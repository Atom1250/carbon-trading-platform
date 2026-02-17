import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  SanctionsScreening,
  ScreeningMatch,
  ScreenEntityDTO,
  ReviewScreeningDTO,
  ScreeningListQuery,
  ScreeningWithMatches,
} from '../types/compliance.types.js';

const SCREENING_COLUMNS = `
  id,
  entity_type          AS "entityType",
  entity_name          AS "entityName",
  entity_country       AS "entityCountry",
  entity_date_of_birth AS "entityDateOfBirth",
  entity_identifiers   AS "entityIdentifiers",
  institution_id       AS "institutionId",
  user_id              AS "userId",
  status,
  match_count          AS "matchCount",
  highest_score        AS "highestScore",
  screened_by          AS "screenedBy",
  reviewed_by          AS "reviewedBy",
  reviewed_at          AS "reviewedAt",
  review_notes         AS "reviewNotes",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

const MATCH_COLUMNS = `
  id,
  screening_id   AS "screeningId",
  list_name      AS "listName",
  list_entry_id  AS "listEntryId",
  matched_name   AS "matchedName",
  match_score    AS "matchScore",
  match_details  AS "matchDetails",
  created_at     AS "createdAt"
`;

interface SanctionEntry {
  name: string;
  listName: string;
  listEntryId: string;
  country?: string;
}

const MOCK_SANCTIONS_LIST: SanctionEntry[] = [
  { name: 'SANCTIONED ENTITY ONE', listName: 'OFAC SDN', listEntryId: 'OFAC-001' },
  { name: 'BLOCKED PERSON TWO', listName: 'OFAC SDN', listEntryId: 'OFAC-002' },
  { name: 'RESTRICTED CORP THREE', listName: 'EU Sanctions', listEntryId: 'EU-001', country: 'RU' },
  { name: 'DESIGNATED INDIVIDUAL FOUR', listName: 'UN Sanctions', listEntryId: 'UN-001' },
  { name: 'PROHIBITED ORGANIZATION FIVE', listName: 'OFAC SDN', listEntryId: 'OFAC-003' },
];

const MATCH_THRESHOLD = 0.60;
const REVIEW_THRESHOLD = 0.80;

export class SanctionsScreeningService {
  constructor(private readonly db: IDatabaseClient) {}

  async screenEntity(data: ScreenEntityDTO): Promise<SanctionsScreening> {
    const normalizedName = this.normalizeName(data.entityName);
    const matches: Array<{ entry: SanctionEntry; score: number }> = [];

    for (const entry of MOCK_SANCTIONS_LIST) {
      const score = this.computeMatchScore(normalizedName, this.normalizeName(entry.name));
      if (score >= MATCH_THRESHOLD) {
        matches.push({ entry, score });
      }
    }

    const highestScore = matches.length > 0 ? Math.max(...matches.map((m) => m.score)) : 0;
    const status = highestScore >= REVIEW_THRESHOLD ? 'potential_match' : 'clear';

    const rows = await this.db.query<SanctionsScreening>(
      `INSERT INTO sanctions_screenings (
        entity_type, entity_name, entity_country, entity_date_of_birth,
        entity_identifiers, institution_id, user_id, status,
        match_count, highest_score, screened_by
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING ${SCREENING_COLUMNS}`,
      [
        data.entityType,
        data.entityName,
        data.entityCountry ?? null,
        data.entityDateOfBirth ?? null,
        data.entityIdentifiers ? JSON.stringify(data.entityIdentifiers) : null,
        data.institutionId ?? null,
        data.userId ?? null,
        status,
        matches.length,
        highestScore,
        data.screenedBy ?? null,
      ],
    );

    const screening = rows[0];

    for (const match of matches) {
      await this.db.query(
        `INSERT INTO sanctions_screening_matches (
          screening_id, list_name, list_entry_id, matched_name, match_score, match_details
        )
        VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          screening.id,
          match.entry.listName,
          match.entry.listEntryId,
          match.entry.name,
          match.score,
          JSON.stringify({ country: match.entry.country ?? null }),
        ],
      );
    }

    return screening;
  }

  async findById(id: string): Promise<ScreeningWithMatches> {
    const rows = await this.db.query<SanctionsScreening>(
      `SELECT ${SCREENING_COLUMNS} FROM sanctions_screenings WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Screening', id);
    }

    const matchRows = await this.db.query<ScreeningMatch>(
      `SELECT ${MATCH_COLUMNS} FROM sanctions_screening_matches WHERE screening_id = $1 ORDER BY match_score DESC`,
      [id],
    );

    return { ...rows[0], matches: matchRows };
  }

  async getReviewQueue(params: ScreeningListQuery): Promise<{ screenings: SanctionsScreening[]; total: number }> {
    const conditions: string[] = [`status = 'potential_match'`];
    const filterValues: unknown[] = [];

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM sanctions_screenings WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const screenings = await this.db.query<SanctionsScreening>(
      `SELECT ${SCREENING_COLUMNS}
       FROM sanctions_screenings
       WHERE ${conditions.join(' AND ')}
       ORDER BY highest_score DESC, created_at ASC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { screenings, total };
  }

  async reviewScreening(id: string, data: ReviewScreeningDTO): Promise<SanctionsScreening> {
    const rows = await this.db.query<SanctionsScreening>(
      `SELECT ${SCREENING_COLUMNS} FROM sanctions_screenings WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Screening', id);
    }

    const screening = rows[0];
    if (screening.status !== 'potential_match') {
      throw new ValidationError(`Screening must be in 'potential_match' status to review, current status: ${screening.status}`);
    }

    const updated = await this.db.query<SanctionsScreening>(
      `UPDATE sanctions_screenings
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(), review_notes = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING ${SCREENING_COLUMNS}`,
      [data.status, data.reviewedBy, data.notes, id],
    );

    return updated[0];
  }

  private normalizeName(name: string): string {
    return name
      .toLowerCase()
      .trim()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, ' ');
  }

  private computeMatchScore(name1: string, name2: string): number {
    const longer = name1.length >= name2.length ? name1 : name2;
    const shorter = name1.length >= name2.length ? name2 : name1;

    if (longer.length === 0) return 1.0;

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }
}
