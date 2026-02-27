# Figma Design Spec - Unified Admin Command Centre (Amended to Match Build)

This version is aligned to the currently implemented admin build in `apps/web-app`.

## Route Mapping (authoritative)
- `ADM-01 Dashboard` -> `/admin/dashboard`
- `ADM-02 Tasks` -> `/admin/tasks`
- `ADM-03 Risk Monitor` -> `/admin/risk`
- `ADM-04 SLA Monitor` -> `/admin/sla`
- `ADM-05 Trade Oversight` -> `/admin/trading/trades/[tradeId]`
- `ADM-06 Document Control` -> `/admin/documents`
- `ADM-07 Disputes` -> `/admin/disputes`

Supporting admin trading routes also present:
- `/admin/trading`
- `/admin/trading/rfqs`
- `/admin/trading/trades`
- `/admin/trading/policies`
- `/admin/trading/disputes`

## Global Behavior (must be reflected in design)
- Realtime polling is active every `30s` for:
  - `/admin/dashboard`
  - `/admin/tasks`
  - `/admin/sla`
- A live badge strip is present on dashboard/tasks/sla:
  - `Open tasks`
  - `Critical`
  - `SLA breaches`
  - `last sync time`

---

## ADM-01 Dashboard

Current implemented KPI row:
- Open tasks
- Critical tasks
- High risk
- Settlement blockage
- SLA breaches

Panels:
- Risk alerts
- SLA breaches
- High priority tasks
- Settlement blockage monitor

Design note:
- Replace original KPI labels (`Active onboarding`, `Projects ready`, etc.) with the list above to match current build.

---

## ADM-02 Tasks

Table/card fields (implemented):
- Task title
- Object type (`ONBOARDING/PROJECT/RFQ/TRADE`)
- Object ID
- Priority (`LOW/MEDIUM/HIGH/CRITICAL`)
- Risk score
- SLA deadline
- Assigned admin
- Status (`OPEN/IN_PROGRESS/BLOCKED/COMPLETE`)
- Escalation flag

Implemented controls:
- Filter by object type
- SLA risk only toggle
- Bulk assign selected tasks
- Inline status update
- Escalation toggle

Design note:
- Include row selection checkboxes for bulk assignment workflow.

---

## ADM-03 Risk Monitor

Current implemented sections:
- High-risk onboarding list
- High-risk trades list
- High-risk projects list
- 7-day risk trend list

Design note:
- Your original chart requirement is valid as v2.
- For v1 parity, design list-first cards with optional chart variants.

---

## ADM-04 SLA Monitor

Current implemented metric cards:
- Avg KYC review time
- Avg trade settlement cycle
- RFQ response time
- Q&A response time

Current implemented table:
- SLA breaches:
  - object type
  - object ID
  - owner
  - due date
  - overdue hours

Design note:
- Keep chart variants optional (v2). Current build uses metrics + breach table.

---

## ADM-05 Trade Oversight

Current implemented layout:
- Settlement summary
  - counterparty
  - executed quantity/price
  - pending milestones
  - counterparty responsibility (`BUYER/SELLER/SHARED`)
- Blockage indicator panel
- Settlement timeline list
  - milestone status
  - updated by/time
  - admin override flag
  - evidence list

Design note:
- This route is admin-only and distinct from trader trade detail.

---

## ADM-06 Document Control

Current implemented issue model:
- Object type + object ID
- Document name
- Issue type:
  - `EXPIRING`
  - `MISSING_CRITICAL`
  - `UNVERIFIED_CLAIM`
- Due date (optional)
- Version

Design note:
- Replace original status set (`missing/approved/expired`) with issue-type chips above for parity.

---

## ADM-07 Disputes

Current implemented fields:
- Dispute ID
- Trade ID
- Dispute reason
- Evidence list
- Resolution status (`OPEN/UNDER_REVIEW/RESOLVED/ESCALATED`)
- Escalation notes
- Link to trade oversight

Design note:
- `Counterparty` and `escalation level` can be added in v2 once backend payload includes them.

---

## Component Naming (recommended for MCP mapping)
- `C-AdminLiveBadges`
- `C-AdminKpiTile`
- `C-AdminRiskAlertsPanel`
- `C-AdminSlaBreachPanel`
- `C-AdminTaskEngine`
- `C-AdminRiskList`
- `C-AdminRiskTrend`
- `C-AdminSlaMetricCards`
- `C-AdminTradeSettlementSummary`
- `C-AdminTradeBlockageIndicator`
- `C-AdminTradeTimeline`
- `C-AdminDocumentIssueTable`
- `C-AdminDisputesList`

## Figma Handoff Rules
- Keep frame names exactly `ADM-01` to `ADM-07`.
- Include desktop first (`1440`), then tablet (`1024`) for `ADM-01/02/05`.
- Add explicit empty/loading/error states for polled panels.
- Show polling freshness label in dashboard/tasks/sla headers.
