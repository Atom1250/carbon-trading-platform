import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { RFQService } from './services/RFQService.js';
import { QuoteService } from './services/QuoteService.js';
import { FeeCalculationService } from './services/FeeCalculationService.js';
import { SettlementService } from './services/SettlementService.js';
import { TradeExecutionService } from './services/TradeExecutionService.js';

const logger = createLogger('trading-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });

const rfqService = new RFQService(db);
const quoteService = new QuoteService(db);
const feeCalculationService = new FeeCalculationService(db);
const settlementService = new SettlementService(db, feeCalculationService);
const tradeExecutionService = new TradeExecutionService(db, quoteService, rfqService, settlementService);

const app = createApp({
  rfqService,
  quoteService,
  settlementService,
  feeCalculationService,
  tradeExecutionService,
  corsOrigins: config.CORS_ORIGINS,
});
const port = config.PORT ?? 3006;

app.listen(port, () => {
  logger.info('Trading service started', { port });
});
