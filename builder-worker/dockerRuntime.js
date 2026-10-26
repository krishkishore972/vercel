import fs from "node:fs";
import path from "node:path";
import { PassThrough } from "node:stream";
import { pipeline } from "node:stream/promises";

import Docker from "dockerode";
import * as tar from "tar";

const socketPath =
  process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock";

export const docker = new Docker({ socketPath });

export async function assertDocker() {
  await docker.ping();
}

export async function ensureNetwork(name) {
  if (!name || name === "bridge") return;

  const networks = await docker.listNetworks();
  if (networks.some((network) => network.Name === name)) {
    return;
  }

  console.log(`Creating Docker network ${name}`);
  await docker.createNetwork({
    Name: name,
    Driver: "bridge",
  });
}

export async function ensureImage(image) {
  try {
    await docker.getImage(image).inspect();
    return;
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }

  console.log(`Pulling builder image ${image}`);

  await new Promise((resolve, reject) => {
    docker.pull(image, (pullError, stream) => {
      if (pullError) {
        reject(pullError);
        return;
      }

      docker.modem.followProgress(
        stream,
        (progressError, output) => {
          if (progressError) {
            reject(progressError);
            return;
          }

          const failure = Array.isArray(output)
            ? output.find(
                (event) => event.error || event.errorDetail
              )
            : null;

          if (failure) {
            reject(
              new Error(
                failure.error ||
                  failure.errorDetail?.message ||
                  "Builder image pull failed"
              )
            );
            return;
          }

          resolve(output);
        }
      );
    });
  });
}

export async function cleanupOrphanedBuilders() {
  const containers = await docker.listContainers({
    all: true,
    filters: { label: ["vercel.builder=1"] },
  });

  // v1 runs a single worker with concurrency 1. Any builder container that
  // still exists when this process starts belongs to a previous worker
  // process, so remove it (running or not) to avoid leaking build containers.
  for (const info of containers) {
    try {
      await docker.getContainer(info.Id).remove({ force: true });
      console.log(`Removed orphaned builder container ${info.Id}`);
    } catch (error) {
      console.error(
        `Failed to remove orphaned builder container ${info.Id}:`,
        error
      );
    }
  }
}

export async function removeContainerByName(name) {
  try {
    await docker.getContainer(name).remove({ force: true });
  } catch (error) {
    if (error.statusCode !== 404) {
      throw error;
    }
  }
}

export async function createSandbox({
  name,
  image,
  env,
  network,
  deploymentId,
  projectId,
  memoryMb,
  cpus,
  pidsLimit,
}) {
  return docker.createContainer({
    name,
    Image: image,
    Env: env,
    WorkingDir: "/home/app",
    Tty: false,
    OpenStdin: false,
    AttachStdout: false,
    AttachStderr: false,
    User: "1000:1000",
    Labels: {
      "vercel.builder": "1",
      "vercel.deploymentId": deploymentId,
      "vercel.projectId": projectId,
    },
    HostConfig: {
      NetworkMode: network,
      AutoRemove: false,
      Memory: memoryMb * 1024 * 1024,
      NanoCpus: Math.round(cpus * 1_000_000_000),
      PidsLimit: pidsLimit,
      CapDrop: ["ALL"],
      SecurityOpt: ["no-new-privileges"],
    },
  });
}

/**
 * Streams stdout/stderr from the container. Docker multiplexes these streams
 * when Tty is false, so demux before passing chunks to the log publisher.
 */
export async function attachLogs(container, onChunk) {
  const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    timestamps: false,
  });

  const stdout = new PassThrough();
  const stderr = new PassThrough();

  docker.modem.demuxStream(stream, stdout, stderr);

  stdout.on("data", (chunk) => onChunk(chunk.toString()));
  stderr.on("data", (chunk) => onChunk(chunk.toString()));

  const done = new Promise((resolve) => {
    const finish = () => resolve();
    stream.once("end", finish);
    stream.once("close", finish);
    stream.once("error", finish);
  });

  return { stream, done };
}

export async function waitForExit(container, timeoutMs) {
  let timedOut = false;

  const timer = setTimeout(() => {
    timedOut = true;

    // Fire and forget: wait() will resolve once the container stops.
    void container
      .stop({ t: 5 })
      .catch(() => {})
      .then(() => container.kill())
      .catch(() => {});
  }, timeoutMs);

  timer.unref?.();

  try {
    const result = await container.wait();
    return { ...result, timedOut };
  } finally {
    clearTimeout(timer);
  }
}

function isDirectory(target) {
  try {
    return fs.lstatSync(target).isDirectory();
  } catch {
    return false;
  }
}

function hasRegularFiles(dir) {
  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return false;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (hasRegularFiles(fullPath)) return true;
    } else if (entry.isFile()) {
      return true;
    }
  }

  return false;
}

function findNamedDist(dir, depth = 0) {
  if (depth > 5) return null;

  let entries;

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return null;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const fullPath = path.join(dir, entry.name);

    if (entry.name === "dist" && hasRegularFiles(fullPath)) {
      return fullPath;
    }

    const found = findNamedDist(fullPath, depth + 1);
    if (found) return found;
  }

  return null;
}

export function resolveDistDir(root) {
  const direct = path.join(root, "dist");

  if (isDirectory(direct) && hasRegularFiles(direct)) {
    return direct;
  }

  const discovered = findNamedDist(root);
  if (discovered) {
    return discovered;
  }

  // Some Docker archive responses contain the directory contents without a
  // top-level "dist" entry.
  if (hasRegularFiles(root)) {
    return root;
  }

  throw new Error(`Build output directory not found or empty under ${root}`);
}

export async function copyDist(container, destination) {
  const archive = await container.getArchive({
    path: "/home/app/output/dist",
  });

  await pipeline(
    archive,
    tar.extract({
      cwd: destination,
      preservePaths: false,
      filter: (entryPath, entry) => {
        const normalized = String(entryPath).replace(/\\/g, "/");

        if (
          normalized.startsWith("/") ||
          normalized.split("/").includes("..")
        ) {
          return false;
        }

        // Never materialize symlinks/hardlinks from build output.
        if (entry.type === "SymbolicLink" || entry.type === "Link") {
          return false;
        }

        return true;
      },
    })
  );

  return resolveDistDir(destination);
}
