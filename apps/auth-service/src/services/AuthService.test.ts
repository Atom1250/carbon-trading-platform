import { AuthService } from './AuthService';
import { AuthenticationError } from '@libs/errors';

// SWC does not hoist mock-prefixed variables — use factory pattern
jest.mock('bcrypt', () => ({
  compare: jest.fn(),
}));

import bcrypt from 'bcrypt';

const mockBcryptCompare = bcrypt.compare as jest.Mock;

const TEST_META = { ipAddress: '127.0.0.1', userAgent: 'jest-test' };

const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  institution_id: '660e8400-e29b-41d4-a716-446655440001',
  email: 'trader@example.com',
  password_hash: '$2b$12$hashed',
  first_name: 'Jane',
  last_name: 'Doe',
  role: 'investor',
  is_active: true,
  has_enabled_mfa: false,
  mfa_secret: null,
};

function makeMockDb(overrides: Record<string, unknown> = {}) {
  return {
    query: jest.fn(),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    end: jest.fn(),
    ...overrides,
  };
}

function makeMockTokenService() {
  return {
    generateAccessToken: jest.fn().mockReturnValue('access-token'),
    generateRefreshToken: jest.fn().mockReturnValue('refresh-token'),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };
}

function makeMockMFAService() {
  return {
    setup: jest.fn(),
    verifyTOTP: jest.fn(),
    enable: jest.fn(),
  };
}

describe('AuthService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('login', () => {
    it('should return tokens on valid credentials (no MFA)', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([TEST_USER])   // user lookup
          .mockResolvedValueOnce([]),            // INSERT session
      });
      const tokenService = makeMockTokenService();
      const mfaService = makeMockMFAService();
      mockBcryptCompare.mockResolvedValue(true);

      const service = new AuthService(db as never, tokenService as never, mfaService as never);
      const result = await service.login('trader@example.com', 'password', TEST_META);

      expect(result.requiresMFA).toBe(false);
      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect(result.user.email).toBe('trader@example.com');
      expect(result.user.firstName).toBe('Jane');
    });

    it('should return requiresMFA=true when MFA is enabled', async () => {
      const mfaUser = { ...TEST_USER, has_enabled_mfa: true };
      const db = makeMockDb({ query: jest.fn().mockResolvedValueOnce([mfaUser]) });
      const tokenService = makeMockTokenService();
      const mfaService = makeMockMFAService();
      mockBcryptCompare.mockResolvedValue(true);

      const service = new AuthService(db as never, tokenService as never, mfaService as never);
      const result = await service.login('trader@example.com', 'password', TEST_META);

      expect(result.requiresMFA).toBe(true);
      expect(result.accessToken).toBe('');
      expect(result.refreshToken).toBe('');
    });

    it('should throw AuthenticationError for unknown email', async () => {
      const db = makeMockDb({ query: jest.fn().mockResolvedValueOnce([]) });
      const service = new AuthService(db as never, makeMockTokenService() as never, makeMockMFAService() as never);

      await expect(service.login('nobody@example.com', 'pass', TEST_META))
        .rejects.toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for wrong password', async () => {
      const db = makeMockDb({ query: jest.fn().mockResolvedValueOnce([TEST_USER]) });
      mockBcryptCompare.mockResolvedValue(false);
      const service = new AuthService(db as never, makeMockTokenService() as never, makeMockMFAService() as never);

      await expect(service.login('trader@example.com', 'wrongpass', TEST_META))
        .rejects.toThrow(AuthenticationError);
    });

    it('should lowercase email before querying', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([TEST_USER])
          .mockResolvedValueOnce([]),
      });
      const tokenService = makeMockTokenService();
      mockBcryptCompare.mockResolvedValue(true);
      const service = new AuthService(db as never, tokenService as never, makeMockMFAService() as never);

      await service.login('TRADER@EXAMPLE.COM', 'password', TEST_META);

      const [sql, params] = (db.query as jest.Mock).mock.calls[0] as [string, string[]];
      expect(sql).toContain('email = $1');
      expect(params[0]).toBe('trader@example.com');
    });
  });

  describe('refresh', () => {
    it('should rotate tokens when refresh token is valid', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([{ id: 'session-id' }])  // lookup
          .mockResolvedValueOnce([])                        // delete old
          .mockResolvedValueOnce([]),                       // insert new
      });
      const tokenService = makeMockTokenService();
      tokenService.verifyRefreshToken.mockReturnValue({
        userId: TEST_USER.id,
        institutionId: TEST_USER.institution_id,
        role: TEST_USER.role,
        tokenId: 'old-token-id',
      });

      const service = new AuthService(db as never, tokenService as never, makeMockMFAService() as never);
      const result = await service.refresh('raw-refresh-token', TEST_META);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
      expect((db.query as jest.Mock).mock.calls[1][0]).toContain('DELETE FROM sessions');
    });

    it('should throw AuthenticationError when session not found', async () => {
      const db = makeMockDb({ query: jest.fn().mockResolvedValueOnce([]) });
      const tokenService = makeMockTokenService();
      tokenService.verifyRefreshToken.mockReturnValue({ userId: 'u1', institutionId: 'i1', role: 'r', tokenId: 't1' });

      const service = new AuthService(db as never, tokenService as never, makeMockMFAService() as never);

      await expect(service.refresh('stale-token', TEST_META))
        .rejects.toThrow(AuthenticationError);
    });
  });

  describe('logout', () => {
    it('should mark session as revoked', async () => {
      const db = makeMockDb({ query: jest.fn().mockResolvedValueOnce([]) });
      const service = new AuthService(db as never, makeMockTokenService() as never, makeMockMFAService() as never);

      await service.logout('raw-refresh-token');

      const [sql] = (db.query as jest.Mock).mock.calls[0] as [string];
      expect(sql).toContain('UPDATE sessions SET is_revoked = true');
    });
  });

  describe('verifyMFA', () => {
    it('should return tokens on valid TOTP', async () => {
      const mfaUser = { ...TEST_USER, has_enabled_mfa: true, mfa_secret: 'BASE32SECRET' };
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([mfaUser])
          .mockResolvedValueOnce([]),
      });
      const tokenService = makeMockTokenService();
      const mfaService = makeMockMFAService();
      mfaService.verifyTOTP.mockResolvedValue(true);

      const service = new AuthService(db as never, tokenService as never, mfaService as never);
      const result = await service.verifyMFA(TEST_USER.id, '123456', TEST_META);

      expect(result.accessToken).toBe('access-token');
      expect(result.refreshToken).toBe('refresh-token');
    });

    it('should throw AuthenticationError on invalid TOTP', async () => {
      const mfaUser = { ...TEST_USER, has_enabled_mfa: true };
      const db = makeMockDb({ query: jest.fn().mockResolvedValueOnce([mfaUser]) });
      const mfaService = makeMockMFAService();
      mfaService.verifyTOTP.mockResolvedValue(false);

      const service = new AuthService(db as never, makeMockTokenService() as never, mfaService as never);

      await expect(service.verifyMFA(TEST_USER.id, '000000', TEST_META))
        .rejects.toThrow(AuthenticationError);
    });
  });
});
