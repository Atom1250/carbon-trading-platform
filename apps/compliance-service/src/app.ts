import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseCorsOrigins } from '@libs/config';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createScreeningRouter } from './routes/screening.routes.js';
import { createAMLRouter } from './routes/aml.routes.js';
import { createKYCRouter } from './routes/kyc.routes.js';
import type { SanctionsScreeningService } from './services/SanctionsScreeningService.js';
import type { AMLMonitoringService } from './services/AMLMonitoringService.js';
import type { KYCDocumentService } from './services/KYCDocumentService.js';

export interface ComplianceAppDependencies {
  sanctionsScreeningService: SanctionsScreeningService;
  amlMonitoringService?: AMLMonitoringService;
  kycDocumentService?: KYCDocumentService;
  corsOrigins?: string;
}

export function createApp(deps: ComplianceAppDependencies): Express {
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

  app.use('/screenings', createScreeningRouter({
    sanctionsScreeningService: deps.sanctionsScreeningService,
  }));

  if (deps.amlMonitoringService) {
    app.use('/aml', createAMLRouter({
      amlMonitoringService: deps.amlMonitoringService,
    }));
  }

  if (deps.kycDocumentService) {
    app.use('/kyc', createKYCRouter({
      kycDocumentService: deps.kycDocumentService,
    }));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', service: 'compliance-service' });
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
