import request from 'supertest';
import { createApp } from '../app';
import { AuthenticationError, ConflictError, NotFoundError, RateLimitError, ValidationError } from '@libs/errors';

// Mock logger to suppress output during tests
jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const TEST_USER = {
  id: '550e8400-e29b-41d4-a716-446655440000',
  institutionId: '660e8400-e29b-41d4-a716-446655440001',
  email: 'trader@example.com',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'investor',
  mfaEnabled: false,
};

function makeServices(overrides: {
  login?: jest.Mock;
  refresh?: jest.Mock;
  logout?: jest.Mock;
  verifyMFA?: jest.Mock;
  register?: jest.Mock;
  verifyEmail?: jest.Mock;
  requestReset?: jest.Mock;
  resetPassword?: jest.Mock;
  checkRateLimit?: jest.Mock;
  trackAttempt?: jest.Mock;
} = {}) {
  const authService = {
    login: overrides.login ?? jest.fn().mockResolvedValue({
      accessToken: 'access-tok',
      refreshToken: 'refresh-tok',
      user: TEST_USER,
      requiresMFA: false,
    }),
    refresh: overrides.refresh ?? jest.fn().mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    }),
    logout: overrides.logout ?? jest.fn().mockResolvedValue(undefined),
    verifyMFA: overrides.verifyMFA ?? jest.fn().mockResolvedValue({
      accessToken: 'mfa-access',
      refreshToken: 'mfa-refresh',
    }),
  };

  const tokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyAccessToken: jest.fn(),
    verifyRefreshToken: jest.fn(),
  };

  const mfaService = {
    setup: jest.fn(),
    verifyTOTP: jest.fn(),
    enable: jest.fn(),
  };

  const registrationService = {
    register: overrides.register ?? jest.fn().mockResolvedValue({
      user: {
        id: TEST_USER.id,
        email: 'newuser@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        role: 'investor',
      },
      verificationToken: 'verify-tok-123',
    }),
    verifyEmail: overrides.verifyEmail ?? jest.fn().mockResolvedValue({ success: true }),
  };

  const passwordResetService = {
    requestReset: overrides.requestReset ?? jest.fn().mockResolvedValue({ success: true, token: 'reset-tok-abc' }),
    resetPassword: overrides.resetPassword ?? jest.fn().mockResolvedValue({ success: true }),
  };

  const loginAttemptService = {
    checkRateLimit: overrides.checkRateLimit ?? jest.fn().mockResolvedValue(undefined),
    trackAttempt: overrides.trackAttempt ?? jest.fn().mockResolvedValue(undefined),
  };

  return { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService };
}

describe('POST /auth/login', () => {
  it('should return 200 with tokens on valid credentials', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('access-tok');
    expect(res.body.user.email).toBe('trader@example.com');
    expect(res.body.requiresMFA).toBe(false);
  });

  it('should return 422 for missing email', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 for invalid email format', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(422);
  });

  it('should return 401 for invalid credentials', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      login: jest.fn().mockRejectedValue(new AuthenticationError('Invalid credentials')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Invalid credentials');
  });

  it('should return 200 with requiresMFA=true when MFA is enabled', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      login: jest.fn().mockResolvedValue({
        accessToken: '',
        refreshToken: '',
        user: { ...TEST_USER, mfaEnabled: true },
        requiresMFA: true,
      }),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.requiresMFA).toBe(true);
  });
});

describe('POST /auth/refresh', () => {
  it('should return 200 with new tokens', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'old-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('new-access');
    expect(res.body.refreshToken).toBe('new-refresh');
  });

  it('should return 422 for missing refreshToken', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app).post('/auth/refresh').send({});

    expect(res.status).toBe(422);
  });

  it('should return 401 for expired token', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      refresh: jest.fn().mockRejectedValue(new AuthenticationError('Refresh token not found or expired')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'expired-token' });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('should return 204 on successful logout', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'my-refresh-token' });

    expect(res.status).toBe(204);
    expect(authService.logout).toHaveBeenCalledWith('my-refresh-token');
  });
});

describe('POST /auth/mfa/verify', () => {
  it('should return 200 with tokens on valid TOTP', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/mfa/verify')
      .send({ userId: '550e8400-e29b-41d4-a716-446655440000', token: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('mfa-access');
  });

  it('should return 422 for token that is not 6 digits', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/mfa/verify')
      .send({ userId: '550e8400-e29b-41d4-a716-446655440000', token: '12345' });

    expect(res.status).toBe(422);
  });
});

const VALID_REGISTRATION = {
  institutionId: '660e8400-e29b-41d4-a716-446655440001',
  email: 'newuser@example.com',
  password: 'P@ssword123',
  firstName: 'Jane',
  lastName: 'Doe',
  role: 'investor',
};

describe('POST /auth/register', () => {
  it('should return 201 with user and verification token', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send(VALID_REGISTRATION);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe('newuser@example.com');
    expect(res.body.verificationToken).toBe('verify-tok-123');
    expect(registrationService.register).toHaveBeenCalledWith(VALID_REGISTRATION);
  });

  it('should return 422 for missing email', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, email: undefined });

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid email format', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, email: 'not-an-email' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for weak password (no uppercase)', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, password: 'p@ssword123' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for weak password (no special character)', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, password: 'Password123' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for password shorter than 8 characters', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, password: 'P@1abc' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid role', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, role: 'admin' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for non-UUID institutionId', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, institutionId: 'not-a-uuid' });

    expect(res.status).toBe(422);
  });

  it('should return 409 when email already exists', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      register: jest.fn().mockRejectedValue(new ConflictError('A user with this email already exists')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send(VALID_REGISTRATION);

    expect(res.status).toBe(409);
    expect(res.body.detail).toBe('A user with this email already exists');
  });

  it('should return 404 when institution does not exist', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      register: jest.fn().mockRejectedValue(new NotFoundError('Institution not found')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send(VALID_REGISTRATION);

    expect(res.status).toBe(404);
  });

  it('should accept compliance_officer as a valid role', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/register')
      .send({ ...VALID_REGISTRATION, role: 'compliance_officer' });

    expect(res.status).toBe(201);
  });
});

describe('POST /auth/verify-email', () => {
  it('should return 200 with success on valid token', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/verify-email')
      .send({ token: 'valid-verification-token' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(registrationService.verifyEmail).toHaveBeenCalledWith('valid-verification-token');
  });

  it('should return 422 for missing token', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/verify-email')
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 422 when service throws ValidationError', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      verifyEmail: jest.fn().mockRejectedValue(new ValidationError('Invalid verification token', [
        { field: 'token', message: 'Token is invalid', code: 'invalid_token' },
      ])),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/verify-email')
      .send({ token: 'bad-token' });

    expect(res.status).toBe(422);
  });
});

describe('POST /auth/forgot-password', () => {
  it('should return 200 with success on valid email', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(passwordResetService.requestReset).toHaveBeenCalled();
  });

  it('should return 422 for invalid email format', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'not-an-email' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for missing email', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 429 when rate limit is exceeded', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      checkRateLimit: jest.fn().mockRejectedValue(new RateLimitError('Too many failed attempts. Please try again later.', 900)),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/forgot-password')
      .send({ email: 'user@example.com' });

    expect(res.status).toBe(429);
    expect(res.body.title).toBe('Too Many Requests');
  });
});

describe('POST /auth/reset-password', () => {
  it('should return 200 on successful password reset', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'valid-reset-token', newPassword: 'NewP@ss123' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(passwordResetService.resetPassword).toHaveBeenCalledWith('valid-reset-token', 'NewP@ss123');
  });

  it('should return 422 for missing token', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ newPassword: 'NewP@ss123' });

    expect(res.status).toBe(422);
  });

  it('should return 422 for weak password', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'some-token', newPassword: 'weak' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when token is invalid', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      resetPassword: jest.fn().mockRejectedValue(new ValidationError('Invalid reset token')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'bad-token', newPassword: 'NewP@ss123' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when token is expired', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      resetPassword: jest.fn().mockRejectedValue(new ValidationError('Reset token has expired')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/reset-password')
      .send({ token: 'expired-token', newPassword: 'NewP@ss123' });

    expect(res.status).toBe(422);
  });
});

describe('Login rate limiting', () => {
  it('should return 429 when login rate limit is exceeded', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      checkRateLimit: jest.fn().mockRejectedValue(new RateLimitError('Too many failed attempts. Please try again later.', 900)),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'password123' });

    expect(res.status).toBe(429);
    expect(loginAttemptService.checkRateLimit).toHaveBeenCalled();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('should track successful login attempt', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'password123' });

    expect(loginAttemptService.trackAttempt).toHaveBeenCalledWith(
      'trader@example.com',
      expect.any(String),
      expect.any(String),
      true,
      null,
    );
  });

  it('should track failed login attempt', async () => {
    const { authService, tokenService, mfaService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      login: jest.fn().mockRejectedValue(new AuthenticationError('Invalid credentials')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'wrongpassword' });

    expect(loginAttemptService.trackAttempt).toHaveBeenCalledWith(
      'trader@example.com',
      expect.any(String),
      expect.any(String),
      false,
      'invalid_credentials',
    );
  });
});
