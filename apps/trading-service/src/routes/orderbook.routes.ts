import { Router } from 'express';
import type { NextFunction, Request, Response } from 'express';
import type { OrderBookService } from '../services/OrderBookService.js';

export interface OrderBookRouterDependencies {
  orderBookService: OrderBookService;
}

export function createOrderBookRouter(deps: OrderBookRouterDependencies): Router {
  const { orderBookService: service } = deps;
  const router = Router();

  // GET /orderbook/:assetId
  router.get('/:assetId', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const orderBook = await service.getOrderBook(req.params['assetId']!);
      res.status(200).json({ data: orderBook });
    } catch (err) {
      next(err);
    }
  });

  // GET /orderbook/:assetId/spread
  router.get('/:assetId/spread', async (req: Request, res: Response, next: NextFunction) => {
    try {
      const spread = await service.getSpread(req.params['assetId']!);
      res.status(200).json({ data: spread });
    } catch (err) {
      next(err);
    }
  });

  return router;
}
