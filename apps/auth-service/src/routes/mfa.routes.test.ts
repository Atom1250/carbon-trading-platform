import request from 'supertest';
import { createApp } from '../app';
import { AuthenticationError } from '@libs/errors';

// Mock logger to suppress output during tests
jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const VALID_USER_PAYLOAD = {
  userId: '550e8400-e29b-41d4-a716-446655440000',
  institutionId: '660e8400-e29b-41d4-a716-446655440001',
  role: 'investor',
  tokenId: 'tok-123',
};

function makeServices(opts: {
  verifyAccessToken?: jest.Mock;
  setup?: jest.Mock;
  enable?: jest.Mock;
} = {}) {
  const tokenService = {
    generateAccessToken: jest.fn(),
    generateRefreshToken: jest.fn(),
    verifyAccessToken: opts.verifyAccessToken ?? jest.fn().mockReturnValue(VALID_USER_PAYLOAD),
    verifyRefreshToken: jest.fn(),
  };

  const mfaService = {
    setup: opts.setup ?? jest.fn().mockResolvedValue({
      secret: 'JBSWY3DPEHPK3PXP',
      qrCodeDataUrl: 'data:image/png;base64,abc123',
    }),
    verifyTOTP: jest.fn(),
    enable: opts.enable ?? jest.fn().mockResolvedValue(undefined),
  };

  const authService = {
    login: jest.fn(),
    refresh: jest.fn(),
    logout: jest.fn(),
    verifyMFA: jest.fn(),
  };

  const registrationService = {
    register: jest.fn(),
    verifyEmail: jest.fn(),
  };

  const passwordResetService = {
    requestReset: jest.fn(),
    resetPassword: jest.fn(),
  };

  const loginAttemptService = {
    checkRateLimit: jest.fn(),
    trackAttempt: jest.fn(),
  };

  return { tokenService, mfaService, authService, registrationService, passwordResetService, loginAttemptService };
}

describe('POST /auth/mfa/setup', () => {
  it('should return 200 with secret and QR code for authenticated user', async () => {
    const { tokenService, mfaService, authService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/mfa/setup')
      .set('Authorization', 'Bearer valid-access-token');

    expect(res.status).toBe(200);
    expect(res.body.secret).toBe('JBSWY3DPEHPK3PXP');
    expect(res.body.qrCodeDataUrl).toContain('data:image/png');
    expect(mfaService.setup).toHaveBeenCalledWith(VALID_USER_PAYLOAD.userId);
  });

  it('should return 401 when no Authorization header is provided', async () => {
    const { tokenService, mfaService, authService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app).post('/auth/mfa/setup');

    expect(res.status).toBe(401);
  });

  it('should return 401 when token is invalid', async () => {
    const { tokenService, mfaService, authService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      verifyAccessToken: jest.fn().mockImplementation(() => {
        throw new AuthenticationError('Invalid token');
      }),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/mfa/setup')
      .set('Authorization', 'Bearer bad-token');

    expect(res.status).toBe(401);
  });
});

describe('POST /auth/mfa/enable', () => {
  it('should return 200 on successful enable', async () => {
    const { tokenService, mfaService, authService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/mfa/enable')
      .set('Authorization', 'Bearer valid-token')
      .send({ token: '123456' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('MFA enabled successfully');
    expect(mfaService.enable).toHaveBeenCalledWith(VALID_USER_PAYLOAD.userId, '123456');
  });

  it('should return 422 when token is not 6 digits', async () => {
    const { tokenService, mfaService, authService, registrationService, passwordResetService, loginAttemptService } = makeServices();
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/mfa/enable')
      .set('Authorization', 'Bearer valid-token')
      .send({ token: '12345' });

    expect(res.status).toBe(422);
  });

  it('should return 401 when MFA code is wrong', async () => {
    const { tokenService, mfaService, authService, registrationService, passwordResetService, loginAttemptService } = makeServices({
      enable: jest.fn().mockRejectedValue(new AuthenticationError('Invalid MFA code')),
    });
    const app = createApp({ authService: authService as never, tokenService: tokenService as never, mfaService: mfaService as never, registrationService: registrationService as never, passwordResetService: passwordResetService as never, loginAttemptService: loginAttemptService as never });

    const res = await request(app)
      .post('/auth/mfa/enable')
      .set('Authorization', 'Bearer valid-token')
      .send({ token: '000000' });

    expect(res.status).toBe(401);
  });
});
