# ADR-001: Service Decomposition

## Status
Accepted

## Context
The platform needs independent scaling and bounded ownership for auth, institution, asset, compliance, trading, and ledger domains.

## Decision
Use domain-oriented services behind a gateway boundary and shared typed libraries for config, errors, and logging.

## Consequences
- Better scaling isolation and release flexibility.
- Additional operational complexity and cross-service tracing requirements.
