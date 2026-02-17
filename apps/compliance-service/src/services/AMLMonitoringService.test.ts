import { AMLMonitoringService } from './AMLMonitoringService';
import { NotFoundError, ValidationError } from '@libs/errors';

const ALERT_ID = '550e8400-e29b-41d4-a716-446655440000';
const TRANSACTION_ID = '660e8400-e29b-41d4-a716-446655440000';
const INSTITUTION_ID = '770e8400-e29b-41d4-a716-446655440000';
const USER_ID = '880e8400-e29b-41d4-a716-446655440000';
const INVESTIGATOR_ID = '990e8400-e29b-41d4-a716-446655440000';

const DB_ALERT_ROW = {
  id: ALERT_ID,
  alertType: 'large_volume',
  severity: 'high',
  status: 'open',
  institutionId: INSTITUTION_ID,
  userId: USER_ID,
  description: 'Large transaction detected',
  transactionIds: [TRANSACTION_ID],
  totalAmountUsd: '150000.00',
  patternDetails: {},
  assignedTo: null,
  investigatedAt: null,
  investigationNotes: null,
  resolvedAt: null,
  resolutionNotes: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const DB_CHECK_ROW = {
  id: 'aa0e8400-e29b-41d4-a716-446655440000',
  transactionId: TRANSACTION_ID,
  institutionId: INSTITUTION_ID,
  userId: USER_ID,
  amountUsd: '150000.00',
  transactionType: 'transfer',
  counterpartyId: null,
  isSuspicious: true,
  riskScore: '25.00',
  rulesTriggered: ['large_volume'],
  alertId: ALERT_ID,
  checkedAt: new Date('2025-01-01'),
};

const CLEAN_CHECK_ROW = {
  ...DB_CHECK_ROW,
  amountUsd: '500.00',
  isSuspicious: false,
  riskScore: '0.00',
  rulesTriggered: [],
  alertId: null,
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

describe('AMLMonitoringService', () => {
  // ─── checkTransaction ─────────────────────────────────────────────────────

  describe('checkTransaction', () => {
    it('should return clean check for small non-suspicious transaction', async () => {
      const db = makeMockDb([[CLEAN_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      const result = await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 500,
        transactionType: 'transfer',
      });

      expect(result.isSuspicious).toBe(false);
      expect(result.riskScore).toBe('0.00');
    });

    it('should insert into aml_transaction_checks', async () => {
      const db = makeMockDb([[CLEAN_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 500,
        transactionType: 'transfer',
      });

      expect(db.query).toHaveBeenCalled();
      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('INSERT INTO aml_transaction_checks');
    });

    it('should detect large volume transactions', async () => {
      const db = makeMockDb([[DB_ALERT_ROW], [DB_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 150_000,
        transactionType: 'transfer',
        institutionId: INSTITUTION_ID,
      });

      // Should create alert first, then check
      const allCalls = (db.query as jest.Mock).mock.calls;
      expect(allCalls.length).toBe(2);
      const [alertSql] = allCalls[0] as [string];
      expect(alertSql).toContain('INSERT INTO aml_alerts');
    });

    it('should create alert for suspicious transactions', async () => {
      const db = makeMockDb([[DB_ALERT_ROW], [DB_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 150_000,
        transactionType: 'transfer',
      });

      const alertInsert = (db.query as jest.Mock).mock.calls[0];
      const params = alertInsert[1] as unknown[];
      expect(params[0]).toBe('large_volume'); // alert_type
      expect(params[1]).toBe('high'); // severity
    });

    it('should detect critical severity for very large transactions', async () => {
      const db = makeMockDb([[{ ...DB_ALERT_ROW, severity: 'critical' }], [DB_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 600_000,
        transactionType: 'transfer',
      });

      const alertInsert = (db.query as jest.Mock).mock.calls[0];
      const params = alertInsert[1] as unknown[];
      expect(params[1]).toBe('critical');
    });

    it('should detect structuring patterns', async () => {
      const db = makeMockDb([[{ ...DB_ALERT_ROW, alertType: 'structuring' }], [DB_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 9_500, // just below $10K threshold
        transactionType: 'transfer',
      });

      const alertInsert = (db.query as jest.Mock).mock.calls[0];
      const params = alertInsert[1] as unknown[];
      expect(params[0]).toBe('structuring');
    });

    it('should detect round amounts', async () => {
      const db = makeMockDb([[{ ...DB_ALERT_ROW, alertType: 'round_amounts' }], [DB_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 5_000,
        transactionType: 'transfer',
      });

      const alertInsert = (db.query as jest.Mock).mock.calls[0];
      const params = alertInsert[1] as unknown[];
      expect(params[0]).toBe('round_amounts');
    });

    it('should not flag small round amounts', async () => {
      const db = makeMockDb([[CLEAN_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 3_000, // under $5K min
        transactionType: 'transfer',
      });

      // Only one call — no alert created
      expect(db.query).toHaveBeenCalledTimes(1);
    });

    it('should pass optional fields to insert', async () => {
      const db = makeMockDb([[CLEAN_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 500,
        transactionType: 'purchase',
        institutionId: INSTITUTION_ID,
        userId: USER_ID,
        counterpartyId: INVESTIGATOR_ID,
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[1]).toBe(INSTITUTION_ID);
      expect(params[2]).toBe(USER_ID);
      expect(params[5]).toBe(INVESTIGATOR_ID);
    });

    it('should set null for missing optional fields', async () => {
      const db = makeMockDb([[CLEAN_CHECK_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.checkTransaction({
        transactionId: TRANSACTION_ID,
        amountUsd: 500,
        transactionType: 'transfer',
      });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params[1]).toBeNull(); // institutionId
      expect(params[2]).toBeNull(); // userId
      expect(params[5]).toBeNull(); // counterpartyId
    });
  });

  // ─── listAlerts ───────────────────────────────────────────────────────────

  describe('listAlerts', () => {
    it('should return alerts with total count', async () => {
      const db = makeMockDb([[{ count: '3' }], [DB_ALERT_ROW, DB_ALERT_ROW, DB_ALERT_ROW]]);
      const service = new AMLMonitoringService(db as never);

      const result = await service.listAlerts({ limit: 20, offset: 0 });

      expect(result.total).toBe(3);
      expect(result.alerts).toHaveLength(3);
    });

    it('should filter by status', async () => {
      const db = makeMockDb([[{ count: '1' }], [DB_ALERT_ROW]]);
      const service = new AMLMonitoringService(db as never);

      await service.listAlerts({ status: 'open', limit: 20, offset: 0 });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('status = $1');
    });

    it('should filter by severity', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new AMLMonitoringService(db as never);

      await service.listAlerts({ severity: 'critical', limit: 20, offset: 0 });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('severity = $1');
    });

    it('should filter by alertType', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new AMLMonitoringService(db as never);

      await service.listAlerts({ alertType: 'structuring', limit: 20, offset: 0 });

      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).toContain('alert_type = $1');
    });

    it('should filter by institutionId', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new AMLMonitoringService(db as never);

      await service.listAlerts({ institutionId: INSTITUTION_ID, limit: 20, offset: 0 });

      const params = (db.query as jest.Mock).mock.calls[0][1] as unknown[];
      expect(params).toContain(INSTITUTION_ID);
    });

    it('should pass limit and offset', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new AMLMonitoringService(db as never);

      await service.listAlerts({ limit: 10, offset: 5 });

      const params = (db.query as jest.Mock).mock.calls[1][1] as unknown[];
      expect(params).toContain(10);
      expect(params).toContain(5);
    });

    it('should order by severity DESC, created_at DESC', async () => {
      const db = makeMockDb([[{ count: '0' }], []]);
      const service = new AMLMonitoringService(db as never);

      await service.listAlerts({ limit: 20, offset: 0 });

      const [dataSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(dataSql).toContain('ORDER BY severity DESC, created_at DESC');
    });

    it('should return all alerts when no filters applied', async () => {
      const db = makeMockDb([[{ count: '2' }], [DB_ALERT_ROW, DB_ALERT_ROW]]);
      const service = new AMLMonitoringService(db as never);

      const result = await service.listAlerts({ limit: 20, offset: 0 });

      expect(result.total).toBe(2);
      const [countSql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(countSql).not.toContain('WHERE');
    });
  });

  // ─── investigateAlert ─────────────────────────────────────────────────────

  describe('investigateAlert', () => {
    it('should update alert to under_investigation', async () => {
      const db = makeMockDb([
        [DB_ALERT_ROW],
        [{ ...DB_ALERT_ROW, status: 'under_investigation', assignedTo: INVESTIGATOR_ID }],
      ]);
      const service = new AMLMonitoringService(db as never);

      const result = await service.investigateAlert(ALERT_ID, {
        assignedTo: INVESTIGATOR_ID,
        notes: 'Starting investigation',
      });

      expect(result.status).toBe('under_investigation');
      expect(result.assignedTo).toBe(INVESTIGATOR_ID);
    });

    it('should throw NotFoundError when alert does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new AMLMonitoringService(db as never);

      await expect(
        service.investigateAlert('nonexistent', {
          assignedTo: INVESTIGATOR_ID,
          notes: 'Test',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when alert is already resolved', async () => {
      const db = makeMockDb([[{ ...DB_ALERT_ROW, status: 'resolved_legitimate' }]]);
      const service = new AMLMonitoringService(db as never);

      await expect(
        service.investigateAlert(ALERT_ID, {
          assignedTo: INVESTIGATOR_ID,
          notes: 'Test',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should allow investigation of escalated alerts', async () => {
      const db = makeMockDb([
        [{ ...DB_ALERT_ROW, status: 'escalated' }],
        [{ ...DB_ALERT_ROW, status: 'under_investigation' }],
      ]);
      const service = new AMLMonitoringService(db as never);

      const result = await service.investigateAlert(ALERT_ID, {
        assignedTo: INVESTIGATOR_ID,
        notes: 'Escalated case review',
      });

      expect(result.status).toBe('under_investigation');
    });

    it('should pass investigation data to update query', async () => {
      const db = makeMockDb([
        [DB_ALERT_ROW],
        [{ ...DB_ALERT_ROW, status: 'under_investigation' }],
      ]);
      const service = new AMLMonitoringService(db as never);

      await service.investigateAlert(ALERT_ID, {
        assignedTo: INVESTIGATOR_ID,
        notes: 'Investigation started',
      });

      const updateCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = updateCall as [string, unknown[]];
      expect(sql).toContain('UPDATE aml_alerts');
      expect(params).toContain(INVESTIGATOR_ID);
      expect(params).toContain('Investigation started');
    });
  });

  // ─── resolveAlert ─────────────────────────────────────────────────────────

  describe('resolveAlert', () => {
    it('should update alert to resolved_suspicious', async () => {
      const db = makeMockDb([
        [{ ...DB_ALERT_ROW, status: 'under_investigation' }],
        [{ ...DB_ALERT_ROW, status: 'resolved_suspicious' }],
      ]);
      const service = new AMLMonitoringService(db as never);

      const result = await service.resolveAlert(ALERT_ID, {
        status: 'resolved_suspicious',
        notes: 'Confirmed suspicious activity',
      });

      expect(result.status).toBe('resolved_suspicious');
    });

    it('should update alert to resolved_legitimate', async () => {
      const db = makeMockDb([
        [{ ...DB_ALERT_ROW, status: 'under_investigation' }],
        [{ ...DB_ALERT_ROW, status: 'resolved_legitimate' }],
      ]);
      const service = new AMLMonitoringService(db as never);

      const result = await service.resolveAlert(ALERT_ID, {
        status: 'resolved_legitimate',
        notes: 'Verified legitimate transaction',
      });

      expect(result.status).toBe('resolved_legitimate');
    });

    it('should throw NotFoundError when alert does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new AMLMonitoringService(db as never);

      await expect(
        service.resolveAlert('nonexistent', {
          status: 'resolved_legitimate',
          notes: 'Test',
        }),
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when alert is not under_investigation', async () => {
      const db = makeMockDb([[DB_ALERT_ROW]]); // status: 'open'
      const service = new AMLMonitoringService(db as never);

      await expect(
        service.resolveAlert(ALERT_ID, {
          status: 'resolved_suspicious',
          notes: 'Test',
        }),
      ).rejects.toThrow(ValidationError);
    });

    it('should pass resolution data to update query', async () => {
      const db = makeMockDb([
        [{ ...DB_ALERT_ROW, status: 'under_investigation' }],
        [{ ...DB_ALERT_ROW, status: 'resolved_suspicious' }],
      ]);
      const service = new AMLMonitoringService(db as never);

      await service.resolveAlert(ALERT_ID, {
        status: 'resolved_suspicious',
        notes: 'SAR filed',
      });

      const updateCall = (db.query as jest.Mock).mock.calls[1];
      const [sql, params] = updateCall as [string, unknown[]];
      expect(sql).toContain('UPDATE aml_alerts');
      expect(params).toContain('resolved_suspicious');
      expect(params).toContain('SAR filed');
    });
  });
});
