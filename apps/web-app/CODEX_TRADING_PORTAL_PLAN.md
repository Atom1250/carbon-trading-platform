# Codex Implementation Plan - Carbon Trading Portal (RFQ OTC)

## Objective
- Discover credits with indicative pricing
- Create RFQs and receive firm quotes
- Execute OTC trades
- Track DvP settlement with evidence/audit trail
- Provide positions and retirement workflows

## Routes created
- /trading
- /trading/listings/[listingId]
- /trading/rfq/new
- /trading/rfq/[rfqId]
- /trading/quotes
- /trading/trades
- /trading/trades/[tradeId]
- /trading/positions
- /trading/retirements
- /seller/inventory
- /seller/quotes
- /seller/trades/[tradeId]
- /admin/trading
- /admin/trading/rfqs
- /admin/trading/trades
- /admin/trading/disputes
- /admin/trading/policies

## Next tasks
1. Marketplace filters + listing scoring.
2. RFQ wizard implementation with validation.
3. Quote accept -> trade + state transitions.
4. Evidence uploads and milestone actioning in settlement timeline.
5. Retirement instruction creation and history with evidence.
