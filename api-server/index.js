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

if (!process.env.JWT_SECRET) {
  console.error("FATAL: JWT_SECRET is not set. Refusing to start.");
  process.exit(1);
}

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  process.env.FRONTEND_URL,
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      // Exact allowlist only. Set FRONTEND_URL/CLIENT_URL in env instead of
      // trusting broad suffix matches (e.g. any *.vercel.app tenant).
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    optionsSuccessStatus: 200,
  })
);



app.use(express.json());

const port = process.env.PORT || 8001;

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
    // Only new messages. fromBeginning:true replays the whole topic on a
    // fresh consumer group and duplicates every row in ClickHouse.
    fromBeginning: false,
  });

  await consumer.run({
    eachBatch: async function ({
      batch,
      commitOffsetsIfNecessary,
      heartbeat,
      resolveOffset,
    }) {
      const messages = batch.messages;

      for (const message of messages) {
        try {
          if (!message.value) {
            resolveOffset(message.offset);
            continue;
          }
          // A single poison message must never stall the partition:
          // parse + validate inside try, always resolve the offset.
          const parsed = JSON.parse(message.value.toString());
          const { DEPLOYMENT_ID, log } = parsed ?? {};
          if (typeof DEPLOYMENT_ID !== "string" || typeof log !== "string") {
            console.warn(
              `Skipping malformed log message at offset ${message.offset}`
            );
            resolveOffset(message.offset);
            continue;
          }
          await clickhouse.insert({
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
          resolveOffset(message.offset);
        } catch (error) {
          console.error(
            `Skipping message at offset ${message.offset} after error:`,
            error
          );
          resolveOffset(message.offset);
        }
        await heartbeat();
      }
      await commitOffsetsIfNecessary();
    },
  });
}

// Non-fatal with retries: the REST API stays useful (auth/projects)
// even while the log pipeline is reconnecting.
async function startKafkaConsumer(attempt = 0) {
  try {
    await initKafkaConsumer();
    console.log("Kafka consumer running");
  } catch (error) {
    const delayMs = Math.min(30000, 5000 * (attempt + 1));
    console.error(
      `Kafka consumer failed (attempt ${attempt + 1}), retrying in ${delayMs}ms:`,
      error
    );
    setTimeout(() => startKafkaConsumer(attempt + 1), delayMs);
  }
}
startKafkaConsumer();

// Global error handler (e.g. CORS rejections). Must stay after routes.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: "Internal server error" });
});

app.listen(port, () => {
  console.log("api-server is listening on port", port);
});
