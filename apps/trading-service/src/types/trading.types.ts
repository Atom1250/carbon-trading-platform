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
