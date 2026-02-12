import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { AssetService } from './services/AssetService.js';

const logger = createLogger('asset-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });
const assetService = new AssetService(db);

const app = createApp({ assetService, corsOrigins: config.CORS_ORIGINS });
const port = config.PORT ?? 3004;

app.listen(port, () => {
  logger.info('Asset service started', { port });
});
