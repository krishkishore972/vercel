# Builder worker

Long-running worker that consumes `build-jobs` from BullMQ and runs each build
in a one-off Docker sandbox.

## Responsibilities

- Owns Redis, S3 uploads, ClickHouse log forwarding (through the API's
  `container-logs` worker), and terminal deployment status.
- Injects only `GIT_REPOSITORY_URL`, project/deployment IDs, and npm cache/home
  paths into the sandbox.
- Removes the sandbox container after every build.

The sandbox image is built from `../build-server`. It clones the repository,
runs `npm install --include=dev`, and runs `npm run build`. It has no AWS,
Redis, ClickHouse, database, or Docker-socket credentials.

## Local setup

```bash
# Build the sandbox image on the Docker host.
docker build -t vercel-builder:local ./build-server

# Create the worker env file from the example and fill in the AWS/S3 values.
cp builder-worker/.env.example builder-worker/.env

# Build and start the API + worker.
docker compose up -d --build api-server builder-worker
```

The worker creates the `vercel-builds` Docker network if it does not exist.
The local compose stack binds Redis/ClickHouse/API ports to `127.0.0.1` so the
sandbox cannot reach them through the Docker host gateway.

## Required worker environment

- `REDIS_URL`
- `BUILDER_IMAGE` (defaults to `vercel-builder:local`)
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`,
  `AWS_S3_BUCKET_NAME`

Optional limits: `BUILD_TIMEOUT_MS`, `BUILDER_MEMORY_MB`, `BUILDER_CPUS`,
`BUILDER_PIDS_LIMIT`, `BUILDER_NETWORK`, `SHUTDOWN_TIMEOUT_MS`.

The worker mounts `/var/run/docker.sock`. Run exactly one worker with
concurrency 1 for v1; that is also when the worker can safely clean up orphaned
builder containers on startup.

## Behavior

1. The API creates a `QUEUED` deployment and enqueues a `build-jobs` job.
2. The worker publishes `IN_PROGRESS`, creates the sandbox container, and
   streams its Docker logs into `container-logs`.
3. On success, the worker extracts `/home/app/output/dist`, uploads it to S3,
   and publishes `READY`.
4. On failure or timeout, it publishes `FAIL` and fails the build job. The API's
   `QueueEvents` handler also marks the deployment `FAIL` if a job dies without
   a terminal status.
