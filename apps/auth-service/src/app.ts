import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseCorsOrigins } from '@libs/config';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAuthenticateMiddleware, requireAuth, requireRoles } from './middleware/authenticate.js';
import { createAuthRouter } from './routes/auth.routes.js';
import { createAdminRouter } from './routes/admin.routes.js';
import { createMFARouter } from './routes/mfa.routes.js';
import type { AuthService } from './services/AuthService.js';
import type { MFAService } from './services/MFAService.js';
import type { TokenService } from './services/TokenService.js';
import type { RegistrationService } from './services/RegistrationService.js';
import type { PasswordResetService } from './services/PasswordResetService.js';
import type { LoginAttemptService } from './services/LoginAttemptService.js';
import type { AdminUserService } from './services/AdminUserService.js';

export interface AuthAppDependencies {
  tokenService: TokenService;
  authService: AuthService;
  mfaService: MFAService;
  registrationService: RegistrationService;
  passwordResetService: PasswordResetService;
  loginAttemptService: LoginAttemptService;
  adminUserService?: AdminUserService;
  corsOrigins?: string;
}

export function createApp(deps: AuthAppDependencies): Express {
  const app = express();
  const authenticate = createAuthenticateMiddleware(deps.tokenService);

  app.use(helmet());

  const origins = parseCorsOrigins(
    deps.corsOrigins ?? process.env['CORS_ORIGINS'] ?? 'http://localhost:3000',
  );
  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestIdMiddleware);
  app.use(loggingMiddleware);

  app.use('/auth', createAuthRouter({
    authService: deps.authService,
    registrationService: deps.registrationService,
    passwordResetService: deps.passwordResetService,
    loginAttemptService: deps.loginAttemptService,
  }));
  app.get('/auth/me', authenticate, requireAuth, async (req, res, next) => {
    try {
      if (!req.user) {
        res.status(401).json({
          type: 'https://api.carbon-platform.com/errors/unauthorized',
          title: 'Unauthorized',
          status: 401,
          detail: 'Authentication required',
          instance: req.path,
        });
        return;
      }
      const user = await deps.authService.getCurrentUser(req.user.userId);
      res.status(200).json({ data: user });
    } catch (err) {
      next(err);
    }
  });
  if (deps.adminUserService) {
    app.use(
      '/auth/admin',
      authenticate,
      requireAuth,
      requireRoles('operations'),
      createAdminRouter({ adminUserService: deps.adminUserService }),
    );
  }
  app.use('/auth/mfa', createMFARouter(deps.mfaService, deps.tokenService));

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', service: 'auth-service' });
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
