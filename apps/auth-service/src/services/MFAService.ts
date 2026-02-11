import speakeasy from 'speakeasy';
import QRCode from 'qrcode';
import { AuthenticationError } from '@libs/errors';
import type { IDatabaseClient } from '@libs/database';

interface MFASecretRow {
  mfa_secret: string | null;
}

export class MFAService {
  constructor(private readonly db: IDatabaseClient) {}

  async setup(userId: string): Promise<{ secret: string; qrCodeDataUrl: string }> {
    const secret = speakeasy.generateSecret({
      name: `Carbon Platform (${userId})`,
      issuer: 'Carbon Platform',
      length: 20,
    });

    await this.db.query(
      'UPDATE users SET mfa_secret = $1 WHERE id = $2',
      [secret.base32, userId],
    );

    const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url ?? '');

    return { secret: secret.base32, qrCodeDataUrl };
  }

  async verifyTOTP(userId: string, token: string): Promise<boolean> {
    const rows = await this.db.query<MFASecretRow>(
      'SELECT mfa_secret FROM users WHERE id = $1',
      [userId],
    );

    if (rows.length === 0 || !rows[0].mfa_secret) {
      return false;
    }

    return speakeasy.totp.verify({
      secret: rows[0].mfa_secret,
      encoding: 'base32',
      token,
      window: 1,
    });
  }

  async enable(userId: string, token: string): Promise<void> {
    const valid = await this.verifyTOTP(userId, token);
    if (!valid) {
      throw new AuthenticationError('Invalid MFA code');
    }
    await this.db.query(
      'UPDATE users SET has_enabled_mfa = true WHERE id = $1',
      [userId],
    );
  }
}
