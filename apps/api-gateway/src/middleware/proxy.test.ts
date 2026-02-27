import request from 'supertest';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import axios from 'axios';
import { createProxyMiddleware } from './proxy.js';
import { errorHandler } from './errorHandler.js';
import type { ServiceConfig } from '../config/services.config.js';

jest.mock('axios');
jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

const mockedAxios = axios as jest.MockedFunction<typeof axios>;

const AUTH_CONFIG: ServiceConfig = {
  url: 'http://localhost:3002',
  healthPath: '/health',
  timeout: 30_000,
};

function buildTestApp(serviceName: string, config: ServiceConfig): express.Express {
  const app = express();
  app.use(express.json());
  app.use((req: Request, _res: Response, next: NextFunction) => {
    req.requestId = 'test-req-id';
    next();
  });
  app.use('/api/v1/auth', createProxyMiddleware(serviceName, config));
  app.use(errorHandler);
  return app;
}

describe('createProxyMiddleware', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should forward GET requests to downstream service', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: { message: 'ok' },
      headers: { 'content-type': 'application/json' },
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app).get('/api/v1/auth/login');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: 'ok' });
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'GET',
        url: 'http://localhost:3002/login',
        timeout: 30_000,
      }),
    );
  });

  it('should forward POST requests with body to downstream service', async () => {
    mockedAxios.mockResolvedValue({
      status: 201,
      data: { id: '123' },
      headers: { 'content-type': 'application/json' },
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'user@test.com', password: 'Pass1234!' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: '123' });
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://localhost:3002/register',
        data: expect.objectContaining({ email: 'user@test.com' }),
      }),
    );
  });

  it('should inject X-Request-ID header', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    await request(app).get('/api/v1/auth/profile');

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-request-id': 'test-req-id',
        }),
      }),
    );
  });

  it('should forward Authorization header', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    await request(app)
      .get('/api/v1/auth/profile')
      .set('Authorization', 'Bearer token-123');

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: 'Bearer token-123',
        }),
      }),
    );
  });

  it('should inject X-Forwarded-For header', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    await request(app).get('/api/v1/auth/profile');

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-forwarded-for': expect.any(String),
        }),
      }),
    );
  });

  it('should inject X-Forwarded-Proto header', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: {},
      headers: {},
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    await request(app).get('/api/v1/auth/profile');

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        headers: expect.objectContaining({
          'x-forwarded-proto': 'http',
        }),
      }),
    );
  });

  it('should forward downstream response status code', async () => {
    mockedAxios.mockResolvedValue({
      status: 422,
      data: { type: 'validation-error', title: 'Validation Error', status: 422 },
      headers: { 'content-type': 'application/json' },
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'bad' });

    expect(res.status).toBe(422);
  });

  it('should forward non-hop-by-hop response headers', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: {},
      headers: {
        'content-type': 'application/json',
        'x-custom-header': 'custom-value',
      },
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app).get('/api/v1/auth/profile');

    expect(res.headers['x-custom-header']).toBe('custom-value');
  });

  it('should strip hop-by-hop headers from response', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: {},
      headers: {
        'content-type': 'application/json',
        'transfer-encoding': 'chunked',
        connection: 'keep-alive',
      },
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app).get('/api/v1/auth/profile');

    // Express/supertest may add its own transfer-encoding, but the proxy
    // should not explicitly set the hop-by-hop ones it received
    expect(res.headers['connection']).not.toBe('keep-alive');
  });

  it('should return 503 when downstream service is unavailable (ECONNREFUSED)', async () => {
    const connError = new Error('connect ECONNREFUSED 127.0.0.1:3002');
    (connError as NodeJS.ErrnoException).code = 'ECONNREFUSED';
    mockedAxios.mockRejectedValue(connError);

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app).get('/api/v1/auth/profile');

    expect(res.status).toBe(503);
    expect(res.body.title).toBe('Service Unavailable');
  });

  it('should return 503 when downstream service times out (ETIMEDOUT)', async () => {
    const timeoutError = new Error('connect ETIMEDOUT');
    (timeoutError as NodeJS.ErrnoException).code = 'ETIMEDOUT';
    mockedAxios.mockRejectedValue(timeoutError);

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app).get('/api/v1/auth/profile');

    expect(res.status).toBe(503);
  });

  it('should return 503 when downstream DNS fails (ENOTFOUND)', async () => {
    const dnsError = new Error('getaddrinfo ENOTFOUND localhost');
    (dnsError as NodeJS.ErrnoException).code = 'ENOTFOUND';
    mockedAxios.mockRejectedValue(dnsError);

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app).get('/api/v1/auth/profile');

    expect(res.status).toBe(503);
  });

  it('should pass non-connection errors to the error handler', async () => {
    mockedAxios.mockRejectedValue(new Error('Unexpected error'));

    const app = buildTestApp('auth', AUTH_CONFIG);
    const res = await request(app).get('/api/v1/auth/profile');

    expect(res.status).toBe(500);
  });

  it('should forward query parameters to downstream service', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: [],
      headers: {},
    });

    const app = buildTestApp('auth', AUTH_CONFIG);
    await request(app).get('/api/v1/auth/users?page=1&limit=10');

    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        params: expect.objectContaining({ page: '1', limit: '10' }),
      }),
    );
  });

  it('should prepend configured basePath when proxying', async () => {
    mockedAxios.mockResolvedValue({
      status: 200,
      data: { ok: true },
      headers: { 'content-type': 'application/json' },
    });

    const app = buildTestApp('auth', { ...AUTH_CONFIG, basePath: '/auth' });
    const res = await request(app).post('/api/v1/auth/login').send({ email: 'admin@uat.local' });

    expect(res.status).toBe(200);
    expect(mockedAxios).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:3002/auth/login',
      }),
    );
  });
});
