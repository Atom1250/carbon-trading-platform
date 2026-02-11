import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticationError } from '@libs/errors';
import type { AppConfig } from '@libs/config';
import type { TokenPayload } from '../types/auth.types.js';

export class TokenService {
  private readonly accessSecret: string;
  private readonly refreshSecret: string;
  private readonly accessExpiresIn: string;
  private readonly refreshExpiresIn: string;

  constructor(config: Pick<AppConfig, 'JWT_ACCESS_SECRET' | 'JWT_REFRESH_SECRET' | 'JWT_ACCESS_EXPIRES_IN' | 'JWT_REFRESH_EXPIRES_IN'>) {
    this.accessSecret = config.JWT_ACCESS_SECRET;
    this.refreshSecret = config.JWT_REFRESH_SECRET;
    this.accessExpiresIn = config.JWT_ACCESS_EXPIRES_IN;
    this.refreshExpiresIn = config.JWT_REFRESH_EXPIRES_IN;
  }

  generateAccessToken(payload: Omit<TokenPayload, 'tokenId'>): string {
    const tokenPayload: TokenPayload = { ...payload, tokenId: uuidv4() };
    return jwt.sign(tokenPayload, this.accessSecret, {
      expiresIn: this.accessExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'carbon-platform',
      audience: 'carbon-platform-api',
    });
  }

  generateRefreshToken(payload: Omit<TokenPayload, 'tokenId'>): string {
    const tokenPayload: TokenPayload = { ...payload, tokenId: uuidv4() };
    return jwt.sign(tokenPayload, this.refreshSecret, {
      expiresIn: this.refreshExpiresIn as jwt.SignOptions['expiresIn'],
      issuer: 'carbon-platform',
    });
  }

  verifyAccessToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.accessSecret, {
        issuer: 'carbon-platform',
        audience: 'carbon-platform-api',
      }) as TokenPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired access token');
    }
  }

  verifyRefreshToken(token: string): TokenPayload {
    try {
      return jwt.verify(token, this.refreshSecret, {
        issuer: 'carbon-platform',
      }) as TokenPayload;
    } catch {
      throw new AuthenticationError('Invalid or expired refresh token');
    }
  }
}
