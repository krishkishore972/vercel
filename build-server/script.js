import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import { S3Client, PutObjectCommand} from "@aws-sdk/client-s3";
import dotenv from "dotenv";
dotenv.config();


const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const project_ID = process.env.PROJECT_ID;

async function main() {
  console.log("executing script.js");
  const outPutDir = path.join(__dirname, "output");

  const p = exec(`cd ${outPutDir} && npm install && npm run build`);

  p.stdout.on("data", (data) => {
    console.log(data.toString());
  });
  p.stderr.on("error", (data) => {
    console.error(data.toString());
  });

  p.on("close", async () => {
    console.log("build completed");
    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;
      console.log("Uploading file: ", filePath);
      const command = new PutObjectCommand({
        Bucket: process.env.AWS_S3_BUCKET_NAME,
        Key: `__outputs/${project_ID}/${file}`, // path that you want to save in S3
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || undefined,
      });
      await s3.send(command);
      console.log("uploaded file: ", filePath);
    }
    console.log("All files uploaded successfully");
  });
}

main().catch((error) => {
  console.error("Error executing script:", error);
  process.exit(1);
});
