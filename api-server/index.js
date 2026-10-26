import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import userRouter from "./routes/user.route.js";
import projectRouter from "./routes/project.route.js";
import verifyToken from "./middleware/auth.middleware.js";
import { startLogWorker, stopLogWorker } from "./queue/logWorker.js";
import {
  closeBuildQueue,
  startBuildQueueEvents,
} from "./queue/buildQueue.js";

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

app.get("/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.use("/user", userRouter);
app.use("/project", verifyToken, projectRouter);

// Non-fatal: the REST API stays useful (auth/projects) even if Redis is
// temporarily unavailable. BullMQ reconnects on its own; the deploy endpoint
// refuses to launch a build when REDIS_URL is not configured.
try {
  startLogWorker();
} catch (error) {
  console.error("Failed to start BullMQ log worker:", error);
}

try {
  startBuildQueueEvents();
} catch (error) {
  console.error("Failed to start build queue events:", error);
}

// Global error handler (e.g. CORS rejections). Must stay after routes.
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  if (res.headersSent) return next(err);
  res.status(err.status || 500).json({ message: "Internal server error" });
});

const server = app.listen(port, () => {
  console.log("api-server is listening on port", port);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received, shutting down...`);

  // Do not let a stuck connection block deploys forever.
  const forceExit = setTimeout(() => {
    console.error("Forced shutdown after timeout");
    process.exit(1);
  }, 10000);
  forceExit.unref();

  try {
    await stopLogWorker();
    await closeBuildQueue();
    await new Promise((resolve) => server.close(resolve));
    process.exit(0);
  } catch (error) {
    console.error("Graceful shutdown failed:", error);
    process.exit(1);
  }
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
