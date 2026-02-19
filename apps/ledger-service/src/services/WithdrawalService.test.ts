import { WithdrawalService } from './WithdrawalService';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const INSTITUTION_ID = 'a10e8400-e29b-41d4-a716-446655440001';
const USER_ID = 'b10e8400-e29b-41d4-a716-446655440002';
const APPROVER_ID = 'b10e8400-e29b-41d4-a716-446655440009';
const WITHDRAWAL_ID = 'c10e8400-e29b-41d4-a716-446655440003';
const JOURNAL_ENTRY_ID = 'd10e8400-e29b-41d4-a716-446655440004';
const FEE_JOURNAL_ID = 'd10e8400-e29b-41d4-a716-446655440005';
const CASH_ACCOUNT_ID = 'e10e8400-e29b-41d4-a716-446655440005';
const DEPOSIT_ACCOUNT_ID = 'f10e8400-e29b-41d4-a716-446655440006';
const FEE_ACCOUNT_ID = 'f10e8400-e29b-41d4-a716-446655440007';

const APPROVED_WITHDRAWAL = {
  id: WITHDRAWAL_ID,
  institutionId: INSTITUTION_ID,
  userId: USER_ID,
  method: 'wire' as const,
  status: 'approved' as const,
  amount: '10000.00',
  feeAmount: '50.00',
  netAmount: '9950.00',
  currency: 'USD',
  externalReference: 'WIRE-123',
  description: null,
  journalEntryId: null,
  feeJournalEntryId: null,
  requiresApproval: false,
  approvedBy: null,
  approvedAt: null,
  rejectedBy: null,
  rejectedAt: null,
  rejectionReason: null,
  failureReason: null,
  completedAt: null,
  failedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const PENDING_WITHDRAWAL = {
  ...APPROVED_WITHDRAWAL,
  status: 'pending_approval' as const,
  amount: '60000.00',
  feeAmount: '300.00',
  netAmount: '59700.00',
  requiresApproval: true,
};

const COMPLETED_WITHDRAWAL = {
  ...APPROVED_WITHDRAWAL,
  status: 'completed' as const,
  journalEntryId: JOURNAL_ENTRY_ID,
  feeJournalEntryId: FEE_JOURNAL_ID,
  completedAt: new Date(),
};

function makeMockDb(queryResults: unknown[][] = []) {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() =>
      Promise.resolve(queryResults[callIndex++] ?? []),
    ),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    end: jest.fn(),
  };
}

function makeMockLedgerService() {
  return {
    getAccountByCode: jest.fn().mockImplementation((code: string) => {
      if (code === '1000') return Promise.resolve({ id: CASH_ACCOUNT_ID, code: '1000', name: 'Cash', category: 'asset' });
      if (code === '2100') return Promise.resolve({ id: DEPOSIT_ACCOUNT_ID, code: '2100', name: 'Client Deposits', category: 'liability' });
      if (code === '3200') return Promise.resolve({ id: FEE_ACCOUNT_ID, code: '3200', name: 'Withdrawal Fee Revenue', category: 'revenue' });
      return Promise.reject(new Error('Account not found'));
    }),
    createJournalEntry: jest.fn().mockImplementation((data) => {
      if (data.referenceType === 'withdrawal_fee') {
        return Promise.resolve({ id: FEE_JOURNAL_ID, referenceType: 'withdrawal_fee', status: 'posted', lines: [] });
      }
      return Promise.resolve({ id: JOURNAL_ENTRY_ID, referenceType: 'withdrawal', status: 'posted', lines: [] });
    }),
  };
}

function makeMockBalanceService() {
  return {
    getAccountBalance: jest.fn().mockResolvedValue({
      accountId: DEPOSIT_ACCOUNT_ID,
      balance: '100000.00',
    }),
    invalidateCache: jest.fn().mockResolvedValue(undefined),
  };
}

// ─── requestWithdrawal ───────────────────────────────────────────────────────

describe('WithdrawalService', () => {
  describe('requestWithdrawal', () => {
    it('should create withdrawal with approved status for small amounts', async () => {
      const db = makeMockDb([[APPROVED_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.requestWithdrawal({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 10000,
      });

      expect(result.status).toBe('approved');
      expect(result.requiresApproval).toBe(false);
    });

    it('should require approval for amounts over $50,000', async () => {
      const db = makeMockDb([[PENDING_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await service.requestWithdrawal({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 60000,
      });

      // Check the INSERT parameters — status is at index 3
      const insertCall = db.query.mock.calls[0];
      expect(insertCall[1][3]).toBe('pending_approval');
      expect(insertCall[1][10]).toBe(true); // requiresApproval
    });

    it('should calculate 0.5% fee', async () => {
      const db = makeMockDb([[APPROVED_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await service.requestWithdrawal({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 10000,
      });

      const insertCall = db.query.mock.calls[0];
      expect(insertCall[1][5]).toBe(50); // feeAmount = 10000 * 0.005
      expect(insertCall[1][6]).toBe(9950); // netAmount = 10000 - 50
    });

    it('should reject amounts below minimum ($100)', async () => {
      const db = makeMockDb();
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await expect(
        service.requestWithdrawal({
          institutionId: INSTITUTION_ID,
          userId: USER_ID,
          method: 'wire',
          amount: 50,
        }),
      ).rejects.toThrow('Minimum withdrawal');
    });

    it('should reject when insufficient balance', async () => {
      const db = makeMockDb();
      const ledger = makeMockLedgerService();
      const balance = makeMockBalanceService();
      balance.getAccountBalance.mockResolvedValue({ accountId: DEPOSIT_ACCOUNT_ID, balance: '500.00' });
      const service = new WithdrawalService(db as never, ledger as never, balance as never);

      await expect(
        service.requestWithdrawal({
          institutionId: INSTITUTION_ID,
          userId: USER_ID,
          method: 'wire',
          amount: 1000,
        }),
      ).rejects.toThrow('Insufficient balance');
    });

    it('should allow withdrawal when balance is sufficient', async () => {
      const db = makeMockDb([[APPROVED_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const balance = makeMockBalanceService();
      const service = new WithdrawalService(db as never, ledger as never, balance as never);

      const result = await service.requestWithdrawal({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 10000,
      });

      expect(result.status).toBe('approved');
    });
  });

  // ─── approveWithdrawal ──────────────────────────────────────────────────────

  describe('approveWithdrawal', () => {
    it('should approve a pending_approval withdrawal', async () => {
      const approved = { ...PENDING_WITHDRAWAL, status: 'approved', approvedBy: APPROVER_ID };
      const db = makeMockDb([
        [PENDING_WITHDRAWAL],  // findById
        [approved],            // UPDATE
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.approveWithdrawal(WITHDRAWAL_ID, APPROVER_ID);

      expect(result.status).toBe('approved');
      expect(result.approvedBy).toBe(APPROVER_ID);
    });

    it('should reject approving non-pending_approval withdrawal', async () => {
      const db = makeMockDb([[APPROVED_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await expect(service.approveWithdrawal(WITHDRAWAL_ID, APPROVER_ID)).rejects.toThrow('only approve pending_approval');
    });
  });

  // ─── rejectWithdrawal ──────────────────────────────────────────────────────

  describe('rejectWithdrawal', () => {
    it('should reject a pending_approval withdrawal', async () => {
      const rejected = { ...PENDING_WITHDRAWAL, status: 'rejected', rejectedBy: APPROVER_ID, rejectionReason: 'Suspicious' };
      const db = makeMockDb([
        [PENDING_WITHDRAWAL],
        [rejected],
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.rejectWithdrawal(WITHDRAWAL_ID, APPROVER_ID, 'Suspicious');

      expect(result.status).toBe('rejected');
      expect(result.rejectionReason).toBe('Suspicious');
    });

    it('should reject rejecting non-pending_approval withdrawal', async () => {
      const db = makeMockDb([[APPROVED_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await expect(service.rejectWithdrawal(WITHDRAWAL_ID, APPROVER_ID, 'reason')).rejects.toThrow('only reject pending_approval');
    });
  });

  // ─── processWithdrawal ─────────────────────────────────────────────────────

  describe('processWithdrawal', () => {
    it('should process approved withdrawal and create journal entries', async () => {
      const db = makeMockDb([
        [APPROVED_WITHDRAWAL],     // findById
        [COMPLETED_WITHDRAWAL],    // UPDATE
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.processWithdrawal(WITHDRAWAL_ID);

      expect(result.status).toBe('completed');
      expect(result.journalEntryId).toBe(JOURNAL_ENTRY_ID);
    });

    it('should create main journal entry: debit Client Deposits, credit Cash', async () => {
      const db = makeMockDb([
        [APPROVED_WITHDRAWAL],
        [COMPLETED_WITHDRAWAL],
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await service.processWithdrawal(WITHDRAWAL_ID);

      expect(ledger.getAccountByCode).toHaveBeenCalledWith('1000');
      expect(ledger.getAccountByCode).toHaveBeenCalledWith('2100');
      expect(ledger.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: 'withdrawal',
          lines: expect.arrayContaining([
            expect.objectContaining({
              accountId: DEPOSIT_ACCOUNT_ID,
              debitAmount: 9950,
              creditAmount: 0,
            }),
            expect.objectContaining({
              accountId: CASH_ACCOUNT_ID,
              debitAmount: 0,
              creditAmount: 9950,
            }),
          ]),
        }),
      );
    });

    it('should create fee journal entry', async () => {
      const db = makeMockDb([
        [APPROVED_WITHDRAWAL],
        [COMPLETED_WITHDRAWAL],
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await service.processWithdrawal(WITHDRAWAL_ID);

      expect(ledger.getAccountByCode).toHaveBeenCalledWith('3200');
      expect(ledger.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: 'withdrawal_fee',
          lines: expect.arrayContaining([
            expect.objectContaining({
              accountId: DEPOSIT_ACCOUNT_ID,
              debitAmount: 50,
            }),
            expect.objectContaining({
              accountId: FEE_ACCOUNT_ID,
              creditAmount: 50,
            }),
          ]),
        }),
      );
    });

    it('should invalidate balance cache after processing', async () => {
      const db = makeMockDb([
        [APPROVED_WITHDRAWAL],
        [COMPLETED_WITHDRAWAL],
      ]);
      const ledger = makeMockLedgerService();
      const balance = makeMockBalanceService();
      const service = new WithdrawalService(db as never, ledger as never, balance as never);

      await service.processWithdrawal(WITHDRAWAL_ID);

      expect(balance.invalidateCache).toHaveBeenCalled();
    });

    it('should reject processing non-approved withdrawal', async () => {
      const db = makeMockDb([[PENDING_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await expect(service.processWithdrawal(WITHDRAWAL_ID)).rejects.toThrow('only process approved');
    });
  });

  // ─── failWithdrawal ────────────────────────────────────────────────────────

  describe('failWithdrawal', () => {
    it('should fail a withdrawal with reason', async () => {
      const failed = { ...APPROVED_WITHDRAWAL, status: 'failed', failureReason: 'Bank rejected' };
      const db = makeMockDb([
        [APPROVED_WITHDRAWAL],
        [failed],
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.failWithdrawal(WITHDRAWAL_ID, 'Bank rejected');

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Bank rejected');
    });

    it('should reject failing a completed withdrawal', async () => {
      const db = makeMockDb([[COMPLETED_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await expect(service.failWithdrawal(WITHDRAWAL_ID, 'reason')).rejects.toThrow('Cannot fail');
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return withdrawal by ID', async () => {
      const db = makeMockDb([[APPROVED_WITHDRAWAL]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.findById(WITHDRAWAL_ID);

      expect(result.id).toBe(WITHDRAWAL_ID);
    });

    it('should throw NotFoundError when not found', async () => {
      const db = makeMockDb([[]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await expect(service.findById('nonexistent')).rejects.toThrow('Withdrawal');
    });
  });

  // ─── listWithdrawals ──────────────────────────────────────────────────────

  describe('listWithdrawals', () => {
    it('should return paginated withdrawals', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [APPROVED_WITHDRAWAL],
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.listWithdrawals({ limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.withdrawals).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([[{ count: '0' }]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      await service.listWithdrawals({ status: 'pending_approval', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['pending_approval'],
      );
    });

    it('should return empty when total is 0', async () => {
      const db = makeMockDb([[{ count: '0' }]]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.listWithdrawals({ limit: 20, offset: 0 });

      expect(result.total).toBe(0);
      expect(result.withdrawals).toHaveLength(0);
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getPendingApprovals ───────────────────────────────────────────────────

  describe('getPendingApprovals', () => {
    it('should return pending_approval withdrawals', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [PENDING_WITHDRAWAL],
      ]);
      const ledger = makeMockLedgerService();
      const service = new WithdrawalService(db as never, ledger as never);

      const result = await service.getPendingApprovals();

      expect(result.total).toBe(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['pending_approval'],
      );
    });
  });
});
