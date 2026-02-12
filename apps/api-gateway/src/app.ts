import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseCorsOrigins } from '@libs/config';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthRouter } from './routes/health.routes.js';
import type { HealthDependencies } from './routes/health.routes.js';
import { createProxyMiddleware } from './middleware/proxy.js';
import type { ServiceConfig } from './config/services.config.js';
import type { HealthMonitor } from './services/healthMonitor.js';

export interface AppDependencies extends HealthDependencies {
  corsOrigins?: string;
  serviceRegistry?: Record<string, ServiceConfig>;
  healthMonitor?: HealthMonitor;
}

/**
 * Create and configure the Express application.
 *
 * Accepts external dependencies (DB/Redis checkers, CORS origins) so the
 * app can be constructed without side effects in tests.
 *
 * Middleware order (must not change):
 *   1. Security (helmet)
 *   2. CORS
 *   3. Body parsing
 *   4. Request ID
 *   5. Logging
 *   6. Routes
 *   7. Error handler (must be last)
 */
export function createApp(deps: AppDependencies): Express {
  const app = express();

  // 1. Security headers
  app.use(helmet());

  // 2. CORS — whitelist only, never wildcard
  const origins = parseCorsOrigins(
    deps.corsOrigins ?? process.env['CORS_ORIGINS'] ?? 'http://localhost:3000',
  );
  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  // 3. Body parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // 4. Request ID (before logging so ID is available in logs)
  app.use(requestIdMiddleware);

  // 5. HTTP access logging
  app.use(loggingMiddleware);

  // 6. Routes
  app.use('/health', createHealthRouter(deps, deps.healthMonitor));

  // Proxy routes — forward to downstream microservices
  if (deps.serviceRegistry) {
    const registry = deps.serviceRegistry;
    if (registry['auth']) {
      app.use('/api/v1/auth', createProxyMiddleware('auth', registry['auth']));
    }
    if (registry['institutions']) {
      app.use('/api/v1/institutions', createProxyMiddleware('institutions', registry['institutions']));
    }
    if (registry['assets']) {
      app.use('/api/v1/assets', createProxyMiddleware('assets', registry['assets']));
    }
  }

  // Catch-all 404 for unrecognised routes
  app.use((_req, res) => {
    res.status(404).json({
      type: 'https://api.carbon-platform.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource does not exist',
      instance: _req.path,
    });
  });

  // 7. Error handler (must be after all routes)
  app.use(errorHandler);

  return app;
}
