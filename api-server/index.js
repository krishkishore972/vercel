import express from "express";
import cors from "cors";
import { clickhouse } from "./click_house/clickHouse.js";
import { Kafka } from "kafkajs";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

import userRouter from "./routes/user.route.js";
import projectRouter from "./routes/project.route.js";
import verifyToken from "./middleware/auth.middleware.js";

dotenv.config();

const app = express();
app.use(express.json());
app.use(
  cors({
    origin: true, // Reflects the request origin
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
const port = 8001;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const KAFKA_BROKER = process.env.KAFKA_BROKER;
const KAFKA_USERNAME = process.env.KAFKA_USERNAME;
const KAFKA_PASSWORD = process.env.KAFKA_PASSWORD;

const kafka = new Kafka({
  clientId: `api-server`,
  brokers: [KAFKA_BROKER],
  ssl: {
    ca: [fs.readFileSync(path.join(__dirname, "kafka.pem"), "utf-8")],
  },
  sasl: {
    mechanism: "plain",
    username: KAFKA_USERNAME,
    password: KAFKA_PASSWORD,
  },
});

const consumer = kafka.consumer({ groupId: "api-server-group" });


app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/user", userRouter);
app.use("/project", verifyToken, projectRouter);

async function initKafkaConsumer() {
  await consumer.connect();
  await consumer.subscribe({
    topic: "container-logs",
    fromBeginning: true,
  });

  await consumer.run({
    eachBatch: async function ({
      batch,
      commitOffsetsIfNecessary,
      heartbeat,
      resolveOffset,
    }) {
      const messages = batch.messages;
      console.log(`received messages ${messages.length} messages `);

      for (const message of messages) {
        if (!message.value) {
          continue;
        }
        const stringMessage = message.value.toString();
        const { PROJECT_ID, DEPLOYMENT_ID, log } = JSON.parse(stringMessage);
        console.log(log);
        try {
          const { query_id } = await clickhouse.insert({
            table: "log_events",
            values: [
              {
                event_id: uuidv4(),
                deployment_id: DEPLOYMENT_ID,
                log,
              },
            ],
            format: "JSONEachRow",
          });
          console.log(query_id);
          resolveOffset(message.offset);
          await commitOffsetsIfNecessary(message.offset);
          await heartbeat();
        } catch (error) {
          console.error("Error inserting into ClickHouse:", error);
        }
      }
    },
  });
}
initKafkaConsumer();
app.listen(port, () => {
  console.log("api-server is listning on port", port);
});
