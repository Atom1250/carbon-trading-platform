import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  PEPCheck,
  CheckPEPDTO,
  CompletePEPReviewDTO,
  PEPCheckListQuery,
  PEPCategory,
} from '../types/compliance.types.js';

const PEP_CHECK_COLUMNS = `
  id,
  beneficial_owner_id  AS "beneficialOwnerId",
  individual_name      AS "individualName",
  date_of_birth        AS "dateOfBirth",
  nationality,
  institution_id       AS "institutionId",
  status,
  is_pep               AS "isPep",
  pep_category         AS "pepCategory",
  pep_details          AS "pepDetails",
  risk_level           AS "riskLevel",
  checked_by           AS "checkedBy",
  reviewed_by          AS "reviewedBy",
  reviewed_at          AS "reviewedAt",
  review_notes         AS "reviewNotes",
  edd_required         AS "eddRequired",
  edd_completed_at     AS "eddCompletedAt",
  edd_notes            AS "eddNotes",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

interface PEPEntry {
  name: string;
  category: PEPCategory;
  country?: string;
  position?: string;
}

const MOCK_PEP_DATABASE: PEPEntry[] = [
  { name: 'JOHN GOVERNMENT OFFICIAL', category: 'government_official', country: 'US', position: 'Senator' },
  { name: 'MARIA MILITARY GENERAL', category: 'military', country: 'RU', position: 'General' },
  { name: 'CARLOS STATE EXECUTIVE', category: 'state_corp_executive', country: 'BR', position: 'CEO of State Corp' },
  { name: 'AHMED PARTY LEADER', category: 'political_party_official', country: 'EG', position: 'Party Chairman' },
  { name: 'SOPHIA FAMILY MEMBER', category: 'family_member', country: 'GB', position: 'Spouse of Minister' },
];

const MATCH_THRESHOLD = 0.70;

export class PEPCheckingService {
  constructor(private readonly db: IDatabaseClient) {}

  async checkIndividual(data: CheckPEPDTO): Promise<PEPCheck> {
    const normalizedName = this.normalizeName(data.individualName);
    const matches: Array<{ entry: PEPEntry; score: number }> = [];

    for (const entry of MOCK_PEP_DATABASE) {
      const score = this.computeMatchScore(normalizedName, this.normalizeName(entry.name));
      if (score >= MATCH_THRESHOLD) {
        matches.push({ entry, score });
      }
    }

    const bestMatch = matches.length > 0
      ? matches.reduce((a, b) => (a.score > b.score ? a : b))
      : null;

    const isPep = bestMatch !== null;
    const status = isPep ? 'pep_identified' : 'clear';
    const riskLevel = isPep ? (bestMatch.score >= 0.9 ? 'high' : 'medium') : 'low';

    const rows = await this.db.query<PEPCheck>(
      `INSERT INTO pep_checks (
        beneficial_owner_id, individual_name, date_of_birth, nationality,
        institution_id, status, is_pep, pep_category, pep_details,
        risk_level, checked_by, edd_required
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING ${PEP_CHECK_COLUMNS}`,
      [
        data.beneficialOwnerId ?? null,
        data.individualName,
        data.dateOfBirth ?? null,
        data.nationality ?? null,
        data.institutionId ?? null,
        status,
        isPep,
        bestMatch?.entry.category ?? null,
        bestMatch ? JSON.stringify({
          matchedName: bestMatch.entry.name,
          matchScore: bestMatch.score,
          position: bestMatch.entry.position ?? null,
          country: bestMatch.entry.country ?? null,
        }) : null,
        riskLevel,
        data.checkedBy ?? null,
        isPep,
      ],
    );

    const pepCheck = rows[0];

    if (isPep && data.beneficialOwnerId) {
      await this.db.query(
        `UPDATE beneficial_owners SET is_pep = TRUE, updated_at = NOW() WHERE id = $1`,
        [data.beneficialOwnerId],
      );
    }

    return pepCheck;
  }

  async findById(id: string): Promise<PEPCheck> {
    const rows = await this.db.query<PEPCheck>(
      `SELECT ${PEP_CHECK_COLUMNS} FROM pep_checks WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('PEP Check', id);
    }

    return rows[0];
  }

  async listChecks(params: PEPCheckListQuery): Promise<{ checks: PEPCheck[]; total: number }> {
    const conditions: string[] = ['1=1'];
    const filterValues: unknown[] = [];

    if (params.institutionId) {
      filterValues.push(params.institutionId);
      conditions.push(`institution_id = $${filterValues.length}`);
    }

    if (params.status) {
      filterValues.push(params.status);
      conditions.push(`status = $${filterValues.length}`);
    }

    if (params.isPep !== undefined) {
      filterValues.push(params.isPep);
      conditions.push(`is_pep = $${filterValues.length}`);
    }

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM pep_checks WHERE ${conditions.join(' AND ')}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const checks = await this.db.query<PEPCheck>(
      `SELECT ${PEP_CHECK_COLUMNS}
       FROM pep_checks
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { checks, total };
  }

  async completeReview(id: string, data: CompletePEPReviewDTO): Promise<PEPCheck> {
    const rows = await this.db.query<PEPCheck>(
      `SELECT ${PEP_CHECK_COLUMNS} FROM pep_checks WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('PEP Check', id);
    }

    const pepCheck = rows[0];
    if (pepCheck.status !== 'pep_identified' && pepCheck.status !== 'edd_required') {
      throw new ValidationError(
        `PEP check must be in 'pep_identified' or 'edd_required' status to review, current status: ${pepCheck.status}`,
      );
    }

    const eddCompletedAt = data.status === 'edd_completed' ? 'NOW()' : 'NULL';

    const updated = await this.db.query<PEPCheck>(
      `UPDATE pep_checks
       SET status = $1, reviewed_by = $2, reviewed_at = NOW(),
           review_notes = $3, edd_notes = $3,
           edd_completed_at = ${eddCompletedAt},
           updated_at = NOW()
       WHERE id = $4
       RETURNING ${PEP_CHECK_COLUMNS}`,
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
