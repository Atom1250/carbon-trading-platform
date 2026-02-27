# Codex GUI Plan - Project Owner Portal (Foundation -> Full Build)

## Goal
Implement Project Owner portal + Investor dataroom for 4 personas:
- Project Owner, Investor, Carbon Trader, Admin.

## Current State
This scaffold includes:
- Next.js App Router + TypeScript + Tailwind foundation
- Portal shell + routing + mock data
- Owner dashboard and project list placeholders

## Next Tasks
1. Implement 7-step Create Project Wizard with react-hook-form + zod.
2. Add required docs matrix and readiness scoring rules.
3. Build owner detail tabs (Overview, Tasks, Documents, Access, Q and A).
4. Build investor teaser + dataroom tabs with access gating.
5. Add carbon trader flow for offtake inquiries.
6. Build admin console for review queue, permissions, and audit.

## Figma MCP Hook
When frame IDs are confirmed, create `figma-mapping.json` and map frames to routes/components.
