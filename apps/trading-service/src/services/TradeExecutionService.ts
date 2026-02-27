import type { IDatabaseClient } from '@libs/database';
import type {
  Trade,
  TradeConfirmation,
} from '../types/trading.types.js';
import type { QuoteService } from './QuoteService.js';
import type { SettlementService } from './SettlementService.js';
import type { RFQService } from './RFQService.js';
import type { TradingLimitsService } from './TradingLimitsService.js';

export class TradeExecutionService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly quoteService: QuoteService,
    private readonly rfqService: RFQService,
    private readonly settlementService: SettlementService,
    private readonly tradingLimitsService?: TradingLimitsService,
  ) {}

  async executeQuoteAcceptance(quoteId: string, acceptedByUserId: string): Promise<Trade> {
    // 1. Accept the quote (rejects other pending quotes, updates RFQ status)
    const acceptedQuote = await this.quoteService.acceptQuote(quoteId, acceptedByUserId);

    // 2. Fetch the RFQ for trade creation
    const rfq = await this.rfqService.findById(acceptedQuote.rfqId);

    // 3. Pre-trade validation (limits, institution status, asset status)
    if (this.tradingLimitsService) {
      await this.tradingLimitsService.validatePreTrade({
        institutionId: rfq.requesterInstitutionId,
        assetId: rfq.assetId,
        totalAmount: parseFloat(acceptedQuote.totalAmount),
      });
    }

    // 4. Create the trade record with fees
    const trade = await this.settlementService.createTradeFromQuote(acceptedQuote, rfq);

    // 5. Settle immediately (T+0 DvP simulation)
    const settledTrade = await this.settlementService.settleTradeSync(trade.id);

    return settledTrade;
  }

  async getTradeConfirmation(tradeId: string): Promise<TradeConfirmation> {
    const trade = await this.settlementService.findById(tradeId);

    // Look up asset details
    const assetRows = await this.db.query<{ name: string; assetType: string }>(
      `SELECT name, asset_type AS "assetType" FROM assets WHERE id = $1`,
      [trade.assetId],
    );

    const asset = assetRows.length > 0
      ? { id: trade.assetId, name: assetRows[0].name, type: assetRows[0].assetType }
      : { id: trade.assetId, name: 'Unknown', type: 'unknown' };

    return {
      tradeId: trade.id,
      tradeDate: trade.createdAt instanceof Date ? trade.createdAt.toISOString() : String(trade.createdAt),
      settlementDate: trade.settledAt instanceof Date ? trade.settledAt.toISOString() : trade.settledAt ? String(trade.settledAt) : null,
      buyer: {
        institutionId: trade.buyerInstitutionId,
        userId: trade.buyerUserId,
      },
      seller: {
        institutionId: trade.sellerInstitutionId,
        userId: trade.sellerUserId,
      },
      asset,
      quantity: trade.quantity,
      pricePerUnit: trade.pricePerUnit,
      totalAmount: trade.totalAmount,
      fees: {
        maker: trade.makerFee,
        taker: trade.takerFee,
        platform: trade.platformFee,
      },
      settlement: {
        txHash: trade.settlementTxHash,
        settledAt: trade.settledAt instanceof Date ? trade.settledAt.toISOString() : trade.settledAt ? String(trade.settledAt) : null,
        status: trade.status,
      },
    };
  }

  async getTradesByInstitution(
    institutionId: string,
    params: { limit: number; offset: number },
  ): Promise<{ trades: Trade[]; total: number }> {
    return this.settlementService.listTrades({
      institutionId,
      limit: params.limit,
      offset: params.offset,
    });
  }
}
