import axios from 'axios';
import { HealthMonitor } from './healthMonitor.js';
import type { ServiceConfig } from '../config/services.config.js';

jest.mock('axios');
jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() })),
}));

const mockedAxiosGet = axios.get as jest.MockedFunction<typeof axios.get>;

const REGISTRY: Record<string, ServiceConfig> = {
  auth: {
    url: 'http://localhost:3002',
    healthPath: '/health',
    timeout: 30_000,
  },
  institutions: {
    url: 'http://localhost:3003',
    healthPath: '/health',
    timeout: 30_000,
  },
};

describe('HealthMonitor', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('checkService', () => {
    it('should return healthy when service responds', async () => {
      mockedAxiosGet.mockResolvedValue({ status: 200 });

      const monitor = new HealthMonitor(REGISTRY);
      const result = await monitor.checkService('auth');

      expect(result.service).toBe('auth');
      expect(result.status).toBe('healthy');
      expect(typeof result.responseTime).toBe('number');
      expect(result.responseTime).toBeGreaterThanOrEqual(0);
    });

    it('should call the correct health endpoint', async () => {
      mockedAxiosGet.mockResolvedValue({ status: 200 });

      const monitor = new HealthMonitor(REGISTRY);
      await monitor.checkService('auth');

      expect(mockedAxiosGet).toHaveBeenCalledWith('http://localhost:3002/health', { timeout: 5000 });
    });

    it('should return unhealthy when service is down', async () => {
      mockedAxiosGet.mockRejectedValue(new Error('connect ECONNREFUSED'));

      const monitor = new HealthMonitor(REGISTRY);
      const result = await monitor.checkService('auth');

      expect(result.service).toBe('auth');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('connect ECONNREFUSED');
    });

    it('should return unhealthy for unknown service', async () => {
      const monitor = new HealthMonitor(REGISTRY);
      const result = await monitor.checkService('unknown-service');

      expect(result.service).toBe('unknown-service');
      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Service not configured');
    });

    it('should handle non-Error thrown values', async () => {
      mockedAxiosGet.mockRejectedValue('network failure');

      const monitor = new HealthMonitor(REGISTRY);
      const result = await monitor.checkService('auth');

      expect(result.status).toBe('unhealthy');
      expect(result.error).toBe('Unknown error');
    });
  });

  describe('checkAllServices', () => {
    it('should check all registered services', async () => {
      mockedAxiosGet.mockResolvedValue({ status: 200 });

      const monitor = new HealthMonitor(REGISTRY);
      const results = await monitor.checkAllServices();

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.service).sort()).toEqual(['auth', 'institutions']);
      expect(results.every((r) => r.status === 'healthy')).toBe(true);
    });

    it('should report individual service failures', async () => {
      mockedAxiosGet
        .mockResolvedValueOnce({ status: 200 }) // auth healthy
        .mockRejectedValueOnce(new Error('Connection refused')); // institutions down

      const monitor = new HealthMonitor(REGISTRY);
      const results = await monitor.checkAllServices();

      const authResult = results.find((r) => r.service === 'auth');
      const instResult = results.find((r) => r.service === 'institutions');

      expect(authResult?.status).toBe('healthy');
      expect(instResult?.status).toBe('unhealthy');
    });

    it('should return empty array for empty registry', async () => {
      const monitor = new HealthMonitor({});
      const results = await monitor.checkAllServices();

      expect(results).toEqual([]);
    });
  });
});
