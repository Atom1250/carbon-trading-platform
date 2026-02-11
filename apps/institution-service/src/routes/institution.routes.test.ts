import request from 'supertest';
import { createApp } from '../app';
import { NotFoundError, ConflictError } from '@libs/errors';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

const INSTITUTION_ID = '550e8400-e29b-41d4-a716-446655440000';

const INSTITUTION = {
  id: INSTITUTION_ID,
  name: 'Green Capital',
  legalName: 'Green Capital Ltd',
  registrationNumber: 'REG-001',
  tier: 'tier2',
  status: 'pending',
  countryCode: 'GB',
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
    create: opts.create ?? jest.fn().mockResolvedValue(INSTITUTION),
    findById: opts.findById ?? jest.fn().mockResolvedValue(INSTITUTION),
    update: opts.update ?? jest.fn().mockResolvedValue({ ...INSTITUTION, status: 'active' }),
    list: opts.list ?? jest.fn().mockResolvedValue({
      institutions: [INSTITUTION],
      total: 1,
    }),
  };
}

function makeApp(serviceOpts?: Parameters<typeof makeService>[0]) {
  return createApp({ institutionService: makeService(serviceOpts) as never });
}

// ─── POST /institutions ────────────────────────────────────────────────────────

describe('POST /institutions', () => {
  it('should return 201 with institution on valid body', async () => {
    const app = makeApp();

    const res = await request(app).post('/institutions').send({
      name: 'Green Capital',
      legalName: 'Green Capital Ltd',
      registrationNumber: 'REG-001',
      tier: 'tier2',
      countryCode: 'GB',
    });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Green Capital');
    expect(res.body.data.tier).toBe('tier2');
  });

  it('should uppercase countryCode before passing to service', async () => {
    const create = jest.fn().mockResolvedValue(INSTITUTION);
    const app = makeApp({ create });

    await request(app).post('/institutions').send({
      name: 'Test Corp',
      legalName: 'Test Corp Ltd',
      tier: 'tier3',
      countryCode: 'gb',
    });

    expect(create).toHaveBeenCalledWith(
      expect.objectContaining({ countryCode: 'GB' }),
    );
  });

  it('should return 422 when name is missing', async () => {
    const res = await request(makeApp()).post('/institutions').send({
      legalName: 'Test Ltd',
      tier: 'tier2',
      countryCode: 'GB',
    });

    expect(res.status).toBe(422);
    expect(res.body.status).toBe(422);
  });

  it('should return 422 when tier is invalid', async () => {
    const res = await request(makeApp()).post('/institutions').send({
      name: 'Test Corp',
      legalName: 'Test Ltd',
      tier: 'tier99',
      countryCode: 'GB',
    });

    expect(res.status).toBe(422);
  });

  it('should return 422 when countryCode is not 2 characters', async () => {
    const res = await request(makeApp()).post('/institutions').send({
      name: 'Test Corp',
      legalName: 'Test Ltd',
      tier: 'tier2',
      countryCode: 'GBR',
    });

    expect(res.status).toBe(422);
  });

  it('should return 409 when registration number already exists', async () => {
    const app = makeApp({
      create: jest.fn().mockRejectedValue(
        new ConflictError('Institution with registration number already exists'),
      ),
    });

    const res = await request(app).post('/institutions').send({
      name: 'Dup Corp',
      legalName: 'Dup Corp Ltd',
      registrationNumber: 'REG-001',
      tier: 'tier2',
      countryCode: 'GB',
    });

    expect(res.status).toBe(409);
  });
});

// ─── GET /institutions ────────────────────────────────────────────────────────

describe('GET /institutions', () => {
  it('should return 200 with institution list', async () => {
    const res = await request(makeApp()).get('/institutions');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.metadata.total).toBe(1);
  });

  it('should include pagination metadata', async () => {
    const res = await request(makeApp()).get('/institutions?limit=10&offset=0');

    expect(res.body.metadata).toMatchObject({
      total: 1,
      limit: 10,
      offset: 0,
      hasMore: false,
    });
  });

  it('should pass status filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ institutions: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/institutions?status=active');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ status: 'active' }));
  });

  it('should pass tier filter to service', async () => {
    const list = jest.fn().mockResolvedValue({ institutions: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/institutions?tier=tier1');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ tier: 'tier1' }));
  });

  it('should uppercase countryCode query param', async () => {
    const list = jest.fn().mockResolvedValue({ institutions: [], total: 0 });
    const app = makeApp({ list });

    await request(app).get('/institutions?countryCode=gb');

    expect(list).toHaveBeenCalledWith(expect.objectContaining({ countryCode: 'GB' }));
  });

  it('should return 422 for invalid status filter', async () => {
    const res = await request(makeApp()).get('/institutions?status=unknown');

    expect(res.status).toBe(422);
  });

  it('should return 422 for non-numeric limit', async () => {
    const res = await request(makeApp()).get('/institutions?limit=abc');

    expect(res.status).toBe(422);
  });
});

// ─── GET /institutions/:id ────────────────────────────────────────────────────

describe('GET /institutions/:id', () => {
  it('should return 200 with institution when found', async () => {
    const res = await request(makeApp())
      .get(`/institutions/${INSTITUTION_ID}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(INSTITUTION_ID);
  });

  it('should return 404 when institution not found', async () => {
    const app = makeApp({
      findById: jest.fn().mockRejectedValue(new NotFoundError('Institution', 'bad-id')),
    });

    const res = await request(app).get('/institutions/bad-id');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});

// ─── PATCH /institutions/:id ──────────────────────────────────────────────────

describe('PATCH /institutions/:id', () => {
  it('should return 200 with updated institution on valid body', async () => {
    const res = await request(makeApp())
      .patch(`/institutions/${INSTITUTION_ID}`)
      .send({ status: 'active' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('active');
  });

  it('should return 422 when body is empty', async () => {
    const res = await request(makeApp())
      .patch(`/institutions/${INSTITUTION_ID}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('should return 422 when tier value is invalid', async () => {
    const res = await request(makeApp())
      .patch(`/institutions/${INSTITUTION_ID}`)
      .send({ tier: 'tier99' });

    expect(res.status).toBe(422);
  });

  it('should return 422 when status value is invalid', async () => {
    const res = await request(makeApp())
      .patch(`/institutions/${INSTITUTION_ID}`)
      .send({ status: 'deleted' });

    expect(res.status).toBe(422);
  });

  it('should return 404 when institution not found', async () => {
    const app = makeApp({
      update: jest.fn().mockRejectedValue(new NotFoundError('Institution', 'bad-id')),
    });

    const res = await request(app)
      .patch('/institutions/bad-id')
      .send({ status: 'active' });

    expect(res.status).toBe(404);
  });
});

// ─── GET /health ──────────────────────────────────────────────────────────────

describe('GET /health', () => {
  it('should return 200 with healthy status', async () => {
    const res = await request(makeApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('institution-service');
  });
});

// ─── 404 catch-all ───────────────────────────────────────────────────────────

describe('Unknown routes', () => {
  it('should return 404 for unknown paths', async () => {
    const res = await request(makeApp()).get('/unknown-path');

    expect(res.status).toBe(404);
    expect(res.body.status).toBe(404);
  });
});
