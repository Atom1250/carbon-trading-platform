import { PasswordResetService } from './PasswordResetService.js';
import { ValidationError } from '@libs/errors';

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

describe('PasswordResetService', () => {
  describe('requestReset', () => {
    it('should generate a reset token for an existing user', async () => {
      const db = createMockDb();
      db.query
        .mockResolvedValueOnce([{ id: 'user-1' }]) // SELECT user
        .mockResolvedValueOnce([]); // INSERT token

      const service = new PasswordResetService(db);
      const result = await service.requestReset('User@Test.com', '127.0.0.1', 'TestAgent');

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.token!.length).toBe(64); // 32 bytes hex

      // Should lowercase email
      expect(db.query).toHaveBeenCalledWith(
        'SELECT id FROM users WHERE email = $1',
        ['user@test.com'],
      );

      // Should insert token
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO password_reset_tokens'),
        expect.arrayContaining(['user-1', expect.any(String), '127.0.0.1', 'TestAgent']),
      );
    });

    it('should return success for non-existent email (no information leak)', async () => {
      const db = createMockDb();
      db.query.mockResolvedValueOnce([]); // no user found

      const service = new PasswordResetService(db);
      const result = await service.requestReset('nobody@test.com', '127.0.0.1', 'TestAgent');

      expect(result.success).toBe(true);
      expect(result.token).toBeUndefined();
      expect(db.query).toHaveBeenCalledTimes(1); // only SELECT, no INSERT
    });

    it('should store ip_address and user_agent with the token', async () => {
      const db = createMockDb();
      db.query
        .mockResolvedValueOnce([{ id: 'user-2' }])
        .mockResolvedValueOnce([]);

      const service = new PasswordResetService(db);
      await service.requestReset('test@example.com', '10.0.0.1', 'Mozilla/5.0');

      const insertCall = db.query.mock.calls[1];
      expect(insertCall[1]).toContain('10.0.0.1');
      expect(insertCall[1]).toContain('Mozilla/5.0');
    });
  });

  describe('resetPassword', () => {
    it('should reset password with a valid token', async () => {
      const db = createMockDb();
      const futureDate = new Date(Date.now() + 3600_000).toISOString();
      db.query
        .mockResolvedValueOnce([{ user_id: 'user-1', expires_at: futureDate, used_at: null }]) // SELECT token
        .mockResolvedValueOnce([]) // UPDATE password
        .mockResolvedValueOnce([]) // UPDATE token used_at
        .mockResolvedValueOnce([]); // DELETE sessions

      const service = new PasswordResetService(db);
      const result = await service.resetPassword('valid-token', 'NewPass123!');

      expect(result.success).toBe(true);

      // Should hash and update password
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users SET password_hash'),
        expect.arrayContaining([expect.any(String), 'user-1']),
      );

      // Should mark token as used
      expect(db.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE password_reset_tokens SET used_at'),
        ['valid-token'],
      );

      // Should invalidate all sessions
      expect(db.query).toHaveBeenCalledWith(
        'DELETE FROM sessions WHERE user_id = $1',
        ['user-1'],
      );
    });

    it('should throw ValidationError for non-existent token', async () => {
      const db = createMockDb();
      db.query.mockResolvedValue([]); // no token found

      const service = new PasswordResetService(db);

      await expect(service.resetPassword('bad-token', 'NewPass123!')).rejects.toThrow(
        ValidationError,
      );
      await expect(service.resetPassword('bad-token', 'NewPass123!')).rejects.toThrow(
        'Invalid reset token',
      );
    });

    it('should throw ValidationError for already-used token', async () => {
      const db = createMockDb();
      const futureDate = new Date(Date.now() + 3600_000).toISOString();
      db.query.mockResolvedValue([
        { user_id: 'user-1', expires_at: futureDate, used_at: '2024-01-01T00:00:00Z' },
      ]);

      const service = new PasswordResetService(db);

      await expect(service.resetPassword('used-token', 'NewPass123!')).rejects.toThrow(
        ValidationError,
      );
      await expect(service.resetPassword('used-token', 'NewPass123!')).rejects.toThrow(
        'already been used',
      );
    });

    it('should throw ValidationError for expired token', async () => {
      const db = createMockDb();
      const pastDate = new Date(Date.now() - 3600_000).toISOString();
      db.query.mockResolvedValue([
        { user_id: 'user-1', expires_at: pastDate, used_at: null },
      ]);

      const service = new PasswordResetService(db);

      await expect(service.resetPassword('expired-token', 'NewPass123!')).rejects.toThrow(
        ValidationError,
      );
      await expect(service.resetPassword('expired-token', 'NewPass123!')).rejects.toThrow(
        'expired',
      );
    });

    it('should hash the new password with bcrypt', async () => {
      const db = createMockDb();
      const futureDate = new Date(Date.now() + 3600_000).toISOString();
      db.query
        .mockResolvedValueOnce([{ user_id: 'user-1', expires_at: futureDate, used_at: null }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const service = new PasswordResetService(db);
      await service.resetPassword('token-123', 'NewPass123!');

      const updateCall = db.query.mock.calls[1];
      const hashedPassword = updateCall[1][0];
      // bcrypt hashes start with $2b$
      expect(hashedPassword).toMatch(/^\$2[aby]\$/);
    });
  });
});
