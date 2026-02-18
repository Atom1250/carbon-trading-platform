import { OrderBookService } from './OrderBookService';

const ASSET_ID = '660e8400-e29b-41d4-a716-446655440000';

function makeMockDb(queryResults: unknown[][] = []) {
  let callIndex = 0;
  return {
    query: jest.fn().mockImplementation(() =>
      Promise.resolve(queryResults[callIndex++] ?? []),
    ),
    transaction: jest.fn(),
    healthCheck: jest.fn(),
    end: jest.fn(),
  };
}

describe('OrderBookService', () => {
  // ─── getOrderBook ──────────────────────────────────────────────────────────

  describe('getOrderBook', () => {
    it('should return empty order book when no entries exist', async () => {
      const db = makeMockDb([[], []]); // bids, asks
      const service = new OrderBookService(db as never);

      const result = await service.getOrderBook(ASSET_ID);

      expect(result.assetId).toBe(ASSET_ID);
      expect(result.bids).toEqual([]);
      expect(result.asks).toEqual([]);
      expect(result.spread).toBeNull();
    });

    it('should return bids sorted by price descending', async () => {
      const bids = [
        { price: '30.00000000', quantity: '50.00000000', orderCount: 2 },
        { price: '25.00000000', quantity: '100.00000000', orderCount: 1 },
      ];
      const db = makeMockDb([bids, []]); // bids, no asks
      const service = new OrderBookService(db as never);

      const result = await service.getOrderBook(ASSET_ID);

      expect(result.bids).toHaveLength(2);
      expect(result.bids[0].price).toBe('30.00000000');
      expect(result.bids[1].price).toBe('25.00000000');
    });

    it('should return asks sorted by price ascending', async () => {
      const asks = [
        { price: '35.00000000', quantity: '75.00000000', orderCount: 1 },
        { price: '40.00000000', quantity: '200.00000000', orderCount: 3 },
      ];
      const db = makeMockDb([[], asks]); // no bids, asks
      const service = new OrderBookService(db as never);

      const result = await service.getOrderBook(ASSET_ID);

      expect(result.asks).toHaveLength(2);
      expect(result.asks[0].price).toBe('35.00000000');
      expect(result.asks[1].price).toBe('40.00000000');
    });

    it('should calculate spread when both bids and asks exist', async () => {
      const bids = [{ price: '30.00000000', quantity: '50.00000000', orderCount: 1 }];
      const asks = [{ price: '35.00000000', quantity: '75.00000000', orderCount: 1 }];
      const db = makeMockDb([bids, asks]);
      const service = new OrderBookService(db as never);

      const result = await service.getOrderBook(ASSET_ID);

      expect(result.spread).toBe(5);
    });

    it('should return null spread when only bids exist', async () => {
      const bids = [{ price: '30.00000000', quantity: '50.00000000', orderCount: 1 }];
      const db = makeMockDb([bids, []]);
      const service = new OrderBookService(db as never);

      const result = await service.getOrderBook(ASSET_ID);

      expect(result.spread).toBeNull();
    });

    it('should return null spread when only asks exist', async () => {
      const asks = [{ price: '35.00000000', quantity: '75.00000000', orderCount: 1 }];
      const db = makeMockDb([[], asks]);
      const service = new OrderBookService(db as never);

      const result = await service.getOrderBook(ASSET_ID);

      expect(result.spread).toBeNull();
    });

    it('should query with asset id', async () => {
      const db = makeMockDb([[], []]);
      const service = new OrderBookService(db as never);

      await service.getOrderBook(ASSET_ID);

      expect((db.query as jest.Mock).mock.calls[0][1]).toEqual([ASSET_ID]);
      expect((db.query as jest.Mock).mock.calls[1][1]).toEqual([ASSET_ID]);
    });
  });

  // ─── getSpread ─────────────────────────────────────────────────────────────

  describe('getSpread', () => {
    it('should return best bid and ask with spread', async () => {
      const db = makeMockDb([
        [{ price: '30.00000000' }], // best bid
        [{ price: '35.00000000' }], // best ask
      ]);
      const service = new OrderBookService(db as never);

      const result = await service.getSpread(ASSET_ID);

      expect(result.bestBid).toBe(30);
      expect(result.bestAsk).toBe(35);
      expect(result.spread).toBe(5);
    });

    it('should return nulls when no orders exist', async () => {
      const db = makeMockDb([[], []]);
      const service = new OrderBookService(db as never);

      const result = await service.getSpread(ASSET_ID);

      expect(result.bestBid).toBeNull();
      expect(result.bestAsk).toBeNull();
      expect(result.spread).toBeNull();
    });

    it('should return null spread when only bid exists', async () => {
      const db = makeMockDb([
        [{ price: '30.00000000' }],
        [],
      ]);
      const service = new OrderBookService(db as never);

      const result = await service.getSpread(ASSET_ID);

      expect(result.bestBid).toBe(30);
      expect(result.bestAsk).toBeNull();
      expect(result.spread).toBeNull();
    });

    it('should return null spread when only ask exists', async () => {
      const db = makeMockDb([
        [],
        [{ price: '35.00000000' }],
      ]);
      const service = new OrderBookService(db as never);

      const result = await service.getSpread(ASSET_ID);

      expect(result.bestBid).toBeNull();
      expect(result.bestAsk).toBe(35);
      expect(result.spread).toBeNull();
    });

    it('should handle fractional spread correctly', async () => {
      const db = makeMockDb([
        [{ price: '25.12345678' }],
        [{ price: '25.12345679' }],
      ]);
      const service = new OrderBookService(db as never);

      const result = await service.getSpread(ASSET_ID);

      expect(result.spread).toBe(0.00000001);
    });

    it('should query with asset id', async () => {
      const db = makeMockDb([[], []]);
      const service = new OrderBookService(db as never);

      await service.getSpread(ASSET_ID);

      expect((db.query as jest.Mock).mock.calls[0][1]).toEqual([ASSET_ID]);
      expect((db.query as jest.Mock).mock.calls[1][1]).toEqual([ASSET_ID]);
    });
  });
});
