// ─── Sanctions Screening (Session 4.1) ─────────────────────────────────────

export type ScreeningEntityType = 'individual' | 'organization';
export type ScreeningStatus = 'clear' | 'potential_match' | 'confirmed_match' | 'false_positive';

export interface SanctionsScreening {
  id: string;
  entityType: ScreeningEntityType;
  entityName: string;
  entityCountry: string | null;
  entityDateOfBirth: Date | null;
  entityIdentifiers: Record<string, unknown> | null;
  institutionId: string | null;
  userId: string | null;
  status: ScreeningStatus;
  matchCount: number;
  highestScore: string;
  screenedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface ScreeningMatch {
  id: string;
  screeningId: string;
  listName: string;
  listEntryId: string | null;
  matchedName: string;
  matchScore: string;
  matchDetails: Record<string, unknown> | null;
  createdAt: Date;
}

export interface ScreenEntityDTO {
  entityType: ScreeningEntityType;
  entityName: string;
  entityCountry?: string;
  entityDateOfBirth?: string;
  entityIdentifiers?: Record<string, unknown>;
  institutionId?: string;
  userId?: string;
  screenedBy?: string;
}

export interface ReviewScreeningDTO {
  reviewedBy: string;
  status: 'confirmed_match' | 'false_positive';
  notes: string;
}

export interface ScreeningListQuery {
  status?: ScreeningStatus;
  limit: number;
  offset: number;
}

export interface ScreeningWithMatches extends SanctionsScreening {
  matches: ScreeningMatch[];
}

// ─── AML Transaction Monitoring (Session 4.2) ──────────────────────────────

export type AMLAlertType = 'structuring' | 'layering' | 'rapid_trading' | 'large_volume' | 'round_amounts' | 'velocity_anomaly';
export type AMLAlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AMLAlertStatus = 'open' | 'under_investigation' | 'escalated' | 'resolved_suspicious' | 'resolved_legitimate';

export interface AMLAlert {
  id: string;
  alertType: AMLAlertType;
  severity: AMLAlertSeverity;
  status: AMLAlertStatus;
  institutionId: string | null;
  userId: string | null;
  description: string;
  transactionIds: string[];
  totalAmountUsd: string | null;
  patternDetails: Record<string, unknown>;
  assignedTo: string | null;
  investigatedAt: Date | null;
  investigationNotes: string | null;
  resolvedAt: Date | null;
  resolutionNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AMLTransactionCheck {
  id: string;
  transactionId: string;
  institutionId: string | null;
  userId: string | null;
  amountUsd: string;
  transactionType: string;
  counterpartyId: string | null;
  isSuspicious: boolean;
  riskScore: string;
  rulesTriggered: string[];
  alertId: string | null;
  checkedAt: Date;
}

export interface CheckTransactionDTO {
  transactionId: string;
  institutionId?: string;
  userId?: string;
  amountUsd: number;
  transactionType: string;
  counterpartyId?: string;
}

export interface InvestigateAlertDTO {
  assignedTo: string;
  notes: string;
}

export interface ResolveAlertDTO {
  status: 'resolved_suspicious' | 'resolved_legitimate';
  notes: string;
}

export interface AMLAlertListQuery {
  status?: AMLAlertStatus;
  severity?: AMLAlertSeverity;
  alertType?: AMLAlertType;
  institutionId?: string;
  limit: number;
  offset: number;
}
