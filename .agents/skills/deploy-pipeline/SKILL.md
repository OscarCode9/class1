---
name: deploy-pipeline
description: Automates the process of deploying updates to the class1 application server (EC2). Trigger this skill when the user wants to deploy, upload changes, publish updates, run the deployment pipeline, sync files to the server, or perform a deployment health check.
---

# Deploy Pipeline Skill

Use this skill to deploy changes from the local repository to the production server `3.144.31.234`.

## Pipeline Steps
This skill automates the following steps:
1. **Database Backup**: Performs a PostgreSQL database backup on the remote server using `pg_dump` and saves it to the `backups/` directory before any files are changed.
2. **Code Synchronization**: Uses `rsync` to sync local files to the server, excluding node modules, git directory, `.env` file, and other unnecessary files.
3. **Container Rebuild**: Runs `docker compose up -d --build` on the remote server to compile the updated code and launch the updated containers.
4. **Database Migration**: Sincroniza el esquema de la base de datos ejecutando `prisma db push` inside the `api` container.
5. **Health Checks**: Queries the public endpoints of the Frontend, API, and MCP services to verify they respond with `200 OK` (using HTTPS).

## How to Execute the Deployment
To run the deployment pipeline, execute the bundled script:
```bash
/Users/oscarcode/class1/.agents/skills/deploy-pipeline/scripts/deploy.sh
```

### Script Environment Variables (Optional)
The script supports custom configurations using environment variables:
* `PEM_KEY`: Path to the private key (defaults to `/Users/oscarcode/api-burritas/truck.pem`)
* `REMOTE_USER`: SSH user (defaults to `ubuntu`)
* `REMOTE_HOST`: SSH host IP (defaults to `3.144.31.234`)
* `REMOTE_DIR`: Remote directory path (defaults to `/home/ubuntu/class1`)

Example using custom key path:
```bash
PEM_KEY="/path/to/my-key.pem" /Users/oscarcode/class1/.agents/skills/deploy-pipeline/scripts/deploy.sh
```

## Post-Deployment Validation
Always check the console output of the script to verify that:
* The backup was successfully saved.
* Docker built and started the containers successfully.
* The 3 health checks returned `🟢 SALUDABLE (HTTP 200)`:
  - Frontend: `https://oscar.oventlabs.net/`
  - API: `https://api.oscar.oventlabs.net/api/v1/health`
  - MCP: `https://mcp.oscar.oventlabs.net/health`
