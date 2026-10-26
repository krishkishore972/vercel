# Vercel Clone

A small self-hosted deployment platform: connect a public GitHub repository,
build it in an isolated Docker sandbox, upload the static output to S3, and
serve it on a generated subdomain.

The project originally used AWS ECS/Fargate for builds. It now uses a
queue-backed, long-running Docker worker so builds run on the same Docker host
as Redis, ClickHouse, and the API.

## Demo

<video src="./deploy_demo_github.mp4" controls width="100%">
  Your browser does not support embedded videos.
</video>

<p><a href="./deploy_demo_github.mp4">Watch the deployment demo</a></p>

## Features

- GitHub repository deployment
- One-off Docker sandbox per build
- Queue-backed build execution with BullMQ
- Live build logs streamed to the browser
- Build logs stored in ClickHouse
- Deployment status tracking in PostgreSQL via Prisma
- Static output uploaded to S3
- Subdomain-based S3 reverse proxy
- Next.js dashboard with authentication and deployment logs
- Automatic failure handling and terminal deployment status

## Architecture

```text
┌─────────────────────┐
│      Frontend       │
│  Next.js / React    │
└──────────┬──────────┘
           │ REST
           ▼
┌─────────────────────┐        ┌──────────────────┐
│     API Server      │───────▶│    PostgreSQL    │
│ Express + Prisma    │        │ users/projects/  │
│                     │        │ deployments      │
└──────┬──────┬───────┘        └──────────────────┘
       │      │
       │      │ enqueue build-job
       │      ▼
       │  ┌──────────────────┐
       │  │      Redis       │
       │  │ BullMQ queues    │
       │  └───────┬──────────┘
       │          │
       │          ▼
       │  ┌──────────────────┐
       │  │  Builder Worker  │
       │  │  concurrency 1   │
       │  └───────┬──────────┘
       │          │ Docker API
       │          ▼
       │  ┌──────────────────┐
       │  │  Build Sandbox   │
       │  │ vercel-builder   │
       │  │ clone/install/   │
       │  │ build -> dist    │
       │  └───────┬──────────┘
       │          │ archive
       │          ▼
       │  ┌──────────────────┐
       │  │   S3 Bucket      │
       │  │ __outputs/...    │
       │  └───────┬──────────┘
       │          │
       ▼          ▼
┌─────────────┐  ┌──────────────────┐
│ ClickHouse  │  │ S3 Reverse Proxy │
│ build logs  │  │ subdomain -> S3  │
└─────────────┘  └──────────────────┘
```

### Build and log flow

1. The frontend calls `POST /project/deploy`.
2. The API creates a `QUEUED` deployment and adds a job to the `build-jobs`
   Redis queue.
3. `builder-worker` picks up the job and publishes `IN_PROGRESS`.
4. The worker creates a one-off sandbox container from the
   `vercel-builder:local` image.
5. The sandbox clones the repository, runs `npm install --include=dev`, and
   runs `npm run build`.
6. The worker streams Docker stdout/stderr into the `container-logs` queue.
7. The API log worker consumes those batches, writes logs to ClickHouse, and
   updates the deployment status in PostgreSQL.
8. On success, the worker extracts `/home/app/output/dist` from the container,
   uploads it to S3, and publishes `READY`.
9. On failure or timeout, the worker publishes `FAIL`.
10. The frontend polls until it sees `READY` or `FAIL`.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | Next.js 15, React 19, Tailwind CSS |
| API | Node.js, Express 5, Prisma |
| Database | PostgreSQL |
| Queue | Redis + BullMQ |
| Logs | ClickHouse |
| Builds | Docker sandbox |
| Artifact storage | Amazon S3 |
| Live sites | Express S3 reverse proxy |

## Repository Layout

```text
.
├── api-server/          # Express API, auth, projects, deployments, log worker
├── builder-worker/      # Long-running BullMQ worker and Docker orchestration
├── build-server/        # Sandbox image source (Dockerfile + sandbox.js)
├── s3-reverse-proxy/    # Serves deployed static sites from S3 by subdomain
├── frontend/            # Next.js dashboard and landing page
├── docker-compose.yml   # Local development stack
└── docker-compose.prod.yml
```

`build-server/` is **not** a running service. It is the build context for the
sandbox image. The worker starts that image once per deployment.

## Prerequisites

- Docker Engine with Docker Compose
- Node.js 20+ for the frontend and optional host-side scripts
- PostgreSQL database reachable from the API
- Redis instance
- ClickHouse instance
- S3 bucket with public read access for uploaded build output
- AWS credentials with permission to upload to the bucket
- A public GitHub repository containing a `build` script that outputs to `dist`

## Local Setup

### 1. Clone the project

```bash
git clone <repo-url>
cd vercel
```

### 2. Create environment files

```bash
cp api-server/.env.example api-server/.env
cp builder-worker/.env.example builder-worker/.env
cp s3-reverse-proxy/.env.example s3-reverse-proxy/.env
cp frontend/.env.example frontend/.env.local
```

Fill in the values in each file.

The backend Compose stack overrides Redis and ClickHouse URLs with local
service names, so `api-server/.env` can keep localhost values for host-side
development.

### 3. Apply database migrations

For a fresh database:

```bash
cd api-server
npm install
npx prisma migrate deploy
cd ..
```

The API image runs `prisma generate` at build time, not migrations.

### 4. Build the sandbox image

```bash
docker build -t vercel-builder:local ./build-server
```

Rebuild this image whenever `build-server/` changes.

### 5. Start the backend

```bash
docker compose up -d --build
```

This starts:

- Redis
- ClickHouse
- API server
- Builder worker
- S3 reverse proxy

Check the stack:

```bash
docker compose ps
curl http://localhost:8001/health
docker compose logs builder-worker | tail -20
```

Expected worker output:

```text
Builder worker ready
Builder worker configured: image=vercel-builder:local network=vercel-builds concurrency=1
```

### 6. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## Service URLs

| Service | Local URL |
| --- | --- |
| Frontend | `http://localhost:3000` |
| API | `http://localhost:8001` |
| API health | `http://localhost:8001/health` |
| S3 reverse proxy | `http://localhost:8000` |
| ClickHouse HTTP | `http://localhost:8123` |
| Redis | `localhost:6379` |

Local Redis, ClickHouse, API, and S3 proxy ports are bound to `127.0.0.1` so the
build sandbox cannot reach them through the Docker host gateway.

## Environment Variables

### `api-server/.env`

| Variable | Purpose |
| --- | --- |
| `PORT` | API port, default `8001` |
| `FRONTEND_URL` | Allowed frontend origin |
| `CLIENT_URL` | Additional allowed origin |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_SECRET` | JWT signing secret |
| `REDIS_URL` | Redis/BullMQ connection |
| `LOG_WORKER_CONCURRENCY` | Log worker concurrency; keep at `1` |
| `CLICKHOUSE_HOST` | ClickHouse HTTP URL |
| `CLICKHOUSE_USERNAME` | ClickHouse user |
| `CLICKHOUSE_PASSWORD` | ClickHouse password |
| `CLICKHOUSE_DATABASE` | ClickHouse database |

### `builder-worker/.env`

| Variable | Purpose |
| --- | --- |
| `REDIS_URL` | Must point at the same Redis as the API |
| `BUILDER_IMAGE` | Sandbox image, default `vercel-builder:local` |
| `BUILDER_NETWORK` | Sandbox Docker network, default `vercel-builds` |
| `BUILD_TIMEOUT_MS` | Build timeout, default 14 minutes |
| `BUILDER_MEMORY_MB` | Sandbox memory limit |
| `BUILDER_CPUS` | Sandbox CPU limit |
| `BUILDER_PIDS_LIMIT` | Sandbox PID limit |
| `SHUTDOWN_TIMEOUT_MS` | Worker shutdown timeout |
| `AWS_REGION` | S3 region |
| `AWS_ACCESS_KEY_ID` | S3 upload key |
| `AWS_SECRET_ACCESS_KEY` | S3 upload secret |
| `AWS_S3_BUCKET_NAME` | Artifact bucket |
| `LOG_BATCH_SIZE` | Log batch row limit |
| `LOG_BATCH_MAX_BYTES` | Log batch byte limit |
| `LOG_FLUSH_INTERVAL_MS` | Log flush interval |

### `s3-reverse-proxy/.env`

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection for subdomain lookup |
| `BASE_URL` | Public S3 origin ending in `/__outputs` |

The current bucket name contains a dot, so use the path-style S3 URL:

```env
BASE_URL=https://s3.ap-south-2.amazonaws.com/vercel.kishore/__outputs
```

Virtual-hosted URLs such as `https://vercel.kishore.s3.ap-south-2.amazonaws.com`
fail TLS certificate validation because of the dotted bucket name.

### `frontend/.env.local`

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_API_URL` | API base URL |
| `NEXT_PUBLIC_S3_PROXY_URL` | Base URL used to build live-site links |

Example:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_S3_PROXY_URL=http://localhost:8000
```

## Usage

1. Register or log in at `/auth`.
2. Create a project with a public GitHub URL:

   ```text
   https://github.com/<user>/<repo>
   ```

3. Open the project and click **Deploy**.
4. Watch the deployment logs and status.
5. Open the generated live URL, for example:

   ```text
   http://bright-screeching-salesclerk.localhost:8000
   ```

The S3 proxy resolves the project from the first hostname label and serves:

```text
__outputs/<projectId>/<file>
```

It also supports path mode for environments where nested subdomains are not
available:

```text
https://<proxy-host>/site/<subdomain>
```

## Deployment Statuses

| Status | Meaning |
| --- | --- |
| `QUEUED` | Deployment created and build job enqueued |
| `IN_PROGRESS` | Worker started the sandbox |
| `READY` | Build output uploaded to S3 |
| `FAIL` | Build, timeout, or infrastructure failure |

If a build job dies without publishing a terminal status, the API's
`QueueEvents` handler marks the deployment `FAIL`.

## API Reference

All project routes require authentication:

```http
Authorization: <jwt-token>
```

`Bearer <jwt-token>` is also accepted.

### Auth

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/user/register` | `{ "username": "...", "password": "..." }` |
| `POST` | `/user/login` | `{ "username": "...", "password": "..." }` |
| `GET` | `/user/getProjects` | — |

### Projects and deployments

| Method | Path | Body |
| --- | --- | --- |
| `POST` | `/project` | `{ "name": "...", "gitURL": "https://github.com/..." }` |
| `POST` | `/project/deploy` | `{ "projectId": "..." }` |
| `GET` | `/project/logs/:deploymentId` | — |
| `GET` | `/health` | — |

Project creation only accepts public `https://github.com/...` repository URLs.
Private repositories are out of scope.

## Build Sandbox

The sandbox image is defined in `build-server/Dockerfile` and runs
`build-server/sandbox.js` as a non-root user.

It receives only:

- `GIT_REPOSITORY_URL`
- `PROJECT_ID`
- `DEPLOYMENT_ID`
- `HOME`
- `NPM_CONFIG_CACHE`
- `CI=true`

It does **not** receive:

- Redis URL
- S3 credentials
- Database URL
- ClickHouse credentials
- Docker socket
- API JWT secret

The sandbox:

- Clones the repository with `git clone --depth 1`
- Runs `npm install --include=dev`
- Runs `npm run build`
- Writes output to `/home/app/output/dist`

The worker extracts that directory through the Docker archive API after the
container exits.

## Security Notes

- Sandbox containers run as UID/GID `1000:1000`.
- `CapDrop: ["ALL"]` is applied.
- `no-new-privileges` is applied.
- Memory, CPU, and PID limits are applied.
- The sandbox uses a dedicated `vercel-builds` Docker network.
- The worker is the only component with the Docker socket.
- The worker validates build jobs against the public GitHub URL rule.
- Build output archives are checked for path traversal and symlinks before
  upload.

The sandbox still has normal outbound internet access so it can clone
repositories and install packages. For stronger isolation, add an egress
firewall or filtering proxy. That is not included in this version.

## Operations

### View logs

```bash
docker compose logs -f api-server
docker compose logs -f builder-worker
docker compose logs -f s3-reverse-proxy
docker compose logs -f redis clickhouse
```

### Rebuild after changes

API or worker code:

```bash
docker compose up -d --build api-server builder-worker
```

Sandbox code:

```bash
docker build -t vercel-builder:local ./build-server
```

The next build uses the new image. The worker does not need a restart.

S3 reverse proxy code:

```bash
docker compose up -d --build s3-reverse-proxy
```

Environment changes:

```bash
docker compose up -d --force-recreate api-server builder-worker s3-reverse-proxy
```

`docker compose restart` does not reload changed env values.

### Stop the stack

```bash
docker compose down
```

To also delete Redis and ClickHouse data:

```bash
docker compose down -v
```

## Troubleshooting

### Live URL returns `500 Internal Server Error`

Check the S3 proxy logs:

```bash
docker compose logs s3-reverse-proxy
```

The usual cause is a missing or incorrect `BASE_URL` in
`s3-reverse-proxy/.env`. It must point at the public S3 origin and end with
`/__outputs`.

### Live URL returns `404 project not found`

The subdomain in the URL does not match a project `subDomain` in PostgreSQL.

### Build fails immediately

Check:

```bash
docker compose logs builder-worker
```

Common causes:

- Repository URL is not public GitHub
- No `package.json`
- No `build` script
- Build does not produce `dist`
- `vercel-builder:local` image is missing
- S3 credentials are invalid

Rebuild the sandbox image if needed:

```bash
docker build -t vercel-builder:local ./build-server
```

### Deployment stays `QUEUED`

The worker may not be running or may not be connected to the same Redis:

```bash
docker compose ps
docker compose logs builder-worker
docker compose logs api-server
```

### Deployment stays `IN_PROGRESS`

Check whether the builder worker is alive and whether the final log/status batch
reached Redis. A killed worker should be corrected to `FAIL` by the API's
`QueueEvents` fallback.

### Frontend cannot reach the API

Confirm `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
```

Restart the Next.js dev server after changing env values:

```bash
cd frontend
npm run dev
```

Also verify:

```bash
curl http://localhost:8001/health
```

### CORS errors

Add the frontend origin to `FRONTEND_URL` / `CLIENT_URL` in `api-server/.env`.
`http://localhost:3000` is allowed by default for local development.

## Production

`docker-compose.prod.yml` expects prebuilt images for the API and S3 proxy, and
builds the worker image from source. It assumes managed PostgreSQL, Redis, and
ClickHouse.

Production checklist:

1. Build and push the API, worker, and S3 proxy images.
2. Build `vercel-builder:local` on the Docker host, or set `BUILDER_IMAGE` to a
   registry image available to that Docker daemon.
3. Mount `/var/run/docker.sock` into the worker.
4. Configure `DATABASE_URL`, `REDIS_URL`, ClickHouse, AWS, and S3 values.
5. Configure `BASE_URL` for the public S3 origin.
6. Make uploaded S3 objects publicly readable, or add signed-URL support.
7. Put the API and S3 proxy behind a TLS reverse proxy.
8. Set `FRONTEND_URL` and `CLIENT_URL` to the deployed frontend origin.
9. Run exactly one builder worker with concurrency `1`.

Start production Compose:

```bash
docker compose -f docker-compose.prod.yml up -d
```

## Current Limitations

- Public GitHub repositories only; private repositories are not supported.
- Build output must be in `dist`.
- Builder concurrency is fixed at `1`.
- One builder worker is assumed per Docker host.
- No automatic deployment on Git push.
- No rollback or per-deployment artifact versioning.
- Custom domains are stored in the schema but not routed by the S3 proxy.
- Builds run on the local Docker host; the previous ECS/Fargate path has been
  removed.
