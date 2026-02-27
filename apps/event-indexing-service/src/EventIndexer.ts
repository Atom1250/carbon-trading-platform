export interface ChainLog {
  blockNumber: number;
  txHash: string;
  contract: 'PlatformAssets' | 'DvPSettlement';
  event: string;
  args: Record<string, string | number | boolean>;
}

export interface IndexedEvent {
  id: string;
  blockNumber: number;
  txHash: string;
  domain: 'asset' | 'settlement' | 'compliance';
  type: string;
  payload: Record<string, string | number | boolean>;
}

export class EventIndexer {
  transform(log: ChainLog): IndexedEvent {
    const domain = this.resolveDomain(log.contract, log.event);
    return {
      id: `${log.txHash}:${log.event}`,
      blockNumber: log.blockNumber,
      txHash: log.txHash,
      domain,
      type: `${log.contract}.${log.event}`,
      payload: log.args,
    };
  }

  transformBatch(logs: ChainLog[]): IndexedEvent[] {
    return logs.map((log) => this.transform(log));
  }

  private resolveDomain(
    contract: ChainLog['contract'],
    event: string,
  ): IndexedEvent['domain'] {
    if (contract === 'DvPSettlement') {
      return 'settlement';
    }
    if (event.includes('KYC')) {
      return 'compliance';
    }
    return 'asset';
  }
}
