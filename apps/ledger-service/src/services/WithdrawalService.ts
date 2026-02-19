import type { IDatabaseClient } from '@libs/database';
import { NotFoundError, ValidationError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { LedgerService } from './LedgerService.js';
import type { BalanceService } from './BalanceService.js';
import type {
  Withdrawal,
  CreateWithdrawalDTO,
  WithdrawalListQuery,
} from '../types/ledger.types.js';

const logger = createLogger('withdrawal-service');

const WITHDRAWAL_COLUMNS = `
  id,
  institution_id       AS "institutionId",
  user_id              AS "userId",
  method,
  status,
  amount,
  fee_amount           AS "feeAmount",
  net_amount           AS "netAmount",
  currency,
  external_reference   AS "externalReference",
  description,
  journal_entry_id     AS "journalEntryId",
  fee_journal_entry_id AS "feeJournalEntryId",
  requires_approval    AS "requiresApproval",
  approved_by          AS "approvedBy",
  approved_at          AS "approvedAt",
  rejected_by          AS "rejectedBy",
  rejected_at          AS "rejectedAt",
  rejection_reason     AS "rejectionReason",
  failure_reason       AS "failureReason",
  completed_at         AS "completedAt",
  failed_at            AS "failedAt",
  created_at           AS "createdAt",
  updated_at           AS "updatedAt"
`;

const WITHDRAWAL_FEE_RATE = 0.005; // 0.5%
const APPROVAL_THRESHOLD = 50_000;
const MIN_WITHDRAWAL_AMOUNT = 100;

export class WithdrawalService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly ledgerService: LedgerService,
    private readonly balanceService?: BalanceService,
  ) {}

  async requestWithdrawal(data: CreateWithdrawalDTO): Promise<Withdrawal> {
    const amount = data.amount;
    const currency = data.currency ?? 'USD';

    if (amount < MIN_WITHDRAWAL_AMOUNT) {
      throw new ValidationError(`Minimum withdrawal amount is $${MIN_WITHDRAWAL_AMOUNT}`, [
        { field: 'amount', message: `Must be at least ${MIN_WITHDRAWAL_AMOUNT}`, code: 'too_small' },
      ]);
    }

    // Check available balance via Client Deposits account
    if (this.balanceService) {
      const clientDepositsAccount = await this.ledgerService.getAccountByCode('2100');
      const balance = await this.balanceService.getAccountBalance(clientDepositsAccount.id);
      const available = parseFloat(balance.balance);
      if (amount > available) {
        throw new ValidationError('Insufficient balance', [
          { field: 'amount', message: `Available balance is ${balance.balance}`, code: 'custom' },
        ]);
      }
    }

    const feeAmount = parseFloat((amount * WITHDRAWAL_FEE_RATE).toFixed(2));
    const netAmount = parseFloat((amount - feeAmount).toFixed(2));
    const requiresApproval = amount > APPROVAL_THRESHOLD;
    const status = requiresApproval ? 'pending_approval' : 'approved';
    const externalReference = `${data.method.toUpperCase()}-${Date.now()}`;

    const rows = await this.db.query<Withdrawal>(
      `INSERT INTO withdrawals (institution_id, user_id, method, status, amount, fee_amount, net_amount,
        currency, external_reference, description, requires_approval)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING ${WITHDRAWAL_COLUMNS}`,
      [
        data.institutionId,
        data.userId,
        data.method,
        status,
        amount,
        feeAmount,
        netAmount,
        currency,
        externalReference,
        data.description ?? null,
        requiresApproval,
      ],
    );

    logger.info('Withdrawal requested', {
      withdrawalId: rows[0].id,
      amount,
      feeAmount,
      requiresApproval,
      status,
    });

    return rows[0];
  }

  async approveWithdrawal(withdrawalId: string, approvedBy: string): Promise<Withdrawal> {
    const withdrawal = await this.findById(withdrawalId);

    if (withdrawal.status !== 'pending_approval') {
      throw new ValidationError(`Can only approve pending_approval withdrawals, current status: ${withdrawal.status}`);
    }

    const rows = await this.db.query<Withdrawal>(
      `UPDATE withdrawals
       SET status = 'approved', approved_by = $2, approved_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${WITHDRAWAL_COLUMNS}`,
      [withdrawalId, approvedBy],
    );

    logger.info('Withdrawal approved', { withdrawalId, approvedBy });

    return rows[0];
  }

  async rejectWithdrawal(withdrawalId: string, rejectedBy: string, reason: string): Promise<Withdrawal> {
    const withdrawal = await this.findById(withdrawalId);

    if (withdrawal.status !== 'pending_approval') {
      throw new ValidationError(`Can only reject pending_approval withdrawals, current status: ${withdrawal.status}`);
    }

    const rows = await this.db.query<Withdrawal>(
      `UPDATE withdrawals
       SET status = 'rejected', rejected_by = $2, rejected_at = NOW(), rejection_reason = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING ${WITHDRAWAL_COLUMNS}`,
      [withdrawalId, rejectedBy, reason],
    );

    logger.info('Withdrawal rejected', { withdrawalId, rejectedBy, reason });

    return rows[0];
  }

  async processWithdrawal(withdrawalId: string): Promise<Withdrawal> {
    const withdrawal = await this.findById(withdrawalId);

    if (withdrawal.status !== 'approved') {
      throw new ValidationError(`Can only process approved withdrawals, current status: ${withdrawal.status}`);
    }

    // Look up GL accounts
    const cashAccount = await this.ledgerService.getAccountByCode('1000');
    const clientDepositsAccount = await this.ledgerService.getAccountByCode('2100');
    const feeRevenueAccount = await this.ledgerService.getAccountByCode('3200');

    // Create main withdrawal journal entry: Debit Client Deposits, Credit Cash
    const journalEntry = await this.ledgerService.createJournalEntry({
      referenceType: 'withdrawal',
      referenceId: withdrawal.id,
      description: `${withdrawal.method.toUpperCase()} withdrawal - $${withdrawal.netAmount}`,
      createdBy: withdrawal.userId,
      lines: [
        {
          accountId: clientDepositsAccount.id,
          debitAmount: parseFloat(withdrawal.netAmount),
          creditAmount: 0,
          description: `Client deposit reduction - withdrawal`,
        },
        {
          accountId: cashAccount.id,
          debitAmount: 0,
          creditAmount: parseFloat(withdrawal.netAmount),
          description: `Cash outflow via ${withdrawal.method}`,
        },
      ],
    });

    // Create fee journal entry if fee > 0
    let feeJournalEntryId: string | null = null;
    const feeAmount = parseFloat(withdrawal.feeAmount);
    if (feeAmount > 0) {
      const feeEntry = await this.ledgerService.createJournalEntry({
        referenceType: 'withdrawal_fee',
        referenceId: withdrawal.id,
        description: `Withdrawal fee - $${withdrawal.feeAmount}`,
        createdBy: withdrawal.userId,
        lines: [
          {
            accountId: clientDepositsAccount.id,
            debitAmount: feeAmount,
            creditAmount: 0,
            description: 'Withdrawal fee deduction',
          },
          {
            accountId: feeRevenueAccount.id,
            debitAmount: 0,
            creditAmount: feeAmount,
            description: 'Withdrawal fee revenue',
          },
        ],
      });
      feeJournalEntryId = feeEntry.id;
    }

    const rows = await this.db.query<Withdrawal>(
      `UPDATE withdrawals
       SET status = 'completed', journal_entry_id = $2, fee_journal_entry_id = $3,
           completed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${WITHDRAWAL_COLUMNS}`,
      [withdrawalId, journalEntry.id, feeJournalEntryId],
    );

    // Invalidate balance cache
    if (this.balanceService) {
      await this.balanceService.invalidateCache();
    }

    logger.info('Withdrawal processed', {
      withdrawalId,
      journalEntryId: journalEntry.id,
      feeJournalEntryId,
      netAmount: withdrawal.netAmount,
    });

    return rows[0];
  }

  async failWithdrawal(withdrawalId: string, reason: string): Promise<Withdrawal> {
    const withdrawal = await this.findById(withdrawalId);

    if (withdrawal.status === 'completed' || withdrawal.status === 'rejected') {
      throw new ValidationError(`Cannot fail a ${withdrawal.status} withdrawal`);
    }

    const rows = await this.db.query<Withdrawal>(
      `UPDATE withdrawals
       SET status = 'failed', failure_reason = $2, failed_at = NOW(), updated_at = NOW()
       WHERE id = $1
       RETURNING ${WITHDRAWAL_COLUMNS}`,
      [withdrawalId, reason],
    );

    logger.info('Withdrawal failed', { withdrawalId, reason });

    return rows[0];
  }

  async findById(id: string): Promise<Withdrawal> {
    const rows = await this.db.query<Withdrawal>(
      `SELECT ${WITHDRAWAL_COLUMNS} FROM withdrawals WHERE id = $1`,
      [id],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Withdrawal', id);
    }

    return rows[0];
  }

  async listWithdrawals(params: WithdrawalListQuery): Promise<{ withdrawals: Withdrawal[]; total: number }> {
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
      `SELECT COUNT(*) AS count FROM withdrawals ${where}`,
      values,
    );
    const total = parseInt(countRows[0].count, 10);

    if (total === 0) {
      return { withdrawals: [], total: 0 };
    }

    const withdrawals = await this.db.query<Withdrawal>(
      `SELECT ${WITHDRAWAL_COLUMNS} FROM withdrawals ${where}
       ORDER BY created_at DESC
       LIMIT $${paramIndex++} OFFSET $${paramIndex}`,
      [...values, params.limit, params.offset],
    );

    return { withdrawals, total };
  }

  async getPendingApprovals(): Promise<{ withdrawals: Withdrawal[]; total: number }> {
    return this.listWithdrawals({ status: 'pending_approval', limit: 100, offset: 0 });
  }
}
