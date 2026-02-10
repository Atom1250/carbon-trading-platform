import { DatabaseClient, createDatabaseClient, createDatabaseClientFromEnv } from './client.js';
import { Pool, PoolClient } from 'pg';

jest.mock('pg');

const MockPool = Pool as jest.MockedClass<typeof Pool>;

describe('DatabaseClient', () => {
  let mockPoolClient: jest.Mocked<PoolClient>;
  let mockPool: jest.Mocked<Pool>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPoolClient = {
      query: jest.fn(),
      release: jest.fn(),
    } as unknown as jest.Mocked<PoolClient>;

    mockPool = {
      connect: jest.fn().mockResolvedValue(mockPoolClient),
      end: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
    } as unknown as jest.Mocked<Pool>;

    MockPool.mockImplementation(() => mockPool);
  });

  describe('constructor', () => {
    it('should create pool with merged config and defaults', () => {
      new DatabaseClient({ host: 'localhost', database: 'test' });
      expect(MockPool).toHaveBeenCalledWith(
        expect.objectContaining({
          host: 'localhost',
          database: 'test',
          max: 20,
          idleTimeoutMillis: 30000,
          connectionTimeoutMillis: 2000,
        }),
      );
    });

    it('should register pool error handler', () => {
      new DatabaseClient({});
      expect(mockPool.on).toHaveBeenCalledWith('error', expect.any(Function));
    });
  });

  describe('query', () => {
    it('should execute parameterized query and return rows', async () => {
      const rows = [{ id: '123', name: 'Test' }];
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows });

      const client = new DatabaseClient({});
      const result = await client.query('SELECT * FROM users WHERE id = $1', ['123']);

      expect(mockPool.connect).toHaveBeenCalledTimes(1);
      expect(mockPoolClient.query).toHaveBeenCalledWith(
        'SELECT * FROM users WHERE id = $1',
        ['123'],
      );
      expect(result).toEqual(rows);
    });

    it('should execute query without params', async () => {
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows: [] });

      const client = new DatabaseClient({});
      await client.query('SELECT 1');

      expect(mockPoolClient.query).toHaveBeenCalledWith('SELECT 1', undefined);
    });

    it('should always release client on success', async () => {
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows: [] });

      const client = new DatabaseClient({});
      await client.query('SELECT 1');

      expect(mockPoolClient.release).toHaveBeenCalledTimes(1);
    });

    it('should always release client on error', async () => {
      mockPoolClient.query = jest.fn().mockRejectedValue(new Error('query error'));

      const client = new DatabaseClient({});
      await expect(client.query('SELECT 1')).rejects.toThrow('query error');

      expect(mockPoolClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('transaction', () => {
    it('should execute callback within BEGIN/COMMIT', async () => {
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows: [] });
      const callback = jest.fn().mockResolvedValue({ id: '123' });

      const client = new DatabaseClient({});
      const result = await client.transaction(callback);

      expect(mockPoolClient.query).toHaveBeenNthCalledWith(1, 'BEGIN');
      expect(callback).toHaveBeenCalledWith(mockPoolClient);
      expect(mockPoolClient.query).toHaveBeenNthCalledWith(2, 'COMMIT');
      expect(result).toEqual({ id: '123' });
    });

    it('should ROLLBACK and rethrow on callback error', async () => {
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows: [] });
      const error = new Error('transaction failed');
      const callback = jest.fn().mockRejectedValue(error);

      const client = new DatabaseClient({});
      await expect(client.transaction(callback)).rejects.toThrow('transaction failed');

      expect(mockPoolClient.query).toHaveBeenCalledWith('ROLLBACK');
    });

    it('should always release client on success', async () => {
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows: [] });
      const callback = jest.fn().mockResolvedValue(null);

      const client = new DatabaseClient({});
      await client.transaction(callback);

      expect(mockPoolClient.release).toHaveBeenCalledTimes(1);
    });

    it('should always release client on error', async () => {
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows: [] });
      const callback = jest.fn().mockRejectedValue(new Error('fail'));

      const client = new DatabaseClient({});
      await expect(client.transaction(callback)).rejects.toThrow();

      expect(mockPoolClient.release).toHaveBeenCalledTimes(1);
    });
  });

  describe('healthCheck', () => {
    it('should return true when query succeeds', async () => {
      mockPoolClient.query = jest.fn().mockResolvedValue({ rows: [{ '?column?': 1 }] });

      const client = new DatabaseClient({});
      const result = await client.healthCheck();

      expect(result).toBe(true);
    });

    it('should return false when query fails', async () => {
      mockPool.connect = jest.fn().mockRejectedValue(new Error('connection refused'));

      const client = new DatabaseClient({});
      const result = await client.healthCheck();

      expect(result).toBe(false);
    });
  });

  describe('end', () => {
    it('should close the pool', async () => {
      const client = new DatabaseClient({});
      await client.end();
      expect(mockPool.end).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createDatabaseClient', () => {
  beforeEach(() => {
    MockPool.mockImplementation(
      () =>
        ({
          connect: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
        }) as unknown as Pool,
    );
  });

  it('should return a DatabaseClient instance', () => {
    const client = createDatabaseClient({ host: 'localhost' });
    expect(client).toBeInstanceOf(DatabaseClient);
  });
});

describe('createDatabaseClientFromEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    MockPool.mockImplementation(
      () =>
        ({
          connect: jest.fn(),
          end: jest.fn(),
          on: jest.fn(),
        }) as unknown as Pool,
    );
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should create client from DATABASE_URL env var', () => {
    process.env['DATABASE_URL'] = 'postgresql://user:pass@localhost:5432/test';
    const client = createDatabaseClientFromEnv();
    expect(client).toBeInstanceOf(DatabaseClient);
  });

  it('should throw when DATABASE_URL is not set', () => {
    delete process.env['DATABASE_URL'];
    expect(() => createDatabaseClientFromEnv()).toThrow(
      'DATABASE_URL environment variable is required',
    );
  });
});
