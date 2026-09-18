# Vercel-like Deployment Platform

This repository contains a small deployment platform inspired by Vercel. Users can create an account, connect a Git repository, start a deployment, follow build logs, and open the resulting static site through a generated project URL.

The platform builds projects in short-lived AWS ECS tasks, uploads the generated files to Amazon S3, and serves those files through an Express reverse proxy.

## Project Scope

Implemented functionality includes:

- User registration and login with JWT authentication.
- Project creation with a Git repository URL.
- One-click deployment from the dashboard.
- Git clone and `npm install && npm run build` inside an ECS build task.
- Upload of generated `dist` files to S3 under the project ID.
- Build log publishing through Kafka and persistence in ClickHouse.
- Deployment-log polling from the frontend.
- Project delivery through generated subdomains or Render-compatible `/site/:subDomain` paths.

This is currently a static-site deployment workflow. It does not yet provide automatic Git webhooks, framework-specific build detection, preview deployments, rollback controls, team permissions, custom-domain provisioning, or a server-side deployment queue.

## Architecture

```text
Next.js frontend
        |
        | REST API + JWT
        v
Express API server --------------> PostgreSQL
        |
        | RunTaskCommand
        v
AWS ECS build task
        |
        | clone repository
        | npm install && npm run build
        | upload dist/*
        v
Amazon S3 <----------------------- S3 reverse proxy <----- browser
                                      |
                                      +-- project lookup in PostgreSQL

ECS build task -> Kafka -> API consumer -> ClickHouse -> frontend polling
```

### Components

| Component | Location | Responsibility | Default port |
| --- | --- | --- | --- |
| Frontend | `frontend/` | Authentication, project dashboard, deployment controls, and logs UI | `3000` |
| API server | `api-server/` | Auth, projects, deployment requests, ECS task creation, Kafka consumer, and log API | `8001` |
| Build server | `build-server/` | ECS task image that clones and builds a repository, uploads artifacts, and publishes logs | ECS task |
| S3 reverse proxy | `s3-reverse-proxy/` | Maps a project subdomain/path to its S3 artifact directory | `8000` |

## Prerequisites

For a complete deployment, provide:

- Node.js 20 or newer.
- PostgreSQL for users, projects, and deployments.
- A Kafka-compatible broker and its TLS CA certificate.
- ClickHouse with a `log_events` table matching the fields queried by the API: `event_id`, `deployment_id`, `log`, and `timestamp`.
- An AWS S3 bucket for build artifacts.
- AWS ECS Fargate configuration with a task definition using the `build-server` image.
- AWS credentials with permissions to start ECS tasks and upload build files to S3.
- A Git repository that can be cloned by the build task and has a working `npm run build` script.

The API and reverse proxy use the same PostgreSQL schema. Run the migration from `api-server/`; the reverse proxy has its own generated Prisma client because it is deployed independently.

## Repository Setup

Install dependencies for each Node.js service:

```bash
cd api-server
npm ci
npx prisma generate
npx prisma migrate deploy

cd ../s3-reverse-proxy
npm ci
npx prisma generate

cd ../frontend
npm ci
```

Do not commit real `.env` files or credentials. Use the checked-in `api-server/.env.example` and `build-server/.env.example` as templates. The reverse proxy requires the same database connection and a `BASE_URL` value, documented below.

## Environment Variables

### Frontend: `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8001
NEXT_PUBLIC_S3_PROXY_URL=http://localhost:8000
```

`NEXT_PUBLIC_API_URL` is used for authentication, project, deployment, and log requests. `NEXT_PUBLIC_S3_PROXY_URL` is used to construct the live-project link.

### API server: `api-server/.env`

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string used by Prisma |
| `JWT_SECRET` | Secret used to sign and verify 7-day JWTs |
| `FRONTEND_URL` | Allowed frontend origin |
| `CLIENT_URL` | Optional additional allowed origin |
| `AWS_REGION` | AWS region for ECS and S3 |
| `AWS_ACCESS_KEY_ID` | AWS access key used by the API and passed to build tasks |
| `AWS_SECRET_ACCESS_KEY` | AWS secret used by the API and passed to build tasks |
| `AWS_S3_BUCKET_NAME` | Artifact bucket used by build tasks |
| `ECS_CLUSTER_ARN` | ECS cluster where build tasks run |
| `ECS_TASK_DEFINITION_ARN` | ECS task definition for the build server |
| `AWS_VPC_SUBNETS` | Comma-separated subnet IDs for Fargate networking |
| `AWS_SECURITY_GROUP` | Security group ID for Fargate networking |
| `KAFKA_BROKER` | Kafka broker address |
| `KAFKA_USERNAME` | Kafka SASL username |
| `KAFKA_PASSWORD` | Kafka SASL password |
| `CLICKHOUSE_HOST` | ClickHouse HTTP endpoint |
| `CLICKHOUSE_USERNAME` | ClickHouse username |
| `CLICKHOUSE_PASSWORD` | ClickHouse password |
| `CLICKHOUSE_DATABASE` | ClickHouse database name |

The API also expects `api-server/kafka.pem` to contain the Kafka CA certificate.

### Build task: ECS environment

The API passes these values to every ECS task:

```env
GIT_REPOSITORY_URL=<repository-url>
PROJECT_ID=<project-id>
DEPLOYMENT_ID=<deployment-id>
AWS_REGION=<aws-region>
AWS_ACCESS_KEY_ID=<aws-access-key>
AWS_SECRET_ACCESS_KEY=<aws-secret-key>
AWS_S3_BUCKET_NAME=<bucket-name>
KAFKA_BROKER=<broker>
KAFKA_USERNAME=<username>
KAFKA_PASSWORD=<password>
```

The build image also needs the Kafka CA certificate at `build-server/kafka.pem`. Its image entrypoint clones `GIT_REPOSITORY_URL` into `/home/app/output` and then runs the build script.

### S3 reverse proxy: `s3-reverse-proxy/.env`

```env
DATABASE_URL=<same-postgresql-connection-string>
BASE_URL=https://s3.<region>.amazonaws.com/<bucket>/__outputs
```

`BASE_URL` must point to the S3 prefix containing project artifacts. The proxy appends the project ID and forwards requests such as `/index.html` and `/assets/...` to that location.

## Running Locally

Start the API server:

```bash
cd api-server
npm run dev
```

Start the reverse proxy in another terminal:

```bash
cd s3-reverse-proxy
npm run dev
```

Start the frontend in a third terminal:

```bash
cd frontend
npm run dev
```

Open `http://localhost:3000`. The API health endpoint is available at `http://localhost:8001/health`.

The local API still starts its Kafka consumer, so Kafka, ClickHouse, PostgreSQL, and the required environment variables must be reachable even when testing only the UI.

## Docker Compose

The root `docker-compose.yml` builds and runs the API and reverse proxy. It does not run the Next.js frontend, PostgreSQL, Kafka, ClickHouse, or the ECS builder locally.

```bash
docker compose up --build
```

The compose services load environment files from `api-server/.env` and `s3-reverse-proxy/.env`, and expose:

- API server: `http://localhost:8001`
- S3 reverse proxy: `http://localhost:8000`

The production compose file uses published Docker Hub images instead:

```bash
docker compose -f docker-compose.prod.yml up -d
```

Set `DOCKERHUB_USERNAME` when the images are published under a different Docker Hub account.

## Deployment Flow

1. A user registers or logs in through the frontend.
2. The frontend creates a project with a Git URL. The API generates a random project subdomain.
3. Clicking **Deploy Project** creates a deployment record and starts one Fargate task through ECS.
4. The ECS task clones the repository and runs `npm install && npm run build`.
5. Every build log is published to the Kafka `container-logs` topic.
6. The API Kafka consumer writes logs to ClickHouse.
7. The frontend polls `GET /project/logs/:id` until it sees `All files uploaded successfully`.
8. The build task uploads every file under `dist/` to `__outputs/<project-id>/` in S3.
9. The live-project link routes through the reverse proxy, which looks up the project and forwards the request to its S3 prefix.

For Render's free tier, the frontend uses a path-based URL such as:

```text
https://<proxy-host>/site/<project-subdomain>
```

The proxy strips `/site/<project-subdomain>` before forwarding. Asset requests from that page, including absolute `/assets/...` requests, are resolved using the page referrer.

## API Reference

All `/project` routes and the protected project-list route require an `Authorization` header containing the JWT returned by login.

### Public endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/health` | API health and uptime |
| `POST` | `/user/register` | Create a user |
| `POST` | `/user/login` | Authenticate and receive a JWT |

### Authenticated endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/user/getProjects` | List the authenticated user's projects |
| `POST` | `/project` | Create a project from a Git URL |
| `POST` | `/project/deploy` | Queue a deployment and start an ECS task |
| `GET` | `/project/logs/:deploymentId` | Read deployment logs from ClickHouse |

Example deployment request:

```bash
curl -X POST http://localhost:8001/project/deploy \
  -H "Authorization: <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"projectId":"<project-id>"}'
```

## Build Contract

The current builder assumes the source repository:

- Can be cloned with the URL supplied to the project.
- Uses npm dependencies and has a valid `package.json`.
- Defines an `npm run build` script.
- Writes the deployable static output to a root-level `dist/` directory.

The builder does not currently install pnpm, yarn, Bun, or framework-specific adapters. Server-rendered applications are not supported by the S3 delivery path.

## Security Notes

- Never commit database URLs, JWT secrets, AWS credentials, Kafka credentials, or ClickHouse credentials.
- Use an IAM role for ECS tasks instead of long-lived AWS keys where possible.
- The current API passes AWS and Kafka credentials into ECS task environment variables; restrict task and bucket permissions accordingly.
- Keep the S3 bucket private when possible and expose artifacts only through the proxy.
- Rotate any credentials that have been exposed in logs, local files, or public deployments.

## Troubleshooting

### Live site returns `404` for `/assets/...`

Confirm that the reverse proxy is running the current code and that the request is opened from a `/site/<subdomain>` page. The proxy uses the page referrer to map absolute asset paths back to the project.

### Deployment logs never complete

Check ECS task logs, Kafka connectivity, the `container-logs` topic, ClickHouse credentials, and the `log_events` table. The frontend considers a deployment complete only after receiving `All files uploaded successfully`.

### Deployment fails before the ECS task starts

Verify the API has all ECS variables, valid subnet and security-group IDs, a reachable task-definition image, and permission to call `ecs:RunTask`.

### Project builds but the live site is empty

Verify the repository creates `dist/` at the project root. The builder uploads only files found in that directory.

## Development Notes

- The API uses Prisma migrations in `api-server/prisma/migrations`.
- The reverse proxy has a separate Prisma schema/client directory because it is built and deployed independently.
- There are no automated application tests currently included in the repository.
- `frontend/.next` and service `node_modules` directories are generated artifacts and should not be committed.
