import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { SanctionsScreeningService } from './services/SanctionsScreeningService.js';

const logger = createLogger('compliance-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });

const sanctionsScreeningService = new SanctionsScreeningService(db);

const app = createApp({
  sanctionsScreeningService,
  corsOrigins: config.CORS_ORIGINS,
});
const port = config.PORT ?? 3005;

app.listen(port, () => {
  logger.info('Compliance service started', { port });
});
