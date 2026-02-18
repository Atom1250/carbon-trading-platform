import express from 'express';
import type { Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { parseCorsOrigins } from '@libs/config';
import { requestIdMiddleware } from './middleware/requestId.js';
import { loggingMiddleware } from './middleware/logging.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createRFQRouter } from './routes/rfq.routes.js';
import { createQuoteRouter, createQuoteActionsRouter } from './routes/quote.routes.js';
import { createTradeRouter, createFeeRouter } from './routes/trade.routes.js';
import { createConfirmationRouter } from './routes/confirmation.routes.js';
import type { RFQService } from './services/RFQService.js';
import type { QuoteService } from './services/QuoteService.js';
import type { SettlementService } from './services/SettlementService.js';
import type { FeeCalculationService } from './services/FeeCalculationService.js';
import type { TradeExecutionService } from './services/TradeExecutionService.js';

export interface TradingAppDependencies {
  rfqService: RFQService;
  quoteService?: QuoteService;
  settlementService?: SettlementService;
  feeCalculationService?: FeeCalculationService;
  tradeExecutionService?: TradeExecutionService;
  corsOrigins?: string;
}

export function createApp(deps: TradingAppDependencies): Express {
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

  app.use('/rfq', createRFQRouter({
    rfqService: deps.rfqService,
  }));

  if (deps.quoteService) {
    app.use('/rfq/:rfqId/quotes', createQuoteRouter({
      quoteService: deps.quoteService,
    }));
    app.use('/quotes', createQuoteActionsRouter({
      quoteService: deps.quoteService,
      tradeExecutionService: deps.tradeExecutionService,
    }));
  }

  if (deps.settlementService) {
    app.use('/trades', createTradeRouter({
      settlementService: deps.settlementService,
    }));
  }

  if (deps.tradeExecutionService) {
    app.use('/trades', createConfirmationRouter({
      tradeExecutionService: deps.tradeExecutionService,
    }));
  }

  if (deps.feeCalculationService) {
    app.use('/fees', createFeeRouter({
      feeCalculationService: deps.feeCalculationService,
    }));
  }

  app.get('/health', (_req, res) => {
    res.status(200).json({ status: 'healthy', service: 'trading-service' });
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
