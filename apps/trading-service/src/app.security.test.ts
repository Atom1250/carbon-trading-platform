import request from 'supertest';
import { createApp } from './app';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('Trading security middleware', () => {
  it('sets CSP header on responses', async () => {
    const app = createApp({ rfqService: {} as never });
    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['content-security-policy']).toContain("default-src 'self'");
  });

  it('enforces rate limiting when threshold is exceeded', async () => {
    const app = createApp({
      rfqService: {} as never,
      security: { rateLimitMax: 2, rateLimitWindowMs: 60_000 },
    });

    await request(app).get('/health');
    await request(app).get('/health');
    const limited = await request(app).get('/health');

    expect(limited.status).toBe(429);
  });

  it('rejects state-changing requests with invalid CSRF token', async () => {
    const app = createApp({ rfqService: {} as never });

    const response = await request(app)
      .post('/rfq')
      .set('cookie', 'csrf_token=expected-token')
      .send({});

    expect(response.status).toBe(403);
    expect(response.body.detail).toContain('CSRF');
  });
});
