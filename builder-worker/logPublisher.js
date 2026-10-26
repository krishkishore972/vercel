import { Queue } from "bullmq";
import IORedis from "ioredis";

const QUEUE_NAME = "container-logs";
const JOB_NAME = "log-batch";

const MAX_BATCH_SIZE = Number(process.env.LOG_BATCH_SIZE || 100);
const MAX_BATCH_BYTES = Number(process.env.LOG_BATCH_MAX_BYTES || 256 * 1024);
const FLUSH_INTERVAL_MS = Number(process.env.LOG_FLUSH_INTERVAL_MS || 250);

const JOB_OPTIONS = {
  attempts: 5,
  backoff: { type: "exponential", delay: 1000 },
  removeOnComplete: { age: 60 * 60, count: 5000 },
  removeOnFail: { age: 24 * 60 * 60 },
};

/**
 * Buffers build output and publishes it to the BullMQ queue in batches.
 * Flushes are chained so batches reach Redis in the same order they were
 * produced even though queue.add() is asynchronous.
 *
 * Unlike the old in-container publisher, this version does not swallow
 * publish failures. If Redis cannot accept the final status, the build job
 * must fail so the API can mark the deployment FAIL instead of leaving it
 * stuck in IN_PROGRESS.
 */
export class LogPublisher {
  constructor({ projectId, deploymentId }) {
    this.projectId = projectId;
    this.deploymentId = deploymentId;
    this.queue = null;
    this.buffer = [];
    this.bufferedBytes = 0;
    this.nextSeq = 0;
    this.writeChain = Promise.resolve();
    this.flushTimer = null;
  }

  async start() {
    if (!process.env.REDIS_URL) {
      throw new Error("REDIS_URL is not set");
    }

    const connection = new IORedis(process.env.REDIS_URL, {
      maxRetriesPerRequest: 2,
      enableOfflineQueue: false,
      connectTimeout: 10000,
    });

    connection.on("error", (error) => {
      console.error("Build log publisher Redis error:", error.message);
    });

    this.queue = new Queue(QUEUE_NAME, { connection });

    await this.queue.waitUntilReady();

    this.flushTimer = setInterval(() => {
      void this.flush().catch((error) => {
        console.error("Failed to publish log batch:", error);
      });
    }, FLUSH_INTERVAL_MS);
    this.flushTimer.unref?.();
  }

  publish(log) {
    const text = String(log);
    this.buffer.push({
      seq: this.nextSeq++,
      log: text,
    });
    this.bufferedBytes += Buffer.byteLength(text);

    if (
      this.buffer.length >= MAX_BATCH_SIZE ||
      this.bufferedBytes >= MAX_BATCH_BYTES
    ) {
      void this.flush().catch((error) => {
        console.error("Failed to publish log batch:", error);
      });
    }
  }

  async flush(deploymentStatus) {
    if (!this.queue || (this.buffer.length === 0 && !deploymentStatus)) {
      return this.writeChain;
    }

    const logs = this.buffer.splice(0, this.buffer.length);
    this.bufferedBytes = 0;

    this.writeChain = this.writeChain.then(() =>
      this.queue.add(
        JOB_NAME,
        {
          PROJECT_ID: this.projectId,
          DEPLOYMENT_ID: this.deploymentId,
          logs,
          ...(deploymentStatus ? { deploymentStatus } : {}),
        },
        JOB_OPTIONS
      )
    );

    return this.writeChain;
  }

  async close({ deploymentStatus } = {}) {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    let flushError = null;

    try {
      // The final flush carries the terminal status in the same job as the
      // remaining logs. With a single worker, that job is processed last.
      await this.flush(deploymentStatus);
    } catch (error) {
      flushError = error;
    }

    if (this.queue) {
      try {
        await this.queue.close();
      } catch (error) {
        console.error("Failed to close log publisher queue:", error);
      }
      this.queue = null;
    }

    if (flushError) {
      throw flushError;
    }
  }
}
