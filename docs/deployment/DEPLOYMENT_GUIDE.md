# Deployment Guide (AWS/GCP/Azure)

## Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Docker (optional local orchestration)

## Build and Validate
```bash
npm ci
npm run build
npm run migrate:up
npm run validate:final
```

## Environment Variables
- `DATABASE_URL`
- `REDIS_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `NODE_ENV`

## AWS Reference
1. Deploy services to ECS/Fargate.
2. Use RDS PostgreSQL and ElastiCache Redis.
3. Route traffic through ALB + API Gateway.
4. Store secrets in AWS Secrets Manager.

## GCP Reference
1. Deploy services to Cloud Run.
2. Use Cloud SQL PostgreSQL and Memorystore Redis.
3. Expose endpoints through Cloud Load Balancing.
4. Store secrets in Secret Manager.

## Azure Reference
1. Deploy services to Azure Container Apps.
2. Use Azure Database for PostgreSQL and Azure Cache for Redis.
3. Use Azure Front Door for edge routing.
4. Store secrets in Key Vault.

## Rollback
1. Revert application image tag.
2. Roll back database migration if necessary:
```bash
npm run migrate:down
```
3. Re-run smoke checks:
```bash
npx nx test @carbon-trading-platform/trading-service
npx nx test @carbon-trading-platform/ledger-service
```
