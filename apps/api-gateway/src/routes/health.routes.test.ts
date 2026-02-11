import request from 'supertest';
import express from 'express';
import { createHealthRouter } from './health.routes.js';
import { errorHandler } from '../middleware/errorHandler.js';
import type { HealthMonitor } from '../services/healthMonitor.js';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

function buildTestApp(
  checkDatabase: () => Promise<void>,
  checkRedis: () => Promise<void>,
  healthMonitor?: HealthMonitor,
): express.Express {
  const app = express();
  app.use(express.json());
  // Stub requestId for tests
  app.use((req, _res, next) => {
    (req as unknown as Record<string, string>)['requestId'] = 'test-req-id';
    next();
  });
  app.use('/health', createHealthRouter({ checkDatabase, checkRedis }, healthMonitor));
  app.use(errorHandler);
  return app;
}

describe('GET /health', () => {
  it('should return 200 with status healthy', async () => {
    const app = buildTestApp(jest.fn(), jest.fn());
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
  });

  it('should include timestamp as ISO 8601 string', async () => {
    const app = buildTestApp(jest.fn(), jest.fn());
    const res = await request(app).get('/health');

    expect(typeof res.body.timestamp).toBe('string');
    expect(() => new Date(res.body.timestamp).toISOString()).not.toThrow();
  });

  it('should include uptime as a number', async () => {
    const app = buildTestApp(jest.fn(), jest.fn());
    const res = await request(app).get('/health');

    expect(typeof res.body.uptime).toBe('number');
    expect(res.body.uptime).toBeGreaterThanOrEqual(0);
  });

  it('should include version', async () => {
    const app = buildTestApp(jest.fn(), jest.fn());
    const res = await request(app).get('/health');

    expect(typeof res.body.version).toBe('string');
  });

  it('should NOT call database or redis checks', async () => {
    const checkDb = jest.fn();
    const checkRedis = jest.fn();
    const app = buildTestApp(checkDb, checkRedis);

    await request(app).get('/health');

    expect(checkDb).not.toHaveBeenCalled();
    expect(checkRedis).not.toHaveBeenCalled();
  });
});

describe('GET /health/detailed', () => {
  it('should return 200 when all dependencies are healthy', async () => {
    const app = buildTestApp(
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockResolvedValue(undefined),
    );
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.checks.database).toBe('ok');
    expect(res.body.checks.redis).toBe('ok');
  });

  it('should return 503 when database check fails', async () => {
    const app = buildTestApp(
      jest.fn().mockRejectedValue(new Error('DB down')),
      jest.fn().mockResolvedValue(undefined),
    );
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(503);
    expect(res.body.status).toBe(503);
  });

  it('should return 503 when redis check fails', async () => {
    const app = buildTestApp(
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockRejectedValue(new Error('Redis down')),
    );
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(503);
  });

  it('should return 503 when both dependencies fail', async () => {
    const app = buildTestApp(
      jest.fn().mockRejectedValue(new Error('DB down')),
      jest.fn().mockRejectedValue(new Error('Redis down')),
    );
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(503);
  });

  it('should include timestamp when healthy', async () => {
    const app = buildTestApp(
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockResolvedValue(undefined),
    );
    const res = await request(app).get('/health/detailed');

    expect(typeof res.body.timestamp).toBe('string');
  });

  it('should call both dependency checks', async () => {
    const checkDb = jest.fn().mockResolvedValue(undefined);
    const checkRedis = jest.fn().mockResolvedValue(undefined);
    const app = buildTestApp(checkDb, checkRedis);

    await request(app).get('/health/detailed');

    expect(checkDb).toHaveBeenCalledTimes(1);
    expect(checkRedis).toHaveBeenCalledTimes(1);
  });

  it('should include downstream service health when healthMonitor is provided', async () => {
    const mockMonitor = {
      checkAllServices: jest.fn().mockResolvedValue([
        { service: 'auth', status: 'healthy', responseTime: 15 },
        { service: 'institutions', status: 'healthy', responseTime: 20 },
      ]),
      checkService: jest.fn(),
    } as unknown as HealthMonitor;

    const app = buildTestApp(
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockResolvedValue(undefined),
      mockMonitor,
    );
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(200);
    expect(res.body.services).toHaveLength(2);
    expect(res.body.services[0].service).toBe('auth');
    expect(res.body.services[0].status).toBe('healthy');
  });

  it('should return degraded status when a downstream service is unhealthy', async () => {
    const mockMonitor = {
      checkAllServices: jest.fn().mockResolvedValue([
        { service: 'auth', status: 'healthy', responseTime: 15 },
        { service: 'institutions', status: 'unhealthy', error: 'Connection refused' },
      ]),
      checkService: jest.fn(),
    } as unknown as HealthMonitor;

    const app = buildTestApp(
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockResolvedValue(undefined),
      mockMonitor,
    );
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('degraded');
    expect(res.body.services).toHaveLength(2);
  });

  it('should not include services field when no healthMonitor is provided', async () => {
    const app = buildTestApp(
      jest.fn().mockResolvedValue(undefined),
      jest.fn().mockResolvedValue(undefined),
    );
    const res = await request(app).get('/health/detailed');

    expect(res.status).toBe(200);
    expect(res.body.services).toBeUndefined();
  });
});
