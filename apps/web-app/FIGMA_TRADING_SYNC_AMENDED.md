# Figma-to-App Sync (Amended) — Carbon Trading Portal

This document aligns the implemented trading GUI with the Figma trading specification and MCP resource naming so design handoff can map directly to code.

Primary mapping artifact:
- `figma-trading-mapping.json`

## 1) Route Coverage

Implemented trading routes:
- `/trading`
- `/trading/listings/[listingId]`
- `/trading/rfq/new`
- `/trading/rfq/[rfqId]`
- `/trading/quotes`
- `/trading/trades`
- `/trading/trades/[tradeId]`
- `/trading/positions`
- `/trading/retirements`

Compatibility aliases added for Figma naming consistency:
- `/trading/marketplace` -> same page as `/trading`
- `/trading/dashboard` -> same page as `/trading`

Code:
- `src/app/(portal)/trading/page.tsx`
- `src/app/(portal)/trading/marketplace/page.tsx`
- `src/app/(portal)/trading/dashboard/page.tsx`
- plus all route files under `src/app/(portal)/trading/**`

## 2) Domain Model Coverage

Trading domain types are implemented in:
- `src/lib/trading/types.ts`

Covered entities:
- `CreditListing`
- `RFQ`
- `Quote`
- `Trade`
- `SettlementMilestone`
- `PositionLot`
- `RetirementInstruction`

## 3) Mock API Coverage

Mock trading API is implemented in:
- `src/lib/trading/api.ts`

Covered operations:
- Listings: list/get
- RFQs: list/get/create
- Quotes: list/listByRfq/updateStatus/accept
- Trades: list/get/updateStatus
- Settlement: timeline get/update milestone
- Positions: list
- Retirements: list/create

## 4) Figma Component Name Compatibility

To reduce friction with Figma component naming, adapter components were added with Figma-friendly names and exported in one index:
- `src/components/trading/index.ts`

Adapters added:
- `CreditListingCard`
- `IndicativePriceChip`
- `AvailabilityChip`
- `AttributeBadges`
- `FilterBarQuick`
- `FilterDrawerAdvanced`
- `RFQStepper`
- `QuoteCard`
- `BlotterTable`
- `SettlementTimeline`
- `EvidenceUploadTile`
- `PositionLotRow`
- `RetirementForm`

## 5) Current Linkage Status

Status: aligned and compile-safe.
- Trading routes exist and resolve.
- Types + mocked API exist and are wired.
- Figma naming compatibility layer exists for component linkage.

Build validation:
- Workspace build passed successfully after route/component sync updates.

## 6) Recommended Next Step (Optional)

If you want strict automated mapping, add a machine-readable mapping file (for example `figma-trading-mapping.json`) that maps each Figma frame/component ID to:
- route path
- React component path
- state variant keys

This is now implemented in `figma-trading-mapping.json`.

## 7) Validation Command

Validate coverage and file existence:
- `npm run figma:trading:validate`

What it checks:
- required trading routes are mapped
- required trading components are mapped
- mapped code target files exist
