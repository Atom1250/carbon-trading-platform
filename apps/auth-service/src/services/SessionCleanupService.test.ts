import { SessionCleanupService } from './SessionCleanupService.js';

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

describe('SessionCleanupService', () => {
  describe('cleanup', () => {
    it('should delete expired sessions and return count', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '5' }]);

      const service = new SessionCleanupService(db);
      const deleted = await service.cleanup();

      expect(deleted).toBe(5);
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM sessions'),
      );
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('expires_at < NOW()'),
      );
    });

    it('should return 0 when no sessions to clean up', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '0' }]);

      const service = new SessionCleanupService(db);
      const deleted = await service.cleanup();

      expect(deleted).toBe(0);
    });
  });

  describe('startSchedule', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should run cleanup immediately on start', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '0' }]);

      const service = new SessionCleanupService(db);
      service.startSchedule(60);

      // Flush the immediate cleanup promise
      await Promise.resolve();

      expect(db.query).toHaveBeenCalledTimes(1);

      service.stopSchedule();
    });

    it('should schedule recurring cleanup', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '0' }]);

      const service = new SessionCleanupService(db);
      service.startSchedule(60);

      // Flush initial
      await Promise.resolve();
      expect(db.query).toHaveBeenCalledTimes(1);

      // Advance 60 minutes
      jest.advanceTimersByTime(60 * 60 * 1000);
      await Promise.resolve();

      expect(db.query).toHaveBeenCalledTimes(2);

      service.stopSchedule();
    });
  });

  describe('stopSchedule', () => {
    beforeEach(() => jest.useFakeTimers());
    afterEach(() => jest.useRealTimers());

    it('should stop the scheduled cleanup', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([{ count: '0' }]);

      const service = new SessionCleanupService(db);
      service.startSchedule(60);
      await Promise.resolve();

      service.stopSchedule();

      jest.advanceTimersByTime(60 * 60 * 1000);
      await Promise.resolve();

      // Should only have the initial call, not the interval one
      expect(db.query).toHaveBeenCalledTimes(1);
    });
  });
});
