import type { TokenPayload } from './auth.types.js';

declare global {
  namespace Express {
    interface Request {
      requestId: string;
      user?: TokenPayload;
    }
  }
}
