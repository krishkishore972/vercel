import { prismaClient } from "../db/prismaClient.js";
import { projectSchema } from "../zodSchema.js";
import { generateSlug } from "random-word-slugs";
import { ECSClient, RunTaskCommand } from "@aws-sdk/client-ecs";
import { clickhouse } from "../click_house/clickHouse.js";

const ecsClient = new ECSClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

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
  const requiredEnv = [
    "ECS_CLUSTER_ARN",
    "ECS_TASK_DEFINITION_ARN",
    "AWS_VPC_SUBNETS",
    "AWS_SECURITY_GROUP",
    "AWS_REGION",
    "AWS_ACCESS_KEY_ID",
    "AWS_SECRET_ACCESS_KEY",
    "AWS_S3_BUCKET_NAME",
    "REDIS_URL",
  ];

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

    const subnets = process.env.AWS_VPC_SUBNETS.split(",");
    const securityGroups = [process.env.AWS_SECURITY_GROUP];

    // Step 4: ECS task config
    const command = new RunTaskCommand({
      cluster: process.env.ECS_CLUSTER_ARN,
      taskDefinition: process.env.ECS_TASK_DEFINITION_ARN,
      launchType: "FARGATE",
      count: 1,
      networkConfiguration: {
        awsvpcConfiguration: {
          assignPublicIp: "ENABLED",
          subnets,
          securityGroups,
        },
      },
      overrides: {
        containerOverrides: [
          {
            name: "builder-task", // container name in ECS task definition
            environment: [
              { name: "GIT_REPOSITORY_URL", value: project.gitURL },
              { name: "PROJECT_ID", value: project.id },
              { name: "DEPLOYMENT_ID", value: deployment.id },
              { name: "AWS_REGION", value: process.env.AWS_REGION },
              {
                name: "AWS_ACCESS_KEY_ID",
                value: process.env.AWS_ACCESS_KEY_ID,
              },
              {
                name: "AWS_SECRET_ACCESS_KEY",
                value: process.env.AWS_SECRET_ACCESS_KEY,
              },
              {
                name: "AWS_S3_BUCKET_NAME",
                value: process.env.AWS_S3_BUCKET_NAME,
              },
              { name: "REDIS_URL", value: process.env.REDIS_URL },
            ],
          },
        ],
      },
    });

    // Step 5: Run ECS task
    let ecsResponse;
    try {
      ecsResponse = await ecsClient.send(command);
    } catch (ecsError) {
      // ECS launch failed: don't leave the deployment stuck in QUEUED.
      await prismaClient.deployment.update({
        where: { id: deployment.id },
        data: { status: "FAIL" },
      });
      throw ecsError;
    }

    // The build task publishes READY/FAIL when it finishes. Mark the
    // deployment as in progress only while it is still QUEUED, so a very fast
    // build cannot be downgraded by this update.
    try {
      await prismaClient.deployment.updateMany({
        where: { id: deployment.id, status: "QUEUED" },
        data: { status: "IN_PROGRESS" },
      });
    } catch (statusError) {
      console.error("Failed to mark deployment IN_PROGRESS:", statusError);
    }

    return res.json({
      status: "queued",
      deploymentId: deployment.id,
      ecsTaskArn: ecsResponse.tasks?.[0]?.taskArn || null,
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
