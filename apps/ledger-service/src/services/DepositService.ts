import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { LedgerService } from './LedgerService.js';
import type {
  Deposit,
  CreateDepositDTO,
  DepositListQuery,
  DepositStatus,
  IPaymentProvider,
} from '../types/ledger.types.js';

const logger = createLogger('deposit-service');

const DEPOSIT_COLUMNS = `
  id,
  institution_id       AS "institutionId",
  user_id              AS "userId",
  method,
  status,
  amount,
  currency,
  external_reference   AS "externalReference",
  stripe_payment_intent AS "stripePaymentIntent",
  description,
  journal_entry_id     AS "journalEntryId",
  failure_reason       AS "failureReason",
  completed_at         AS "completedAt",
  failed_at            AS "failedAt",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

const MIN_DEPOSIT_AMOUNT = 1_000;
const MAX_DEPOSIT_AMOUNT = 500_000;

export class DepositService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly ledgerService: LedgerService,
    private readonly paymentProvider?: IPaymentProvider,
  ) {}

  async initiateDeposit(data: CreateDepositDTO): Promise<Deposit> {
    const amount = data.amount;
    const currency = data.currency ?? 'USD';

    if (amount < MIN_DEPOSIT_AMOUNT) {
      throw new ValidationError(`Minimum deposit amount is $${MIN_DEPOSIT_AMOUNT.toLocaleString()}`, [
        { field: 'amount', message: `Must be at least ${MIN_DEPOSIT_AMOUNT}`, code: 'too_small' },
      ]);
    }

    if (amount > MAX_DEPOSIT_AMOUNT) {
      throw new ValidationError(`Maximum deposit amount is $${MAX_DEPOSIT_AMOUNT.toLocaleString()}`, [
        { field: 'amount', message: `Must be at most ${MAX_DEPOSIT_AMOUNT}`, code: 'too_big' },
      ]);
    }

    let stripePaymentIntent: string | null = null;
    let externalReference: string | null = null;
    let status: DepositStatus = 'pending';

    if (data.method === 'card' && this.paymentProvider) {
      const intent = await this.paymentProvider.createPaymentIntent(amount, currency, {
        institutionId: data.institutionId,
        userId: data.userId,
      });
      stripePaymentIntent = intent.id;
      externalReference = intent.id;
      status = 'processing';
    } else if (data.method === 'wire') {
      externalReference = `WIRE-${Date.now()}`;
      status = 'pending';
    } else if (data.method === 'ach') {
      externalReference = `ACH-${Date.now()}`;
      status = 'processing';
    }

    const rows = await this.db.query<Deposit>(
      `INSERT INTO deposits (institution_id, user_id, method, status, amount, currency,
        external_reference, stripe_payment_intent, description)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING ${DEPOSIT_COLUMNS}`,
      [
        data.institutionId,
        data.userId,
        data.method,
        status,
        amount,
        currency,
        externalReference,
        stripePaymentIntent,
        data.description ?? null,
      ],
    );

    logger.info('Deposit initiated', {
      depositId: rows[0].id,
      method: data.method,
      amount,
      status,
    });

    return rows[0];
  }

  async completeDeposit(depositId: string): Promise<Deposit> {
    const deposit = await this.findById(depositId);

    if (deposit.status === 'completed') {
      throw new ValidationError('Deposit is already completed');
    }
    if (deposit.status === 'failed' || deposit.status === 'cancelled') {
      throw new ValidationError(`Cannot complete a ${deposit.status} deposit`);
    }

    // Look up GL accounts by code
    const cashAccount = await this.ledgerService.getAccountByCode('1000');
    const clientDepositsAccount = await this.ledgerService.getAccountByCode('2100');

    // Create double-entry journal: Debit Cash, Credit Client Deposits
    const journalEntry = await this.ledgerService.createJournalEntry({
      referenceType: 'deposit',
      referenceId: deposit.id,
      description: `${deposit.method.toUpperCase()} deposit - $${deposit.amount}`,
      createdBy: deposit.userId,
      lines: [
        {
          accountId: cashAccount.id,
          debitAmount: parseFloat(deposit.amount),
          creditAmount: 0,
          description: `Cash received via ${deposit.method}`,
        },
        {
          accountId: clientDepositsAccount.id,
          debitAmount: 0,
          creditAmount: parseFloat(deposit.amount),
          description: `Client deposit liability - ${deposit.institutionId}`,
        },
      ],
    });

    const rows = await this.db.query<Deposit>(
      `UPDATE deposits
       SET status = 'completed', journal_entry_id = $2, completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${DEPOSIT_COLUMNS}`,
      [depositId, journalEntry.id],
    );

    logger.info('Deposit completed', {
      depositId,
      journalEntryId: journalEntry.id,
      amount: deposit.amount,
    });

    return rows[0];
  }

  async failDeposit(depositId: string, reason: string): Promise<Deposit> {
    const deposit = await this.findById(depositId);

    if (deposit.status === 'completed') {
      throw new ValidationError('Cannot fail a completed deposit');
    }
    if (deposit.status === 'failed') {
      throw new ValidationError('Deposit is already failed');
    }

    if (deposit.method === 'card' && deposit.stripePaymentIntent && this.paymentProvider) {
      await this.paymentProvider.cancelPaymentIntent(deposit.stripePaymentIntent);
    }

    const rows = await this.db.query<Deposit>(
      `UPDATE deposits
       SET status = 'failed', failure_reason = $2, failed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${DEPOSIT_COLUMNS}`,
      [depositId, reason],
    );

    logger.info('Deposit failed', { depositId, reason });

    return rows[0];
  }

  async cancelDeposit(depositId: string): Promise<Deposit> {
    const deposit = await this.findById(depositId);

    if (deposit.status !== 'pending') {
      throw new ValidationError(`Can only cancel pending deposits, current status: ${deposit.status}`);
    }

    if (deposit.method === 'card' && deposit.stripePaymentIntent && this.paymentProvider) {
      await this.paymentProvider.cancelPaymentIntent(deposit.stripePaymentIntent);
    }

    const rows = await this.db.query<Deposit>(
      `UPDATE deposits
       SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1
       RETURNING ${DEPOSIT_COLUMNS}`,
      [depositId],
    );

    logger.info('Deposit cancelled', { depositId });

    return rows[0];
  }

  async findById(id: string): Promise<Deposit> {
    const rows = await this.db.query<Deposit>(
      `SELECT ${DEPOSIT_COLUMNS} FROM deposits WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Deposit', id);
    }

    return rows[0];
  }

  async listDeposits(params: DepositListQuery): Promise<{ deposits: Deposit[]; total: number }> {
    const conditions: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.institutionId) {
      conditions.push(`institution_id = $${paramIndex++}`);
      values.push(params.institutionId);
    }
    if (params.userId) {
      conditions.push(`user_id = $${paramIndex++}`);
      values.push(params.userId);
    }
    if (params.status) {
      conditions.push(`status = $${paramIndex++}`);
      values.push(params.status);
    }
    if (params.method) {
      conditions.push(`method = $${paramIndex++}`);
      values.push(params.method);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countRows = await this.db.query<{ count: string }>(
      `SELECT COUNT(*) AS count FROM deposits ${where}`,
      values,
    );
    const total = parseInt(countRows[0].count, 10);

    if (total === 0) {
      return { deposits: [], total: 0 };
    }

    const deposits = await this.db.query<Deposit>(
      `SELECT ${DEPOSIT_COLUMNS} FROM deposits ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, params.limit, params.offset],
    );

    return { deposits, total };
  }

  async getDepositsByInstitution(
    institutionId: string,
    params: { limit: number; offset: number },
  ): Promise<{ deposits: Deposit[]; total: number }> {
    return this.listDeposits({ institutionId, ...params });
  }
}
