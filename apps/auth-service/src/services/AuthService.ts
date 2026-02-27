import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { AuthenticationError } from '@libs/errors';
import type { IDatabaseClient } from '@libs/database';
import { NotFoundError } from '@libs/errors';
import type { LoginResult, RefreshResult, RequestMeta, SafeUser, UserRow } from '../types/auth.types.js';
import type { TokenService } from './TokenService.js';
import type { MFAService } from './MFAService.js';

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function toSafeUser(user: UserRow): SafeUser {
  return {
    id: user.id,
    institutionId: user.institution_id,
    email: user.email,
    firstName: user.first_name,
    lastName: user.last_name,
    role: user.role,
    mfaEnabled: user.has_enabled_mfa,
  };
}

export class AuthService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly tokenService: TokenService,
    private readonly mfaService: MFAService,
  ) {}

  async login(email: string, password: string, meta: RequestMeta): Promise<LoginResult> {
    const rows = await this.db.query<UserRow>(
      `SELECT u.id, u.institution_id, u.email, u.password_hash,
              u.first_name, u.last_name, u.role, u.is_active,
              u.has_enabled_mfa, u.mfa_secret
       FROM users u
       WHERE u.email = $1 AND u.is_active = true`,
      [email.toLowerCase()],
    );

    if (rows.length === 0) {
      throw new AuthenticationError('Invalid credentials');
    }

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      throw new AuthenticationError('Invalid credentials');
    }

    if (user.has_enabled_mfa) {
      return {
        accessToken: '',
        refreshToken: '',
        user: toSafeUser(user),
        requiresMFA: true,
      };
    }

    const tokens = await this.issueTokens(user, meta);
    return { ...tokens, user: toSafeUser(user), requiresMFA: false };
  }

  async refresh(rawRefreshToken: string, meta: RequestMeta): Promise<RefreshResult> {
    const payload = this.tokenService.verifyRefreshToken(rawRefreshToken);
    const tokenHash = hashToken(rawRefreshToken);

    const sessions = await this.db.query<{ id: string }>(
      `SELECT id FROM sessions
       WHERE refresh_token_hash = $1
         AND is_revoked = false
         AND expires_at > NOW()`,
      [tokenHash],
    );

    if (sessions.length === 0) {
      throw new AuthenticationError('Refresh token not found or expired');
    }

    // Token rotation: delete old session
    await this.db.query('DELETE FROM sessions WHERE refresh_token_hash = $1', [tokenHash]);

    const base = { userId: payload.userId, institutionId: payload.institutionId, role: payload.role };
    const accessToken = this.tokenService.generateAccessToken(base);
    const refreshToken = this.tokenService.generateRefreshToken(base);
    await this.storeSession(payload.userId, refreshToken, meta);

    return { accessToken, refreshToken };
  }

  async logout(rawRefreshToken: string): Promise<void> {
    const tokenHash = hashToken(rawRefreshToken);
    await this.db.query(
      'UPDATE sessions SET is_revoked = true WHERE refresh_token_hash = $1',
      [tokenHash],
    );
  }

  async verifyMFA(
    userId: string,
    totpCode: string,
    meta: RequestMeta,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    const rows = await this.db.query<UserRow>(
      `SELECT id, institution_id, email, first_name, last_name, role,
              is_active, has_enabled_mfa, mfa_secret, password_hash
       FROM users WHERE id = $1 AND is_active = true`,
      [userId],
    );

    if (rows.length === 0) {
      throw new AuthenticationError('User not found');
    }

    const user = rows[0];
    if (!user.has_enabled_mfa) {
      throw new AuthenticationError('MFA not enabled for this user');
    }

    const valid = await this.mfaService.verifyTOTP(userId, totpCode);
    if (!valid) {
      throw new AuthenticationError('Invalid MFA code');
    }

    return this.issueTokens(user, meta);
  }

  async getCurrentUser(userId: string): Promise<SafeUser> {
    const rows = await this.db.query<UserRow>(
      `SELECT u.id, u.institution_id, u.email, u.password_hash,
              u.first_name, u.last_name, u.role, u.is_active,
              u.has_enabled_mfa, u.mfa_secret
       FROM users u
       WHERE u.id = $1 AND u.is_active = true`,
      [userId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('User', userId);
    }

    return toSafeUser(rows[0]);
  }

  private async issueTokens(user: UserRow, meta: RequestMeta): Promise<{ accessToken: string; refreshToken: string }> {
    const base = { userId: user.id, institutionId: user.institution_id, role: user.role };
    const accessToken = this.tokenService.generateAccessToken(base);
    const refreshToken = this.tokenService.generateRefreshToken(base);
    await this.storeSession(user.id, refreshToken, meta);
    return { accessToken, refreshToken };
  }

  private async storeSession(userId: string, refreshToken: string, meta: RequestMeta): Promise<void> {
    const tokenHash = hashToken(refreshToken);
    await this.db.query(
      `INSERT INTO sessions (user_id, refresh_token_hash, expires_at, ip_address, user_agent)
       VALUES ($1, $2, NOW() + INTERVAL '7 days', $3, $4)`,
      [userId, tokenHash, meta.ipAddress, meta.userAgent],
    );
  }
}
