import crypto from 'crypto';
import bcrypt from 'bcrypt';
import type { IDatabaseClient } from '@libs/database';
import { ValidationError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { PasswordResetTokenRow } from '../types/auth.types.js';

const logger = createLogger('auth-service');

export class PasswordResetService {
  constructor(private readonly db: IDatabaseClient) {}

  async requestReset(
    email: string,
    ipAddress: string,
    userAgent: string,
  ): Promise<{ success: true; token?: string }> {
    const normalizedEmail = email.toLowerCase();

    const users = await this.db.query<{ id: string }>(
      'SELECT id FROM users WHERE email = $1',
      [normalizedEmail],
    );

    // Always return success to avoid leaking whether the email exists
    if (users.length === 0) {
      logger.info('Password reset requested for non-existent email', { email: normalizedEmail });
      return { success: true };
    }

    const userId = users[0].id;
    const token = crypto.randomBytes(32).toString('hex');

    await this.db.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '1 hour', $3, $4)`,
      [userId, token, ipAddress, userAgent],
    );

    logger.info('Password reset token generated', { userId });

    // In production, send email with token. Return token for testing.
    return { success: true, token };
  }

  async resetPassword(token: string, newPassword: string): Promise<{ success: true }> {
    const rows = await this.db.query<PasswordResetTokenRow>(
      'SELECT user_id, expires_at, used_at FROM password_reset_tokens WHERE token = $1',
      [token],
    );

    if (rows.length === 0) {
      throw new ValidationError('Invalid reset token');
    }

    const { user_id, expires_at, used_at } = rows[0];

    if (used_at !== null) {
      throw new ValidationError('Reset token has already been used');
    }

    if (new Date(expires_at) < new Date()) {
      throw new ValidationError('Reset token has expired');
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await this.db.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [passwordHash, user_id],
    );

    await this.db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE token = $1',
      [token],
    );

    // Invalidate all sessions for this user (force re-login)
    await this.db.query(
      'DELETE FROM sessions WHERE user_id = $1',
      [user_id],
    );

    logger.info('Password reset successful', { userId: user_id });

    return { success: true };
  }
}
