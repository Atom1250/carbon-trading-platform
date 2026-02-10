import { loadConfig, parseCorsOrigins } from './config.js';

const validEnv = {
  NODE_ENV: 'development' as const,
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/db',
  REDIS_URL: 'redis://localhost:6379',
  JWT_ACCESS_SECRET: 'access-secret-that-is-at-least-32-chars!!',
  JWT_REFRESH_SECRET: 'refresh-secret-that-is-at-least-32-chars!',
};

describe('loadConfig', () => {
  describe('valid configuration', () => {
    it('should return parsed config with defaults applied', () => {
      const config = loadConfig(validEnv);
      expect(config.NODE_ENV).toBe('development');
      expect(config.PORT).toBe(3000);
      expect(config.LOG_LEVEL).toBe('info');
      expect(config.DATABASE_URL).toBe(validEnv.DATABASE_URL);
      expect(config.DATABASE_POOL_MAX).toBe(20);
      expect(config.REDIS_URL).toBe(validEnv.REDIS_URL);
      expect(config.JWT_ACCESS_SECRET).toBe(validEnv.JWT_ACCESS_SECRET);
      expect(config.JWT_REFRESH_SECRET).toBe(validEnv.JWT_REFRESH_SECRET);
      expect(config.JWT_ACCESS_EXPIRES_IN).toBe('15m');
      expect(config.JWT_REFRESH_EXPIRES_IN).toBe('7d');
      expect(config.CORS_ORIGINS).toBe('http://localhost:3000');
    });

    it('should coerce PORT from string to number', () => {
      const config = loadConfig({ ...validEnv, PORT: '8080' as unknown as undefined });
      expect(config.PORT).toBe(8080);
      expect(typeof config.PORT).toBe('number');
    });

    it('should coerce DATABASE_POOL_MAX from string to number', () => {
      const config = loadConfig({ ...validEnv, DATABASE_POOL_MAX: '10' as unknown as undefined });
      expect(config.DATABASE_POOL_MAX).toBe(10);
    });

    it('should accept production NODE_ENV', () => {
      const config = loadConfig({ ...validEnv, NODE_ENV: 'production' });
      expect(config.NODE_ENV).toBe('production');
    });

    it('should accept test NODE_ENV', () => {
      const config = loadConfig({ ...validEnv, NODE_ENV: 'test' });
      expect(config.NODE_ENV).toBe('test');
    });

    it('should accept custom LOG_LEVEL', () => {
      const config = loadConfig({ ...validEnv, LOG_LEVEL: 'debug' });
      expect(config.LOG_LEVEL).toBe('debug');
    });

    it('should accept custom JWT expiry values', () => {
      const config = loadConfig({
        ...validEnv,
        JWT_ACCESS_EXPIRES_IN: '30m',
        JWT_REFRESH_EXPIRES_IN: '14d',
      });
      expect(config.JWT_ACCESS_EXPIRES_IN).toBe('30m');
      expect(config.JWT_REFRESH_EXPIRES_IN).toBe('14d');
    });

    it('should accept custom CORS_ORIGINS', () => {
      const config = loadConfig({ ...validEnv, CORS_ORIGINS: 'https://app.example.com' });
      expect(config.CORS_ORIGINS).toBe('https://app.example.com');
    });
  });

  describe('invalid configuration', () => {
    it('should throw when DATABASE_URL is missing', () => {
      const env = { ...validEnv };
      delete (env as Partial<typeof validEnv>).DATABASE_URL;
      expect(() => loadConfig(env)).toThrow('Invalid environment configuration');
    });

    it('should throw when REDIS_URL is missing', () => {
      const env = { ...validEnv };
      delete (env as Partial<typeof validEnv>).REDIS_URL;
      expect(() => loadConfig(env)).toThrow('Invalid environment configuration');
    });

    it('should throw when JWT_ACCESS_SECRET is missing', () => {
      const env = { ...validEnv };
      delete (env as Partial<typeof validEnv>).JWT_ACCESS_SECRET;
      expect(() => loadConfig(env)).toThrow('Invalid environment configuration');
    });

    it('should throw when JWT_REFRESH_SECRET is missing', () => {
      const env = { ...validEnv };
      delete (env as Partial<typeof validEnv>).JWT_REFRESH_SECRET;
      expect(() => loadConfig(env)).toThrow('Invalid environment configuration');
    });

    it('should throw when JWT_ACCESS_SECRET is too short (< 32 chars)', () => {
      expect(() =>
        loadConfig({ ...validEnv, JWT_ACCESS_SECRET: 'short' }),
      ).toThrow('Invalid environment configuration');
    });

    it('should throw when DATABASE_URL is not a valid URL', () => {
      expect(() =>
        loadConfig({ ...validEnv, DATABASE_URL: 'not-a-url' }),
      ).toThrow('Invalid environment configuration');
    });

    it('should throw when REDIS_URL is not a valid URL', () => {
      expect(() =>
        loadConfig({ ...validEnv, REDIS_URL: 'not-a-url' }),
      ).toThrow('Invalid environment configuration');
    });

    it('should throw when LOG_LEVEL is invalid', () => {
      expect(() =>
        loadConfig({ ...validEnv, LOG_LEVEL: 'verbose' as 'info' }),
      ).toThrow('Invalid environment configuration');
    });

    it('should include field path in error message', () => {
      const env = { ...validEnv };
      delete (env as Partial<typeof validEnv>).DATABASE_URL;
      try {
        loadConfig(env);
        fail('Expected error');
      } catch (e) {
        expect((e as Error).message).toContain('DATABASE_URL');
      }
    });
  });
});

describe('parseCorsOrigins', () => {
  it('should parse a single origin', () => {
    expect(parseCorsOrigins('http://localhost:3000')).toEqual(['http://localhost:3000']);
  });

  it('should parse multiple comma-separated origins', () => {
    const result = parseCorsOrigins(
      'http://localhost:3000,https://app.example.com, https://admin.example.com',
    );
    expect(result).toEqual([
      'http://localhost:3000',
      'https://app.example.com',
      'https://admin.example.com',
    ]);
  });

  it('should trim whitespace around origins', () => {
    const result = parseCorsOrigins('  http://localhost:3000  ,  https://example.com  ');
    expect(result).toEqual(['http://localhost:3000', 'https://example.com']);
  });

  it('should filter out empty strings', () => {
    const result = parseCorsOrigins('http://localhost:3000,,https://example.com,');
    expect(result).toEqual(['http://localhost:3000', 'https://example.com']);
  });

  it('should return empty array for empty string', () => {
    expect(parseCorsOrigins('')).toEqual([]);
  });
});
