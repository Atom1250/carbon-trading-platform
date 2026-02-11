import request from 'supertest';
import { createApp } from '../app';
import { AuthenticationError, ValidationError } from '@libs/errors';

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

  return { authService, tokenService, mfaService };
}

describe('POST /auth/login', () => {
  it('should return 200 with tokens on valid credentials', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('access-tok');
    expect(res.body.user.email).toBe('trader@example.com');
    expect(res.body.requiresMFA).toBe(false);
  });

  it('should return 422 for missing email', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ password: 'password123' });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 for invalid email format', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'password123' });

    expect(res.status).toBe(422);
  });

  it('should return 401 for invalid credentials', async () => {
    const { authService, tokenService, mfaService } = makeServices({
      login: jest.fn().mockRejectedValue(new AuthenticationError('Invalid credentials')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.detail).toBe('Invalid credentials');
  });

  it('should return 200 with requiresMFA=true when MFA is enabled', async () => {
    const { authService, tokenService, mfaService } = makeServices({
      login: jest.fn().mockResolvedValue({
        accessToken: '',
        refreshToken: '',
        user: { ...TEST_USER, mfaEnabled: true },
        requiresMFA: true,
      }),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'trader@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.requiresMFA).toBe(true);
  });
});

describe('POST /auth/refresh', () => {
  it('should return 200 with new tokens', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'old-refresh-token' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('new-access');
    expect(res.body.refreshToken).toBe('new-refresh');
  });

  it('should return 422 for missing refreshToken', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app).post('/auth/refresh').send({});

    expect(res.status).toBe(422);
  });

  it('should return 401 for expired token', async () => {
    const { authService, tokenService, mfaService } = makeServices({
      refresh: jest.fn().mockRejectedValue(new AuthenticationError('Refresh token not found or expired')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/refresh')
      .send({ refreshToken: 'expired-token' });

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/logout', () => {
  it('should return 204 on successful logout', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/logout')
      .send({ refreshToken: 'my-refresh-token' });

    expect(res.status).toBe(204);
    expect(authService.logout).toHaveBeenCalledWith('my-refresh-token');
  });
});

describe('POST /auth/mfa/verify', () => {
  it('should return 200 with tokens on valid TOTP', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/mfa/verify')
      .send({ userId: '550e8400-e29b-41d4-a716-446655440000', token: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.accessToken).toBe('mfa-access');
  });

  it('should return 422 for token that is not 6 digits', async () => {
    const { authService, tokenService, mfaService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never });

    const res = await request(app)
      .post('/auth/mfa/verify')
      .send({ userId: '550e8400-e29b-41d4-a716-446655440000', token: '12345' });

    expect(res.status).toBe(422);
  });
});
