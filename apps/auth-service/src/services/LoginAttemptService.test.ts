import { LoginAttemptService } from './LoginAttemptService.js';
import { RateLimitError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

function createMockDb() {
  return {
    query: jest.fn(),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    end: jest.fn(),
  };
}

describe('LoginAttemptService', () => {
  describe('trackAttempt', () => {
    it('should insert a login attempt record', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([]);

      const service = new LoginAttemptService(db);
      await service.trackAttempt('User@Test.com', '127.0.0.1', 'TestAgent', true, null);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO login_attempts'),
        ['user@test.com', '127.0.0.1', 'TestAgent', true, null],
      );
    });

    it('should lowercase email before inserting', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([]);

      const service = new LoginAttemptService(db);
      await service.trackAttempt('UPPER@CASE.COM', '10.0.0.1', 'agent', false, 'invalid_credentials');

      expect(db.query.mock.calls[0][1][0]).toBe('upper@case.com');
    });

    it('should store failure reason for failed attempts', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([]);

      const service = new LoginAttemptService(db);
      await service.trackAttempt('test@test.com', '127.0.0.1', 'agent', false, 'invalid_credentials');

      expect(db.query.mock.calls[0][1]).toEqual([
        'test@test.com', '127.0.0.1', 'agent', false, 'invalid_credentials',
      ]);
    });
  });

  describe('checkRateLimit', () => {
    it('should not throw when under the limit', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '3' }]);

      const service = new LoginAttemptService(db);

      await expect(service.checkRateLimit('test@test.com', '127.0.0.1', 5, 15))
        .resolves.toBeUndefined();
    });

    it('should throw RateLimitError when at the limit', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '5' }]);

      const service = new LoginAttemptService(db);

      await expect(service.checkRateLimit('test@test.com', '127.0.0.1', 5, 15))
        .rejects.toThrow(RateLimitError);
    });

    it('should throw RateLimitError when over the limit', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '10' }]);

      const service = new LoginAttemptService(db);

      await expect(service.checkRateLimit('test@test.com', '127.0.0.1', 5, 15))
        .rejects.toThrow('Too many failed attempts');
    });

    it('should include retryAfterSeconds in RateLimitError', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '5' }]);

      const service = new LoginAttemptService(db);

      try {
        await service.checkRateLimit('test@test.com', '127.0.0.1', 5, 15);
        fail('Expected RateLimitError');
      } catch (err) {
        expect(err).toBeInstanceOf(RateLimitError);
        expect((err as RateLimitError).retryAfterSeconds).toBe(900); // 15 * 60
      }
    });

    it('should query with correct parameters', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '0' }]);

      const service = new LoginAttemptService(db);
      await service.checkRateLimit('User@Test.com', '10.0.0.1', 3, 30);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('login_attempts'),
        ['user@test.com', '10.0.0.1', 30],
      );
    });

    it('should only count failed attempts', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '0' }]);

      const service = new LoginAttemptService(db);
      await service.checkRateLimit('test@test.com', '127.0.0.1', 5, 15);

      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('success = FALSE'),
        expect.any(Array),
      );
    });
  });
});
