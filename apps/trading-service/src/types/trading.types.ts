// ─── RFQ Requests (Session 5.1) ─────────────────────────────────────────────

export type RFQSide = 'buy' | 'sell';
export type RFQStatus = 'open' | 'quoted' | 'accepted' | 'expired' | 'cancelled';

export interface RFQRequest {
  id: string;
  assetId: string;
  requesterInstitutionId: string;
  requesterUserId: string;
  side: RFQSide;
  quantity: string;
  status: RFQStatus;
  expiresAt: Date;
  cancelledAt: Date | null;
  cancellationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRFQDTO {
  assetId: string;
  requesterInstitutionId: string;
  requesterUserId: string;
  side: RFQSide;
  quantity: number;
}

export interface CancelRFQDTO {
  cancellationReason?: string;
}

export interface RFQListQuery {
  status?: RFQStatus;
  assetId?: string;
  institutionId?: string;
  side?: RFQSide;
  limit: number;
  offset: number;
}

// ─── Quotes (Session 5.2) ──────────────────────────────────────────────────

export type QuoteStatus = 'pending' | 'accepted' | 'rejected' | 'expired' | 'withdrawn';

export interface Quote {
  id: string;
  rfqId: string;
  quoterInstitutionId: string;
  quoterUserId: string;
  pricePerUnit: string;
  quantity: string;
  totalAmount: string;
  status: QuoteStatus;
  expiresAt: Date;
  acceptedAt: Date | null;
  withdrawnAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface SubmitQuoteDTO {
  quoterInstitutionId: string;
  quoterUserId: string;
  pricePerUnit: number;
  quantity: number;
}

export interface QuoteListQuery {
  limit: number;
  offset: number;
}

export interface AcceptQuoteDTO {
  acceptedByUserId: string;
}

// ─── Trades & Settlement (Session 5.3) ──────────────────────────────────────

export type TradeStatus = 'pending_settlement' | 'settled' | 'failed';

export interface Trade {
  id: string;
  rfqId: string;
  quoteId: string;
  assetId: string;
  buyerInstitutionId: string;
  sellerInstitutionId: string;
  buyerUserId: string;
  sellerUserId: string;
  quantity: string;
  pricePerUnit: string;
  totalAmount: string;
  makerFee: string;
  takerFee: string;
  platformFee: string;
  status: TradeStatus;
  settlementTxHash: string | null;
  settledAt: Date | null;
  failedAt: Date | null;
  failureReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TradeListQuery {
  status?: TradeStatus;
  assetId?: string;
  institutionId?: string;
  limit: number;
  offset: number;
}

export interface FeeBreakdown {
  makerFee: number;
  takerFee: number;
  platformFee: number;
}

export interface FeeReportQuery {
  startDate?: string;
  endDate?: string;
}

export interface FeeReport {
  totalMakerFees: string;
  totalTakerFees: string;
  totalPlatformFees: string;
  tradeCount: number;
  startDate: string | null;
  endDate: string | null;
}

export interface InstitutionFees {
  institutionId: string;
  totalFeesPaid: string;
  tradeCount: number;
}

// ─── Trade Orchestration & Confirmations (Session 5.4) ──────────────────────

export interface TradeConfirmation {
  tradeId: string;
  tradeDate: string;
  settlementDate: string | null;
  buyer: { institutionId: string; userId: string };
  seller: { institutionId: string; userId: string };
  asset: { id: string; name: string; type: string };
  quantity: string;
  pricePerUnit: string;
  totalAmount: string;
  fees: { maker: string; taker: string; platform: string };
  settlement: { txHash: string | null; settledAt: string | null; status: TradeStatus };
}
