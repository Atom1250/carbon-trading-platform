import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { RFQService } from './services/RFQService.js';
import { QuoteService } from './services/QuoteService.js';

const logger = createLogger('trading-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });

const rfqService = new RFQService(db);
const quoteService = new QuoteService(db);

const app = createApp({
  rfqService,
  quoteService,
  corsOrigins: config.CORS_ORIGINS,
});
const port = config.PORT ?? 3006;

app.listen(port, () => {
  logger.info('Trading service started', { port });
});
