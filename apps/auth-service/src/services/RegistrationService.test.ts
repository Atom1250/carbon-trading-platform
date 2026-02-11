import { RegistrationService } from './RegistrationService';
import { ConflictError, NotFoundError, AuthorizationError, ValidationError } from '@libs/errors';

// SWC does not hoist mock-prefixed variables — use factory pattern
jest.mock('bcrypt', () => ({
  hash: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => ({
    toString: jest.fn().mockReturnValue('abc123verificationtoken'),
  })),
}));

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

import bcrypt from 'bcrypt';

const mockBcryptHash = bcrypt.hash as jest.Mock;

const TEST_INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440001';
const TEST_USER_ID = '550e8400-e29b-41d4-a716-446655440000';

const VALID_INPUT = {
  institutionId: TEST_INSTITUTION_ID,
  email: 'newuser@example.com',
  password: 'P@ssword123',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'investor' as const,
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

describe('RegistrationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockBcryptHash.mockResolvedValue('$2b$12$hashedpassword');
  });

  describe('register', () => {
    it('should create a user and return verification token', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])                                       // email check — no existing user
          .mockResolvedValueOnce([{ id: TEST_INSTITUTION_ID, status: 'active' }])  // institution check
          .mockResolvedValueOnce([{                                        // INSERT user
            id: TEST_USER_ID,
            email: 'newuser@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            role: 'investor',
          }])
          .mockResolvedValueOnce([])                                       // invalidate old tokens
          .mockResolvedValueOnce([]),                                       // INSERT verification token
      });

      const service = new RegistrationService(db as never);
      const result = await service.register(VALID_INPUT);

      expect(result.user.id).toBe(TEST_USER_ID);
      expect(result.user.email).toBe('newuser@example.com');
      expect(result.user.firstName).toBe('Jane');
      expect(result.user.lastName).toBe('Doe');
      expect(result.user.role).toBe('investor');
      expect(result.verificationToken).toBe('abc123verificationtoken');
    });

    it('should lowercase the email before querying and inserting', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: TEST_INSTITUTION_ID, status: 'active' }])
          .mockResolvedValueOnce([{
            id: TEST_USER_ID,
            email: 'upper@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            role: 'investor',
          }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      });

      const service = new RegistrationService(db as never);
      await service.register({ ...VALID_INPUT, email: 'UPPER@EXAMPLE.COM' });

      // Email check uses lowercase
      const emailCheckParams = (db.query as jest.Mock).mock.calls[0][1] as string[];
      expect(emailCheckParams[0]).toBe('upper@example.com');

      // INSERT uses lowercase
      const insertParams = (db.query as jest.Mock).mock.calls[2][1] as string[];
      expect(insertParams[1]).toBe('upper@example.com');
    });

    it('should throw ConflictError if email already exists', async () => {
      const db = makeMockDb({
        query: jest.fn().mockResolvedValueOnce([{ id: 'existing-user-id' }]),
      });

      const service = new RegistrationService(db as never);

      await expect(service.register(VALID_INPUT))
        .rejects.toThrow(ConflictError);
    });

    it('should throw NotFoundError if institution does not exist', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])  // no existing user
          .mockResolvedValueOnce([]), // no institution
      });

      const service = new RegistrationService(db as never);

      await expect(service.register(VALID_INPUT))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw AuthorizationError if institution is suspended', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: TEST_INSTITUTION_ID, status: 'suspended' }]),
      });

      const service = new RegistrationService(db as never);

      await expect(service.register(VALID_INPUT))
        .rejects.toThrow(AuthorizationError);
    });

    it('should throw AuthorizationError if institution is closed', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: TEST_INSTITUTION_ID, status: 'closed' }]),
      });

      const service = new RegistrationService(db as never);

      await expect(service.register(VALID_INPUT))
        .rejects.toThrow(AuthorizationError);
    });

    it('should allow registration when institution is pending', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: TEST_INSTITUTION_ID, status: 'pending' }])
          .mockResolvedValueOnce([{
            id: TEST_USER_ID,
            email: 'newuser@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            role: 'investor',
          }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      });

      const service = new RegistrationService(db as never);
      const result = await service.register(VALID_INPUT);

      expect(result.user.id).toBe(TEST_USER_ID);
    });

    it('should hash the password with bcrypt (12 rounds)', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: TEST_INSTITUTION_ID, status: 'active' }])
          .mockResolvedValueOnce([{
            id: TEST_USER_ID,
            email: 'newuser@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            role: 'investor',
          }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      });

      const service = new RegistrationService(db as never);
      await service.register(VALID_INPUT);

      expect(mockBcryptHash).toHaveBeenCalledWith('P@ssword123', 12);
    });

    it('should invalidate existing unused verification tokens before creating new one', async () => {
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: TEST_INSTITUTION_ID, status: 'active' }])
          .mockResolvedValueOnce([{
            id: TEST_USER_ID,
            email: 'newuser@example.com',
            first_name: 'Jane',
            last_name: 'Doe',
            role: 'investor',
          }])
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([]),
      });

      const service = new RegistrationService(db as never);
      await service.register(VALID_INPUT);

      // Call 3 (index 3) should be the invalidation of old tokens
      const [invalidateSql, invalidateParams] = (db.query as jest.Mock).mock.calls[3] as [string, string[]];
      expect(invalidateSql).toContain('UPDATE email_verification_tokens SET used_at');
      expect(invalidateParams[0]).toBe(TEST_USER_ID);
    });
  });

  describe('verifyEmail', () => {
    it('should mark token as used and verify user email', async () => {
      const futureDate = new Date(Date.now() + 86400000).toISOString(); // 24h from now
      const db = makeMockDb({
        query: jest.fn()
          .mockResolvedValueOnce([{ user_id: TEST_USER_ID, expires_at: futureDate, used_at: null }])
          .mockResolvedValueOnce([]) // mark token used
          .mockResolvedValueOnce([]), // update user has_verified_email
      });

      const service = new RegistrationService(db as never);
      const result = await service.verifyEmail('valid-token');

      expect(result.success).toBe(true);

      // Verify token was marked as used
      const [tokenSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(tokenSql).toContain('UPDATE email_verification_tokens SET used_at');

      // Verify user was updated
      const [userSql] = (db.query as jest.Mock).mock.calls[2] as [string];
      expect(userSql).toContain('UPDATE users SET has_verified_email = TRUE');
    });

    it('should throw ValidationError for invalid token', async () => {
      const db = makeMockDb({
        query: jest.fn().mockResolvedValueOnce([]),
      });

      const service = new RegistrationService(db as never);

      await expect(service.verifyEmail('nonexistent-token'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for already-used token', async () => {
      const db = makeMockDb({
        query: jest.fn().mockResolvedValueOnce([{
          user_id: TEST_USER_ID,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          used_at: new Date().toISOString(),
        }]),
      });

      const service = new RegistrationService(db as never);

      await expect(service.verifyEmail('used-token'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for expired token', async () => {
      const db = makeMockDb({
        query: jest.fn().mockResolvedValueOnce([{
          user_id: TEST_USER_ID,
          expires_at: new Date(Date.now() - 86400000).toISOString(), // 24h ago
          used_at: null,
        }]),
      });

      const service = new RegistrationService(db as never);

      await expect(service.verifyEmail('expired-token'))
        .rejects.toThrow(ValidationError);
    });

    it('should include correct error code for already-used token', async () => {
      const db = makeMockDb({
        query: jest.fn().mockResolvedValueOnce([{
          user_id: TEST_USER_ID,
          expires_at: new Date(Date.now() + 86400000).toISOString(),
          used_at: new Date().toISOString(),
        }]),
      });

      const service = new RegistrationService(db as never);

      try {
        await service.verifyEmail('used-token');
        fail('Expected ValidationError');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const ve = err as ValidationError;
        expect(ve.validationErrors[0].code).toBe('token_used');
      }
    });

    it('should include correct error code for expired token', async () => {
      const db = makeMockDb({
        query: jest.fn().mockResolvedValueOnce([{
          user_id: TEST_USER_ID,
          expires_at: new Date(Date.now() - 86400000).toISOString(),
          used_at: null,
        }]),
      });

      const service = new RegistrationService(db as never);

      try {
        await service.verifyEmail('expired-token');
        fail('Expected ValidationError');
      } catch (err) {
        expect(err).toBeInstanceOf(ValidationError);
        const ve = err as ValidationError;
        expect(ve.validationErrors[0].code).toBe('token_expired');
      }
    });
  });
});
