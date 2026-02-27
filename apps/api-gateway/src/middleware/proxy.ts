import type { Request, Response, NextFunction } from 'express';
import axios from 'axios';
import { ServiceUnavailableError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { ServiceConfig } from '../config/services.config.js';

const logger = createLogger('api-gateway');

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'transfer-encoding',
  'te',
  'trailer',
  'upgrade',
  'proxy-authorization',
  'proxy-authenticate',
]);

/**
 * Create a proxy middleware that forwards requests to a downstream service.
 *
 * - Forwards method, path, query, body, and selected headers
 * - Injects X-Forwarded-For and X-Request-ID
 * - Returns 503 on ECONNREFUSED / ETIMEDOUT
 */
export function createProxyMiddleware(serviceName: string, serviceConfig: ServiceConfig) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const normalizedBasePath = serviceConfig.basePath?.replace(/\/$/, '') ?? '';
    const normalizedPath = req.path.startsWith('/') ? req.path : `/${req.path}`;
    const targetUrl = `${serviceConfig.url}${normalizedBasePath}${normalizedPath}`;

    logger.info('Proxying request', {
      service: serviceName,
      method: req.method,
      path: req.path,
      targetUrl,
      requestId: req.requestId,
    });

    try {
      const response = await axios({
        method: req.method as 'get' | 'post' | 'put' | 'delete' | 'patch',
        url: targetUrl,
        data: req.body,
        headers: {
          'content-type': req.headers['content-type'] ?? 'application/json',
          authorization: req.headers['authorization'] ?? '',
          'x-request-id': req.requestId ?? '',
          'x-forwarded-for': req.ip ?? req.socket.remoteAddress ?? '0.0.0.0',
          'x-forwarded-proto': req.protocol,
        },
        params: req.query,
        timeout: serviceConfig.timeout,
        validateStatus: () => true,
      });

      // Forward non-hop-by-hop response headers
      for (const [key, value] of Object.entries(response.headers)) {
        if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase()) && value != null) {
          res.setHeader(key, value as string);
        }
      }

      res.status(response.status).json(response.data);
    } catch (error: unknown) {
      const axiosErr = error as { code?: string; message?: string };

      logger.error('Proxy error', {
        service: serviceName,
        error: axiosErr.message ?? 'Unknown error',
        code: axiosErr.code,
        requestId: req.requestId,
      });

      if (axiosErr.code === 'ECONNREFUSED' || axiosErr.code === 'ETIMEDOUT' || axiosErr.code === 'ENOTFOUND') {
        next(new ServiceUnavailableError(`${serviceName} service is unavailable`));
        return;
      }

      next(error);
    }
  };
}
