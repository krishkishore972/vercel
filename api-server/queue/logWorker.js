import { Worker, UnrecoverableError } from "bullmq";
import IORedis from "ioredis";
import { v4 as uuidv4 } from "uuid";

import { clickhouse } from "../click_house/clickHouse.js";
import { prismaClient } from "../db/prismaClient.js";

export const LOG_QUEUE_NAME = "container-logs";
export const LOG_JOB_NAME = "log-batch";

const TERMINAL_DEPLOYMENT_STATUSES = new Set(["READY", "FAIL"]);

let worker = null;

function createRedisConnection() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }

  return new IORedis(process.env.REDIS_URL, {
    // BullMQ workers use blocking commands, so they must never give up
    // reconnecting: maxRetriesPerRequest must be null.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });
}

function getDeploymentStatus(data) {
  const status = data?.deploymentStatus;

  if (status === undefined) return null;

  if (!TERMINAL_DEPLOYMENT_STATUSES.has(status)) {
    throw new UnrecoverableError(`Invalid deployment status: ${status}`);
  }

  return status;
}

function toClickHouseRows(data, deploymentStatus) {
  const deploymentId = data?.DEPLOYMENT_ID;
  const logs = data?.logs;

  if (typeof deploymentId !== "string" || !Array.isArray(logs)) {
    throw new UnrecoverableError("Malformed log batch payload");
  }

  const values = [];
  let skipped = 0;

  for (const entry of logs) {
    if (
      !entry ||
      typeof entry.log !== "string" ||
      !Number.isInteger(entry.seq)
    ) {
      skipped += 1;
      continue;
    }

    values.push({
      event_id: uuidv4(),
      deployment_id: deploymentId,
      log: entry.log,
      seq: entry.seq,
    });
  }

  // A terminal status may arrive with no remaining log lines.
  if (values.length === 0 && !deploymentStatus) {
    throw new UnrecoverableError("Log batch contained no valid log entries");
  }

  if (skipped > 0) {
    console.warn(
      `Skipped ${skipped} malformed log entries for deployment ${deploymentId}`
    );
  }

  return values;
}

export function startLogWorker() {
  if (worker) return worker;

  worker = new Worker(
    LOG_QUEUE_NAME,
    async (job) => {
      if (job.name !== LOG_JOB_NAME) {
        throw new UnrecoverableError(`Unknown job name: ${job.name}`);
      }

      const deploymentStatus = getDeploymentStatus(job.data);
      const values = toClickHouseRows(job.data, deploymentStatus);

      if (values.length > 0) {
        await clickhouse.insert({
          table: "log_events",
          values,
          format: "JSONEachRow",
        });
      }

      if (deploymentStatus) {
        const result = await prismaClient.deployment.updateMany({
          where: { id: job.data.DEPLOYMENT_ID },
          data: { status: deploymentStatus },
        });

        if (result.count === 0) {
          console.warn(
            `Deployment ${job.data.DEPLOYMENT_ID} not found while setting ${deploymentStatus}`
          );
        }
      }
    },
    {
      connection: createRedisConnection(),
      // Ordering matters: the final status must not be processed before the
      // log batches generated before it. Scale horizontally with more
      // deployments/queues rather than raising this without a sequencing plan.
      concurrency: Number(process.env.LOG_WORKER_CONCURRENCY || 1),
    }
  );

  worker.on("ready", () => {
    console.log("BullMQ log worker ready");
  });

  worker.on("failed", async (job, error) => {
    console.error(`Log batch ${job?.id ?? "unknown"} failed:`, error);

    const maxAttempts = job?.opts?.attempts ?? 1;
    const isFinalBatch = Boolean(job?.data?.deploymentStatus);

    // If the final READY/FAIL batch is exhausted, never leave the deployment
    // stuck in IN_PROGRESS (which would make the dashboard poll forever).
    if (isFinalBatch && job.attemptsMade >= maxAttempts) {
      const deploymentId = job.data.DEPLOYMENT_ID;
      if (typeof deploymentId === "string") {
        try {
          await prismaClient.deployment.updateMany({
            where: { id: deploymentId, status: { not: "READY" } },
            data: { status: "FAIL" },
          });
        } catch (statusError) {
          console.error(
            "Failed to mark deployment FAIL after final batch failure:",
            statusError
          );
        }
      }
    }
  });

  worker.on("error", (error) => {
    console.error("BullMQ log worker error:", error);
  });

  return worker;
}

export async function stopLogWorker() {
  if (!worker) return;
  await worker.close();
  worker = null;
}
