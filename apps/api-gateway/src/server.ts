import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { createDatabaseClientFromEnv } from '@libs/database';
import Redis from 'ioredis';
import { createApp } from './app.js';
import { getServiceRegistry } from './config/services.config.js';
import { HealthMonitor } from './services/healthMonitor.js';

const logger = createLogger('api-gateway');

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDatabaseClientFromEnv();
  const redis = new Redis(config.REDIS_URL);
  const serviceRegistry = getServiceRegistry();
  const healthMonitor = new HealthMonitor(serviceRegistry);

  const app = createApp({
    corsOrigins: config.CORS_ORIGINS,
    checkDatabase: async () => {
      const ok = await db.healthCheck();
      if (!ok) throw new Error('Database health check failed');
    },
    checkRedis: async () => {
      const pong = await redis.ping();
      if (pong !== 'PONG') throw new Error('Redis health check failed');
    },
    serviceRegistry,
    healthMonitor,
  });

  const server = app.listen(config.PORT, () => {
    logger.info('API Gateway started', {
      port: config.PORT,
      env: config.NODE_ENV,
    });
  });

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutting down', { signal });
    server.close(async () => {
      await db.end();
      redis.disconnect();
      logger.info('Shutdown complete');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err: unknown) => {
  process.stderr.write(`Fatal error during startup: ${err instanceof Error ? err.message : String(err)}\n`);
  process.exit(1);
});
