import request from 'supertest';
import { createApp } from '../app';
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
const INSTITUTION_ID = '660e8400-e29b-41d4-a716-446655440000';

const ASSET = {
  id: ASSET_ID,
  institutionId: INSTITUTION_ID,
  assetType: 'carbon_credit',
  name: 'Green Offset Token',
  description: 'Verified carbon offset',
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
  createdAt: new Date('2025-01-01').toISOString(),
  updatedAt: new Date('2025-01-01').toISOString(),
};

const VERIFIER_ID = '770e8400-e29b-41d4-a716-446655440000';

const USER_ID = '990e8400-e29b-41d4-a716-446655440000';
const RECIPIENT_ADDRESS = '0x70997970C51812dc3A010C7d01b50e0d17dc79C8';
const TX_HASH = '0xabc123def456789012345678901234567890123456789012345678901234abcd';

const PENDING_ASSET = { ...ASSET, status: 'pending_verification' };
const VERIFIED_ASSET = { ...ASSET, status: 'verified' };
const MINTED_ASSET = { ...ASSET, status: 'minted', tokenId: '123456', mintingTxHash: TX_HASH };

const VERIFICATION_RECORD = {
  id: '880e8400-e29b-41d4-a716-446655440000',
  assetId: ASSET_ID,
  decision: 'approved',
  verifiedBy: VERIFIER_ID,
  notes: 'Looks good',
  createdAt: new Date('2025-01-02').toISOString(),
};

const ANALYTICS_ROW = {
  assetType: 'carbon_credit',
  status: 'verified',
  count: 5,
  totalSupply: '50000.00000000',
  availableSupply: '45000.00000000',
  retiredSupply: '5000.00000000',
};

const GEOGRAPHY_ROW = {
  geography: 'Brazil',
  count: 3,
  availableSupply: '30000.00000000',
};

function makeService(opts: {
  create?: jest.Mock;
  findById?: jest.Mock;
  update?: jest.Mock;
  list?: jest.Mock;
  getAnalytics?: jest.Mock;
  getGeographyBreakdown?: jest.Mock;
} = {}) {
  return {
    create: opts.create ?? jest.fn().mockResolvedValue(ASSET),
    findById: opts.findById ?? jest.fn().mockResolvedValue(ASSET),
    update: opts.update ?? jest.fn().mockResolvedValue({ ...ASSET, name: 'Updated' }),
    list: opts.list ?? jest.fn().mockResolvedValue({
      assets: [ASSET],
      total: 1,
    }),
    getAnalytics: opts.getAnalytics ?? jest.fn().mockResolvedValue([ANALYTICS_ROW]),
    getGeographyBreakdown: opts.getGeographyBreakdown ?? jest.fn().mockResolvedValue([GEOGRAPHY_ROW]),
  };
}

function makeVerificationService(opts: {
  submitForVerification?: jest.Mock;
  approve?: jest.Mock;
  reject?: jest.Mock;
  getHistory?: jest.Mock;
} = {}) {
  return {
    submitForVerification: opts.submitForVerification ?? jest.fn().mockResolvedValue(PENDING_ASSET),
    approve: opts.approve ?? jest.fn().mockResolvedValue(VERIFIED_ASSET),
    reject: opts.reject ?? jest.fn().mockResolvedValue(ASSET),
    getHistory: opts.getHistory ?? jest.fn().mockResolvedValue([VERIFICATION_RECORD]),
  };
}

const RETIREMENT_RECORD = {
  id: 'aa0e8400-e29b-41d4-a716-446655440000',
  assetId: ASSET_ID,
  amount: '1000.00000000',
  retiredByUserId: USER_ID,
  reason: 'Carbon offset',
  transactionHash: TX_HASH,
  createdAt: new Date('2025-01-03').toISOString(),
};

function makeMintingService(opts: {
  mintAssetTokens?: jest.Mock;
} = {}) {
  return {
    mintAssetTokens: opts.mintAssetTokens ?? jest.fn().mockResolvedValue({ tokenId: '123456', txHash: TX_HASH }),
  };
}

function makeRetirementService(opts: {
  retire?: jest.Mock;
  getHistory?: jest.Mock;
} = {}) {
  return {
    retire: opts.retire ?? jest.fn().mockResolvedValue({ txHash: TX_HASH, amount: 1000 }),
    getHistory: opts.getHistory ?? jest.fn().mockResolvedValue([RETIREMENT_RECORD]),
  };
}

function makeApp(
  serviceOpts?: Parameters<typeof makeService>[0],
  verificationOpts?: Parameters<typeof makeVerificationService>[0],
  mintingOpts?: Parameters<typeof makeMintingService>[0],
  retirementOpts?: Parameters<typeof makeRetirementService>[0],
) {
  return createApp({
    assetService: makeService(serviceOpts) as never,
    verificationService: makeVerificationService(verificationOpts) as never,
    mintingService: makeMintingService(mintingOpts) as never,
    retirementService: makeRetirementService(retirementOpts) as never,
  });
}

// ─── POST /assets ──────────────────────────────────────────────────────────────

describe('POST /assets', () => {
  it('should return 201 with asset on valid body', async () => {
    const res = await request(makeApp()).post('/assets').send({
      institutionId: INSTITUTION_ID,
      assetType: 'carbon_credit',
      name: 'Green Offset Token',
      totalSupply: 10000,
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Green Offset Token');
    expect(res.body.data.assetType).toBe('carbon_credit');
  });

  it('should accept optional fields', async () => {
    const create = jest.fn().mockResolvedValue(ASSET);
    const app = makeApp({ create });

    await request(app).post('/assets').send({
      institutionId: INSTITUTION_ID,
      assetType: 'carbon_credit',
      name: 'Test Token',
      description: 'A description',
      vintage: 2024,
      standard: 'Verra VCS',
      geography: 'Brazil',
      totalSupply: 5000,
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({
        description: 'A description',
        vintage: 2024,
        standard: 'Verra VCS',
        geography: 'Brazil',
      }),
    );
  });

  it('should return 422 when name is missing', async () => {
    const res = await request(makeApp()).post('/assets').send({
      institutionId: INSTITUTION_ID,
      assetType: 'carbon_credit',
      totalSupply: 1000,
    });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 when assetType is invalid', async () => {
    const res = await request(makeApp()).post('/assets').send({
      institutionId: INSTITUTION_ID,
      assetType: 'invalid_type',
      name: 'Test',
      totalSupply: 1000,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when institutionId is not a valid UUID', async () => {
    const res = await request(makeApp()).post('/assets').send({
      institutionId: 'not-a-uuid',
      assetType: 'carbon_credit',
      name: 'Test',
      totalSupply: 1000,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when totalSupply is negative', async () => {
    const res = await request(makeApp()).post('/assets').send({
      institutionId: INSTITUTION_ID,
      assetType: 'carbon_credit',
      name: 'Test',
      totalSupply: -100,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when totalSupply is zero', async () => {
    const res = await request(makeApp()).post('/assets').send({
      institutionId: INSTITUTION_ID,
      assetType: 'carbon_credit',
      name: 'Test',
      totalSupply: 0,
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when vintage is out of range', async () => {
    const res = await request(makeApp()).post('/assets').send({
      institutionId: INSTITUTION_ID,
      assetType: 'carbon_credit',
      name: 'Test',
      totalSupply: 1000,
      vintage: 1800,
    });

    expect(res.status).toBe(422);
  });
});

// ─── GET /assets ────────────────────────────────────────────────────────────────

describe('GET /assets', () => {
  it('should return 200 with asset list', async () => {
    const res = await request(makeApp()).get('/assets');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get('/assets?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass assetType filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?assetType=carbon_credit');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ assetType: 'carbon_credit' }));
  });

  it('should pass status filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?status=verified');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: 'verified' }));
  });

  it('should pass institutionId filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get(`/assets?institutionId=${INSTITUTION_ID}`);

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ institutionId: INSTITUTION_ID }));
  });

  it('should return 422 for invalid assetType filter', async () => {
    const res = await request(makeApp()).get('/assets?assetType=invalid');

    expect(res.status).toBe(422);
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeApp()).get('/assets?status=unknown');

    expect(res.status).toBe(422);
  });

  it('should return 422 for non-numeric limit', async () => {
    const res = await request(makeApp()).get('/assets?limit=abc');

    expect(res.status).toBe(422);
  });

  it('should pass vintage filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?vintage=2024');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ vintage: 2024 }));
  });

  it('should pass geography filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?geography=Brazil');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ geography: 'Brazil' }));
  });

  it('should pass standard filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?standard=Verra%20VCS');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ standard: 'Verra VCS' }));
  });

  it('should pass minSupply and maxSupply to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?minSupply=100&maxSupply=5000');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ minSupply: 100, maxSupply: 5000 }));
  });

  it('should pass search to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?search=green');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ search: 'green' }));
  });

  it('should pass sortBy and sortOrder to service', async () => {
    const list = jest.fn().mockResolvedValue({ assets: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/assets?sortBy=total_supply&sortOrder=desc');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'total_supply', sortOrder: 'desc' }));
  });
});

// ─── GET /assets/analytics ──────────────────────────────────────────────────────

describe('GET /assets/analytics', () => {
  it('should return 200 with analytics and geography breakdown', async () => {
    const res = await request(makeApp()).get('/assets/analytics');

    expect(res.status).toBe(200);
    expect(res.body.data.analytics).toHaveLength(1);
    expect(res.body.data.analytics[0].assetType).toBe('carbon_credit');
    expect(res.body.data.geographyBreakdown).toHaveLength(1);
    expect(res.body.data.geographyBreakdown[0].geography).toBe('Brazil');
  });

  it('should call both getAnalytics and getGeographyBreakdown', async () => {
    const getAnalytics = jest.fn().mockResolvedValue([]);
    const getGeographyBreakdown = jest.fn().mockResolvedValue([]);
    const app = makeApp({ getAnalytics, getGeographyBreakdown });

    await request(app).get('/assets/analytics');

    expect(getAnalytics).toHaveBeenCalled();
    expect(getGeographyBreakdown).toHaveBeenCalled();
  });
});

// ─── GET /assets/:id ────────────────────────────────────────────────────────────

describe('GET /assets/:id', () => {
  it('should return 200 with asset when found', async () => {
    const res = await request(makeApp()).get(`/assets/${ASSET_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(ASSET_ID);
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app).get('/assets/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

// ─── PATCH /assets/:id ──────────────────────────────────────────────────────────

describe('PATCH /assets/:id', () => {
  it('should return 200 with updated asset on valid body', async () => {
    const res = await request(makeApp())
      .patch(`/assets/${ASSET_ID}`)
      .send({ name: 'Updated Name' });

    expect(res.status).toBe(200);
  });

  it('should return 422 when body is empty', async () => {
    const res = await request(makeApp())
      .patch(`/assets/${ASSET_ID}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 422 when status value is invalid', async () => {
    const res = await request(makeApp())
      .patch(`/assets/${ASSET_ID}`)
      .send({ status: 'deleted' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp({
      update: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app)
      .patch('/assets/bad-id')
      .send({ name: 'Test' });

    expect(res.status).toBe(404);
  });

  it('should accept metadataUri in update', async () => {
    const update = jest.fn().mockResolvedValue({ ...ASSET, metadataUri: 'ipfs://Qm123' });
    const app = makeApp({ update });

    await request(app)
      .patch(`/assets/${ASSET_ID}`)
      .send({ metadataUri: 'ipfs://Qm123' });

    expect(update).toHaveBeenCalledWith(
      ASSET_ID,
      expect.objectContaining({ metadataUri: 'ipfs://Qm123' }),
    );
  });
});

// ─── GET /health ────────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('should return 200 with healthy status', async () => {
    const res = await request(makeApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('asset-service');
  });
});

// ─── POST /assets/:id/submit-verification ───────────────────────────────────────

describe('POST /assets/:id/submit-verification', () => {
  it('should return 200 with pending asset', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/submit-verification`);

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('pending_verification');
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp(undefined, {
      submitForVerification: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app).post('/assets/bad-id/submit-verification');

    expect(res.status).toBe(404);
  });

  it('should return 422 when asset is not in draft status', async () => {
    const app = makeApp(undefined, {
      submitForVerification: jest.fn().mockRejectedValue(
        new ValidationError("Asset must be in 'draft' status to submit for verification"),
      ),
    });

    const res = await request(app).post(`/assets/${ASSET_ID}/submit-verification`);

    expect(res.status).toBe(422);
  });
});

// ─── POST /assets/:id/approve ───────────────────────────────────────────────────

describe('POST /assets/:id/approve', () => {
  it('should return 200 with verified asset', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/approve`)
      .send({ verifiedBy: VERIFIER_ID });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('verified');
  });

  it('should accept optional notes', async () => {
    const approve = jest.fn().mockResolvedValue(VERIFIED_ASSET);
    const app = makeApp(undefined, { approve });

    await request(app)
      .post(`/assets/${ASSET_ID}/approve`)
      .send({ verifiedBy: VERIFIER_ID, notes: 'All documents checked' });

    expect(approve).toHaveBeenCalledWith(ASSET_ID, VERIFIER_ID, 'All documents checked');
  });

  it('should return 422 when verifiedBy is missing', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/approve`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 422 when verifiedBy is not a valid UUID', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/approve`)
      .send({ verifiedBy: 'not-a-uuid' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp(undefined, {
      approve: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app)
      .post('/assets/bad-id/approve')
      .send({ verifiedBy: VERIFIER_ID });

    expect(res.status).toBe(404);
  });
});

// ─── POST /assets/:id/reject ────────────────────────────────────────────────────

describe('POST /assets/:id/reject', () => {
  it('should return 200 with draft asset after rejection', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/reject`)
      .send({ verifiedBy: VERIFIER_ID, notes: 'Missing documentation' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('draft');
  });

  it('should return 422 when notes are missing', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/reject`)
      .send({ verifiedBy: VERIFIER_ID });

    expect(res.status).toBe(422);
  });

  it('should return 422 when notes are empty string', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/reject`)
      .send({ verifiedBy: VERIFIER_ID, notes: '' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when verifiedBy is missing', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/reject`)
      .send({ notes: 'Missing documentation' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp(undefined, {
      reject: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app)
      .post('/assets/bad-id/reject')
      .send({ verifiedBy: VERIFIER_ID, notes: 'Bad asset' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /assets/:id/verifications ──────────────────────────────────────────────

describe('GET /assets/:id/verifications', () => {
  it('should return 200 with verification records', async () => {
    const res = await request(makeApp())
      .get(`/assets/${ASSET_ID}/verifications`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].decision).toBe('approved');
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp(undefined, {
      getHistory: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app).get('/assets/bad-id/verifications');

    expect(res.status).toBe(404);
  });
});

// ─── POST /assets/:id/mint ───────────────────────────────────────────────────

describe('POST /assets/:id/mint', () => {
  it('should return 200 with tokenId and txHash', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/mint`)
      .send({ recipientAddress: RECIPIENT_ADDRESS });

    expect(res.status).toBe(200);
    expect(res.body.data.tokenId).toBe('123456');
    expect(res.body.data.txHash).toBe(TX_HASH);
  });

  it('should pass correct args to mintingService', async () => {
    const mintAssetTokens = jest.fn().mockResolvedValue({ tokenId: '123', txHash: TX_HASH });
    const app = makeApp(undefined, undefined, { mintAssetTokens });

    await request(app)
      .post(`/assets/${ASSET_ID}/mint`)
      .send({ recipientAddress: RECIPIENT_ADDRESS });

    expect(mintAssetTokens).toHaveBeenCalledWith(ASSET_ID, RECIPIENT_ADDRESS);
  });

  it('should return 422 when recipientAddress is missing', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/mint`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp(undefined, undefined, {
      mintAssetTokens: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app)
      .post('/assets/bad-id/mint')
      .send({ recipientAddress: RECIPIENT_ADDRESS });

    expect(res.status).toBe(404);
  });

  it('should return 422 when asset is not in verified status', async () => {
    const app = makeApp(undefined, undefined, {
      mintAssetTokens: jest.fn().mockRejectedValue(
        new ValidationError("Asset must be in 'verified' status to mint"),
      ),
    });

    const res = await request(app)
      .post(`/assets/${ASSET_ID}/mint`)
      .send({ recipientAddress: RECIPIENT_ADDRESS });

    expect(res.status).toBe(422);
  });
});

// ─── POST /assets/:id/retire ────────────────────────────────────────────────

describe('POST /assets/:id/retire', () => {
  it('should return 200 with txHash and amount', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/retire`)
      .send({ amount: 1000, userId: USER_ID, reason: 'Carbon offset' });

    expect(res.status).toBe(200);
    expect(res.body.data.txHash).toBe(TX_HASH);
    expect(res.body.data.amount).toBe(1000);
  });

  it('should return 422 when amount is missing', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/retire`)
      .send({ userId: USER_ID, reason: 'Carbon offset' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when userId is not a valid UUID', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/retire`)
      .send({ amount: 100, userId: 'not-a-uuid', reason: 'Offset' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when reason is missing', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/retire`)
      .send({ amount: 100, userId: USER_ID });

    expect(res.status).toBe(422);
  });

  it('should return 422 when amount is zero or negative', async () => {
    const res = await request(makeApp())
      .post(`/assets/${ASSET_ID}/retire`)
      .send({ amount: 0, userId: USER_ID, reason: 'Offset' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp(undefined, undefined, undefined, {
      retire: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app)
      .post('/assets/bad-id/retire')
      .send({ amount: 100, userId: USER_ID, reason: 'Offset' });

    expect(res.status).toBe(404);
  });

  it('should return 422 when asset is not carbon_credit', async () => {
    const app = makeApp(undefined, undefined, undefined, {
      retire: jest.fn().mockRejectedValue(
        new ValidationError('Only carbon credits can be retired'),
      ),
    });

    const res = await request(app)
      .post(`/assets/${ASSET_ID}/retire`)
      .send({ amount: 100, userId: USER_ID, reason: 'Offset' });

    expect(res.status).toBe(422);
  });
});

// ─── GET /assets/:id/retirements ─────────────────────────────────────────────

describe('GET /assets/:id/retirements', () => {
  it('should return 200 with retirement records', async () => {
    const res = await request(makeApp())
      .get(`/assets/${ASSET_ID}/retirements`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].transactionHash).toBe(TX_HASH);
  });

  it('should return 404 when asset not found', async () => {
    const app = makeApp(undefined, undefined, undefined, {
      getHistory: jest.fn().mockRejectedValue(new NotFoundError('Asset', 'bad-id')),
    });

    const res = await request(app).get('/assets/bad-id/retirements');

    expect(res.status).toBe(404);
  });
});

// ─── 404 catch-all ──────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('should return 404 for unknown paths', async () => {
    const res = await request(makeApp()).get('/unknown-path');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});
