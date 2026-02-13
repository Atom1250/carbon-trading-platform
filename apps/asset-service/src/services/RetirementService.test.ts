import { RetirementService } from './RetirementService';
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
const USER_ID = '770e8400-e29b-41d4-a716-446655440000';
const TX_HASH = '0xabc123def456789012345678901234567890123456789012345678901234abcd';

const MINTED_CARBON_CREDIT = {
  id: ASSET_ID,
  institutionId: '660e8400-e29b-41d4-a716-446655440000',
  assetType: 'carbon_credit',
  name: 'Green Offset Token',
  description: null,
  status: 'minted',
  tokenId: '1430532096',
  mintingTxHash: '0xdef456',
  mintedAt: new Date('2025-01-02'),
  vintage: 2024,
  standard: 'Verra VCS',
  geography: 'Brazil',
  metadataUri: null,
  totalSupply: '10000.00000000',
  availableSupply: '5000.00000000',
  retiredSupply: '5000.00000000',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-02'),
};

const LOAN_PORTION = { ...MINTED_CARBON_CREDIT, assetType: 'loan_portion' };
const VERIFIED_ASSET = { ...MINTED_CARBON_CREDIT, status: 'verified', tokenId: null };

const RETIREMENT_RECORD = {
  id: '990e8400-e29b-41d4-a716-446655440000',
  assetId: ASSET_ID,
  amount: '1000.00000000',
  retiredByUserId: USER_ID,
  reason: 'Carbon offset for 2024',
  transactionHash: TX_HASH,
  createdAt: new Date('2025-01-03'),
};

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

function makeMockBlockchain(opts: { burnToken?: jest.Mock } = {}) {
  return {
    mintToken: jest.fn(),
    burnToken: opts.burnToken ?? jest.fn().mockResolvedValue({ txHash: TX_HASH }),
    getBalance: jest.fn(),
    approveKYC: jest.fn(),
    isKYCApproved: jest.fn(),
  };
}

describe('RetirementService', () => {
  describe('retire', () => {
    it('should burn tokens and record retirement', async () => {
      const db = makeMockDb([
        [MINTED_CARBON_CREDIT], // SELECT asset
        [],                      // INSERT retirement
        [],                      // UPDATE supply
      ]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      const result = await service.retire(ASSET_ID, 1000, USER_ID, 'Carbon offset');

      expect(result.txHash).toBe(TX_HASH);
      expect(result.amount).toBe(1000);
      expect(blockchain.burnToken).toHaveBeenCalledWith(
        USER_ID,
        1430532096,
        '1000',
      );
    });

    it('should insert retirement record with correct values', async () => {
      const db = makeMockDb([
        [MINTED_CARBON_CREDIT],
        [],
        [],
      ]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await service.retire(ASSET_ID, 500, USER_ID, 'Annual offset');

      const insertCall = db.query.mock.calls[1];
      expect(insertCall[0]).toContain('INSERT INTO asset_retirements');
      expect(insertCall[1]).toEqual([ASSET_ID, 500, USER_ID, 'Annual offset', TX_HASH]);
    });

    it('should update available_supply and retired_supply', async () => {
      const db = makeMockDb([
        [MINTED_CARBON_CREDIT],
        [],
        [],
      ]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await service.retire(ASSET_ID, 500, USER_ID, 'Offset');

      const updateCall = db.query.mock.calls[2];
      expect(updateCall[0]).toContain('available_supply = available_supply - $1');
      expect(updateCall[0]).toContain('retired_supply = retired_supply + $1');
      expect(updateCall[1]).toEqual([500, ASSET_ID]);
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await expect(service.retire('nonexistent', 100, USER_ID, 'Offset'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError for non-carbon_credit assets', async () => {
      const db = makeMockDb([[LOAN_PORTION]]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await expect(service.retire(ASSET_ID, 100, USER_ID, 'Offset'))
        .rejects.toThrow('Only carbon credits can be retired');
    });

    it('should throw ValidationError when asset is not minted', async () => {
      const db = makeMockDb([[VERIFIED_ASSET]]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await expect(service.retire(ASSET_ID, 100, USER_ID, 'Offset'))
        .rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when amount exceeds available supply', async () => {
      const db = makeMockDb([[MINTED_CARBON_CREDIT]]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await expect(service.retire(ASSET_ID, 6000, USER_ID, 'Offset'))
        .rejects.toThrow('Insufficient available supply');
    });

    it('should throw ValidationError when amount is zero', async () => {
      const db = makeMockDb([[MINTED_CARBON_CREDIT]]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await expect(service.retire(ASSET_ID, 0, USER_ID, 'Offset'))
        .rejects.toThrow('Retirement amount must be greater than zero');
    });

    it('should throw ValidationError when amount is negative', async () => {
      const db = makeMockDb([[MINTED_CARBON_CREDIT]]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await expect(service.retire(ASSET_ID, -100, USER_ID, 'Offset'))
        .rejects.toThrow('Retirement amount must be greater than zero');
    });

    it('should propagate blockchain errors', async () => {
      const db = makeMockDb([[MINTED_CARBON_CREDIT]]);
      const blockchain = makeMockBlockchain({
        burnToken: jest.fn().mockRejectedValue(new ServiceUnavailableError('blockchain')),
      });
      const service = new RetirementService(db, blockchain as never);

      await expect(service.retire(ASSET_ID, 100, USER_ID, 'Offset'))
        .rejects.toThrow(ServiceUnavailableError);
    });
  });

  describe('getHistory', () => {
    it('should return retirement records for an asset', async () => {
      const db = makeMockDb([
        [{ id: ASSET_ID }],         // SELECT check
        [RETIREMENT_RECORD],         // SELECT retirements
      ]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      const records = await service.getHistory(ASSET_ID);

      expect(records).toHaveLength(1);
      expect(records[0].transactionHash).toBe(TX_HASH);
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await expect(service.getHistory('nonexistent'))
        .rejects.toThrow(NotFoundError);
    });

    it('should return empty array when no retirements', async () => {
      const db = makeMockDb([
        [{ id: ASSET_ID }],
        [],
      ]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      const records = await service.getHistory(ASSET_ID);

      expect(records).toHaveLength(0);
    });

    it('should query retirements ordered by created_at DESC', async () => {
      const db = makeMockDb([
        [{ id: ASSET_ID }],
        [],
      ]);
      const blockchain = makeMockBlockchain();
      const service = new RetirementService(db, blockchain as never);

      await service.getHistory(ASSET_ID);

      const queryCall = db.query.mock.calls[1];
      expect(queryCall[0]).toContain('ORDER BY created_at DESC');
    });
  });
});
