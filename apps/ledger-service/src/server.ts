import Redis from 'ioredis';
import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { DatabaseClient } from '@libs/database';
import { createApp } from './app.js';
import { LedgerService } from './services/LedgerService.js';
import { BalanceService } from './services/BalanceService.js';
import { ReconciliationService } from './services/ReconciliationService.js';
import type { ICacheClient } from './types/ledger.types.js';

const logger = createLogger('ledger-service');

const config = loadConfig();
const db = new DatabaseClient({ connectionString: config.DATABASE_URL, max: config.DATABASE_POOL_MAX });

// Redis cache adapter
const redis = new Redis(config.REDIS_URL);
const cacheClient: ICacheClient = {
  get: (key) => redis.get(key),
  set: async (key, value, ttlSeconds) => {
    if (ttlSeconds) {
      await redis.set(key, value, 'EX', ttlSeconds);
    } else {
      await redis.set(key, value);
    }
  },
  del: async (key) => { await redis.del(key); },
  delByPattern: async (pattern) => {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) {
      await redis.del(...keys);
    }
  },
};

const ledgerService = new LedgerService(db);
const balanceService = new BalanceService(db, cacheClient);
const reconciliationService = new ReconciliationService(db);

const app = createApp({
  ledgerService,
  balanceService,
  reconciliationService,
  corsOrigins: config.CORS_ORIGINS,
});
const port = config.PORT ?? 3007;

app.listen(port, () => {
  logger.info('Ledger service started', { port });
});
