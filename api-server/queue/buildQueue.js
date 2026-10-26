import { Queue, QueueEvents } from "bullmq";
import IORedis from "ioredis";

import { prismaClient } from "../db/prismaClient.js";

export const BUILD_QUEUE_NAME = "build-jobs";
export const BUILD_JOB_NAME = "build";

let queue = null;
let queueConnection = null;
let queueEvents = null;
let queueEventsConnection = null;

function assertRedis() {
  if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not set");
  }
}

function createQueueConnection() {
  assertRedis();
  const connection = new IORedis(process.env.REDIS_URL, {
    // A deploy request should fail fast if Redis is unavailable instead of
    // hanging the HTTP request forever.
    maxRetriesPerRequest: 2,
    enableOfflineQueue: false,
    connectTimeout: 5000,
  });

  connection.on("error", (error) => {
    console.error("Build queue Redis error:", error.message);
  });

  return connection;
}

function createQueueEventsConnection() {
  assertRedis();
  const connection = new IORedis(process.env.REDIS_URL, {
    // QueueEvents uses blocking commands and must keep reconnecting.
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  connection.on("error", (error) => {
    console.error("Build queue events Redis error:", error.message);
  });

  return connection;
}

export function getBuildQueue() {
  if (queue) return queue;

  queueConnection = createQueueConnection();
  queue = new Queue(BUILD_QUEUE_NAME, {
    connection: queueConnection,
  });

  return queue;
}

export async function enqueueBuild({ projectId, deploymentId, gitURL }) {
  const buildQueue = getBuildQueue();

  await buildQueue.add(
    BUILD_JOB_NAME,
    {
      projectId,
      deploymentId,
      gitURL,
    },
    {
      // One job per deployment. A duplicate enqueue for the same deployment
      // will not create a second build.
      jobId: deploymentId,
      // v1 does not retry failed repository builds. The user can redeploy.
      attempts: 1,
      removeOnComplete: { age: 24 * 60 * 60, count: 1000 },
      removeOnFail: { age: 7 * 24 * 60 * 60, count: 5000 },
    }
  );
}

/**
 * Marks a deployment FAIL when its build job dies without publishing a
 * terminal status (for example, the builder worker is killed mid-build).
 */
export function startBuildQueueEvents() {
  if (queueEvents) return queueEvents;

  queueEventsConnection = createQueueEventsConnection();
  queueEvents = new QueueEvents(BUILD_QUEUE_NAME, {
    connection: queueEventsConnection,
  });

  queueEvents.on("error", (error) => {
    console.error("Build queue events error:", error);
  });

  queueEvents.on("failed", async ({ jobId, failedReason }) => {
    try {
      const job = await getBuildQueue().getJob(jobId);
      const deploymentId = job?.data?.deploymentId;

      if (typeof deploymentId !== "string") {
        return;
      }

      // `failed` can also fire between retry attempts. Only act when the job
      // has reached its final failed state.
      const state = await job.getState();
      if (state !== "failed") {
        return;
      }

      await prismaClient.deployment.updateMany({
        where: {
          id: deploymentId,
          status: { notIn: ["READY", "FAIL"] },
        },
        data: { status: "FAIL" },
      });

      console.error(
        `Build job ${jobId} failed permanently for deployment ${deploymentId}: ${failedReason}`
      );
    } catch (error) {
      console.error("Failed to handle build job failure:", error);
    }
  });

  return queueEvents;
}

export async function closeBuildQueue() {
  const closers = [];

  if (queueEvents) {
    closers.push(queueEvents.close());
    queueEvents = null;
  }

  if (queue) {
    closers.push(queue.close());
    queue = null;
  }

  await Promise.allSettled(closers);

  if (queueEventsConnection) {
    queueEventsConnection.disconnect();
    queueEventsConnection = null;
  }

  if (queueConnection) {
    queueConnection.disconnect();
    queueConnection = null;
  }
}
