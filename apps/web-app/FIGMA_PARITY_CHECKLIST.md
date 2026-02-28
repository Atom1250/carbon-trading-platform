# Figma Parity Checklist

`/figma/**` is a development preview surface only. Production UX is delivered through portal routes.

## Routing and shell parity
- [x] `/dashboard` uses the unified portal shell and nav.
- [x] `/trading` uses production trading components (not figma runtime routing).
- [x] `/admin/dashboard` uses production admin components.
- [x] `/onboarding` and `/project-owner` canonical aliases route into production portals.

## Design parity
- [x] Token source file exists: `design/tokens/figma.tokens.json`.
- [x] Generated CSS variables are consumed by `src/app/globals.css`.
- [x] Component mapping contract exists: `figma-component-contract.json`.

## Runtime guardrails
- [x] Middleware does not rewrite portal routes to `/figma`.
- [x] `/figma/**` requires `FIGMA_RUNTIME_ENABLED=true`.
- [x] `/figma/**` is disabled when `NODE_ENV=production`.

## Decommission readiness
- [ ] Remove `figma-source` and runtime dependencies after parity sign-off.
- [ ] Remove `/figma/**` route after two stable releases.
