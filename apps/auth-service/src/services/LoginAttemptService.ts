import type { IDatabaseClient } from '@libs/database';
import { RateLimitError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { LoginAttemptRow } from '../types/auth.types.js';

const logger = createLogger('auth-service');

export class LoginAttemptService {
  constructor(private readonly db: IDatabaseClient) {}

  async trackAttempt(
    email: string,
    ipAddress: string,
    userAgent: string,
    success: boolean,
    failureReason: string | null,
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO login_attempts (email, ip_address, user_agent, success, failure_reason)
       VALUES ($1, $2, $3, $4, $5)`,
      [email.toLowerCase(), ipAddress, userAgent, success, failureReason],
    );
  }

  async checkRateLimit(
    email: string,
    ipAddress: string,
    maxAttempts: number,
    windowMinutes: number,
  ): Promise<void> {
    const rows = await this.db.query<LoginAttemptRow>(
      `SELECT COUNT(*) as count
       FROM login_attempts
       WHERE (email = $1 OR ip_address = $2)
         AND success = FALSE
         AND attempted_at > NOW() - INTERVAL '1 minute' * $3`,
      [email.toLowerCase(), ipAddress, windowMinutes],
    );

    const attemptCount = parseInt(rows[0].count, 10);

    if (attemptCount >= maxAttempts) {
      logger.warn('Rate limit exceeded', {
        email: email.toLowerCase(),
        ipAddress,
        attempts: attemptCount,
        windowMinutes,
      });

      throw new RateLimitError(
        'Too many failed attempts. Please try again later.',
        windowMinutes * 60,
      );
    }
  }
}
