This project is for a deployment system (a Vercel-like clone).
Users can register, link GitHub repos, and deploy projects. The system runs builds inside AWS ECS, uploads static assets to S3, and serves them via a reverse proxy.

📌 Features

API Server

Handles user registration, project creation, and deployment triggers

Consumes Kafka logs and stores them in ClickHouse

Build Containers on AWS ECS

ECS tasks spin up dynamically when a user deploys a project

Build container clones GitHub repo, runs npm install && npm run build

Uploads build outputs to AWS S3

Publishes build logs to Kafka

Logs Streaming (via Short Polling)

Build containers → Kafka (logs)

API server → ClickHouse (stores logs)

Frontend polls API to fetch logs

Reverse Proxy

Maps subdomains to corresponding build outputs in S3

🏗️ Architecture

API Server  → Manages users, projects, deployments

Build Server (ECS Task) → Executes project builds inside AWS ECS

S3 Reverse Proxy  → Proxies subdomains/domains → S3 build artifacts

Kafka + ClickHouse → Scalable logging pipeline (producer → consumer → storage)

Log Flow

ECS build container publishes logs to Kafka

API server consumes logs from Kafka and inserts them into ClickHouse

Frontend fetches logs using short polling REST API
