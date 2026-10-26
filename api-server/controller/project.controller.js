import { prismaClient } from "../db/prismaClient.js";
import { projectSchema } from "../zodSchema.js";
import { generateSlug } from "random-word-slugs";
import { clickhouse } from "../click_house/clickHouse.js";
import { enqueueBuild } from "../queue/buildQueue.js";

export const createProject = async (req, res) => {
  const safeParse = projectSchema.safeParse(req.body);
  if (safeParse.error) {
    return res.status(400).json({ message: "invalid inputs" });
  }
  const { name, gitURL } = safeParse.data;

  try {
    const project = await prismaClient.project.create({
      data: {
        name,
        gitURL,
        subDomain: generateSlug(),
        userId: req.userId,
      },
      include: { deployments: true },
    });
    res.status(200).json({ success: true, project });
  } catch (error) {
    console.error("Create project error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const deployProject = async (req, res) => {
  const { projectId } = req.body;

  if (!projectId || typeof projectId !== "string") {
    return res.status(400).json({ message: "projectId is required" });
  }

  // Fail fast on server misconfiguration BEFORE creating a deployment row,
  // so we never leave orphan QUEUED deployments behind.
  const requiredEnv = ["REDIS_URL"];

  const missingEnv = requiredEnv.filter((key) => !process.env[key]);
  if (missingEnv.length > 0) {
    console.error("Deploy misconfigured, missing env:", missingEnv);
    return res.status(500).json({ message: "Internal server error" });
  }

  let deployment = null;
  try {
    // Ownership check: users can only deploy their own projects.
    const project = await prismaClient.project.findFirst({
      where: { id: projectId, userId: req.userId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    deployment = await prismaClient.deployment.create({
      data: {
        project: { connect: { id: projectId } },
        status: "QUEUED",
      },
    });

    try {
      await enqueueBuild({
        projectId: project.id,
        deploymentId: deployment.id,
        gitURL: project.gitURL,
      });
    } catch (queueError) {
      // Queueing failed: don't leave the deployment stuck in QUEUED.
      await prismaClient.deployment.update({
        where: { id: deployment.id },
        data: { status: "FAIL" },
      });
      throw queueError;
    }

    // The builder worker publishes IN_PROGRESS when it actually starts the
    // sandbox container, and READY/FAIL when the build finishes.
    return res.json({
      status: "queued",
      deploymentId: deployment.id,
    });
  } catch (error) {
    console.error("Deploy Error:", error);
    res.status(500).json({ message: "Error while deploying" });
  }
};

export const getLogs = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ message: "Invalid deployment id" });
    }

    // Ownership check: resolve deployment -> project -> user before
    // touching ClickHouse. Same 404 either way so existence isn't leaked.
    const deployment = await prismaClient.deployment.findUnique({
      where: { id },
      include: { project: { select: { userId: true } } },
    });

    if (!deployment || deployment.project.userId !== req.userId) {
      return res.status(404).json({ message: "Logs not found" });
    }

    const logs = await clickhouse.query({
      query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id = {deployment_id:String} ORDER BY seq ASC, timestamp ASC`,
      query_params: {
        deployment_id: id,
      },
      format: "JSONEachRow",
    });
    const rawLogs = await logs.json();
    res.status(200).json({
      logs: rawLogs,
      status: deployment.status,
    });
  } catch (error) {
    console.error("Error while fetching logs:", error);
    res.status(500).json({
      message: "Internal server error",
    });
  }
};
