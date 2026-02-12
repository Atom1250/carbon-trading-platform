import { loadConfig } from '@libs/config';
import { createLogger } from '@libs/logger';
import { createDatabaseClientFromEnv } from '@libs/database';
import { createApp } from './app.js';
import { TokenService } from './services/TokenService.js';
import { AuthService } from './services/AuthService.js';
import { MFAService } from './services/MFAService.js';
import { RegistrationService } from './services/RegistrationService.js';
import { PasswordResetService } from './services/PasswordResetService.js';
import { LoginAttemptService } from './services/LoginAttemptService.js';
import { SessionCleanupService } from './services/SessionCleanupService.js';

const logger = createLogger('auth-service');

async function main(): Promise<void> {
  const config = loadConfig();
  const db = createDatabaseClientFromEnv();

  const tokenService = new TokenService(config);
  const mfaService = new MFAService(db);
  const authService = new AuthService(db, tokenService, mfaService);
  const registrationService = new RegistrationService(db);
  const passwordResetService = new PasswordResetService(db);
  const loginAttemptService = new LoginAttemptService(db);
  const sessionCleanupService = new SessionCleanupService(db);

  const app = createApp({
    tokenService,
    authService,
    mfaService,
    registrationService,
    passwordResetService,
    loginAttemptService,
    corsOrigins: config.CORS_ORIGINS,
  });

  // Start session cleanup job (runs every 60 minutes)
  sessionCleanupService.startSchedule(60);

  const server = app.listen(config.PORT, () => {
    logger.info('Auth Service started', {
      port: config.PORT,
      env: config.NODE_ENV,
    });
  });

  const shutdown = async (signal: string): Promise<void> => {
    logger.info('Shutting down', { signal });
    server.close(async () => {
      await db.end();
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
