# Codex Implementation Plan - KYC/AML Onboarding

## New User Routes
- /onboarding/start
- /onboarding/institution/new
- /onboarding/institution/[caseId]/status
- /onboarding/person/join
- /onboarding/person/new
- /onboarding/person/[caseId]/status

## New Admin Routes
- /admin/onboarding
- /admin/onboarding/[caseId]
- /admin/onboarding/policies

## Build Order
1. Institutional wizard (RHF + zod).
2. Personal KYC wizard with invite-code linking.
3. Case status screens and resubmission loop.
4. Admin queue + case review tabs.
5. Deterministic readiness/progress model with blockers.

## Notes
- Backend calls are mocked in src/lib/onboarding/api.ts.
- Replace mocks with API routes or server actions later.
