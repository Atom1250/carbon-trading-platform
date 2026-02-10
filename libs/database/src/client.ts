import { Pool, PoolClient, PoolConfig, QueryResult } from 'pg';

export interface IDatabaseClient {
  query<T extends Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]>;
  transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T>;
  healthCheck(): Promise<boolean>;
  end(): Promise<void>;
}

export class DatabaseClient implements IDatabaseClient {
  private readonly pool: Pool;

  constructor(config: PoolConfig) {
    this.pool = new Pool({
      ...config,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err: Error) => {
      // Pool errors are non-fatal — individual queries will surface errors
      process.stderr.write(`Unexpected pool error: ${err.message}\n`);
    });
  }

  async query<T extends Record<string, unknown>>(
    sql: string,
    params?: unknown[],
  ): Promise<T[]> {
    const client = await this.pool.connect();
    try {
      const result: QueryResult<T> = await client.query(sql, params);
      return result.rows;
    } finally {
      client.release();
    }
  }

  async transaction<T>(callback: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.query('SELECT 1');
      return true;
    } catch {
      return false;
    }
  }

  async end(): Promise<void> {
    await this.pool.end();
  }
}

export function createDatabaseClient(config: PoolConfig): IDatabaseClient {
  return new DatabaseClient(config);
}

export function createDatabaseClientFromEnv(): IDatabaseClient {
  const connectionString = process.env['DATABASE_URL'];
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return new DatabaseClient({ connectionString });
}
