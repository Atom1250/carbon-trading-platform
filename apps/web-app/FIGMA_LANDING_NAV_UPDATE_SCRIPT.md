# Figma Update Script — Landing Page + Navigation Framework

Use this script to patch or replace the existing Figma landing experience so it matches the implemented app shell and role-aware dashboard behavior.

## 1) Review Summary (Figma vs Implemented App)

Based on the current app implementation and available Figma source manifest:
- A unified role-aware `/dashboard` now exists in code and should become the primary platform home.
- Sidebar navigation is role-aware with `VISIBLE/GATED/HIDDEN` behavior.
- Gated destinations redirect to onboarding route.
- Command palette exists as a global modal (Ctrl/⌘ + K) with nav shortcuts.
- Landing content sections exist: Start Here, Quick Actions, Recent, Work Queue, Platform Health.

### Required alignment changes from prior spec
- Replace `/project-owner` with `/owner`.
- Replace `/onboarding` with `/onboarding/start`.
- Gated navigation and gated command results route to `/onboarding/start`.
- Preserve Admin Command Centre route as `/admin/dashboard`.

---

## 2) Figma Naming Contract (Do Not Rename)

Create/update these frames exactly:

### Core
- `LND-01 Dashboard`
- `NAV-01 Sidebar`
- `NAV-02 Breadcrumbs`
- `NAV-03 Command Palette`

### Persona variants
- `LND-02 Dashboard (Project Owner)`
- `LND-03 Dashboard (Investor)`
- `LND-04 Dashboard (Carbon Trader)`
- `LND-05 Dashboard (Admin)`

### Components
- `C-SidebarNav`
- `C-SidebarSectionHeader`
- `C-SidebarNavItem`
- `C-Breadcrumbs`
- `C-CommandPaletteModal`
- `C-CommandResultRow`
- `C-UserContextChip`
- `C-PageHeader`
- `C-HeroStartHere`
- `C-QuickActionsPanel`
- `C-QuickActionButton`
- `C-RecentPanel`
- `C-RecentRow`
- `C-WorkQueuePanel`
- `C-WorkQueueItem`
- `C-PlatformHealthPanel`
- `C-HealthMetricTile`

---

## 3) Route Map (Source of Truth)

Use these links/labels in Figma prototypes:
- `/dashboard`
- `/owner`
- `/owner/projects/new`
- `/investor`
- `/investor/search`
- `/trading`
- `/onboarding/start`
- `/admin/dashboard`

---

## 4) Sidebar Spec (NAV-01)

Build `C-SidebarNav` with sections and item behavior exactly:

### Sections
1. Core
- Dashboard -> `/dashboard` (VISIBLE all personas)

2. Projects
- Project Owner Portal -> `/owner`
  - Project Owner: VISIBLE
  - Investor: GATED
  - Carbon Trader: HIDDEN
  - Admin: VISIBLE
- Investor Portal -> `/investor`
  - Project Owner: GATED
  - Investor: VISIBLE
  - Carbon Trader: GATED
  - Admin: VISIBLE

3. Trading
- Carbon Trading (RFQ) -> `/trading`
  - Project Owner: GATED
  - Investor: VISIBLE
  - Carbon Trader: VISIBLE
  - Admin: VISIBLE

4. Onboarding
- Client Onboarding -> `/onboarding/start` (VISIBLE all personas)

5. Administration
- Admin Command Centre -> `/admin/dashboard`
  - Admin: VISIBLE
  - all others: HIDDEN

### Variant states for `C-SidebarNavItem`
- `state=visible`
- `state=gated` (shows outline badge text: `Request access`)
- `state=hidden` (not rendered in variants; documented only)
- `active=true|false`

---

## 5) Header/Breadcrumbs Spec (NAV-02)

Top row includes:
- Left: `C-Breadcrumbs` (single level on dashboard: `Dashboard`)
- Right: `C-UserContextChip` content pattern: `{name} · {persona}`

Page header beneath top row (`C-PageHeader`):
- Project Owner: `Project Owner Dashboard`
- Investor: `Investor Dashboard`
- Carbon Trader: `Carbon Trading Dashboard`
- Admin: `Admin Command Centre`

Subtitle should match operational intent, concise, no marketing copy.

---

## 6) Command Palette Spec (NAV-03)

`C-CommandPaletteModal`:
- Trigger hint: `Ctrl/⌘ + K`
- Input placeholder: `Search... (Projects, RFQs, Trades, Onboarding)`
- Empty state: `No results.`

Rows (`C-CommandResultRow`):
- Left: destination label
- Right: section tag (`Core`, `Projects`, `Trading`, `Onboarding`, `Administration`)
- Gated row variant includes `Request access` treatment and prototype link to `/onboarding/start`.

v1 scope in design should reflect implemented behavior:
- Navigation shortcuts only (no deep entity search yet)

---

## 7) Dashboard Layout Spec (LND-01)

Desktop composition:
- Sidebar fixed width: 280-300 px
- Main content with 3-column responsive grid
- Section order:
  1. Breadcrumb + user context
  2. Page header
  3. `C-HeroStartHere`
  4. Two-column content

Main content blocks:
- Left column:
  - `C-QuickActionsPanel`
  - `C-RecentPanel`
- Right column:
  - `C-WorkQueuePanel`
  - `C-PlatformHealthPanel`

`C-HeroStartHere` copy baseline:
- Title: `Start here`
- Body: mention `Ctrl/⌘ + K` for cross-module search

---

## 8) Persona Variant Content (LND-02..05)

### LND-02 Project Owner
Quick actions:
- Create a new project
- Complete onboarding
Work queue emphasis:
- Missing docs
- Investor Q&A response
- Readiness blockers

### LND-03 Investor
Quick actions:
- Search investment opportunities
- Browse carbon listings
- Complete onboarding
Work queue emphasis:
- Unanswered diligence questions
- RFQ/trade follow-ups

### LND-04 Carbon Trader
Quick actions:
- Browse carbon listings
- Open trading workflows
- Complete onboarding
Work queue emphasis:
- Quotes expiring
- Settlement evidence pending

### LND-05 Admin
Quick actions:
- Admin Command Centre
- Trading oversight
- Onboarding queue
Work queue emphasis:
- SLA breaches
- Blocked settlements
- Risk escalations

---

## 9) Patch-First Workflow (Preserve IDs)

1. Locate any existing landing/home/dashboard frames.
2. Rename to required `LND-*`/`NAV-*` names where possible.
3. Convert repeated structures into `C-*` components.
4. Apply variants for persona and gating states.
5. Update prototype links to corrected route map.
6. Only create new frames if existing frames cannot be safely patched.

Do not delete old frames unless duplication is unavoidable; preserve IDs for mapping stability.

---

## 10) Acceptance Checklist

- [ ] `LND-01..05` and `NAV-01..03` frames exist with exact names.
- [ ] Route labels/prototype links use `/owner` and `/onboarding/start`.
- [ ] Gated variant visibly marked `Request access`.
- [ ] Command palette modal, row, and empty states are present.
- [ ] Dashboard matches implemented section architecture.
- [ ] Persona variants reflect role-specific quick actions and work queue focus.

---

## 11) Optional Figma Make Prompt (Copy/Paste)

"Update the existing platform landing/dashboard to a role-aware framework. Patch existing frames instead of deleting nodes. Create or update frames named `LND-01 Dashboard`, `NAV-01 Sidebar`, `NAV-02 Breadcrumbs`, `NAV-03 Command Palette`, and persona variants `LND-02..05`. Use sections: Core, Projects, Trading, Onboarding, Administration. Implement nav item states visible/gated/hidden; gated items must show `Request access` and link to `/onboarding/start`. Use route links `/dashboard`, `/owner`, `/investor`, `/investor/search`, `/trading`, `/onboarding/start`, `/admin/dashboard`. Dashboard must include Start Here, Quick Actions, Recent, Work Queue, and Platform Health panels in a two-column content structure beside persistent sidebar."
