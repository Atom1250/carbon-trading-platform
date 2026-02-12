import { VerificationService } from './VerificationService';
import { NotFoundError, ValidationError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const ASSET_ID = '550e8400-e29b-41d4-a716-446655440000';
const VERIFIER_ID = '770e8400-e29b-41d4-a716-446655440000';

const DRAFT_ASSET = {
  id: ASSET_ID,
  institutionId: '660e8400-e29b-41d4-a716-446655440000',
  assetType: 'carbon_credit',
  name: 'Green Offset Token',
  description: null,
  status: 'draft',
  tokenId: null,
  mintingTxHash: null,
  mintedAt: null,
  vintage: 2024,
  standard: 'Verra VCS',
  geography: 'Brazil',
  metadataUri: null,
  totalSupply: '10000.00000000',
  availableSupply: '10000.00000000',
  retiredSupply: '0.00000000',
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const PENDING_ASSET = { ...DRAFT_ASSET, status: 'pending_verification' };
const VERIFIED_ASSET = { ...DRAFT_ASSET, status: 'verified' };
const MINTED_ASSET = { ...DRAFT_ASSET, status: 'minted' };

const VERIFICATION_RECORD = {
  id: '880e8400-e29b-41d4-a716-446655440000',
  assetId: ASSET_ID,
  decision: 'approved',
  verifiedBy: VERIFIER_ID,
  notes: 'Approved after review',
  createdAt: new Date('2025-01-02'),
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

describe('VerificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── submitForVerification ──────────────────────────────────────────────────

  describe('submitForVerification', () => {
    it('should update status from draft to pending_verification', async () => {
      const db = makeMockDb([[DRAFT_ASSET], [PENDING_ASSET]]);
      const service = new VerificationService(db as never);

      const result = await service.submitForVerification(ASSET_ID);

      expect(result.status).toBe('pending_verification');
      expect(db.query).toHaveBeenCalledTimes(2);
      const [updateSql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(updateSql).toContain("status = 'pending_verification'");
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new VerificationService(db as never);

      await expect(service.submitForVerification('bad-id')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when asset is not in draft status', async () => {
      const db = makeMockDb([[PENDING_ASSET]]);
      const service = new VerificationService(db as never);

      await expect(service.submitForVerification(ASSET_ID)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when asset is already verified', async () => {
      const db = makeMockDb([[VERIFIED_ASSET]]);
      const service = new VerificationService(db as never);

      await expect(service.submitForVerification(ASSET_ID)).rejects.toThrow(ValidationError);
    });
  });

  // ─── approve ────────────────────────────────────────────────────────────────

  describe('approve', () => {
    it('should update status from pending_verification to verified', async () => {
      const db = makeMockDb([[PENDING_ASSET], [], [VERIFIED_ASSET]]);
      const service = new VerificationService(db as never);

      const result = await service.approve(ASSET_ID, VERIFIER_ID, 'Looks good');

      expect(result.status).toBe('verified');
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should insert verification record with approved decision', async () => {
      const db = makeMockDb([[PENDING_ASSET], [], [VERIFIED_ASSET]]);
      const service = new VerificationService(db as never);

      await service.approve(ASSET_ID, VERIFIER_ID, 'All checked');

      const [insertSql, insertParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      expect(insertSql).toContain('INSERT INTO asset_verifications');
      expect(insertSql).toContain("'approved'");
      expect(insertParams).toContain(ASSET_ID);
      expect(insertParams).toContain(VERIFIER_ID);
      expect(insertParams).toContain('All checked');
    });

    it('should insert null notes when not provided', async () => {
      const db = makeMockDb([[PENDING_ASSET], [], [VERIFIED_ASSET]]);
      const service = new VerificationService(db as never);

      await service.approve(ASSET_ID, VERIFIER_ID);

      const [, insertParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      expect(insertParams[2]).toBeNull();
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new VerificationService(db as never);

      await expect(service.approve('bad-id', VERIFIER_ID)).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when asset is not pending_verification', async () => {
      const db = makeMockDb([[DRAFT_ASSET]]);
      const service = new VerificationService(db as never);

      await expect(service.approve(ASSET_ID, VERIFIER_ID)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when asset is already minted', async () => {
      const db = makeMockDb([[MINTED_ASSET]]);
      const service = new VerificationService(db as never);

      await expect(service.approve(ASSET_ID, VERIFIER_ID)).rejects.toThrow(ValidationError);
    });
  });

  // ─── reject ─────────────────────────────────────────────────────────────────

  describe('reject', () => {
    it('should update status from pending_verification to draft', async () => {
      const db = makeMockDb([[PENDING_ASSET], [], [DRAFT_ASSET]]);
      const service = new VerificationService(db as never);

      const result = await service.reject(ASSET_ID, VERIFIER_ID, 'Insufficient documentation');

      expect(result.status).toBe('draft');
      expect(db.query).toHaveBeenCalledTimes(3);
    });

    it('should insert verification record with rejected decision', async () => {
      const db = makeMockDb([[PENDING_ASSET], [], [DRAFT_ASSET]]);
      const service = new VerificationService(db as never);

      await service.reject(ASSET_ID, VERIFIER_ID, 'Missing proof');

      const [insertSql, insertParams] = (db.query as jest.Mock).mock.calls[1] as [string, unknown[]];
      expect(insertSql).toContain('INSERT INTO asset_verifications');
      expect(insertSql).toContain("'rejected'");
      expect(insertParams).toContain('Missing proof');
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new VerificationService(db as never);

      await expect(service.reject('bad-id', VERIFIER_ID, 'Reason')).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when asset is not pending_verification', async () => {
      const db = makeMockDb([[DRAFT_ASSET]]);
      const service = new VerificationService(db as never);

      await expect(service.reject(ASSET_ID, VERIFIER_ID, 'Reason')).rejects.toThrow(ValidationError);
    });
  });

  // ─── getHistory ─────────────────────────────────────────────────────────────

  describe('getHistory', () => {
    it('should return verification records ordered by created_at DESC', async () => {
      const db = makeMockDb([[DRAFT_ASSET], [VERIFICATION_RECORD]]);
      const service = new VerificationService(db as never);

      const result = await service.getHistory(ASSET_ID);

      expect(result).toEqual([VERIFICATION_RECORD]);
      const [historySql] = (db.query as jest.Mock).mock.calls[1] as [string];
      expect(historySql).toContain('FROM asset_verifications');
      expect(historySql).toContain('ORDER BY created_at DESC');
    });

    it('should return empty array when no verifications exist', async () => {
      const db = makeMockDb([[DRAFT_ASSET], []]);
      const service = new VerificationService(db as never);

      const result = await service.getHistory(ASSET_ID);

      expect(result).toEqual([]);
    });

    it('should throw NotFoundError when asset does not exist', async () => {
      const db = makeMockDb([[]]);
      const service = new VerificationService(db as never);

      await expect(service.getHistory('bad-id')).rejects.toThrow(NotFoundError);
    });
  });
});
