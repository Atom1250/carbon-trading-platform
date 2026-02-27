# Operations Runbook

## SLO Targets
- API latency: p95 < 500ms
- Web page load: p95 < 2s
- Availability: 99.9%

## Daily Checks
1. Check service health endpoints.
2. Review failed jobs and reconciliation mismatches.
3. Verify rate-limit and security warning volumes.

## Incident Response
1. Identify impacted service and scope.
2. Mitigate user impact (feature flag, scale-up, traffic shift).
3. Collect logs by `X-Request-ID`.
4. Patch and redeploy.
5. Run post-incident review within 48 hours.

## On-call Escalation
- P1: User-facing outage or settlement failure
- P2: Core workflow degradation
- P3: Non-critical defects

## Recovery Commands
```bash
npx nx test @carbon-trading-platform/web-app
npx nx test @carbon-trading-platform/ledger-service
npx nx test @carbon-trading-platform/trading-service
npx nx run @carbon-trading-platform/carbon-trading-platform-e2e:e2e
```
