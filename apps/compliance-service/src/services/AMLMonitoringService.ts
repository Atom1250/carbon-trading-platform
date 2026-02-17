import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import type {
  AMLAlert,
  AMLTransactionCheck,
  CheckTransactionDTO,
  InvestigateAlertDTO,
  ResolveAlertDTO,
  AMLAlertListQuery,
} from '../types/compliance.types.js';

const ALERT_COLUMNS = `
  id,
  alert_type          AS "alertType",
  severity,
  status,
  institution_id      AS "institutionId",
  user_id             AS "userId",
  description,
  transaction_ids     AS "transactionIds",
  total_amount_usd    AS "totalAmountUsd",
  pattern_details     AS "patternDetails",
  assigned_to         AS "assignedTo",
  investigated_at     AS "investigatedAt",
  investigation_notes AS "investigationNotes",
  resolved_at         AS "resolvedAt",
  resolution_notes    AS "resolutionNotes",
  created_at          AS "createdAt",
  updated_at          AS "updatedAt"
`;

const CHECK_COLUMNS = `
  id,
  transaction_id   AS "transactionId",
  institution_id   AS "institutionId",
  user_id          AS "userId",
  amount_usd       AS "amountUsd",
  transaction_type AS "transactionType",
  counterparty_id  AS "counterpartyId",
  is_suspicious    AS "isSuspicious",
  risk_score       AS "riskScore",
  rules_triggered  AS "rulesTriggered",
  alert_id         AS "alertId",
  checked_at       AS "checkedAt"
`;

// ─── Pattern Detection Thresholds ─────────────────────────────────────────────

const LARGE_VOLUME_THRESHOLD = 100_000;
const STRUCTURING_THRESHOLD = 10_000;
const STRUCTURING_TOTAL_THRESHOLD = 10_000;
const ROUND_AMOUNT_DIVISOR = 1_000;
const ROUND_AMOUNT_MIN = 5_000;
const RAPID_TRADING_COUNT = 10;

type RuleResult = {
  rule: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
};

export class AMLMonitoringService {
  constructor(private readonly db: IDatabaseClient) {}

  async checkTransaction(data: CheckTransactionDTO): Promise<AMLTransactionCheck> {
    const rules = this.detectPatterns(data);
    const isSuspicious = rules.length > 0;
    const riskScore = Math.min(rules.reduce((sum, r) => sum + r.score, 0), 100);
    const rulesTriggered = rules.map((r) => r.rule);

    let alertId: string | null = null;

    if (isSuspicious) {
      const highestSeverity = this.getHighestSeverity(rules);
      const alertRows = await this.db.query<AMLAlert>(
        `INSERT INTO aml_alerts (
          alert_type, severity, status, institution_id, user_id,
          description, transaction_ids, total_amount_usd, pattern_details
        )
        VALUES ($1, $2, 'open', $3, $4, $5, $6, $7, $8)
        RETURNING ${ALERT_COLUMNS}`,
        [
          rules[0].rule,
          highestSeverity,
          data.institutionId ?? null,
          data.userId ?? null,
          rules.map((r) => r.description).join('; '),
          [data.transactionId],
          data.amountUsd,
          JSON.stringify({ rules: rules.map((r) => ({ rule: r.rule, score: r.score })) }),
        ],
      );
      alertId = alertRows[0].id;
    }

    const checkRows = await this.db.query<AMLTransactionCheck>(
      `INSERT INTO aml_transaction_checks (
        transaction_id, institution_id, user_id, amount_usd,
        transaction_type, counterparty_id, is_suspicious,
        risk_score, rules_triggered, alert_id
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING ${CHECK_COLUMNS}`,
      [
        data.transactionId,
        data.institutionId ?? null,
        data.userId ?? null,
        data.amountUsd,
        data.transactionType,
        data.counterpartyId ?? null,
        isSuspicious,
        riskScore,
        rulesTriggered,
        alertId,
      ],
    );

    return checkRows[0];
  }

  async listAlerts(params: AMLAlertListQuery): Promise<{ alerts: AMLAlert[]; total: number }> {
    const conditions: string[] = [];
    const filterValues: unknown[] = [];

    if (params.status) {
      filterValues.push(params.status);
      conditions.push(`status = $${filterValues.length}`);
    }
    if (params.severity) {
      filterValues.push(params.severity);
      conditions.push(`severity = $${filterValues.length}`);
    }
    if (params.alertType) {
      filterValues.push(params.alertType);
      conditions.push(`alert_type = $${filterValues.length}`);
    }
    if (params.institutionId) {
      filterValues.push(params.institutionId);
      conditions.push(`institution_id = $${filterValues.length}`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM aml_alerts ${whereClause}`,
      filterValues,
    );
    const total = parseInt(countRows[0].count, 10);

    const limitParam = filterValues.length + 1;
    const offsetParam = filterValues.length + 2;

    const alerts = await this.db.query<AMLAlert>(
      `SELECT ${ALERT_COLUMNS}
       FROM aml_alerts
       ${whereClause}
       ORDER BY severity DESC, created_at DESC
       LIMIT $${limitParam} OFFSET $${offsetParam}`,
      [...filterValues, params.limit, params.offset],
    );

    return { alerts, total };
  }

  async investigateAlert(id: string, data: InvestigateAlertDTO): Promise<AMLAlert> {
    const rows = await this.db.query<AMLAlert>(
      `SELECT ${ALERT_COLUMNS} FROM aml_alerts WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('AML Alert', id);
    }

    const alert = rows[0];
    if (alert.status !== 'open' && alert.status !== 'escalated') {
      throw new ValidationError(`Alert must be in 'open' or 'escalated' status to investigate, current status: ${alert.status}`);
    }

    const updated = await this.db.query<AMLAlert>(
      `UPDATE aml_alerts
       SET status = 'under_investigation', assigned_to = $1, investigated_at = NOW(),
           investigation_notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING ${ALERT_COLUMNS}`,
      [data.assignedTo, data.notes, id],
    );

    return updated[0];
  }

  async resolveAlert(id: string, data: ResolveAlertDTO): Promise<AMLAlert> {
    const rows = await this.db.query<AMLAlert>(
      `SELECT ${ALERT_COLUMNS} FROM aml_alerts WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('AML Alert', id);
    }

    const alert = rows[0];
    if (alert.status !== 'under_investigation') {
      throw new ValidationError(`Alert must be in 'under_investigation' status to resolve, current status: ${alert.status}`);
    }

    const updated = await this.db.query<AMLAlert>(
      `UPDATE aml_alerts
       SET status = $1, resolved_at = NOW(), resolution_notes = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING ${ALERT_COLUMNS}`,
      [data.status, data.notes, id],
    );

    return updated[0];
  }

  // ─── Pattern Detection Rules ──────────────────────────────────────────────

  private detectPatterns(data: CheckTransactionDTO): RuleResult[] {
    const results: RuleResult[] = [];

    const largeVolume = this.checkLargeVolume(data.amountUsd);
    if (largeVolume) results.push(largeVolume);

    const structuring = this.checkStructuring(data.amountUsd);
    if (structuring) results.push(structuring);

    const roundAmounts = this.checkRoundAmounts(data.amountUsd);
    if (roundAmounts) results.push(roundAmounts);

    return results;
  }

  private checkLargeVolume(amountUsd: number): RuleResult | null {
    if (amountUsd >= LARGE_VOLUME_THRESHOLD) {
      return {
        rule: 'large_volume',
        severity: amountUsd >= 500_000 ? 'critical' : 'high',
        description: `Single transaction of $${amountUsd.toLocaleString()} exceeds $${LARGE_VOLUME_THRESHOLD.toLocaleString()} threshold`,
        score: amountUsd >= 500_000 ? 40 : 25,
      };
    }
    return null;
  }

  private checkStructuring(amountUsd: number): RuleResult | null {
    if (amountUsd > STRUCTURING_TOTAL_THRESHOLD * 0.8 && amountUsd < STRUCTURING_THRESHOLD) {
      return {
        rule: 'structuring',
        severity: 'high',
        description: `Transaction of $${amountUsd.toLocaleString()} is just below $${STRUCTURING_THRESHOLD.toLocaleString()} reporting threshold (possible structuring)`,
        score: 30,
      };
    }
    return null;
  }

  private checkRoundAmounts(amountUsd: number): RuleResult | null {
    if (amountUsd >= ROUND_AMOUNT_MIN && amountUsd % ROUND_AMOUNT_DIVISOR === 0) {
      return {
        rule: 'round_amounts',
        severity: 'low',
        description: `Round amount of $${amountUsd.toLocaleString()} (divisible by $${ROUND_AMOUNT_DIVISOR.toLocaleString()})`,
        score: 10,
      };
    }
    return null;
  }

  private getHighestSeverity(rules: RuleResult[]): string {
    const order = ['critical', 'high', 'medium', 'low'];
    for (const level of order) {
      if (rules.some((r) => r.severity === level)) return level;
    }
    return 'medium';
  }
}
