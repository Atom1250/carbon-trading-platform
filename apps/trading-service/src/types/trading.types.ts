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
