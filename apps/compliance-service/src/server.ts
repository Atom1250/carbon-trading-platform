import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { SanctionsScreeningService } from './services/SanctionsScreeningService.js';
import { AMLMonitoringService } from './services/AMLMonitoringService.js';
import { KYCDocumentService } from './services/KYCDocumentService.js';
import { PEPCheckingService } from './services/PEPCheckingService.js';
import { SARService } from './services/SARService.js';

const logger = createLogger('compliance-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });

const sanctionsScreeningService = new SanctionsScreeningService(db);
const amlMonitoringService = new AMLMonitoringService(db);
const kycDocumentService = new KYCDocumentService(db);
const pepCheckingService = new PEPCheckingService(db);
const sarService = new SARService(db);

const app = createApp({
  sanctionsScreeningService,
  amlMonitoringService,
  kycDocumentService,
  pepCheckingService,
  sarService,
  corsOrigins: config.CORS_ORIGINS,
});
const port = config.PORT ?? 3005;

app.listen(port, () => {
  logger.info('Compliance service started', { port });
});
