# Carbon Trading Platform — Project Context

## Repository
- GitHub: https://github.com/Atom1250/carbon-trading-platform
- Stack: Nx 22 monorepo · Node.js 18.20.8 (Homebrew) · TypeScript · Express 4 · PostgreSQL · Redis

## Environment
- Node: `/opt/homebrew/opt/node@18/bin/node`
- Run NX with: `NX_DAEMON=false NX_SOCKET_DIR=/tmp/nx-tmp npx nx ...`

---

## Session History

### Session 1.1 — Project Initialization & Tooling
- Nx 22 workspace scaffolded at `carbon-trading-platform/`
- SWC + Jest configured monorepo-wide
- commitlint + husky pre-commit hooks (scope-enum enforced)
- Commit: `feat(session): session 1.1 - project initialization & tooling`

### Session 1.2 — Database Schema & Client (`libs/database`)
- 10 PostgreSQL migrations in `libs/database/src/migrations/`
- `DatabaseClient` wrapper (query, transaction, healthCheck, end)
- 16 unit tests, 100% coverage
- Commit: `feat(database): session 1.2 - schema migrations and database client`

### Session 1.3 — Core Libraries
- `libs/logger` — Winston `createLogger(service)` → `ILogger`
- `libs/errors` — `ApplicationError` hierarchy (Validation/NotFound/Auth/etc.), RFC 7807-ready
- `libs/config` — Zod-validated `loadConfig()` + `parseCorsOrigins()`
- `libs/common` — Shared TypeScript types (ApiResponse, PaginatedResponse, BaseEntity, etc.)
- 88 tests total, 100% coverage
- Commit: `feat(session): session 1.3 - core libraries`

### Session 1.4 — API Gateway Foundation (`apps/api-gateway`)
- Express factory `createApp(deps)` with injectable dependencies for testability
- Middleware stack: helmet → cors → body-parsing → X-Request-ID → logging → routes → 404 → errorHandler
- `GET /health` — liveness probe (always 200)
- `GET /health/detailed` — readiness probe (checks DB + Redis, returns 503 on failure)
- RFC 7807 Problem Details error handler (never leaks stack traces)
- 49 tests, 100% statement/function/line coverage
- **Key lesson:** SWC does NOT hoist `mock`-prefixed variables like babel-jest does. Use `jest.mock` factory with internal instance + `jest.requireMock(mod).__instance` to get external reference.
- **Key fix:** Express 4 async route handlers must call `next(err)` (not `throw`) — wrap in try/catch.
- Commit: `feat(api-gateway): session 1.4 - api gateway foundation`

---

## Current Project Structure

```
apps/
  api-gateway/
    src/
      app.ts                    # Express factory
      server.ts                 # Runtime entry (excluded from coverage)
      index.ts                  # Public API
      middleware/
        requestId.ts            # X-Request-ID propagation
        logging.ts              # HTTP access log (Winston)
        errorHandler.ts         # RFC 7807 global error handler
      routes/
        health.routes.ts        # GET /health, GET /health/detailed
      types/
        express.d.ts            # Augments Request with requestId
libs/
  logger/src/                   # createLogger(service) → ILogger
  errors/src/                   # ApplicationError hierarchy + isOperationalError
  config/src/                   # Zod config (loadConfig, parseCorsOrigins)
  common/src/                   # Shared TS types
  database/src/                 # DatabaseClient + 10 migrations
```

## Test Summary (cumulative)
| Project       | Tests | Coverage |
|---------------|-------|----------|
| api-gateway   | 49    | 100% stmt/fn/line, 86% branch |
| errors        | 25    | 100%     |
| logger        | 11    | 100%     |
| config        | 22    | 100%     |
| common        | 14    | 100%     |
| database      | 16    | 100%     |
| **Total**     | **137** |        |

---

## Conventions
- All errors extend `ApplicationError` from `@libs/errors`; error handler uses `isOperationalError()` to decide 500 vs real statusCode
- CORS: whitelist-only via `parseCorsOrigins()`, never `*`
- All async Express route handlers: try/catch + `next(err)`, never bare `throw`
- Commit scopes: `session`, `api-gateway`, `database`, `logger`, `errors`, `config`, `common`
