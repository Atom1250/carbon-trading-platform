# UAT Launch Guide (Local, One Command)

## Prerequisites
- Node.js `22.x` (`nvm use` in repo root)
- Docker Desktop running

## Start Full UAT Stack
From repository root:

```bash
npm run uat:compose:up
```

This command will:
1. Build the local UAT runtime image
2. Start PostgreSQL and Redis
3. Run pending DB migrations in container
4. Seed a test admin account in container
5. Start all backend services, API gateway, and web app

`uat-setup` is a one-off bootstrap job. It should finish with exit code `0` and then stop.
Check it with:

```bash
docker compose ps -a uat-setup
```

For local non-container process mode (legacy):

```bash
npm run uat:up
```

That mode will:
1. Start PostgreSQL and Redis
2. Run pending DB migrations
3. Seed a test admin account
4. Start all backend services, API gateway, and web app

## Service URLs
- Web app: `http://localhost:3000`
- API gateway: `http://localhost:3001`
- Auth service: `http://localhost:3002`
- Institution service: `http://localhost:3003`
- Asset service: `http://localhost:3004`
- Compliance service: `http://localhost:3005`
- Trading service: `http://localhost:3006`
- Ledger service: `http://localhost:3007`

If a host port is already in use, override at launch (example uses web on `3100`):

```bash
WEB_HOST_PORT=3100 npm run uat:compose:up
```

## Admin Test Account
Default seeded admin account:
- Email: `admin@uat.local`
- Password: `AdminPass123!`
- Role: `operations`

Override with env vars before `npm run uat:compose:up` (or `npm run uat:up` for legacy process mode):
- `ADMIN_EMAIL`
- `ADMIN_PASSWORD`
- `ADMIN_INSTITUTION_ID`
- `ADMIN_INSTITUTION_NAME`

## Admin Approval APIs
Use a bearer token from `/api/v1/auth/login` and then:

- List users:
  `GET /api/v1/auth/admin/users`
- Approve/activate user:
  `POST /api/v1/auth/admin/users/:id/approve`
- Deactivate user:
  `POST /api/v1/auth/admin/users/:id/deactivate`

These routes are restricted to `operations` role.

## Stop Stack
```bash
npm run uat:compose:down
```

View aggregated logs:

```bash
npm run uat:compose:logs
```
