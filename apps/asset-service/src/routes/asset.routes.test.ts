import request from 'supertest';
import { createApp } from '../app';
import { NotFoundError } from '@libs/errors';

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

function makeService(opts: {
  create?: jest.Mock;
  findById?: jest.Mock;
  update?: jest.Mock;
  list?: jest.Mock;
} = {}) {
  return {
    create: opts.create ?? jest.fn().mockResolvedValue(ASSET),
    findById: opts.findById ?? jest.fn().mockResolvedValue(ASSET),
    update: opts.update ?? jest.fn().mockResolvedValue({ ...ASSET, name: 'Updated' }),
    list: opts.list ?? jest.fn().mockResolvedValue({
      assets: [ASSET],
      total: 1,
    }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeService>[0]) {
  return createApp({ assetService: makeService(serviceOpts) as never });
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

// ─── 404 catch-all ──────────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('should return 404 for unknown paths', async () => {
    const res = await request(makeApp()).get('/unknown-path');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});
