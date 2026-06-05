---
name: docker-infrastructure
description: Document, generate, and manage the Docker container infrastructure for the project. Use this skill when the user asks to containerize the application, set up Dockerfiles, create a docker-compose.yml file, configure PostgreSQL database containers, or run/configure dev/prod environments using Docker.
---

# Docker Infrastructure

Comprehensive guidelines, templates, and best practices for managing and deploying the project's Docker container infrastructure. This architecture orchestrates three core services:
1. **API (Backend)**: Built with Bun runtime for maximum performance.
2. **Frontend (Web)**: Vite-powered React application served via Nginx.
3. **Database (PostgreSQL)**: Latest stable PostgreSQL release with persistence.

---

## Service Specifications

### 1. API (Backend)
- **Base Image**: `oven/bun:1.1-alpine` (or latest stable alpine tag)
- **Port**: `3000`
- **Environment**: Node/Bun environment variables, Database credentials.
- **Configuration**: Exposes endpoint `/api/v1/...`

### 2. Frontend
- **Base Image**: `oven/bun:1.1-alpine` (for building) & `nginx:stable-alpine` (for serving)
- **Port**: `80` (HTTP) mapped to host port as needed (e.g., `8080` or `80`).
- **Nginx Configuration**: Configured to support Single Page Application (SPA) routing by redirecting all fallback requests to `index.html`.

### 3. Database
- **Base Image**: `postgres:17-alpine` (latest stable major version)
- **Port**: `5432`
- **Volume**: `postgres_data` mapped to `/var/lib/postgresql/data` for data durability.

---

## Infrastructure Templates

### docker-compose.yml

```yaml
version: '3.8'

services:
  db:
    image: postgres:17-alpine
    container_name: class1-db
    restart: always
    environment:
      POSTGRES_USER: ${DB_USER:-postgres}
      POSTGRES_PASSWORD: ${DB_PASSWORD:-postgres_secure_pass}
      POSTGRES_DB: ${DB_NAME:-class1_db}
    ports:
      - "${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} -d $${POSTGRES_DB}"]
      interval: 5s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  api:
    build:
      context: .
      dockerfile: Dockerfile.api
    container_name: class1-api
    restart: always
    ports:
      - "${PORT:-3000}:3000"
    environment:
      NODE_ENV: production
      PORT: 3000
      DB_HOST: db
      DB_PORT: 5432
      DB_USER: ${DB_USER:-postgres}
      DB_PASSWORD: ${DB_PASSWORD:-postgres_secure_pass}
      DB_NAME: ${DB_NAME:-class1_db}
      ACCESS_TOKEN_SECRET: ${ACCESS_TOKEN_SECRET:-dev-access-token-secret}
    depends_on:
      db:
        condition: service_healthy
    networks:
      - app-network

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    container_name: class1-frontend
    restart: always
    ports:
      - "${FRONTEND_PORT:-80}:80"
    depends_on:
      - api
    networks:
      - app-network

volumes:
  postgres_data:
    driver: local

networks:
  app-network:
    driver: bridge
```

### Dockerfile.api (Root Directory)

```dockerfile
# Multi-stage build for Bun Backend
FROM oven/bun:1.1-alpine AS base
WORKDIR /usr/src/app

# Install dependencies
FROM base AS install
RUN mkdir -p /temp/dev
COPY package.json bun.lock /temp/dev/
RUN cd /temp/dev && bun install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json bun.lock /temp/prod/
RUN cd /temp/prod && bun install --frozen-lockfile --production

# Build source code
FROM base AS prerelease
COPY --from=install /temp/dev/node_modules node_modules
COPY . .
# Run typechecking/build if applicable
RUN bun run typecheck

# Production stage
FROM base AS release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=prerelease /usr/src/app/src src
COPY --from=prerelease /usr/src/app/package.json package.json
COPY --from=prerelease /usr/src/app/tsconfig.json tsconfig.json

# Run as non-root user
USER bun
EXPOSE 3000/tcp
ENTRYPOINT [ "bun", "run", "start" ]
```

### Dockerfile.frontend (frontend/ Directory)

```dockerfile
# Stage 1: Build the React Application
FROM oven/bun:1.1-alpine AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile
COPY . .
RUN bun run build

# Stage 2: Serve using Nginx
FROM nginx:stable-alpine
COPY --from=builder /app/dist /usr/share/nginx/html
# Custom nginx config to handle SPA routing
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

### nginx.conf (frontend/ Directory)

```nginx
server {
    listen 80;
    server_name localhost;

    location / {
        root /usr/share/nginx/html;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
    }

    # Proxy API requests to backend container
    location /api {
        proxy_pass http://api:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

---

## Reference Environment File (`.env`)

Create a `.env` file in the root folder with the following variables before running `docker-compose`:

```env
# Database Configuration
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres_secure_pass
DB_NAME=class1_db

# API Configuration
PORT=3000
ACCESS_TOKEN_SECRET=some-ultra-secure-key-change-me-in-production

# Frontend Configuration
FRONTEND_PORT=80
```

---

## Commands and Workflow

### Build and Start Containers
```bash
docker-compose up --build -d
```

### Stop Containers
```bash
docker-compose down
```

### Remove Containers and Volumes (Clean Reset)
```bash
docker-compose down -v
```

### View Live Logs
```bash
docker-compose logs -f
```

### Shell Access to Database
```bash
docker-compose exec db psql -U postgres -d class1_db
```
