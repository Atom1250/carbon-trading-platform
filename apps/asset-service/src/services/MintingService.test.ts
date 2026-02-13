import { MintingService } from './MintingService';
import { NotFoundError, ValidationError, ServiceUnavailableError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ASSET_ID = '550e8400-e29b-41d4-a716-446655440000';
const RECIPIENT = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TX_HASH = '0xabc123def456789012345678901234567890123456789012345678901234abcd';

const VERIFIED_ASSET = {
  id: ASSET_ID,
  institutionId: '660e8400-e29b-41d4-a716-446655440000',
  assetType: 'carbon_credit',
  name: 'Green Offset Token',
  description: null,
  status: 'verified',
  tokenId: null,
  mintingTxHash: null,
  mintedAt: null,
  vintage: 2024,
  standard: 'Verra VCS',
  geography: 'Brazil',
  metadataUri: 'ipfs://metadata-123',
  totalSupply: '10000.00000000',
  availableSupply: '10000.00000000',
  retiredSupply: '0.00000000',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const DRAFT_ASSET = { ...VERIFIED_ASSET, status: 'draft' };
const ALREADY_MINTED_VERIFIED = { ...VERIFIED_ASSET, tokenId: '123456' };
const MINTED_ASSET = { ...VERIFIED_ASSET, status: 'minted', tokenId: '123456' };

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

function makeMockBlockchain(opts: { mintToken?: jest.Mock } = {}) {
  return {
    mintToken: opts.mintToken ?? jest.fn().mockResolvedValue({ txHash: TX_HASH }),
    burnToken: jest.fn(),
    getBalance: jest.fn(),
    approveKYC: jest.fn(),
    isKYCApproved: jest.fn(),
  };
}

describe('MintingService', () => {
  describe('mintAssetTokens', () => {
    it('should mint tokens for a verified asset and return tokenId + txHash', async () => {
      const db = makeMockDb([
        [VERIFIED_ASSET],       // SELECT asset
        [MINTED_ASSET],         // UPDATE asset
      ]);
      const blockchain = makeMockBlockchain();
      const service = new MintingService(db, blockchain as never);

      const result = await service.mintAssetTokens(ASSET_ID, RECIPIENT);

      expect(result.txHash).toBe(TX_HASH);
      expect(result.tokenId).toBeDefined();
      expect(blockchain.mintToken).toHaveBeenCalledWith(
        RECIPIENT,
        expect.any(String),
        '10000.00000000',
        'ipfs://metadata-123',
      );
    });

    it('should update asset with token_id, minting_tx_hash, and minted status', async () => {
      const db = makeMockDb([
        [VERIFIED_ASSET],
        [MINTED_ASSET],
      ]);
      const blockchain = makeMockBlockchain();
      const service = new MintingService(db, blockchain as never);

      await service.mintAssetTokens(ASSET_ID, RECIPIENT);

      expect(db.query).toHaveBeenCalledTimes(2);
      const updateCall = db.query.mock.calls[1];
      expect(updateCall[0]).toContain('UPDATE assets');
      expect(updateCall[0]).toContain("status = 'minted'");
      expect(updateCall[1]).toEqual([expect.any(String), TX_HASH, ASSET_ID]);
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const blockchain = makeMockBlockchain();
      const service = new MintingService(db, blockchain as never);

      await expect(service.mintAssetTokens('nonexistent', RECIPIENT))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when asset is not verified', async () => {
      const db = makeMockDb([[DRAFT_ASSET]]);
      const blockchain = makeMockBlockchain();
      const service = new MintingService(db, blockchain as never);

      await expect(service.mintAssetTokens(ASSET_ID, RECIPIENT))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when asset already has a tokenId', async () => {
      const db = makeMockDb([[ALREADY_MINTED_VERIFIED]]);
      const blockchain = makeMockBlockchain();
      const service = new MintingService(db, blockchain as never);

      await expect(service.mintAssetTokens(ASSET_ID, RECIPIENT))
        .rejects.toThrow('Asset has already been minted');
    });

    it('should pass empty string as metadataUri when asset has none', async () => {
      const assetNoUri = { ...VERIFIED_ASSET, metadataUri: null };
      const db = makeMockDb([[assetNoUri], [MINTED_ASSET]]);
      const blockchain = makeMockBlockchain();
      const service = new MintingService(db, blockchain as never);

      await service.mintAssetTokens(ASSET_ID, RECIPIENT);

      expect(blockchain.mintToken).toHaveBeenCalledWith(
        RECIPIENT,
        expect.any(String),
        '10000.00000000',
        '',
      );
    });

    it('should generate a numeric tokenId from the asset UUID', async () => {
      const db = makeMockDb([[VERIFIED_ASSET], [MINTED_ASSET]]);
      const blockchain = makeMockBlockchain();
      const service = new MintingService(db, blockchain as never);

      const result = await service.mintAssetTokens(ASSET_ID, RECIPIENT);

      expect(Number(result.tokenId)).not.toBeNaN();
      expect(parseInt(result.tokenId, 10)).toBeGreaterThan(0);
    });

    it('should propagate blockchain errors', async () => {
      const db = makeMockDb([[VERIFIED_ASSET]]);
      const blockchain = makeMockBlockchain({
        mintToken: jest.fn().mockRejectedValue(new ServiceUnavailableError('blockchain')),
      });
      const service = new MintingService(db, blockchain as never);

      await expect(service.mintAssetTokens(ASSET_ID, RECIPIENT))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });
});
