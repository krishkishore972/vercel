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

function isValid_GIT_Repository(str) {
  // Regex to check valid
  // GIT Repository
  let regex = new RegExp(
    /((http|git|ssh|http(s)|file|\/?)|(git@[\w\.]+))(:(\/\/)?)([\w\.@\:/\-~]+)(\.git)(\/)?/
  );

  // if str
  // is empty return false
  if (str == null) {
    return "false";
  }

  // Return true if the str
  // matched the ReGex
  if (regex.test(str) == true) {
    return "true";
  } else {
    return "false";
  }
}

export const createProject = async (req, res) => {
  const safeParse = projectSchema.safeParse(req.body);
  if (safeParse.error) {
    return res.status(400).json({ message: "invalid inputs" });
  }
  const { name, gitURL } = safeParse.data;
  if (isValid_GIT_Repository(gitURL) == "false") {
    return res.status(400).json({ message: "invalid gitURL" });
  }
  console.log(req.userId);

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
    res.status(400).json({ message: "internal server err", error });
  }
};

export const deployProject = async (req, res) => {
  try {
    const { projectId } = req.body;

    const project = await prismaClient.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const deployment = await prismaClient.deployment.create({
      data: {
        project: { connect: { id: projectId } },
        status: "QUEUED",
      },
    });

    const requiredEnv = [
      "ECS_CLUSTER_ARN",
      "ECS_TASK_DEFINITION_ARN",
      "AWS_VPC_SUBNETS",
      "AWS_SECURITY_GROUP",
      "AWS_REGION",
      "AWS_ACCESS_KEY_ID",
      "AWS_SECRET_ACCESS_KEY",
      "AWS_S3_BUCKET_NAME",
      "KAFKA_BROKER",
      "KAFKA_USERNAME",
      "KAFKA_PASSWORD",
    ];

    for (const key of requiredEnv) {
      if (!process.env[key]) {
        throw new Error(`Missing environment variable: ${key}`);
      }
    }

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
              { name: "KAFKA_BROKER", value: process.env.KAFKA_BROKER },
              { name: "KAFKA_USERNAME", value: process.env.KAFKA_USERNAME },
              { name: "KAFKA_PASSWORD", value: process.env.KAFKA_PASSWORD },
            ],
          },
        ],
      },
    });

    // Step 5: Run ECS task
    const ecsResponse = await ecsClient.send(command);

    console.log("ECS Task started:", ecsResponse.tasks?.[0]?.taskArn);

    return res.json({
      status: "queued",
      deploymentId: deployment.id,
      ecsTaskArn: ecsResponse.tasks?.[0]?.taskArn || null,
    });
  } catch (error) {
    console.error("Deploy Error:", error);
    res
      .status(500)
      .json({ message: "Error while deploying", error: error.message });
  }
};

export const getLogs = async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await clickhouse.query({
      query: `SELECT event_id, deployment_id, log, timestamp from log_events where deployment_id = {deployment_id:String}`,
      query_params: {
        deployment_id: id,
      },
      format: "JSONEachRow",
    });
    const rawLogs = await logs.json();
    res.status(200).json({
      logs: rawLogs,
    });
  } catch (error) {
    res.status(400).json({
      message: "err while fetching logs",
    });
  }
};
