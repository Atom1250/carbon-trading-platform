# Developer Guide

## Local Setup
```bash
npm ci
npm run migrate:up
npm run test
```

## Core Test Gates
```bash
npx nx test @carbon-trading-platform/web-app
npx nx test @carbon-trading-platform/ledger-service
npx nx test @carbon-trading-platform/trading-service
npx nx run @carbon-trading-platform/carbon-trading-platform-e2e:e2e
```

## Contribution Rules
- Keep changes scoped by session objective.
- Add/adjust tests with every feature change.
- Do not regress existing gates.
