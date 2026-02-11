import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { InstitutionService } from './services/InstitutionService.js';

const logger = createLogger('institution-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });
const institutionService = new InstitutionService(db);

const app = createApp({ institutionService, corsOrigins: config.CORS_ORIGINS });
const port = config.PORT ?? 3003;

app.listen(port, () => {
  logger.info('Institution service started', { port });
});
