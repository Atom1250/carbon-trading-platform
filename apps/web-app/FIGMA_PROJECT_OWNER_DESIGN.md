# Figma Project Owner Design Spec

## Purpose
Define the Figma design baseline for the Project Owner rebuild so implementation in `apps/web-app` matches design exactly.

## Product Scope (V1)
- Persona: `PROJECT_OWNER`
- Secondary surfaces in scope for shell consistency: `INVESTOR`, `ADMIN`
- Route baseline:
  - `/owner`
  - `/owner/projects`
  - `/owner/projects/new`
  - `/owner/projects/[projectId]`
  - `/owner/messages`
  - `/owner/documents`
  - `/owner/tasks`
  - `/owner/settings`
  - `/investor`
  - `/investor/projects/[projectId]`
  - `/admin`

## Figma File Structure
- Page: `00 Foundations`
  - `Color Tokens`
  - `Type Scale`
  - `Spacing`
  - `Grid`
- Page: `01 Components`
  - `Shell/Sidebar`
  - `Shell/Header`
  - `UI/Button`
  - `UI/Card`
  - `UI/Badge`
  - `UI/Progress`
  - `UI/Separator`
- Page: `02 Screens`
  - `Owner/Dashboard`
  - `Owner/Projects List`
  - `Owner/Create Project (Wizard Placeholder)`
  - `Owner/Project Detail`
  - `Owner/Messages`
  - `Owner/Documents`
  - `Owner/Tasks`
  - `Owner/Settings`
  - `Investor/Catalog Placeholder`
  - `Investor/Project Placeholder`
  - `Admin/Console Placeholder`

## Frame Naming Convention
- `Screen/{route}/{viewport}`
- Examples:
  - `Screen/owner/desktop-1440`
  - `Screen/owner-projects/desktop-1440`
  - `Screen/owner-project-detail/tablet-1024`
  - `Screen/owner-projects/mobile-390`

## Layout Spec
- Desktop canvas width: `1440`
- Main app shell:
  - Sidebar width: `288` (matches `w-72`)
  - Top bar height: `56` (matches `h-14`)
  - Content padding: `24`
- Responsive breakpoints to design:
  - Mobile: `390`
  - Tablet: `1024`
  - Desktop: `1440`

## Design Tokens (Match Current Code)
Use these as Figma variables/styles:

- `background`: `#ffffff`
- `foreground`: `oklch(0.145 0 0)`
- `card`: `#ffffff`
- `card-foreground`: `oklch(0.145 0 0)`
- `primary`: `#030213`
- `primary-foreground`: `oklch(1 0 0)`
- `secondary`: `oklch(0.95 0.0058 264.53)`
- `secondary-foreground`: `#030213`
- `muted`: `#ececf0`
- `muted-foreground`: `#717182`
- `accent`: `#e9ebef`
- `accent-foreground`: `#030213`
- `destructive`: `#d4183d`
- `destructive-foreground`: `#ffffff`
- `border`: `rgba(0,0,0,0.1)`
- `ring`: `oklch(0.708 0 0)`
- `radius`: `10px` (`0.625rem`)

Sidebar tokens:
- `sidebar`: `oklch(0.985 0 0)`
- `sidebar-foreground`: `oklch(0.145 0 0)`
- `sidebar-primary`: `#030213`
- `sidebar-primary-foreground`: `oklch(0.985 0 0)`
- `sidebar-accent`: `oklch(0.97 0 0)`
- `sidebar-accent-foreground`: `oklch(0.205 0 0)`
- `sidebar-border`: `oklch(0.922 0 0)`
- `sidebar-ring`: `oklch(0.708 0 0)`

## Typography
- Base font size: `16px`
- Weights:
  - Regular: `400`
  - Medium: `500`
- Minimum text styles:
  - `Heading/L` (page title)
  - `Heading/M` (card title)
  - `Body/M`
  - `Body/S`
  - `Label/S`

## Component Variants Required
- `Button`
  - Variants: `default`, `secondary`, `outline`
  - States: `default`, `hover`, `disabled`
- `Badge`
  - Variants: `default`, `secondary`, `outline`
- `Card`
  - Sections: `header`, `content`
- `Progress`
  - Values: `0`, `25`, `50`, `75`, `100`

## Screen Content Requirements
- Owner Dashboard:
  - KPI cards: Active Projects, Avg Readiness, Investor Requests, Open Q&A
- Owner Projects List:
  - Project cards with category/stage badges, funding ask, annual credits, readiness bar, actions
- Owner Create Project:
  - Wizard placeholder block for 7-step flow
- Owner Project Detail:
  - Two-column desktop structure with overview + readiness card

## Interaction Notes
- Sidebar active item uses `sidebar-accent` background.
- Primary CTA in sidebar: `Create Project`.
- Progress bars represent readiness score percent.

## Handoff Checklist
- Every route above has at least one desktop frame.
- `owner`, `owner/projects`, `owner/projects/[projectId]` also have tablet + mobile frames.
- All component variants listed exist in `01 Components`.
- Figma variables are named exactly like token names in this spec.

## Dev Mapping
- Shell: `src/components/layout/PortalShell.tsx`
- Tokens: `src/app/globals.css`, `tailwind.config.js`
- UI primitives:
  - `src/components/ui/button.tsx`
  - `src/components/ui/card.tsx`
  - `src/components/ui/badge.tsx`
  - `src/components/ui/progress.tsx`
  - `src/components/ui/separator.tsx`
