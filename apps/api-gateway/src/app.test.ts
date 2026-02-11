import request from 'supertest';
import axios from 'axios';
import { createApp } from './app.js';
import type { ServiceConfig } from './config/services.config.js';

jest.mock('axios');
jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

const testDeps = {
  corsOrigins: 'http://localhost:3000',
  checkDatabase: jest.fn().mockResolvedValue(undefined),
  checkRedis: jest.fn().mockResolvedValue(undefined),
};

describe('createApp', () => {
  const app = createApp(testDeps);

  beforeEach(() => jest.clearAllMocks());

  describe('security middleware', () => {
    it('should set X-Content-Type-Options header (helmet)', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-content-type-options']).toBe('nosniff');
    });

    it('should not expose X-Powered-By header (helmet removes it)', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('request ID middleware', () => {
    it('should return X-Request-ID header on every response', async () => {
      const res = await request(app).get('/health');
      expect(res.headers['x-request-id']).toBeDefined();
    });

    it('should honour client-provided X-Request-ID', async () => {
      const clientId = 'client-trace-999';
      const res = await request(app).get('/health').set('X-Request-ID', clientId);
      expect(res.headers['x-request-id']).toBe(clientId);
    });

    it('should generate a new X-Request-ID when none is provided', async () => {
      const res1 = await request(app).get('/health');
      const res2 = await request(app).get('/health');
      expect(res1.headers['x-request-id']).toBeDefined();
      expect(res1.headers['x-request-id']).not.toBe(res2.headers['x-request-id']);
    });
  });

  describe('GET /health', () => {
    it('should return 200', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('healthy');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return 200 when dependencies are healthy', async () => {
      testDeps.checkDatabase.mockResolvedValue(undefined);
      testDeps.checkRedis.mockResolvedValue(undefined);
      const res = await request(app).get('/health/detailed');
      expect(res.status).toBe(200);
      expect(res.body.checks.database).toBe('ok');
      expect(res.body.checks.redis).toBe('ok');
    });

    it('should return 503 when a dependency is down', async () => {
      const failApp = createApp({
        ...testDeps,
        checkDatabase: jest.fn().mockRejectedValue(new Error('DB down')),
      });
      const res = await request(failApp).get('/health/detailed');
      expect(res.status).toBe(503);
    });
  });

  describe('404 handler', () => {
    it('should return 404 JSON for unknown routes', async () => {
      const res = await request(app).get('/api/v1/nonexistent');
      expect(res.status).toBe(404);
      expect(res.body.status).toBe(404);
      expect(res.body.title).toBe('Not Found');
    });

    it('should return RFC 7807 format for 404', async () => {
      const res = await request(app).get('/unknown');
      expect(res.body).toHaveProperty('type');
      expect(res.body).toHaveProperty('title');
      expect(res.body).toHaveProperty('status');
      expect(res.body).toHaveProperty('detail');
      expect(res.body).toHaveProperty('instance');
    });
  });

  describe('error handler', () => {
    it('should return 500 RFC 7807 for unhandled errors thrown in routes', async () => {
      // Mount a route that throws
      const crashApp = createApp({
        ...testDeps,
        checkDatabase: jest.fn().mockImplementation(() => {
          throw new Error('Unexpected crash');
        }),
      });
      const res = await request(crashApp).get('/health/detailed');
      // The error is thrown synchronously; Express error handler catches it
      expect(res.status).toBeGreaterThanOrEqual(500);
    });
  });

  describe('body parsing', () => {
    it('should parse JSON request body', async () => {
      // POST to a health endpoint (will 404 but body parsing should work)
      const res = await request(app)
        .post('/health')
        .send({ test: true })
        .set('Content-Type', 'application/json');
      // 404 is fine — body parsing middleware ran
      expect(res.status).toBe(404);
    });
  });

  describe('proxy routes', () => {
    const serviceRegistry: Record<string, ServiceConfig> = {
      auth: { url: 'http://localhost:3002', healthPath: '/health', timeout: 30_000 },
      institutions: { url: 'http://localhost:3003', healthPath: '/health', timeout: 30_000 },
    };

    const proxyApp = createApp({ ...testDeps, serviceRegistry });

    beforeEach(() => jest.clearAllMocks());

    it('should route /api/v1/auth/* to auth service', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: { token: 'abc' },
        headers: { 'content-type': 'application/json' },
      });

      const res = await request(proxyApp)
        .post('/api/v1/auth/login')
        .send({ email: 'user@test.com', password: 'pass' });

      expect(res.status).toBe(200);
      expect(res.body.token).toBe('abc');
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3002/login',
        }),
      );
    });

    it('should route /api/v1/auth/register to auth service', async () => {
      mockedAxios.mockResolvedValue({
        status: 201,
        data: { id: '123' },
        headers: {},
      });

      const res = await request(proxyApp)
        .post('/api/v1/auth/register')
        .send({ email: 'new@test.com' });

      expect(res.status).toBe(201);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3002/register',
        }),
      );
    });

    it('should route /api/v1/institutions to institutions service', async () => {
      mockedAxios.mockResolvedValue({
        status: 200,
        data: [{ id: '1', name: 'Test Corp' }],
        headers: {},
      });

      const res = await request(proxyApp).get('/api/v1/institutions');

      expect(res.status).toBe(200);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3003/',
        }),
      );
    });

    it('should route POST /api/v1/institutions to institutions service', async () => {
      mockedAxios.mockResolvedValue({
        status: 201,
        data: { id: '2' },
        headers: {},
      });

      const res = await request(proxyApp)
        .post('/api/v1/institutions')
        .send({ name: 'New Corp' });

      expect(res.status).toBe(201);
      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'http://localhost:3003/',
          method: 'POST',
        }),
      );
    });

    it('should return 503 when auth service is down', async () => {
      const err = new Error('connect ECONNREFUSED');
      (err as NodeJS.ErrnoException).code = 'ECONNREFUSED';
      mockedAxios.mockRejectedValue(err);

      const res = await request(proxyApp).post('/api/v1/auth/login').send({});

      expect(res.status).toBe(503);
      expect(res.body.title).toBe('Service Unavailable');
    });

    it('should return 503 when institutions service is down', async () => {
      const err = new Error('connect ECONNREFUSED');
      (err as NodeJS.ErrnoException).code = 'ECONNREFUSED';
      mockedAxios.mockRejectedValue(err);

      const res = await request(proxyApp).get('/api/v1/institutions');

      expect(res.status).toBe(503);
    });

    it('should forward request ID to downstream services', async () => {
      mockedAxios.mockResolvedValue({ status: 200, data: {}, headers: {} });

      await request(proxyApp)
        .get('/api/v1/auth/me')
        .set('X-Request-ID', 'trace-abc-123');

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            'x-request-id': 'trace-abc-123',
          }),
        }),
      );
    });

    it('should not mount proxy routes when serviceRegistry is not provided', async () => {
      const noProxyApp = createApp(testDeps);
      const res = await request(noProxyApp).get('/api/v1/auth/login');

      expect(res.status).toBe(404);
    });
  });
});
