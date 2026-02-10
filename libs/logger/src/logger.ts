import winston from 'winston';

export interface ILogger {
  error(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  debug(message: string, meta?: Record<string, unknown>): void;
}

const { combine, timestamp, json, colorize, simple, errors } = winston.format;

function buildFormat(env: string): winston.Logform.Format {
  if (env === 'test') {
    return combine(errors({ stack: true }), timestamp(), json());
  }
  if (env === 'production') {
    return combine(errors({ stack: true }), timestamp(), json());
  }
  // development: human-readable
  return combine(
    colorize(),
    errors({ stack: true }),
    timestamp({ format: 'HH:mm:ss' }),
    simple(),
  );
}

function buildTransports(env: string): winston.transport[] {
  if (env === 'test') {
    // Silent in tests unless LOG_LEVEL=debug is set explicitly
    return [
      new winston.transports.Console({
        silent: process.env['LOG_LEVEL'] !== 'debug',
      }),
    ];
  }
  return [
    new winston.transports.Console(),
  ];
}

/**
 * Create a named logger for a specific service or module.
 * In test environments the logger is silent by default.
 */
export function createLogger(service: string): ILogger {
  const env = process.env['NODE_ENV'] ?? 'development';
  const level = process.env['LOG_LEVEL'] ?? (env === 'production' ? 'info' : 'debug');

  const winstonLogger = winston.createLogger({
    level,
    defaultMeta: { service },
    format: buildFormat(env),
    transports: buildTransports(env),
  });

  return {
    error(message: string, meta?: Record<string, unknown>): void {
      winstonLogger.error(message, meta);
    },
    warn(message: string, meta?: Record<string, unknown>): void {
      winstonLogger.warn(message, meta);
    },
    info(message: string, meta?: Record<string, unknown>): void {
      winstonLogger.info(message, meta);
    },
    debug(message: string, meta?: Record<string, unknown>): void {
      winstonLogger.debug(message, meta);
    },
  };
}

/**
 * Default application-level logger.
 * Use createLogger(service) to get a named logger for a specific service.
 */
export const logger: ILogger = createLogger('app');
