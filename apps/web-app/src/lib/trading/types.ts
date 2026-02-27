export type TradeStatus = "AGREED" | "CONFIRMED" | "SETTLEMENT_IN_PROGRESS" | "SETTLED" | "FAILED" | "CANCELLED";
export type RFQStatus = "DRAFT" | "SENT" | "QUOTED" | "EXPIRED" | "CANCELLED";
export type QuoteStatus = "FIRM" | "ACCEPTED" | "REJECTED" | "EXPIRED";

export interface CreditListing {
  id: string;
  standard: string;
  registry: string;
  projectId: string;
  projectName: string;
  methodology: string;
  location: string;
  category: "REMOVAL" | "AVOIDANCE";
  vintages: number[];
  totalQty: number;
  minLot: number;
  settlementWindow: string;
  indicativePricing: { mid: number; rangeLow: number; rangeHigh: number; currency: string; lastUpdatedAt: string };
  sellers: { anonymizedCount: number; kycBadge: boolean; proofOfInventory: "VERIFIED" | "PENDING" };
}

export interface RFQ {
  id: string;
  buyerOrgId: string;
  listingId?: string;
  requestedQty: number;
  acceptableVintages: number[];
  requiredAttributes: string[];
  deliveryWindow: string;
  targetSettlementDate: string;
  partialFillAllowed: boolean;
  notes?: string;
  status: RFQStatus;
}

export interface Quote {
  id: string;
  rfqId: string;
  sellerId: string;
  price: number;
  currency: string;
  fees: number;
  validityUntil: string;
  deliveryTerms: string;
  settlementTerms: string;
  status: QuoteStatus;
}

export interface Trade {
  id: string;
  quoteId: string;
  rfqId: string;
  executedPrice: number;
  executedQty: number;
  currency: string;
  status: TradeStatus;
  createdAt: string;
  updatedAt: string;
  counterparty: string;
  settlementStage: "CASH" | "TRANSFER" | "COMPLETE";
  documents?: Array<{ id: string; name: string }>;
}

export interface SettlementMilestone {
  id: string;
  tradeId: string;
  type: "CASH_INITIATED" | "CASH_CONFIRMED" | "TRANSFER_INITIATED" | "TRANSFER_CONFIRMED" | "RETIREMENT_DONE" | "DVP_COMPLETE";
  status: "PENDING" | "DONE" | "BLOCKED";
  comment?: string;
  evidence?: Array<{ id: string; name: string }>;
  updatedAt: string;
  updatedBy: string;
  adminOverride?: boolean;
}

export interface PositionLot {
  id: string;
  buyerOrgId: string;
  projectName: string;
  standard: string;
  vintage: number;
  qty: number;
  status: "HELD" | "PENDING" | "RETIRED";
}

export interface RetirementInstruction {
  id: string;
  positionLotId: string;
  qty: number;
  beneficiary: string;
  claimText: string;
  evidence?: string;
  status: "REQUESTED" | "PROCESSING" | "DONE";
  createdAt: string;
}
