import type { CreditListing, Quote, RFQ, RetirementInstruction, SettlementMilestone, Trade, PositionLot, TradeStatus, QuoteStatus } from "@/lib/trading/types";

const now = () => new Date().toISOString();

const listings: CreditListing[] = [
  {
    id: "lst_001",
    standard: "VERRA",
    registry: "Verra Registry",
    projectId: "p_001",
    projectName: "Sunridge Solar SPV",
    methodology: "VM0042",
    location: "Portugal",
    category: "AVOIDANCE",
    vintages: [2026, 2027],
    totalQty: 120000,
    minLot: 1000,
    settlementWindow: "T+5",
    indicativePricing: { mid: 19.5, rangeLow: 18.8, rangeHigh: 20.4, currency: "EUR", lastUpdatedAt: now() },
    sellers: { anonymizedCount: 3, kycBadge: true, proofOfInventory: "VERIFIED" },
  },
  {
    id: "lst_002",
    standard: "Gold Standard",
    registry: "GS Registry",
    projectId: "p_002",
    projectName: "Coastal Mangrove Restoration",
    methodology: "Blue Carbon",
    location: "Mozambique",
    category: "REMOVAL",
    vintages: [2027, 2028],
    totalQty: 80000,
    minLot: 500,
    settlementWindow: "T+7",
    indicativePricing: { mid: 27.2, rangeLow: 25.0, rangeHigh: 29.1, currency: "USD", lastUpdatedAt: now() },
    sellers: { anonymizedCount: 2, kycBadge: true, proofOfInventory: "PENDING" },
  },
];

const rfqs: RFQ[] = [
  {
    id: "rfq_001",
    buyerOrgId: "inv_org_01",
    listingId: "lst_001",
    requestedQty: 20000,
    acceptableVintages: [2026, 2027],
    requiredAttributes: ["Corresponding adjustment preferred"],
    deliveryWindow: "Q3-2026",
    targetSettlementDate: "2026-08-15",
    partialFillAllowed: true,
    status: "QUOTED",
  },
];

const quotes: Quote[] = [
  {
    id: "qte_001",
    rfqId: "rfq_001",
    sellerId: "seller_a",
    price: 19.2,
    currency: "EUR",
    fees: 0.3,
    validityUntil: "2026-12-05T17:00:00Z",
    deliveryTerms: "Registry transfer on settlement date",
    settlementTerms: "DvP",
    status: "FIRM",
  },
  {
    id: "qte_002",
    rfqId: "rfq_001",
    sellerId: "seller_b",
    price: 19.8,
    currency: "EUR",
    fees: 0.2,
    validityUntil: "2026-11-20T16:00:00Z",
    deliveryTerms: "Registry transfer within T+5",
    settlementTerms: "DvP",
    status: "FIRM",
  },
];

const trades: Trade[] = [
  {
    id: "trd_001",
    quoteId: "qte_001",
    rfqId: "rfq_001",
    executedPrice: 19.2,
    executedQty: 15000,
    currency: "EUR",
    status: "SETTLEMENT_IN_PROGRESS",
    settlementStage: "TRANSFER",
    counterparty: "seller_a",
    createdAt: now(),
    updatedAt: now(),
  },
];

const milestones: SettlementMilestone[] = [
  { id: "ms_1", tradeId: "trd_001", type: "CASH_INITIATED", status: "DONE", updatedAt: now(), updatedBy: "system" },
  { id: "ms_2", tradeId: "trd_001", type: "CASH_CONFIRMED", status: "DONE", updatedAt: now(), updatedBy: "system" },
  { id: "ms_3", tradeId: "trd_001", type: "TRANSFER_INITIATED", status: "PENDING", updatedAt: now(), updatedBy: "system" },
  { id: "ms_4", tradeId: "trd_001", type: "TRANSFER_CONFIRMED", status: "PENDING", updatedAt: now(), updatedBy: "system" },
  { id: "ms_5", tradeId: "trd_001", type: "DVP_COMPLETE", status: "PENDING", updatedAt: now(), updatedBy: "system" },
];

const positions: PositionLot[] = [
  { id: "lot_001", buyerOrgId: "inv_org_01", projectName: "Sunridge Solar SPV", standard: "VERRA", vintage: 2026, qty: 12000, status: "HELD" },
  { id: "lot_002", buyerOrgId: "inv_org_01", projectName: "Sunridge Solar SPV", standard: "VERRA", vintage: 2027, qty: 3000, status: "PENDING" },
];

const retirements: RetirementInstruction[] = [];

export async function listListings() { return listings; }
export async function getListing(listingId: string) { return listings.find((l) => l.id === listingId) ?? null; }
export async function listRfqs() { return rfqs; }
export async function getRfq(rfqId: string) { return rfqs.find((r) => r.id === rfqId) ?? null; }
export async function createRfq(input: Omit<RFQ, "id" | "status">) {
  const next: RFQ = { ...input, id: `rfq_${Math.random().toString(16).slice(2)}`, status: "SENT" };
  rfqs.unshift(next);
  const newQuote: Quote = {
    id: `qte_${Math.random().toString(16).slice(2)}`,
    rfqId: next.id,
    sellerId: "seller_auto",
    price: 20.1,
    currency: "EUR",
    fees: 0.25,
    validityUntil: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    deliveryTerms: "Standard registry transfer",
    settlementTerms: "DvP",
    status: "FIRM",
  };
  quotes.unshift(newQuote);
  next.status = "QUOTED";
  return next;
}
export async function listQuotes() { return quotes; }
export async function listQuotesForRfq(rfqId: string) { return quotes.filter((q) => q.rfqId === rfqId); }
export async function updateQuoteStatus(quoteId: string, status: QuoteStatus) {
  const quote = quotes.find((q) => q.id === quoteId);
  if (!quote) return null;
  quote.status = status;
  return quote;
}
export async function acceptQuote(quoteId: string) {
  const quote = quotes.find((q) => q.id === quoteId);
  if (!quote) return null;
  quote.status = "ACCEPTED";
  quotes.forEach((q) => {
    if (q.rfqId === quote.rfqId && q.id !== quote.id && q.status === "FIRM") q.status = "REJECTED";
  });
  const t: Trade = {
    id: `trd_${Math.random().toString(16).slice(2)}`,
    quoteId: quote.id,
    rfqId: quote.rfqId,
    executedPrice: quote.price,
    executedQty: 10000,
    currency: quote.currency,
    status: "AGREED",
    settlementStage: "CASH",
    counterparty: quote.sellerId,
    createdAt: now(),
    updatedAt: now(),
  };
  trades.unshift(t);
  rfqs.forEach((r) => {
    if (r.id === quote.rfqId) r.status = "QUOTED";
  });
  milestones.push(
    { id: `ms_${Math.random().toString(16).slice(2)}`, tradeId: t.id, type: "CASH_INITIATED", status: "PENDING", updatedAt: now(), updatedBy: "system" },
    { id: `ms_${Math.random().toString(16).slice(2)}`, tradeId: t.id, type: "CASH_CONFIRMED", status: "PENDING", updatedAt: now(), updatedBy: "system" },
    { id: `ms_${Math.random().toString(16).slice(2)}`, tradeId: t.id, type: "TRANSFER_INITIATED", status: "PENDING", updatedAt: now(), updatedBy: "system" },
    { id: `ms_${Math.random().toString(16).slice(2)}`, tradeId: t.id, type: "TRANSFER_CONFIRMED", status: "PENDING", updatedAt: now(), updatedBy: "system" },
    { id: `ms_${Math.random().toString(16).slice(2)}`, tradeId: t.id, type: "DVP_COMPLETE", status: "PENDING", updatedAt: now(), updatedBy: "system" }
  );
  return t;
}
export async function listTrades() { return trades; }
export async function getTrade(tradeId: string) { return trades.find((t) => t.id === tradeId) ?? null; }
export async function getSettlementTimeline(tradeId: string) { return milestones.filter((m) => m.tradeId === tradeId); }
export async function updateTradeStatus(tradeId: string, status: TradeStatus) {
  const trade = trades.find((t) => t.id === tradeId);
  if (!trade) return null;
  trade.status = status;
  trade.updatedAt = now();
  if (status === "SETTLED") trade.settlementStage = "COMPLETE";
  if (status === "SETTLEMENT_IN_PROGRESS") trade.settlementStage = "TRANSFER";
  return trade;
}
export async function updateMilestone(
  milestoneId: string,
  input: { status: "PENDING" | "DONE" | "BLOCKED"; comment?: string; evidenceName?: string; updatedBy?: string; adminOverride?: boolean }
) {
  const milestone = milestones.find((m) => m.id === milestoneId);
  if (!milestone) return null;
  milestone.status = input.status;
  milestone.comment = input.comment ?? milestone.comment;
  milestone.updatedAt = now();
  milestone.updatedBy = input.updatedBy ?? "operator";
  if (input.evidenceName) {
    milestone.evidence = milestone.evidence ?? [];
    milestone.evidence.push({ id: `ev_${Math.random().toString(16).slice(2)}`, name: input.evidenceName });
  }
  if (input.adminOverride) milestone.adminOverride = true;

  const tradeMilestones = milestones.filter((m) => m.tradeId === milestone.tradeId);
  const trade = trades.find((t) => t.id === milestone.tradeId);
  if (trade) {
    const allDone = tradeMilestones.every((m) => m.status === "DONE");
    if (allDone) {
      trade.status = "SETTLED";
      trade.settlementStage = "COMPLETE";
      trade.updatedAt = now();
    } else if (tradeMilestones.some((m) => m.status === "DONE")) {
      trade.status = "SETTLEMENT_IN_PROGRESS";
      trade.updatedAt = now();
    }
  }

  return milestone;
}
export async function listPositions() { return positions; }
export async function listRetirements() { return retirements; }
export async function createRetirementInstruction(input: {
  positionLotId: string;
  qty: number;
  beneficiary: string;
  claimText: string;
  evidence?: string;
}) {
  const r: RetirementInstruction = {
    ...input,
    id: `ret_${Math.random().toString(16).slice(2)}`,
    status: "REQUESTED",
    createdAt: now(),
  };
  retirements.unshift(r);
  const lot = positions.find((p) => p.id === input.positionLotId);
  if (lot) {
    lot.qty = Math.max(0, lot.qty - input.qty);
    lot.status = lot.qty === 0 ? "RETIRED" : "HELD";
  }
  return r;
}
