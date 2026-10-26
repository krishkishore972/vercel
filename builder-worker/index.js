import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { UnrecoverableError, Worker } from "bullmq";
import dotenv from "dotenv";
import IORedis from "ioredis";

import {
  assertDocker,
  attachLogs,
  cleanupOrphanedBuilders,
  copyDist,
  createSandbox,
  ensureImage,
  ensureNetwork,
  removeContainerByName,
  waitForExit,
} from "./dockerRuntime.js";
import { LogPublisher } from "./logPublisher.js";
import { uploadDist } from "./s3Uploader.js";

dotenv.config();

const BUILD_QUEUE_NAME = "build-jobs";
const BUILD_JOB_NAME = "build";

// Keep the worker's input validation aligned with the API's project schema.
// Redis should not be a path to SSRF or local/private repository access even
// if another producer manages to write to the queue.
const GITHUB_REPO_REGEX =
  /^https:\/\/github\.com\/[^/]+\/[^/]+\/?(\.git)?\/?$/;

const REQUIRED_ENV = [
  "REDIS_URL",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET_NAME",
];

const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
  process.exit(1);
}

const BUILDER_IMAGE =
  process.env.BUILDER_IMAGE || "vercel-builder:local";
const BUILDER_NETWORK =
  process.env.BUILDER_NETWORK || "vercel-builds";

if (BUILDER_NETWORK === "host") {
  console.error("BUILDER_NETWORK must not be host: sandbox isolation is required");
  process.exit(1);
}
const BUILD_TIMEOUT_MS = Number(
  process.env.BUILD_TIMEOUT_MS || 14 * 60 * 1000
);
const BUILDER_MEMORY_MB = Number(
  process.env.BUILDER_MEMORY_MB || 3072
);
const BUILDER_CPUS = Number(process.env.BUILDER_CPUS || 1);
const BUILDER_PIDS_LIMIT = Number(
  process.env.BUILDER_PIDS_LIMIT || 512
);
const SHUTDOWN_TIMEOUT_MS = Number(
  process.env.SHUTDOWN_TIMEOUT_MS || 30 * 1000
);

for (const [name, value] of [
  ["BUILD_TIMEOUT_MS", BUILD_TIMEOUT_MS],
  ["BUILDER_MEMORY_MB", BUILDER_MEMORY_MB],
  ["BUILDER_CPUS", BUILDER_CPUS],
  ["BUILDER_PIDS_LIMIT", BUILDER_PIDS_LIMIT],
  ["SHUTDOWN_TIMEOUT_MS", SHUTDOWN_TIMEOUT_MS],
]) {
  if (!Number.isFinite(value) || value <= 0) {
    console.error(`Invalid ${name}: ${value}`);
    process.exit(1);
  }
}

const redis = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

redis.on("error", (error) => {
  console.error("Builder Redis error:", error.message);
});

function containerNameFor(deploymentId) {
  return `build-${deploymentId}`;
}

function waitForStream(done, timeoutMs) {
  let timer;

  return Promise.race([
    done,
    new Promise((resolve) => {
      timer = setTimeout(resolve, timeoutMs);
      timer.unref?.();
    }),
  ]).finally(() => clearTimeout(timer));
}

async function processBuildJob(job) {
  if (job.name !== BUILD_JOB_NAME) {
    throw new UnrecoverableError(`Unknown job name: ${job.name}`);
  }

  const { projectId, deploymentId, gitURL } = job.data || {};

  if (
    typeof projectId !== "string" ||
    typeof deploymentId !== "string" ||
    typeof gitURL !== "string" ||
    !GITHUB_REPO_REGEX.test(gitURL)
  ) {
    throw new UnrecoverableError("Invalid build job payload");
  }

  const publisher = new LogPublisher({ projectId, deploymentId });
  const containerName = containerNameFor(deploymentId);

  let container = null;
  let logStream = null;
  let tempDir = null;
  let terminalStatus = "FAIL";
  let jobError = null;
  let publishError = null;

  try {
    await publisher.start();

    // The API keeps the deployment QUEUED until a worker actually starts it.
    await publisher.flush("IN_PROGRESS");
    publisher.publish("Build started..");

    await removeContainerByName(containerName);

    container = await createSandbox({
      name: containerName,
      image: BUILDER_IMAGE,
      env: [
        `GIT_REPOSITORY_URL=${gitURL}`,
        `PROJECT_ID=${projectId}`,
        `DEPLOYMENT_ID=${deploymentId}`,
        "HOME=/home/app",
        "NPM_CONFIG_CACHE=/home/app/.npm",
        "CI=true",
      ],
      network: BUILDER_NETWORK,
      deploymentId,
      projectId,
      memoryMb: BUILDER_MEMORY_MB,
      cpus: BUILDER_CPUS,
      pidsLimit: BUILDER_PIDS_LIMIT,
    });

    await container.start();

    const logHandle = await attachLogs(container, (chunk) => {
      publisher.publish(chunk);
    });
    logStream = logHandle.stream;

    const result = await waitForExit(container, BUILD_TIMEOUT_MS);

    // Give the log stream a moment to drain before checking the exit code.
    await waitForStream(logHandle.done, 5000);

    if (result.timedOut) {
      throw new Error(
        `Build timed out after ${BUILD_TIMEOUT_MS} ms`
      );
    }

    if (result.StatusCode !== 0) {
      throw new Error(
        `Build failed with exit code ${result.StatusCode}`
      );
    }

    tempDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `vercel-build-${deploymentId}-`)
    );

    publisher.publish("Build Complete");

    const distDir = await copyDist(container, tempDir);

    await uploadDist({
      distDir,
      projectId,
      bucket: process.env.AWS_S3_BUCKET_NAME,
      publisher,
    });

    publisher.publish("All files uploaded successfully");
    terminalStatus = "READY";
  } catch (error) {
    jobError = error;
    console.error(`Build ${deploymentId} failed:`, error);

    try {
      publisher.publish(`Build error: ${error?.stack || error}`);
    } catch (publishFailure) {
      console.error(
        "Failed to buffer build error log:",
        publishFailure
      );
    }
  } finally {
    if (logStream) {
      try {
        logStream.destroy();
      } catch (error) {
        console.error("Failed to close container log stream:", error);
      }
    }

    if (container) {
      try {
        await container.remove({ force: true });
      } catch (error) {
        console.error(
          `Failed to remove build container ${containerName}:`,
          error
        );
      }
    }

    if (tempDir) {
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (error) {
        console.error(
          `Failed to remove build temp directory ${tempDir}:`,
          error
        );
      }
    }

    try {
      await publisher.close({ deploymentStatus: terminalStatus });
    } catch (error) {
      publishError = error;
      console.error(
        `Failed to publish final ${terminalStatus} status for deployment ${deploymentId}:`,
        error
      );
    }
  }

  // If we could not publish the terminal status, the job must fail so the
  // API's QueueEvents handler can correct the deployment status.
  if (jobError) {
    throw jobError;
  }

  if (publishError) {
    throw publishError;
  }
}

let worker = null;
let shuttingDown = false;

function startWorker() {
  worker = new Worker(BUILD_QUEUE_NAME, processBuildJob, {
    connection: redis,
    concurrency: 1,
    lockDuration: 120000,
    stalledInterval: 30000,
    maxStalledCount: 1,
  });

  worker.on("ready", () => {
    console.log("Builder worker ready");
  });

  worker.on("completed", (job) => {
    console.log(`Build job ${job.id} completed`);
  });

  worker.on("failed", (job, error) => {
    console.error(`Build job ${job?.id ?? "unknown"} failed:`, error);
  });

  worker.on("error", (error) => {
    console.error("Builder worker error:", error);
  });
}

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received, shutting down builder worker...`);

  const forceExit = setTimeout(() => {
    console.error("Forced builder worker shutdown after timeout");
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  try {
    if (worker) await worker.close();
    await redis.quit();
    process.exit(0);
  } catch (error) {
    console.error("Builder worker shutdown failed:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

async function main() {
  await assertDocker();
  await ensureNetwork(BUILDER_NETWORK);
  await cleanupOrphanedBuilders();
  await ensureImage(BUILDER_IMAGE);

  console.log(
    `Builder worker configured: image=${BUILDER_IMAGE} network=${BUILDER_NETWORK} concurrency=1`
  );

  // Start consuming only after Docker/network/image setup and orphan cleanup
  // are complete. Otherwise a waiting job could race startup cleanup.
  startWorker();
}

main().catch((error) => {
  console.error("Failed to start builder worker:", error);
  process.exit(1);
});
