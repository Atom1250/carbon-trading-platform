import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { ConflictError, NotFoundError, AuthorizationError, ValidationError } from '@libs/errors';
import { createLogger } from '@libs/logger';
import type { IDatabaseClient } from '@libs/database';
import type {
  RegisterInput,
  RegisterResult,
  VerifyEmailResult,
  UserRow,
  EmailVerificationTokenRow,
  InstitutionCheckRow,
} from '../types/auth.types.js';

const logger = createLogger('auth-service');

const BCRYPT_ROUNDS = 12;
const TOKEN_BYTES = 32;
const VERIFICATION_TOKEN_EXPIRY_HOURS = 24;

export class RegistrationService {
  constructor(private readonly db: IDatabaseClient) {}

  async register(input: RegisterInput): Promise<RegisterResult> {
    const email = input.email.toLowerCase();

    logger.info('User registration started', { email, institutionId: input.institutionId });

    // Check if user already exists
    const existing = await this.db.query<Pick<UserRow, 'id'>>(
      'SELECT id FROM users WHERE email = $1',
      [email],
    );

    if (existing.length > 0) {
      throw new ConflictError('A user with this email already exists');
    }

    // Verify institution exists and is in an acceptable state
    await this.verifyInstitution(input.institutionId);

    // Hash password
    const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

    // Create user
    const rows = await this.db.query<{
      id: string;
      email: string;
      first_name: string;
      last_name: string;
      role: string;
    }>(
      `INSERT INTO users (
        institution_id, email, password_hash,
        first_name, last_name, role
      )
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, email, first_name, last_name, role`,
      [
        input.institutionId,
        email,
        passwordHash,
        input.firstName,
        input.lastName,
        input.role,
      ],
    );

    const user = rows[0];

    // Generate email verification token
    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');

    // Invalidate any existing unused tokens for this user, then insert new one
    await this.db.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL',
      [user.id],
    );

    await this.db.query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '${VERIFICATION_TOKEN_EXPIRY_HOURS} hours')`,
      [user.id, token],
    );

    logger.info('User registered successfully', { userId: user.id, email });

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
      },
      verificationToken: token,
    };
  }

  async verifyEmail(token: string): Promise<VerifyEmailResult> {
    logger.info('Email verification attempt');

    const rows = await this.db.query<EmailVerificationTokenRow>(
      `SELECT user_id, expires_at, used_at
       FROM email_verification_tokens
       WHERE token = $1`,
      [token],
    );

    if (rows.length === 0) {
      throw new ValidationError('Invalid verification token', [
        { field: 'token', message: 'Token is invalid or does not exist', code: 'invalid_token' },
      ]);
    }

    const { user_id, expires_at, used_at } = rows[0];

    if (used_at) {
      throw new ValidationError('Verification token has already been used', [
        { field: 'token', message: 'Token has already been used', code: 'token_used' },
      ]);
    }

    if (new Date(expires_at) < new Date()) {
      throw new ValidationError('Verification token has expired', [
        { field: 'token', message: 'Token has expired', code: 'token_expired' },
      ]);
    }

    // Mark token as used
    await this.db.query(
      'UPDATE email_verification_tokens SET used_at = NOW() WHERE token = $1',
      [token],
    );

    // Mark user email as verified
    await this.db.query(
      'UPDATE users SET has_verified_email = TRUE, updated_at = NOW() WHERE id = $1',
      [user_id],
    );

    logger.info('Email verified successfully', { userId: user_id });

    return { success: true };
  }

  private async verifyInstitution(institutionId: string): Promise<void> {
    const rows = await this.db.query<InstitutionCheckRow>(
      'SELECT id, status FROM institutions WHERE id = $1',
      [institutionId],
    );

    if (rows.length === 0) {
      throw new NotFoundError('Institution not found');
    }

    const { status } = rows[0];
    if (status !== 'active' && status !== 'pending') {
      throw new AuthorizationError('Institution is not accepting new registrations');
    }
  }
}
