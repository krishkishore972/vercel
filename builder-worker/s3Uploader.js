import fs from "node:fs";
import path from "node:path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import mime from "mime-types";

let s3Client = null;

function getS3Client() {
  if (s3Client) return s3Client;

  s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  });

  return s3Client;
}

function listRegularFiles(dir) {
  const files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    // lstat/dirent avoids following symlinks. A build must not be able to
    // make the worker read files outside the extracted output directory.
    if (entry.isDirectory()) {
      files.push(...listRegularFiles(fullPath));
    } else if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

export async function uploadDist({ distDir, projectId, bucket, publisher }) {
  const files = listRegularFiles(distDir);

  if (files.length === 0) {
    throw new Error(`Build output directory is empty: ${distDir}`);
  }

  const s3 = getS3Client();

  for (const filePath of files) {
    const relativePath = path
      .relative(distDir, filePath)
      .split(path.sep)
      .join("/");

    publisher.publish(`uploading file ${relativePath}`);

    await s3.send(
      new PutObjectCommand({
        Bucket: bucket,
        Key: `__outputs/${projectId}/${relativePath}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || "application/octet-stream",
      })
    );

    publisher.publish(`uploaded file ${relativePath}`);
  }
}
