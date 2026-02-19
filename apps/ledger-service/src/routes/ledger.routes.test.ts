import request from 'supertest';
import express from 'express';
import { createAccountRouter, createEntryRouter, createTrialBalanceRouter } from './ledger.routes';
import { errorHandler } from '../middleware/errorHandler';
import { requestIdMiddleware } from '../middleware/requestId';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ACCOUNT_ID = 'a10e8400-e29b-41d4-a716-446655440001';
const ACCOUNT_ID_2 = 'a10e8400-e29b-41d4-a716-446655440002';
const ENTRY_ID = 'e10e8400-e29b-41d4-a716-446655440001';
const USER_ID = 'b10e8400-e29b-41d4-a716-446655440001';
const REF_ID = 'c10e8400-e29b-41d4-a716-446655440001';

const CASH_ACCOUNT = {
  id: ACCOUNT_ID,
  code: '1000',
  name: 'Cash',
  category: 'asset',
  description: 'Cash and cash equivalents',
  isActive: true,
  parentAccountId: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const JOURNAL_ENTRY = {
  id: ENTRY_ID,
  referenceType: 'trade',
  referenceId: REF_ID,
  description: 'Trade settlement fee',
  status: 'posted',
  postedAt: new Date(),
  reversedAt: null,
  reversalOfId: null,
  createdBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
  lines: [
    {
      id: 'l1',
      journalEntryId: ENTRY_ID,
      accountId: ACCOUNT_ID,
      debitAmount: '100.00',
      creditAmount: '0.00',
      description: 'Cash debit',
      createdAt: new Date(),
    },
    {
      id: 'l2',
      journalEntryId: ENTRY_ID,
      accountId: ACCOUNT_ID_2,
      debitAmount: '0.00',
      creditAmount: '100.00',
      description: 'Revenue credit',
      createdAt: new Date(),
    },
  ],
};

const ACCOUNT_BALANCE = {
  accountId: ACCOUNT_ID,
  accountCode: '1000',
  accountName: 'Cash',
  category: 'asset',
  totalDebits: '500.00',
  totalCredits: '200.00',
  balance: '300.00',
};

const TRIAL_BALANCE = {
  accounts: [ACCOUNT_BALANCE],
  totalDebits: '500.00',
  totalCredits: '500.00',
  isBalanced: true,
  asOf: new Date(),
};

function makeLedgerService(opts: {
  createAccount?: jest.Mock;
  listAccounts?: jest.Mock;
  getAccountById?: jest.Mock;
  getAccountBalance?: jest.Mock;
  createJournalEntry?: jest.Mock;
  listJournalEntries?: jest.Mock;
  getJournalEntryById?: jest.Mock;
  reverseJournalEntry?: jest.Mock;
  getTrialBalance?: jest.Mock;
} = {}) {
  return {
    createAccount: opts.createAccount ?? jest.fn().mockResolvedValue(CASH_ACCOUNT),
    listAccounts: opts.listAccounts ?? jest.fn().mockResolvedValue({ accounts: [CASH_ACCOUNT], total: 1 }),
    getAccountById: opts.getAccountById ?? jest.fn().mockResolvedValue(CASH_ACCOUNT),
    getAccountByCode: jest.fn().mockResolvedValue(CASH_ACCOUNT),
    getAccountBalance: opts.getAccountBalance ?? jest.fn().mockResolvedValue(ACCOUNT_BALANCE),
    createJournalEntry: opts.createJournalEntry ?? jest.fn().mockResolvedValue(JOURNAL_ENTRY),
    listJournalEntries: opts.listJournalEntries ?? jest.fn().mockResolvedValue({ entries: [JOURNAL_ENTRY], total: 1 }),
    getJournalEntryById: opts.getJournalEntryById ?? jest.fn().mockResolvedValue(JOURNAL_ENTRY),
    reverseJournalEntry: opts.reverseJournalEntry ?? jest.fn().mockResolvedValue(JOURNAL_ENTRY),
    getTrialBalance: opts.getTrialBalance ?? jest.fn().mockResolvedValue(TRIAL_BALANCE),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeLedgerService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  const service = makeLedgerService(serviceOpts);
  app.use('/accounts', createAccountRouter({ ledgerService: service as never }));
  app.use('/entries', createEntryRouter({ ledgerService: service as never }));
  app.use('/trial-balance', createTrialBalanceRouter({ ledgerService: service as never }));
  app.use(errorHandler);
  return app;
}

// ─── Account Routes ──────────────────────────────────────────────────────────

describe('POST /accounts', () => {
  it('should return 201 with created account', async () => {
    const res = await request(makeApp())
      .post('/accounts')
      .send({ code: '1000', name: 'Cash', category: 'asset' });

    expect(res.status).toBe(201);
    expect(res.body.data.code).toBe('1000');
  });

  it('should return 422 for missing code', async () => {
    const res = await request(makeApp())
      .post('/accounts')
      .send({ name: 'Cash', category: 'asset' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid category', async () => {
    const res = await request(makeApp())
      .post('/accounts')
      .send({ code: '1000', name: 'Cash', category: 'invalid' });

    expect(res.status).toBe(422);
  });

  it('should pass data to service', async () => {
    const createAccount = jest.fn().mockResolvedValue(CASH_ACCOUNT);
    await request(makeApp({ createAccount }))
      .post('/accounts')
      .send({ code: '1000', name: 'Cash', category: 'asset', description: 'Cash account' });

    expect(createAccount).toHaveBeenCalledWith(
      expect.objectContaining({ code: '1000', name: 'Cash', category: 'asset' }),
    );
  });
});

describe('GET /accounts', () => {
  it('should return 200 with account list', async () => {
    const res = await request(makeApp()).get('/accounts');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass category filter to service', async () => {
    const listAccounts = jest.fn().mockResolvedValue({ accounts: [], total: 0 });
    await request(makeApp({ listAccounts })).get('/accounts?category=asset');

    expect(listAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ category: 'asset' }),
    );
  });
});

describe('GET /accounts/:id', () => {
  it('should return 200 with account', async () => {
    const res = await request(makeApp()).get(`/accounts/${ACCOUNT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ACCOUNT_ID);
  });

  it('should pass id to service', async () => {
    const getAccountById = jest.fn().mockResolvedValue(CASH_ACCOUNT);
    await request(makeApp({ getAccountById })).get(`/accounts/${ACCOUNT_ID}`);

    expect(getAccountById).toHaveBeenCalledWith(ACCOUNT_ID);
  });
});

describe('GET /accounts/:id/balance', () => {
  it('should return 200 with balance', async () => {
    const res = await request(makeApp()).get(`/accounts/${ACCOUNT_ID}/balance`);

    expect(res.status).toBe(200);
    expect(res.body.data.balance).toBe('300.00');
  });

  it('should pass id to service', async () => {
    const getAccountBalance = jest.fn().mockResolvedValue(ACCOUNT_BALANCE);
    await request(makeApp({ getAccountBalance })).get(`/accounts/${ACCOUNT_ID}/balance`);

    expect(getAccountBalance).toHaveBeenCalledWith(ACCOUNT_ID);
  });
});

// ─── Entry Routes ────────────────────────────────────────────────────────────

describe('POST /entries', () => {
  it('should return 201 with created entry', async () => {
    const res = await request(makeApp())
      .post('/entries')
      .send({
        referenceType: 'trade',
        referenceId: REF_ID,
        description: 'Trade fee',
        createdBy: USER_ID,
        lines: [
          { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
          { accountId: ACCOUNT_ID_2, debitAmount: 0, creditAmount: 100 },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.data.id).toBe(ENTRY_ID);
    expect(res.body.data.lines).toHaveLength(2);
  });

  it('should return 422 for missing referenceType', async () => {
    const res = await request(makeApp())
      .post('/entries')
      .send({
        referenceId: REF_ID,
        description: 'Test',
        createdBy: USER_ID,
        lines: [
          { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
          { accountId: ACCOUNT_ID_2, debitAmount: 0, creditAmount: 100 },
        ],
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 for too few lines', async () => {
    const res = await request(makeApp())
      .post('/entries')
      .send({
        referenceType: 'trade',
        referenceId: REF_ID,
        description: 'Test',
        createdBy: USER_ID,
        lines: [
          { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
        ],
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid createdBy UUID', async () => {
    const res = await request(makeApp())
      .post('/entries')
      .send({
        referenceType: 'trade',
        referenceId: REF_ID,
        description: 'Test',
        createdBy: 'not-a-uuid',
        lines: [
          { accountId: ACCOUNT_ID, debitAmount: 100, creditAmount: 0 },
          { accountId: ACCOUNT_ID_2, debitAmount: 0, creditAmount: 100 },
        ],
      });

    expect(res.status).toBe(422);
  });
});

describe('GET /entries', () => {
  it('should return 200 with entry list', async () => {
    const res = await request(makeApp()).get('/entries');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass filters to service', async () => {
    const listJournalEntries = jest.fn().mockResolvedValue({ entries: [], total: 0 });
    await request(makeApp({ listJournalEntries })).get('/entries?status=posted&referenceType=trade');

    expect(listJournalEntries).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'posted', referenceType: 'trade' }),
    );
  });
});

describe('GET /entries/:id', () => {
  it('should return 200 with entry and lines', async () => {
    const res = await request(makeApp()).get(`/entries/${ENTRY_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ENTRY_ID);
    expect(res.body.data.lines).toHaveLength(2);
  });

  it('should pass id to service', async () => {
    const getJournalEntryById = jest.fn().mockResolvedValue(JOURNAL_ENTRY);
    await request(makeApp({ getJournalEntryById })).get(`/entries/${ENTRY_ID}`);

    expect(getJournalEntryById).toHaveBeenCalledWith(ENTRY_ID);
  });
});

describe('POST /entries/:id/reverse', () => {
  it('should return 201 with reversal entry', async () => {
    const res = await request(makeApp())
      .post(`/entries/${ENTRY_ID}/reverse`)
      .send({ reversedBy: USER_ID });

    expect(res.status).toBe(201);
  });

  it('should return 422 for invalid reversedBy UUID', async () => {
    const res = await request(makeApp())
      .post(`/entries/${ENTRY_ID}/reverse`)
      .send({ reversedBy: 'not-a-uuid' });

    expect(res.status).toBe(422);
  });

  it('should pass id and reversedBy to service', async () => {
    const reverseJournalEntry = jest.fn().mockResolvedValue(JOURNAL_ENTRY);
    await request(makeApp({ reverseJournalEntry }))
      .post(`/entries/${ENTRY_ID}/reverse`)
      .send({ reversedBy: USER_ID });

    expect(reverseJournalEntry).toHaveBeenCalledWith(ENTRY_ID, USER_ID);
  });
});

// ─── Trial Balance Routes ────────────────────────────────────────────────────

describe('GET /trial-balance', () => {
  it('should return 200 with trial balance', async () => {
    const res = await request(makeApp()).get('/trial-balance');

    expect(res.status).toBe(200);
    expect(res.body.data.isBalanced).toBe(true);
    expect(res.body.data.accounts).toHaveLength(1);
  });

  it('should call service', async () => {
    const getTrialBalance = jest.fn().mockResolvedValue(TRIAL_BALANCE);
    await request(makeApp({ getTrialBalance })).get('/trial-balance');

    expect(getTrialBalance).toHaveBeenCalled();
  });
});
