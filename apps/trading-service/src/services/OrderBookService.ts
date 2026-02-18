import type { IDatabaseClient } from '@libs/database';
import type {
  OrderBook,
  OrderBookSpread,
  PriceLevel,
} from '../types/trading.types.js';

export class OrderBookService {
  constructor(private readonly db: IDatabaseClient) {}

  async getOrderBook(assetId: string): Promise<OrderBook> {
    const bids = await this.db.query<PriceLevel>(
      `SELECT
        price,
        SUM(quantity - filled_quantity) AS quantity,
        COUNT(*)::int                   AS "orderCount"
       FROM order_book_entries
       WHERE asset_id = $1 AND side = 'bid' AND status = 'open'
       GROUP BY price
       ORDER BY price DESC`,
      [assetId],
    );

    const asks = await this.db.query<PriceLevel>(
      `SELECT
        price,
        SUM(quantity - filled_quantity) AS quantity,
        COUNT(*)::int                   AS "orderCount"
       FROM order_book_entries
       WHERE asset_id = $1 AND side = 'ask' AND status = 'open'
       GROUP BY price
       ORDER BY price ASC`,
      [assetId],
    );

    const bestBid = bids.length > 0 ? parseFloat(bids[0].price) : null;
    const bestAsk = asks.length > 0 ? parseFloat(asks[0].price) : null;
    const spread = bestBid !== null && bestAsk !== null
      ? Math.round((bestAsk - bestBid) * 1e8) / 1e8
      : null;

    return { assetId, bids, asks, spread };
  }

  async getSpread(assetId: string): Promise<OrderBookSpread> {
    const bidRows = await this.db.query<{ price: string }>(
      `SELECT price FROM order_book_entries
       WHERE asset_id = $1 AND side = 'bid' AND status = 'open'
       ORDER BY price DESC LIMIT 1`,
      [assetId],
    );

    const askRows = await this.db.query<{ price: string }>(
      `SELECT price FROM order_book_entries
       WHERE asset_id = $1 AND side = 'ask' AND status = 'open'
       ORDER BY price ASC LIMIT 1`,
      [assetId],
    );

    const bestBid = bidRows.length > 0 ? parseFloat(bidRows[0].price) : null;
    const bestAsk = askRows.length > 0 ? parseFloat(askRows[0].price) : null;
    const spread = bestBid !== null && bestAsk !== null
      ? Math.round((bestAsk - bestBid) * 1e8) / 1e8
      : null;

    return { bestBid, bestAsk, spread };
  }
}
