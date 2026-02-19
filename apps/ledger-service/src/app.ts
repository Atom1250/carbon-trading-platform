import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseCorsOrigins } from '@libs/config';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createAccountRouter, createEntryRouter, createTrialBalanceRouter } from './routes/ledger.routes.js';
import { createBalanceRouter } from './routes/balance.routes.js';
import { createReconciliationRouter } from './routes/reconciliation.routes.js';
import { createDepositRouter } from './routes/deposit.routes.js';
import { createWithdrawalRouter } from './routes/withdrawal.routes.js';
import type { LedgerService } from './services/LedgerService.js';
import type { BalanceService } from './services/BalanceService.js';
import type { ReconciliationService } from './services/ReconciliationService.js';
import type { DepositService } from './services/DepositService.js';
import type { WithdrawalService } from './services/WithdrawalService.js';

export interface LedgerAppDependencies {
  ledgerService: LedgerService;
  balanceService?: BalanceService;
  reconciliationService?: ReconciliationService;
  depositService?: DepositService;
  withdrawalService?: WithdrawalService;
  corsOrigins?: string;
}

export function createApp(deps: LedgerAppDependencies): Express {
  const app = express();

  app.use(helmet());

  const origins = parseCorsOrigins(
    deps.corsOrigins ?? process.env['CORS_ORIGINS'] ?? 'http://localhost:3000',
  );
  app.use(
    cors({
      origin: origins,
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    }),
  );

  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use(requestIdMiddleware);
  app.use(loggingMiddleware);

  app.use('/accounts', createAccountRouter({
    ledgerService: deps.ledgerService,
  }));

  app.use('/entries', createEntryRouter({
    ledgerService: deps.ledgerService,
  }));

  app.use('/trial-balance', createTrialBalanceRouter({
    ledgerService: deps.ledgerService,
  }));

  if (deps.balanceService) {
    app.use('/balances', createBalanceRouter({
      balanceService: deps.balanceService,
    }));
  }

  if (deps.reconciliationService) {
    app.use('/reconciliation', createReconciliationRouter({
      reconciliationService: deps.reconciliationService,
    }));
  }

  if (deps.depositService) {
    app.use('/deposits', createDepositRouter({
      depositService: deps.depositService,
    }));
  }

  if (deps.withdrawalService) {
    app.use('/withdrawals', createWithdrawalRouter({
      withdrawalService: deps.withdrawalService,
    }));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', service: 'ledger-service' });
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
