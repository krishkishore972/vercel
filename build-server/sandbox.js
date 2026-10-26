import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const repoURL = process.env.GIT_REPOSITORY_URL;
const outputDir = path.join(__dirname, "output");

function run(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: process.env,
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(
          new Error(
            `${command} ${args.join(" ")} exited with code ${code}`
          )
        );
      }
    });
  });
}

async function main() {
  if (!repoURL) {
    throw new Error("GIT_REPOSITORY_URL is not set");
  }

  fs.rmSync(outputDir, { recursive: true, force: true });

  console.log(`Cloning ${repoURL}`);
  await run("git", ["clone", "--depth", "1", repoURL, outputDir], __dirname);

  console.log("Installing dependencies");
  await run("npm", ["install", "--include=dev"], outputDir);

  console.log("Running build");
  await run("npm", ["run", "build"], outputDir);

  console.log("Build finished");
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
});
