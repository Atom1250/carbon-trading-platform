import { EventIndexer, type ChainLog } from './EventIndexer';

describe('EventIndexer', () => {
  const indexer = new EventIndexer();

  it('indexes PlatformAssets mint events into asset domain', () => {
    const log: ChainLog = {
      blockNumber: 101,
      txHash: '0xabc',
      contract: 'PlatformAssets',
      event: 'AssetMinted',
      args: { tokenId: 1, amount: 10 },
    };

    const event = indexer.transform(log);

    expect(event.domain).toBe('asset');
    expect(event.type).toBe('PlatformAssets.AssetMinted');
    expect(event.id).toBe('0xabc:AssetMinted');
  });

  it('indexes KYC events into compliance domain', () => {
    const log: ChainLog = {
      blockNumber: 102,
      txHash: '0xdef',
      contract: 'PlatformAssets',
      event: 'KYCApproved',
      args: { account: '0x111' },
    };

    const event = indexer.transform(log);

    expect(event.domain).toBe('compliance');
    expect(event.type).toBe('PlatformAssets.KYCApproved');
  });

  it('indexes DvP settlement events into settlement domain', () => {
    const log: ChainLog = {
      blockNumber: 203,
      txHash: '0x999',
      contract: 'DvPSettlement',
      event: 'TradeSettled',
      args: { tradeId: 'T1', valueWei: 1000 },
    };

    const event = indexer.transform(log);

    expect(event.domain).toBe('settlement');
    expect(event.payload.tradeId).toBe('T1');
  });

  it('indexes batches preserving order', () => {
    const logs: ChainLog[] = [
      {
        blockNumber: 1,
        txHash: '0x1',
        contract: 'PlatformAssets',
        event: 'AssetMinted',
        args: { tokenId: 1 },
      },
      {
        blockNumber: 2,
        txHash: '0x2',
        contract: 'DvPSettlement',
        event: 'TradeSettled',
        args: { tradeId: 'T2' },
      },
    ];

    const result = indexer.transformBatch(logs);

    expect(result).toHaveLength(2);
    expect(result[0].blockNumber).toBe(1);
    expect(result[1].blockNumber).toBe(2);
  });
});
