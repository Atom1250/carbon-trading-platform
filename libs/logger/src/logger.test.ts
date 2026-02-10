import winston from 'winston';
import { createLogger, logger } from './logger.js';

jest.mock('winston', () => {
  const mockLogger = {
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn(),
  };
  const mockFormat = {
    combine: jest.fn((...args: unknown[]) => args[0]),
    timestamp: jest.fn(() => ({})),
    json: jest.fn(() => ({})),
    colorize: jest.fn(() => ({})),
    simple: jest.fn(() => ({})),
    errors: jest.fn(() => ({})),
  };
  return {
    __esModule: true,
    default: {
      createLogger: jest.fn(() => mockLogger),
      format: mockFormat,
      transports: {
        Console: jest.fn(() => ({})),
      },
    },
    format: mockFormat,
    transports: {
      Console: jest.fn(() => ({})),
    },
  };
});

describe('createLogger', () => {
  const mockedWinston = jest.mocked(winston);

  beforeEach(() => {
    jest.clearAllMocks();
    delete process.env['NODE_ENV'];
    delete process.env['LOG_LEVEL'];
  });

  it('should create a logger with the given service name', () => {
    createLogger('test-service');
    expect(mockedWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({ defaultMeta: { service: 'test-service' } }),
    );
  });

  it('should use LOG_LEVEL env var when set', () => {
    process.env['LOG_LEVEL'] = 'warn';
    createLogger('svc');
    expect(mockedWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'warn' }),
    );
  });

  it('should default to info level in production', () => {
    process.env['NODE_ENV'] = 'production';
    createLogger('svc');
    expect(mockedWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'info' }),
    );
  });

  it('should default to debug level in development', () => {
    process.env['NODE_ENV'] = 'development';
    createLogger('svc');
    expect(mockedWinston.createLogger).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'debug' }),
    );
  });

  describe('logger methods', () => {
    let mockWinstonLogger: {
      error: jest.Mock;
      warn: jest.Mock;
      info: jest.Mock;
      debug: jest.Mock;
    };

    beforeEach(() => {
      mockWinstonLogger = {
        error: jest.fn(),
        warn: jest.fn(),
        info: jest.fn(),
        debug: jest.fn(),
      };
      mockedWinston.createLogger.mockReturnValue(mockWinstonLogger as unknown as winston.Logger);
    });

    it('should delegate error() to winston error', () => {
      const l = createLogger('svc');
      l.error('boom', { code: 500 });
      expect(mockWinstonLogger.error).toHaveBeenCalledWith('boom', { code: 500 });
    });

    it('should delegate warn() to winston warn', () => {
      const l = createLogger('svc');
      l.warn('careful', { id: '1' });
      expect(mockWinstonLogger.warn).toHaveBeenCalledWith('careful', { id: '1' });
    });

    it('should delegate info() to winston info', () => {
      const l = createLogger('svc');
      l.info('started', { port: 3000 });
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('started', { port: 3000 });
    });

    it('should delegate debug() to winston debug', () => {
      const l = createLogger('svc');
      l.debug('trace', { query: 'SELECT 1' });
      expect(mockWinstonLogger.debug).toHaveBeenCalledWith('trace', { query: 'SELECT 1' });
    });

    it('should work without meta argument', () => {
      const l = createLogger('svc');
      l.info('hello');
      expect(mockWinstonLogger.info).toHaveBeenCalledWith('hello', undefined);
    });
  });
});

describe('default logger', () => {
  it('should be an ILogger instance', () => {
    expect(typeof logger.error).toBe('function');
    expect(typeof logger.warn).toBe('function');
    expect(typeof logger.info).toBe('function');
    expect(typeof logger.debug).toBe('function');
  });

  it('should delegate calls to the underlying winston logger', () => {
    const mockedWinston = jest.mocked(winston);
    const mockWinstonLogger = {
      error: jest.fn(),
      warn: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
    };
    mockedWinston.createLogger.mockReturnValue(mockWinstonLogger as unknown as ReturnType<typeof winston.createLogger>);
    const appLogger = createLogger('app');
    appLogger.info('test message', { key: 'value' });
    expect(mockWinstonLogger.info).toHaveBeenCalledWith('test message', { key: 'value' });
  });
});
