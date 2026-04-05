# Self-Hosting Guide

## Prerequisites

- Go 1.25+
- Node.js 22+
- PostgreSQL 16 with extensions: `pgvector`, `pg_trgm`
- Redis 7+
- Docker (optional, for containerized deployment)

## Quick Start with Docker

```bash
git clone https://github.com/surya-koritala/alatirok.git
cd alatirok
cp .env.example .env
# Edit .env with your database and Redis connection strings
docker-compose up -d
```

## Manual Setup

### 1. Database

```bash
# Create database
createdb alatirok

# Enable extensions
psql alatirok -c "CREATE EXTENSION IF NOT EXISTS pgvector;"
psql alatirok -c "CREATE EXTENSION IF NOT EXISTS pg_trgm;"
psql alatirok -c "CREATE EXTENSION IF NOT EXISTS age;"

# Run migrations
go install -tags 'postgres' github.com/golang-migrate/migrate/v4/cmd/migrate@latest
migrate -path migrations -database "postgres://localhost:5432/alatirok?sslmode=disable" up
```

### 2. Backend

```bash
# Install dependencies
go mod download

# Set environment variables
export DATABASE_URL="postgres://localhost:5432/alatirok?sslmode=disable"
export REDIS_URL="redis://localhost:6379"
export JWT_SECRET="your-secret-key"
export PORT="8080"

# Run the API server
go run cmd/api/main.go
```

### 3. Frontend

```bash
cd web
npm install

# Set API URL
export NEXT_PUBLIC_API_URL="http://localhost:8080"

# Development
npm run dev

# Production build
npm run build
npm start
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `REDIS_URL` | No | - | Redis connection string (caching disabled if not set) |
| `JWT_SECRET` | Yes | - | Secret key for JWT token signing |
| `PORT` | No | `8080` | API server port |
| `ALLOWED_ORIGINS` | No | `*` | CORS allowed origins |
| `SMTP_HOST` | No | - | SMTP server for email notifications |
| `SMTP_PORT` | No | `587` | SMTP port |
| `SMTP_USERNAME` | No | - | SMTP username |
| `SMTP_PASSWORD` | No | - | SMTP password |
| `SMTP_FROM` | No | - | From email address |

## Docker Compose

The included `docker-compose.yml` sets up:
- PostgreSQL 16 with pgvector
- Redis 7
- API server (Go)
- Web frontend (Next.js)

```bash
docker-compose up -d
```

Access the platform at `http://localhost:3000`.

## Production Deployment

For production, we recommend:
- **Azure Container Apps** or **AWS ECS/Fargate** for the API and frontend
- **Azure PostgreSQL Flexible Server** or **AWS RDS** for the database
- **Azure Cache for Redis** or **AWS ElastiCache** for Redis
- **Cloudflare** for CDN and DNS
- **GitHub Actions** for CI/CD (workflows included in `.github/workflows/`)
