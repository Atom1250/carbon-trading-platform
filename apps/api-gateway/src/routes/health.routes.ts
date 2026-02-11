import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import { ServiceUnavailableError } from '@libs/errors';
import type { HealthMonitor, ServiceHealth } from '../services/healthMonitor.js';

export interface HealthDependencies {
  checkDatabase: () => Promise<void>;
  checkRedis: () => Promise<void>;
}

interface DependencyStatus {
  database: 'ok' | 'error';
  redis: 'ok' | 'error';
}

interface LivenessResponse {
  status: 'healthy';
  timestamp: string;
  uptime: number;
  version: string;
}

interface ReadinessResponse {
  status: 'healthy' | 'degraded';
  timestamp: string;
  checks: DependencyStatus;
  services?: ServiceHealth[];
}

/**
 * Create health check router with injectable dependency checkers.
 *
 * GET /health        — Liveness probe (always 200 if process is alive)
 * GET /health/detailed — Readiness probe (checks DB + Redis + downstream services)
 */
export function createHealthRouter(deps: HealthDependencies, healthMonitor?: HealthMonitor): Router {
  const router = Router();

  router.get('/', (_req: Request, res: Response) => {
    const body: LivenessResponse = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env['npm_package_version'] ?? '1.0.0',
    };
    res.status(200).json(body);
  });

  router.get('/detailed', async (_req: Request, res: Response, next: NextFunction) => {
    try {
      const results = await Promise.allSettled([deps.checkDatabase(), deps.checkRedis()]);

      const checks: DependencyStatus = {
        database: results[0].status === 'fulfilled' ? 'ok' : 'error',
        redis: results[1].status === 'fulfilled' ? 'ok' : 'error',
      };

      const isHealthy = Object.values(checks).every((v) => v === 'ok');

      if (!isHealthy) {
        const failedServices = Object.entries(checks)
          .filter(([, v]) => v === 'error')
          .map(([k]) => k)
          .join(', ');
        next(new ServiceUnavailableError(failedServices));
        return;
      }

      const body: ReadinessResponse = {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        checks,
      };

      if (healthMonitor) {
        body.services = await healthMonitor.checkAllServices();
        const anyUnhealthy = body.services.some((s) => s.status === 'unhealthy');
        if (anyUnhealthy) {
          body.status = 'degraded';
        }
      }

      res.status(200).json(body);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
