import request from 'supertest';
import express from 'express';
import { createBankReconciliationRouter } from './bank-reconciliation.routes';
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

const INSTITUTION_ID = 'a10e8400-e29b-41d4-a716-446655440001';
const USER_ID = 'b10e8400-e29b-41d4-a716-446655440002';
const STATEMENT_ID = 'c10e8400-e29b-41d4-a716-446655440003';
const ENTRY_ID = 'd10e8400-e29b-41d4-a716-446655440004';
const RUN_ID = 'e10e8400-e29b-41d4-a716-446655440005';

const MOCK_STATEMENT = {
  id: STATEMENT_ID,
  institutionId: INSTITUTION_ID,
  bankName: 'Test Bank',
  accountNumber: '****1234',
  statementDate: new Date('2025-01-31'),
  openingBalance: '10000.00',
  closingBalance: '15000.00',
  entryCount: 2,
  importedBy: USER_ID,
  fileName: 'jan-2025.csv',
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_ENTRY = {
  id: ENTRY_ID,
  statementId: STATEMENT_ID,
  transactionDate: new Date('2025-01-15'),
  description: 'Wire deposit',
  reference: 'WIRE-001',
  debitAmount: '0.00',
  creditAmount: '5000.00',
  balance: '15000.00',
  matchStatus: 'unmatched',
  matchedDepositId: null,
  matchedWithdrawalId: null,
  matchConfidence: null,
  disputeReason: null,
  resolvedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const MOCK_RUN = {
  id: RUN_ID,
  institutionId: INSTITUTION_ID,
  statementId: STATEMENT_ID,
  status: 'completed',
  totalEntries: 2,
  matchedCount: 2,
  unmatchedCount: 0,
  disputedCount: 0,
  matchRate: '100.00',
  totalVariance: '0.00',
  startedAt: new Date(),
  completedAt: new Date(),
  runBy: USER_ID,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const CSV_CONTENT = [
  'date,description,reference,debit,credit',
  '2025-01-15,Wire deposit,WIRE-001,,5000.00',
].join('\n');

function makeService(opts: {
  importStatement?: jest.Mock;
  getStatementById?: jest.Mock;
  getEntriesByStatement?: jest.Mock;
  runReconciliation?: jest.Mock;
  listRuns?: jest.Mock;
  getRunById?: jest.Mock;
  getReconciliationReport?: jest.Mock;
  disputeEntry?: jest.Mock;
  resolveEntry?: jest.Mock;
} = {}) {
  return {
    importStatement: opts.importStatement ?? jest.fn().mockResolvedValue({ statement: MOCK_STATEMENT, entries: [MOCK_ENTRY] }),
    getStatementById: opts.getStatementById ?? jest.fn().mockResolvedValue(MOCK_STATEMENT),
    getEntriesByStatement: opts.getEntriesByStatement ?? jest.fn().mockResolvedValue([MOCK_ENTRY]),
    runReconciliation: opts.runReconciliation ?? jest.fn().mockResolvedValue(MOCK_RUN),
    listRuns: opts.listRuns ?? jest.fn().mockResolvedValue({ runs: [MOCK_RUN], total: 1 }),
    getRunById: opts.getRunById ?? jest.fn().mockResolvedValue(MOCK_RUN),
    getReconciliationReport: opts.getReconciliationReport ?? jest.fn().mockResolvedValue({
      run: MOCK_RUN,
      statement: MOCK_STATEMENT,
      entries: [MOCK_ENTRY],
      summary: { totalCredits: 5000, totalDebits: 0, matchedCredits: 5000, matchedDebits: 0, unmatchedCredits: 0, unmatchedDebits: 0 },
    }),
    disputeEntry: opts.disputeEntry ?? jest.fn().mockResolvedValue({ ...MOCK_ENTRY, matchStatus: 'disputed' }),
    resolveEntry: opts.resolveEntry ?? jest.fn().mockResolvedValue({ ...MOCK_ENTRY, matchStatus: 'resolved' }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeService>[0]) {
  const app = express();
  app.use(express.json());
  app.use(requestIdMiddleware);
  app.use('/bank-reconciliation', createBankReconciliationRouter({
    bankReconciliationService: makeService(serviceOpts) as never,
  }));
  app.use(errorHandler);
  return app;
}

// ─── POST /bank-reconciliation/statements ────────────────────────────────────

describe('POST /bank-reconciliation/statements', () => {
  it('should return 201 with imported statement', async () => {
    const res = await request(makeApp())
      .post('/bank-reconciliation/statements')
      .send({
        institutionId: INSTITUTION_ID,
        bankName: 'Test Bank',
        accountNumber: '****1234',
        statementDate: '2025-01-31',
        openingBalance: 10000,
        closingBalance: 15000,
        importedBy: USER_ID,
        csvContent: CSV_CONTENT,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.statement.id).toBe(STATEMENT_ID);
  });

  it('should return 422 for missing csvContent', async () => {
    const res = await request(makeApp())
      .post('/bank-reconciliation/statements')
      .send({
        institutionId: INSTITUTION_ID,
        bankName: 'Test Bank',
        accountNumber: '****1234',
        statementDate: '2025-01-31',
        openingBalance: 10000,
        closingBalance: 15000,
        importedBy: USER_ID,
      });

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid statementDate format', async () => {
    const res = await request(makeApp())
      .post('/bank-reconciliation/statements')
      .send({
        institutionId: INSTITUTION_ID,
        bankName: 'Test Bank',
        accountNumber: '****1234',
        statementDate: 'Jan 31 2025',
        openingBalance: 10000,
        closingBalance: 15000,
        importedBy: USER_ID,
        csvContent: CSV_CONTENT,
      });

    expect(res.status).toBe(422);
  });

  it('should pass data to service', async () => {
    const importStatement = jest.fn().mockResolvedValue({ statement: MOCK_STATEMENT, entries: [] });
    await request(makeApp({ importStatement }))
      .post('/bank-reconciliation/statements')
      .send({
        institutionId: INSTITUTION_ID,
        bankName: 'Test Bank',
        accountNumber: '****1234',
        statementDate: '2025-01-31',
        openingBalance: 10000,
        closingBalance: 15000,
        importedBy: USER_ID,
        csvContent: CSV_CONTENT,
      });

    expect(importStatement).toHaveBeenCalledWith(
      expect.objectContaining({ institutionId: INSTITUTION_ID, bankName: 'Test Bank' }),
      CSV_CONTENT,
    );
  });
});

// ─── GET /bank-reconciliation/statements/:id ────────────────────────────────

describe('GET /bank-reconciliation/statements/:id', () => {
  it('should return 200 with statement', async () => {
    const res = await request(makeApp()).get(`/bank-reconciliation/statements/${STATEMENT_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(STATEMENT_ID);
  });
});

// ─── GET /bank-reconciliation/statements/:id/entries ────────────────────────

describe('GET /bank-reconciliation/statements/:id/entries', () => {
  it('should return 200 with entries', async () => {
    const res = await request(makeApp()).get(`/bank-reconciliation/statements/${STATEMENT_ID}/entries`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('should pass matchStatus filter to service', async () => {
    const getEntriesByStatement = jest.fn().mockResolvedValue([]);
    await request(makeApp({ getEntriesByStatement }))
      .get(`/bank-reconciliation/statements/${STATEMENT_ID}/entries?matchStatus=unmatched`);

    expect(getEntriesByStatement).toHaveBeenCalledWith(STATEMENT_ID, 'unmatched');
  });
});

// ─── POST /bank-reconciliation/statements/:id/reconcile ─────────────────────

describe('POST /bank-reconciliation/statements/:id/reconcile', () => {
  it('should return 200 with reconciliation run', async () => {
    const res = await request(makeApp())
      .post(`/bank-reconciliation/statements/${STATEMENT_ID}/reconcile`)
      .send({ runBy: USER_ID });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('completed');
  });

  it('should pass statementId and runBy to service', async () => {
    const runReconciliation = jest.fn().mockResolvedValue(MOCK_RUN);
    await request(makeApp({ runReconciliation }))
      .post(`/bank-reconciliation/statements/${STATEMENT_ID}/reconcile`)
      .send({ runBy: USER_ID });

    expect(runReconciliation).toHaveBeenCalledWith(STATEMENT_ID, USER_ID);
  });
});

// ─── GET /bank-reconciliation/runs ──────────────────────────────────────────

describe('GET /bank-reconciliation/runs', () => {
  it('should return 200 with runs list', async () => {
    const res = await request(makeApp()).get('/bank-reconciliation/runs');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should pass status filter to service', async () => {
    const listRuns = jest.fn().mockResolvedValue({ runs: [], total: 0 });
    await request(makeApp({ listRuns })).get('/bank-reconciliation/runs?status=completed');

    expect(listRuns).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'completed' }),
    );
  });
});

// ─── GET /bank-reconciliation/runs/:id/report ───────────────────────────────

describe('GET /bank-reconciliation/runs/:id/report', () => {
  it('should return 200 with reconciliation report', async () => {
    const res = await request(makeApp()).get(`/bank-reconciliation/runs/${RUN_ID}/report`);

    expect(res.status).toBe(200);
    expect(res.body.data.run.id).toBe(RUN_ID);
    expect(res.body.data.summary.totalCredits).toBe(5000);
  });
});

// ─── POST /bank-reconciliation/entries/:id/dispute ──────────────────────────

describe('POST /bank-reconciliation/entries/:id/dispute', () => {
  it('should return 200 with disputed entry', async () => {
    const res = await request(makeApp())
      .post(`/bank-reconciliation/entries/${ENTRY_ID}/dispute`)
      .send({ reason: 'Wrong amount' });

    expect(res.status).toBe(200);
    expect(res.body.data.matchStatus).toBe('disputed');
  });

  it('should return 422 for missing reason', async () => {
    const res = await request(makeApp())
      .post(`/bank-reconciliation/entries/${ENTRY_ID}/dispute`)
      .send({});

    expect(res.status).toBe(422);
  });
});

// ─── POST /bank-reconciliation/entries/:id/resolve ──────────────────────────

describe('POST /bank-reconciliation/entries/:id/resolve', () => {
  it('should return 200 with resolved entry', async () => {
    const res = await request(makeApp())
      .post(`/bank-reconciliation/entries/${ENTRY_ID}/resolve`)
      .send({});

    expect(res.status).toBe(200);
    expect(res.body.data.matchStatus).toBe('resolved');
  });

  it('should pass id to service', async () => {
    const resolveEntry = jest.fn().mockResolvedValue({ ...MOCK_ENTRY, matchStatus: 'resolved' });
    await request(makeApp({ resolveEntry }))
      .post(`/bank-reconciliation/entries/${ENTRY_ID}/resolve`)
      .send({});

    expect(resolveEntry).toHaveBeenCalledWith(ENTRY_ID);
  });
});
