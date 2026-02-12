import type { IDatabaseClient } from '@libs/database';
import { createLogger } from '@libs/logger';

const logger = createLogger('auth-service');

export class SessionCleanupService {
  private intervalHandle: ReturnType<typeof setInterval> | null = null;

  constructor(private readonly db: IDatabaseClient) {}

  async cleanup(): Promise<number> {
    logger.info('Starting session cleanup');

    const result = await this.db.query<{ count: string }>(
      `WITH deleted AS (
         DELETE FROM sessions
         WHERE expires_at IS NOT NULL AND expires_at < NOW()
         RETURNING id
       ) SELECT COUNT(*) as count FROM deleted`,
    );

    const deletedCount = parseInt(result[0].count, 10);

    logger.info('Session cleanup complete', { deleted: deletedCount });

    return deletedCount;
  }

  startSchedule(intervalMinutes = 60): void {
    this.cleanup().catch((error: unknown) => {
      logger.error('Initial session cleanup failed', {
        error: error instanceof Error ? error.message : String(error),
      });
    });

    this.intervalHandle = setInterval(() => {
      this.cleanup().catch((error: unknown) => {
        logger.error('Session cleanup failed', {
          error: error instanceof Error ? error.message : String(error),
        });
      });
    }, intervalMinutes * 60 * 1000);

    logger.info('Session cleanup job scheduled', { intervalMinutes });
  }

  stopSchedule(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
  }
}
