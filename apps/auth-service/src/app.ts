import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseCorsOrigins } from '@libs/config';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createMFARouter } from './routes/mfa.routes.js';
import type { AuthService } from './services/AuthService.js';
import type { MFAService } from './services/MFAService.js';
import type { TokenService } from './services/TokenService.js';

export interface AuthAppDependencies {
  tokenService: TokenService;
  authService: AuthService;
  mfaService: MFAService;
  corsOrigins?: string;
}

export function createApp(deps: AuthAppDependencies): Express {
  const app = express();

  app.use(helmet());

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

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestIdMiddleware);
  app.use(loggingMiddleware);

  app.use('/auth', createAuthRouter(deps.authService));
  app.use('/auth/mfa', createMFARouter(deps.mfaService, deps.tokenService));

  app.use((_req, res) => {
    res.status(404).json({
      type: 'https://api.carbon-platform.com/errors/not-found',
      title: 'Not Found',
      status: 404,
      detail: 'The requested resource does not exist',
      instance: _req.path,
    });
  });

  app.use(errorHandler);

  return app;
}
