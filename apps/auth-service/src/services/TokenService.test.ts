import { TokenService } from './TokenService';
import { AuthenticationError } from '@libs/errors';

const TEST_CONFIG = {
  JWT_ACCESS_SECRET: 'test-access-secret-that-is-at-least-32-chars-long',
  JWT_REFRESH_SECRET: 'test-refresh-secret-that-is-at-least-32-chars-long',
  JWT_ACCESS_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
};

const BASE_PAYLOAD = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  institutionId: '660e8400-e29b-41d4-a716-446655440001',
  role: 'investor',
};

describe('TokenService', () => {
  let service: TokenService;

  beforeEach(() => {
    service = new TokenService(TEST_CONFIG);
  });

  describe('generateAccessToken', () => {
    it('should generate a JWT string', () => {
      const token = service.generateAccessToken(BASE_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });

    it('should include a unique tokenId in each token', () => {
      const token1 = service.generateAccessToken(BASE_PAYLOAD);
      const token2 = service.generateAccessToken(BASE_PAYLOAD);
      const payload1 = service.verifyAccessToken(token1);
      const payload2 = service.verifyAccessToken(token2);
      expect(payload1.tokenId).not.toBe(payload2.tokenId);
    });
  });

  describe('generateRefreshToken', () => {
    it('should generate a JWT string', () => {
      const token = service.generateRefreshToken(BASE_PAYLOAD);
      expect(typeof token).toBe('string');
      expect(token.split('.')).toHaveLength(3);
    });
  });

  describe('verifyAccessToken', () => {
    it('should decode a valid access token', () => {
      const token = service.generateAccessToken(BASE_PAYLOAD);
      const payload = service.verifyAccessToken(token);
      expect(payload.userId).toBe(BASE_PAYLOAD.userId);
      expect(payload.institutionId).toBe(BASE_PAYLOAD.institutionId);
      expect(payload.role).toBe(BASE_PAYLOAD.role);
    });

    it('should throw AuthenticationError for an invalid token', () => {
      expect(() => service.verifyAccessToken('not.a.jwt')).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for a token signed with wrong secret', () => {
      const wrongService = new TokenService({
        ...TEST_CONFIG,
        JWT_ACCESS_SECRET: 'a-completely-different-secret-that-is-long-enough',
      });
      const token = wrongService.generateAccessToken(BASE_PAYLOAD);
      expect(() => service.verifyAccessToken(token)).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for a refresh token used as access token', () => {
      const refreshToken = service.generateRefreshToken(BASE_PAYLOAD);
      expect(() => service.verifyAccessToken(refreshToken)).toThrow(AuthenticationError);
    });
  });

  describe('verifyRefreshToken', () => {
    it('should decode a valid refresh token', () => {
      const token = service.generateRefreshToken(BASE_PAYLOAD);
      const payload = service.verifyRefreshToken(token);
      expect(payload.userId).toBe(BASE_PAYLOAD.userId);
      expect(payload.role).toBe(BASE_PAYLOAD.role);
    });

    it('should throw AuthenticationError for an invalid token', () => {
      expect(() => service.verifyRefreshToken('invalid')).toThrow(AuthenticationError);
    });

    it('should throw AuthenticationError for an access token used as refresh token', () => {
      const accessToken = service.generateAccessToken(BASE_PAYLOAD);
      expect(() => service.verifyRefreshToken(accessToken)).toThrow(AuthenticationError);
    });
  });
});
