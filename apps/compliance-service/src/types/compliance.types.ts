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

// ─── KYC Document Management (Session 4.3) ──────────────────────────────────

export type KYCDocumentType = 'certificate_of_incorporation' | 'proof_of_address' | 'ownership_structure' | 'government_id' | 'selfie';
export type KYCDocumentStatus = 'pending' | 'approved' | 'rejected';
export type KYCEntityType = 'institution' | 'user';

export interface KYCDocument {
  id: string;
  institutionId: string | null;
  userId: string | null;
  documentType: KYCDocumentType;
  status: KYCDocumentStatus;
  fileUrl: string;
  reviewerId: string | null;
  reviewedAt: Date | null;
  rejectionReason: string | null;
  documentExpiryDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKYCDocumentDTO {
  institutionId?: string;
  userId?: string;
  documentType: KYCDocumentType;
  fileUrl: string;
  documentExpiryDate?: string;
}

export interface ReviewKYCDocumentDTO {
  reviewerId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

export interface KYCDocumentListQuery {
  institutionId?: string;
  userId?: string;
  status?: KYCDocumentStatus;
  documentType?: KYCDocumentType;
  limit: number;
  offset: number;
}

export interface KYCStatus {
  entityType: KYCEntityType;
  entityId: string;
  overallStatus: 'complete' | 'incomplete' | 'pending' | 'expired';
  documents: KYCDocument[];
  missingDocuments: KYCDocumentType[];
  expiredDocuments: KYCDocumentType[];
}

// ─── PEP Checking (Session 4.4) ──────────────────────────────────────────────

export type PEPCategory = 'government_official' | 'military' | 'state_corp_executive' | 'political_party_official' | 'family_member' | 'close_associate';
export type PEPCheckStatus = 'clear' | 'pep_identified' | 'edd_required' | 'edd_completed' | 'edd_failed';

export interface PEPCheck {
  id: string;
  beneficialOwnerId: string | null;
  individualName: string;
  dateOfBirth: Date | null;
  nationality: string | null;
  institutionId: string | null;
  status: PEPCheckStatus;
  isPep: boolean;
  pepCategory: PEPCategory | null;
  pepDetails: Record<string, unknown> | null;
  riskLevel: string | null;
  checkedBy: string | null;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  reviewNotes: string | null;
  eddRequired: boolean;
  eddCompletedAt: Date | null;
  eddNotes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CheckPEPDTO {
  individualName: string;
  dateOfBirth?: string;
  nationality?: string;
  beneficialOwnerId?: string;
  institutionId?: string;
  checkedBy?: string;
}

export interface CompletePEPReviewDTO {
  reviewedBy: string;
  status: 'edd_completed' | 'edd_failed';
  notes: string;
}

export interface PEPCheckListQuery {
  institutionId?: string;
  status?: PEPCheckStatus;
  isPep?: boolean;
  limit: number;
  offset: number;
}
