import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

import { LogPublisher } from "./logPublisher.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;

const requiredEnv = [
  "PROJECT_ID",
  "DEPLOYMENT_ID",
  "REDIS_URL",
  "AWS_REGION",
  "AWS_ACCESS_KEY_ID",
  "AWS_SECRET_ACCESS_KEY",
  "AWS_S3_BUCKET_NAME",
];

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length > 0) {
  console.error(
    `Missing required environment variables: ${missingEnv.join(", ")}`
  );
  process.exit(1);
}

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});

function runBuild(outPutDir, publisher) {
  return new Promise((resolve) => {
    // spawn (rather than exec) streams output without exec's 1 MB buffer cap,
    // which large npm install / build logs can easily exceed.
    const p = spawn(
      "bash",
      ["-c", `cd "${outPutDir}" && npm install && npm run build`],
      { stdio: ["ignore", "pipe", "pipe"] }
    );

    p.stdout.on("data", (data) => {
      console.log(data.toString());
      publisher.publish(data.toString());
    });

    // The previous Kafka producer only captured stdout, so build failures
    // written to stderr never reached the dashboard.
    p.stderr.on("data", (data) => {
      console.error(data.toString());
      publisher.publish(data.toString());
    });

    p.on("error", (error) => {
      console.error("Failed to run build process:", error);
      publisher.publish(
        `Build process error: ${error.message || String(error)}`
      );
      resolve(1);
    });

    p.on("close", (code) => {
      resolve(code ?? 1);
    });
  });
}

async function uploadDist(publisher) {
  const distFolderPath = path.join(__dirname, "output", "dist");

  if (!fs.existsSync(distFolderPath)) {
    throw new Error(`Build output directory not found: ${distFolderPath}`);
  }

  const distFolderContents = fs.readdirSync(distFolderPath, {
    recursive: true,
  });

  for (const file of distFolderContents) {
    const filePath = path.join(distFolderPath, file);
    if (fs.lstatSync(filePath).isDirectory()) continue;

    console.log("Uploading file: ", filePath);
    publisher.publish(`uploading file ${file}`);

    const command = new PutObjectCommand({
      Bucket: AWS_S3_BUCKET_NAME,
      Key: `__outputs/${PROJECT_ID}/${file}`,
      Body: fs.createReadStream(filePath),
      ContentType: mime.lookup(filePath) || undefined,
    });

    await s3.send(command);
    console.log("Uploaded file: ", filePath);
    publisher.publish(`uploaded file ${filePath}`);
  }
}

async function main() {
  const publisher = new LogPublisher({
    projectId: PROJECT_ID,
    deploymentId: DEPLOYMENT_ID,
  });

  let exitCode = 1;

  try {
    await publisher.start();
    console.log("executing script.js");

    // Flush immediately so the dashboard shows the first line right away.
    publisher.publish("Build started..");
    await publisher.flush();

    const outPutDir = path.join(__dirname, "output");
    const buildExitCode = await runBuild(outPutDir, publisher);

    if (buildExitCode !== 0) {
      publisher.publish(`Build failed with exit code ${buildExitCode}`);
      exitCode = 1;
    } else {
      publisher.publish("Build Complete");
      await uploadDist(publisher);
      publisher.publish("All files uploaded successfully");
      exitCode = 0;
    }
  } catch (error) {
    console.error("Error executing script:", error);
    publisher.publish(`Build error: ${error?.stack || error}`);
    exitCode = 1;
  } finally {
    try {
      // Flushes buffered logs and waits for all queue.add() calls to land in
      // Redis before the container exits. The terminal status is attached to
      // the same job as the final log lines.
      await publisher.close({
        deploymentStatus: exitCode === 0 ? "READY" : "FAIL",
      });
    } catch (error) {
      console.error("Failed to close log publisher:", error);
    }
    process.exitCode = exitCode;
  }
}

main()
  .then(() => {
    // Redis/HTTP keep-alive sockets can keep the event loop alive; every log
    // batch is already flushed and the queue closed at this point.
    process.exit(process.exitCode ?? 0);
  })
  .catch((error) => {
    console.error("Unhandled build error:", error);
    process.exit(1);
  });
