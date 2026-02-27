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

describe('Ledger performance middleware', () => {
  it('adds response-time and cache headers on health endpoint', async () => {
    const app = createApp({ ledgerService: {} as never });

    const response = await request(app).get('/health');

    expect(response.status).toBe(200);
    expect(response.headers['x-response-time-ms']).toBeDefined();
    expect(response.headers['cache-control']).toContain('max-age=30');
  });

  it('keeps health endpoint average response under 500ms', async () => {
    const app = createApp({ ledgerService: {} as never });
    const startedAt = Date.now();

    for (let index = 0; index < 25; index += 1) {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    }

    const averageDuration = (Date.now() - startedAt) / 25;
    expect(averageDuration).toBeLessThan(500);
  });
});
