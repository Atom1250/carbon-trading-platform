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
