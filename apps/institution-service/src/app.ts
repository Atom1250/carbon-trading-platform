import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseCorsOrigins } from '@libs/config';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createInstitutionRouter } from './routes/institution.routes.js';
import { createProjectRouter } from './routes/project.routes.js';
import { createFundingRequestRouter } from './routes/funding-request.routes.js';
import type { InstitutionService } from './services/InstitutionService.js';
import type { ProjectService } from './services/ProjectService.js';

export interface InstitutionAppDependencies {
  institutionService: InstitutionService;
  projectService?: ProjectService;
  corsOrigins?: string;
}

export function createApp(deps: InstitutionAppDependencies): Express {
  const app = express();

  app.use(helmet());

  const origins = parseCorsOrigins(
    deps.corsOrigins ?? process.env['CORS_ORIGINS'] ?? 'http://localhost:3000',
  );
  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestIdMiddleware);
  app.use(loggingMiddleware);

  app.use('/institutions', createInstitutionRouter(deps.institutionService));
  if (deps.projectService) {
    app.use('/projects', createProjectRouter(deps.projectService));
    app.use('/funding-requests', createFundingRequestRouter(deps.projectService));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', service: 'institution-service' });
  });

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
