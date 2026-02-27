# ADR-002: Request Security Controls

## Status
Accepted

## Context
API endpoints require consistent defense-in-depth behavior.

## Decision
Enforce layered controls in service app bootstraps: helmet/CSP, global rate limiting, request IDs, request logging, and CSRF validation for cookie-backed state-changing requests.

## Consequences
- Stronger baseline security posture.
- Additional tuning needed for rate-limit thresholds in production.
