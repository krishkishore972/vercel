import { exec } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import mime from "mime-types";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";
import { Kafka } from "kafkajs";
dotenv.config();



const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PROJECT_ID = process.env.PROJECT_ID;
const DEPLOYMENT_ID = process.env.DEPLOYMENT_ID;
const AWS_REGION = process.env.AWS_REGION;
const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID;
const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY;
const AWS_S3_BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME;
const KAFKA_BROKER = process.env.KAFKA_BROKER;
const KAFKA_USERNAME = process.env.KAFKA_USERNAME;
const KAFKA_PASSWORD = process.env.KAFKA_PASSWORD;




const kafka = new Kafka({
  clientId: `docker-build-server-${DEPLOYMENT_ID}`,
  brokers: [KAFKA_BROKER],
  ssl: {
    ca:[fs.readFileSync(path.join(__dirname,"kafka.pem"),"utf-8")]
  },
  sasl: {
    mechanism: "plain",
    username: KAFKA_USERNAME,
    password: KAFKA_PASSWORD,
  },
});

const producer = kafka.producer()

async function publishLog(log){
 await producer.send({
  topic:`container-logs`,
  messages:[
    {
      key:"log", value:JSON.stringify({PROJECT_ID,DEPLOYMENT_ID,log})
    }
  ]
 })
}

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY,
  },
});



async function main() {
  await producer.connect()
  console.log("executing script.js");
  await publishLog("Build started..")
  const outPutDir = path.join(__dirname, "output");

  const p = exec(`cd ${outPutDir} && npm install && npm run build`);

  p.stdout.on("data", async (data) => {
    console.log(data.toString());
    await publishLog(data.toString())
  });

  p.stdout.on("error", async (err) => {
    console.error("Stream error:", err);
     await publishLog(err.message || err.toString());
  });

  p.on("close", async () => {
    console.log("Build Complete");
    await publishLog(`Build Complete`);
    const distFolderPath = path.join(__dirname, "output", "dist");
    const distFolderContents = fs.readdirSync(distFolderPath, {
      recursive: true,
    });

    for (const file of distFolderContents) {
      const filePath = path.join(distFolderPath, file);
      if (fs.lstatSync(filePath).isDirectory()) continue;

      console.log("Uploading file: ", filePath);
      await publishLog(`uploading file ${file}`)
      const command = new PutObjectCommand({
        Bucket: AWS_S3_BUCKET_NAME,
        Key: `__outputs/${PROJECT_ID}/${file}`,
        Body: fs.createReadStream(filePath),
        ContentType: mime.lookup(filePath) || undefined,
      });

      await s3.send(command);
      console.log("Uploaded file: ", filePath);
      await publishLog(`uploded file${filePath}`)
    }

    console.log("All files uploaded successfully");
    await publishLog("All files uploaded successfully");
    process.exit(0); // <-- kill container after success
  });
}

main().catch((error) => {
  console.error("Error executing script:", error)
  process.exit(1);
});
