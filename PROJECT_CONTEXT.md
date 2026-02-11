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

### Session 1.5 — Smart Contract Foundation (`contracts/`)
- Standalone Hardhat project in `contracts/` (NOT in Nx workspace — Hardhat has its own pipeline)
- `PlatformAssets.sol` — ERC-1155 multi-token contract (OpenZeppelin v4.9.x):
  - Roles: `DEFAULT_ADMIN_ROLE`, `MINTER_ROLE`, `PAUSER_ROLE` (AccessControl)
  - KYC registry: `_kycApproved` mapping; enforced on all peer transfers via `_beforeTokenTransfer`
  - `mint(to, tokenId, amount, tokenURI, data)` — requires KYC + MINTER_ROLE, stores per-token URI
  - `mintBatch(to, tokenIds, amounts, data)` — batch mint with KYC check
  - `burn(from, tokenId, amount)` — owner/approved only, emits AssetBurned (carbon credit retirement)
  - `approveKYC` / `revokeKYC` — admin only; mints/burns exempt from KYC check on zero-address side
  - `pause()` / `unpause()` — PAUSER_ROLE gates all state-changing operations
- Solidity 0.8.20, optimizer 200 runs; Hardhat chainId 31337
- 20 tests (ethers v6 + chai): Deployment × 2, Minting × 5, KYC Management × 6, Burning × 4, Pause/Unpause × 2 — all passing
- **Key decision:** OZ v4 (not v5) because execution plan uses `_beforeTokenTransfer` + `security/Pausable` (v4 API)
- Commit: `feat(blockchain): session 1.4 - smart contract foundation`

### Session 2.0 — Missing DB Migrations (Rebase)
- Added 4 migrations required for Phase 2 auth features:
  - **0011** `login_attempts` — tracks all login attempts (email, ip_address, success, failure_reason, attempted_at); composite partial index `WHERE success = FALSE`
  - **0012** `email_verification_tokens` — one-per-user enforced via `UNIQUE INDEX WHERE used_at IS NULL`; `ON DELETE CASCADE` on user_id FK
  - **0013** `password_reset_tokens` — trigger `check_password_reset_token_limit()` limits to 3 active tokens per user; partial index `WHERE used_at IS NULL`
  - **0014** `session_cleanup_index` — plain indexes on `sessions(expires_at)` and `sessions(user_id, is_revoked)`
- 25 migration unit tests (SQL structure assertions via mock pgm — no live DB required)
- **Confirmed column names:** `has_verified_email` (not `email_verified`); role enum = `developer | investor | compliance_officer | operations`
- Migration file format: `.js` with `exports.up = (pgm) => { pgm.sql(...) }` / `exports.down`
- Commit: `feat(database): session 2.0 - add migrations 0011-0014`

### Session 2.2 — Institution Service (`apps/institution-service`)
- New Nx Express app `apps/institution-service` (port 3003), `createApp(deps)` DI pattern
- `InstitutionService` — `create` (ConflictError on dup reg number), `findById` (NotFoundError 404), `update` (tier/status), `list` (status/tier/countryCode filters + limit/offset pagination)
- Dynamic parameterised queries using `filterValues.length + 1` for safe LIMIT/OFFSET numbering
- `countryCode` auto-uppercased via Zod `.transform()` on create and list
- Endpoints: `POST /institutions` (201), `GET /institutions` (200 + metadata), `GET /institutions/:id` (200/404), `PATCH /institutions/:id` (200/404/422), `GET /health`
- 40 tests: 17 service (all CRUD + filter + error paths), 23 route (supertest, makeService factory)
- Commit: `feat(institution): session 2.2 - institution service`

### Session 2.1 — Authentication Service (`apps/auth-service`)
- Standalone Nx Express app with dependency-injected services (`createApp(deps)` pattern)
- `TokenService` — JWT access tokens (15m) + refresh tokens (7d); `issuer`/`audience` claims; throws `AuthenticationError` on invalid/expired
- `AuthService` — bcrypt login (12 rounds), refresh token rotation (SHA-256 hash in `sessions.refresh_token_hash`), logout, MFA verification
- `MFAService` — speakeasy TOTP setup (returns secret + QR code data URL), verify (±1 window), enable
- `authenticate` middleware — factory pattern; extracts Bearer token → `req.user: TokenPayload`
- Routes: `POST /auth/login|refresh|logout|mfa/verify|mfa/setup|mfa/enable`; Zod body validation; RFC 7807 errors
- **Key decision:** Refresh tokens stored as SHA-256 hash in DB (`sessions.refresh_token_hash`) — matches migration 0004 column name
- **DB column names (migration 0003/0004):** `has_enabled_mfa`, `mfa_secret`, `refresh_token_hash`, `is_revoked`
- 50 tests, 6 suites, 100% stmt/fn/line coverage
- Deps added at root: `jsonwebtoken`, `bcrypt`, `speakeasy`, `qrcode` + `@types/*`
- Commit: `feat(auth): session 2.1 - authentication service`

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
  database/src/                 # DatabaseClient + migration tests
  database/migrations/          # 14 migration files (0001-0014, .js format)
apps/
  institution-service/
    src/
      app.ts                    # Express factory (createApp)
      server.ts                 # Runtime entry
      index.ts                  # Public API
      middleware/               # requestId, logging, errorHandler (per-app)
      routes/
        institution.routes.ts   # POST/GET/PATCH /institutions
      services/
        InstitutionService.ts   # create, findById, update, list
      types/
        institution.types.ts    # Institution, DTOs, query types
contracts/                      # Standalone Hardhat project (NOT in Nx)
  contracts/
    PlatformAssets.sol          # ERC-1155 with KYC, AccessControl, Pausable
  test/
    PlatformAssets.test.ts      # 20 Hardhat tests
  hardhat.config.ts
  package.json
```

## Test Summary (cumulative)
| Project            | Tests | Coverage |
|--------------------|-------|----------|
| api-gateway        | 49    | 100% stmt/fn/line, 86% branch |
| errors             | 25    | 100%     |
| logger             | 11    | 100%     |
| config             | 22    | 100%     |
| common             | 14    | 100%     |
| database           | 41    | 100%     |
| auth-service       | 50    | 100% stmt/fn/line |
| institution-service| 40    | 100% stmt/fn/line |
| contracts (Hardhat)| 20    | N/A      |
| **Total**          | **252** |        |

---

## Conventions
- All errors extend `ApplicationError` from `@libs/errors`; error handler uses `isOperationalError()` to decide 500 vs real statusCode
- CORS: whitelist-only via `parseCorsOrigins()`, never `*`
- All async Express route handlers: try/catch + `next(err)`, never bare `throw`
- Commit scopes: `session`, `api-gateway`, `auth`, `database`, `logger`, `errors`, `config`, `common`, `blockchain`, `institution`
- Migration format: `.js` files in `libs/database/migrations/`, using `exports.up = (pgm) => { pgm.sql(...) }`
- Error classes: use specific subclasses (`NotFoundError`, `ConflictError`, `AuthenticationError`, etc.) not `ApplicationError` with statusCode options
- No `errorHandler` in `@libs/errors` — lives in each app's own `src/middleware/errorHandler.ts`
- No shared middleware in `@libs/common` — each app has its own `requestId.ts`, `logging.ts`, `errorHandler.ts`
