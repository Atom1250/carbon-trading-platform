import { DepositService } from './DepositService';

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
const DEPOSIT_ID = 'c10e8400-e29b-41d4-a716-446655440003';
const JOURNAL_ENTRY_ID = 'd10e8400-e29b-41d4-a716-446655440004';
const CASH_ACCOUNT_ID = 'e10e8400-e29b-41d4-a716-446655440005';
const DEPOSIT_ACCOUNT_ID = 'f10e8400-e29b-41d4-a716-446655440006';

const PENDING_DEPOSIT = {
  id: DEPOSIT_ID,
  institutionId: INSTITUTION_ID,
  userId: USER_ID,
  method: 'wire' as const,
  status: 'pending' as const,
  amount: '5000.00',
  currency: 'USD',
  externalReference: 'WIRE-123',
  stripePaymentIntent: null,
  description: null,
  journalEntryId: null,
  failureReason: null,
  completedAt: null,
  failedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const COMPLETED_DEPOSIT = {
  ...PENDING_DEPOSIT,
  status: 'completed' as const,
  journalEntryId: JOURNAL_ENTRY_ID,
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
      return Promise.reject(new Error('Account not found'));
    }),
    createJournalEntry: jest.fn().mockResolvedValue({
      id: JOURNAL_ENTRY_ID,
      referenceType: 'deposit',
      referenceId: DEPOSIT_ID,
      status: 'posted',
      lines: [],
    }),
  };
}

function makeMockPaymentProvider() {
  return {
    createPaymentIntent: jest.fn().mockResolvedValue({
      id: 'pi_test_123',
      clientSecret: 'secret_test_123',
      status: 'requires_confirmation',
    }),
    confirmPaymentIntent: jest.fn().mockResolvedValue({ status: 'succeeded' }),
    cancelPaymentIntent: jest.fn().mockResolvedValue({ status: 'canceled' }),
  };
}

// ─── initiateDeposit ─────────────────────────────────────────────────────────

describe('DepositService', () => {
  describe('initiateDeposit', () => {
    it('should create a wire deposit with pending status', async () => {
      const db = makeMockDb([[PENDING_DEPOSIT]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.initiateDeposit({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 5000,
      });

      expect(result.status).toBe('pending');
      expect(result.method).toBe('wire');
    });

    it('should create an ACH deposit with processing status', async () => {
      const achDeposit = { ...PENDING_DEPOSIT, method: 'ach', status: 'processing' };
      const db = makeMockDb([[achDeposit]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.initiateDeposit({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'ach',
        amount: 5000,
      });

      expect(result.status).toBe('processing');
    });

    it('should create a card deposit via Stripe', async () => {
      const cardDeposit = { ...PENDING_DEPOSIT, method: 'card', status: 'processing', stripePaymentIntent: 'pi_test_123' };
      const db = makeMockDb([[cardDeposit]]);
      const ledger = makeMockLedgerService();
      const payment = makeMockPaymentProvider();
      const service = new DepositService(db as never, ledger as never, payment);

      const result = await service.initiateDeposit({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'card',
        amount: 5000,
      });

      expect(payment.createPaymentIntent).toHaveBeenCalledWith(5000, 'USD', {
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
      });
      expect(result.stripePaymentIntent).toBe('pi_test_123');
    });

    it('should reject deposits below minimum ($1,000)', async () => {
      const db = makeMockDb();
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(
        service.initiateDeposit({
          institutionId: INSTITUTION_ID,
          userId: USER_ID,
          method: 'wire',
          amount: 500,
        }),
      ).rejects.toThrow('Minimum deposit');
    });

    it('should reject deposits above maximum ($500,000)', async () => {
      const db = makeMockDb();
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(
        service.initiateDeposit({
          institutionId: INSTITUTION_ID,
          userId: USER_ID,
          method: 'wire',
          amount: 600_000,
        }),
      ).rejects.toThrow('Maximum deposit');
    });

    it('should default currency to USD', async () => {
      const db = makeMockDb([[PENDING_DEPOSIT]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await service.initiateDeposit({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 5000,
      });

      // Check the INSERT parameters — currency is at index 5
      const insertCall = db.query.mock.calls[0];
      expect(insertCall[1][5]).toBe('USD');
    });

    it('should pass description to DB', async () => {
      const db = makeMockDb([[PENDING_DEPOSIT]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await service.initiateDeposit({
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        method: 'wire',
        amount: 5000,
        description: 'Initial deposit',
      });

      const insertCall = db.query.mock.calls[0];
      expect(insertCall[1][8]).toBe('Initial deposit');
    });
  });

  // ─── completeDeposit ────────────────────────────────────────────────────────

  describe('completeDeposit', () => {
    it('should complete deposit and create journal entry', async () => {
      const db = makeMockDb([
        [PENDING_DEPOSIT],    // findById
        [COMPLETED_DEPOSIT],  // UPDATE
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.completeDeposit(DEPOSIT_ID);

      expect(result.status).toBe('completed');
      expect(result.journalEntryId).toBe(JOURNAL_ENTRY_ID);
    });

    it('should create double-entry journal: debit Cash, credit Client Deposits', async () => {
      const db = makeMockDb([
        [PENDING_DEPOSIT],
        [COMPLETED_DEPOSIT],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await service.completeDeposit(DEPOSIT_ID);

      expect(ledger.getAccountByCode).toHaveBeenCalledWith('1000');
      expect(ledger.getAccountByCode).toHaveBeenCalledWith('2100');
      expect(ledger.createJournalEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          referenceType: 'deposit',
          referenceId: DEPOSIT_ID,
          lines: expect.arrayContaining([
            expect.objectContaining({
              accountId: CASH_ACCOUNT_ID,
              debitAmount: 5000,
              creditAmount: 0,
            }),
            expect.objectContaining({
              accountId: DEPOSIT_ACCOUNT_ID,
              debitAmount: 0,
              creditAmount: 5000,
            }),
          ]),
        }),
      );
    });

    it('should reject completing an already completed deposit', async () => {
      const db = makeMockDb([[COMPLETED_DEPOSIT]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(service.completeDeposit(DEPOSIT_ID)).rejects.toThrow('already completed');
    });

    it('should reject completing a failed deposit', async () => {
      const failedDeposit = { ...PENDING_DEPOSIT, status: 'failed' };
      const db = makeMockDb([[failedDeposit]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(service.completeDeposit(DEPOSIT_ID)).rejects.toThrow('Cannot complete');
    });

    it('should throw NotFoundError for unknown deposit', async () => {
      const db = makeMockDb([[]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(service.completeDeposit('nonexistent')).rejects.toThrow('Deposit');
    });
  });

  // ─── failDeposit ───────────────────────────────────────────────────────────

  describe('failDeposit', () => {
    it('should mark deposit as failed with reason', async () => {
      const failedDeposit = { ...PENDING_DEPOSIT, status: 'failed', failureReason: 'Insufficient funds' };
      const db = makeMockDb([
        [PENDING_DEPOSIT],  // findById
        [failedDeposit],    // UPDATE
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.failDeposit(DEPOSIT_ID, 'Insufficient funds');

      expect(result.status).toBe('failed');
      expect(result.failureReason).toBe('Insufficient funds');
    });

    it('should cancel Stripe payment intent on card failure', async () => {
      const cardDeposit = { ...PENDING_DEPOSIT, method: 'card', stripePaymentIntent: 'pi_test_123' };
      const failedCard = { ...cardDeposit, status: 'failed' };
      const db = makeMockDb([
        [cardDeposit],
        [failedCard],
      ]);
      const ledger = makeMockLedgerService();
      const payment = makeMockPaymentProvider();
      const service = new DepositService(db as never, ledger as never, payment);

      await service.failDeposit(DEPOSIT_ID, 'Card declined');

      expect(payment.cancelPaymentIntent).toHaveBeenCalledWith('pi_test_123');
    });

    it('should reject failing a completed deposit', async () => {
      const db = makeMockDb([[COMPLETED_DEPOSIT]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(service.failDeposit(DEPOSIT_ID, 'reason')).rejects.toThrow('Cannot fail a completed');
    });

    it('should reject failing an already failed deposit', async () => {
      const failedDeposit = { ...PENDING_DEPOSIT, status: 'failed' };
      const db = makeMockDb([[failedDeposit]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(service.failDeposit(DEPOSIT_ID, 'reason')).rejects.toThrow('already failed');
    });
  });

  // ─── cancelDeposit ─────────────────────────────────────────────────────────

  describe('cancelDeposit', () => {
    it('should cancel a pending deposit', async () => {
      const cancelledDeposit = { ...PENDING_DEPOSIT, status: 'cancelled' };
      const db = makeMockDb([
        [PENDING_DEPOSIT],
        [cancelledDeposit],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.cancelDeposit(DEPOSIT_ID);

      expect(result.status).toBe('cancelled');
    });

    it('should cancel Stripe payment intent for card deposits', async () => {
      const cardDeposit = { ...PENDING_DEPOSIT, method: 'card', status: 'pending', stripePaymentIntent: 'pi_test_123' };
      const cancelledCard = { ...cardDeposit, status: 'cancelled' };
      const db = makeMockDb([
        [cardDeposit],
        [cancelledCard],
      ]);
      const ledger = makeMockLedgerService();
      const payment = makeMockPaymentProvider();
      const service = new DepositService(db as never, ledger as never, payment);

      await service.cancelDeposit(DEPOSIT_ID);

      expect(payment.cancelPaymentIntent).toHaveBeenCalledWith('pi_test_123');
    });

    it('should reject cancelling a non-pending deposit', async () => {
      const processingDeposit = { ...PENDING_DEPOSIT, status: 'processing' };
      const db = makeMockDb([[processingDeposit]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(service.cancelDeposit(DEPOSIT_ID)).rejects.toThrow('only cancel pending');
    });
  });

  // ─── findById ──────────────────────────────────────────────────────────────

  describe('findById', () => {
    it('should return deposit by ID', async () => {
      const db = makeMockDb([[PENDING_DEPOSIT]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.findById(DEPOSIT_ID);

      expect(result.id).toBe(DEPOSIT_ID);
    });

    it('should throw NotFoundError when not found', async () => {
      const db = makeMockDb([[]]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await expect(service.findById('nonexistent')).rejects.toThrow('Deposit');
    });
  });

  // ─── listDeposits ──────────────────────────────────────────────────────────

  describe('listDeposits', () => {
    it('should return paginated deposits', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [PENDING_DEPOSIT],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.listDeposits({ limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(result.deposits).toHaveLength(1);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await service.listDeposits({ status: 'completed', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('status = $1'),
        ['completed'],
      );
    });

    it('should filter by method', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await service.listDeposits({ method: 'wire', limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('method = $1'),
        ['wire'],
      );
    });

    it('should filter by institutionId', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      await service.listDeposits({ institutionId: INSTITUTION_ID, limit: 20, offset: 0 });

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('institution_id = $1'),
        [INSTITUTION_ID],
      );
    });

    it('should return empty when total is 0', async () => {
      const db = makeMockDb([
        [{ count: '0' }],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.listDeposits({ limit: 20, offset: 0 });

      expect(result.total).toBe(0);
      expect(result.deposits).toHaveLength(0);
      // Only count query, no data query
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });

  // ─── getDepositsByInstitution ──────────────────────────────────────────────

  describe('getDepositsByInstitution', () => {
    it('should delegate to listDeposits with institutionId', async () => {
      const db = makeMockDb([
        [{ count: '1' }],
        [PENDING_DEPOSIT],
      ]);
      const ledger = makeMockLedgerService();
      const service = new DepositService(db as never, ledger as never);

      const result = await service.getDepositsByInstitution(INSTITUTION_ID, { limit: 20, offset: 0 });

      expect(result.total).toBe(1);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('institution_id = $1'),
        [INSTITUTION_ID],
      );
    });
  });
});
