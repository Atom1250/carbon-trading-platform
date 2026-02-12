/**
 * Migration tests for 0011–0016.
 *
 * These tests use a mock pgm object to capture SQL statements emitted by each
 * migration's up()/down() functions. No live database is required.
 */

// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0011 = require('../migrations/0011_login_attempts.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0012 = require('../migrations/0012_email_verification_tokens.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0013 = require('../migrations/0013_password_reset_tokens.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0014 = require('../migrations/0014_session_cleanup_index.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0015 = require('../migrations/0015_assets.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0016 = require('../migrations/0016_asset_verifications.js');

/** Creates a mock pgm object and returns captured SQL strings after calling fn. */
function captureSql(fn: (pgm: { sql: (s: string) => void }) => void): string[] {
  const sqls: string[] = [];
  fn({ sql: (s: string) => sqls.push(s) });
  return sqls;
}

function joined(sqls: string[]): string {
  return sqls.join('\n').replace(/\s+/g, ' ');
}

// ─── Migration 0011: login_attempts ──────────────────────────────────────────

describe('Migration 0011: login_attempts', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0011.up); });

    it('creates the login_attempts table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE login_attempts');
    });

    it('includes id, email, ip_address, success columns', () => {
      const all = joined(sqls);
      expect(all).toContain('id');
      expect(all).toContain('email');
      expect(all).toContain('ip_address');
      expect(all).toContain('success');
    });

    it('includes failure_reason and attempted_at columns', () => {
      const all = joined(sqls);
      expect(all).toContain('failure_reason');
      expect(all).toContain('attempted_at');
    });

    it('creates index on email', () => {
      expect(joined(sqls)).toContain('idx_login_attempts_email');
    });

    it('creates index on ip_address', () => {
      expect(joined(sqls)).toContain('idx_login_attempts_ip');
    });

    it('creates composite partial index for failed attempts', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_login_attempts_email_attempted');
      expect(all).toContain('WHERE success = FALSE');
    });
  });

  describe('down', () => {
    it('drops the login_attempts table', () => {
      const sqls = captureSql(migration0011.down);
      expect(joined(sqls)).toContain('DROP TABLE IF EXISTS login_attempts');
    });
  });
});

// ─── Migration 0012: email_verification_tokens ───────────────────────────────

describe('Migration 0012: email_verification_tokens', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0012.up); });

    it('creates the email_verification_tokens table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE email_verification_tokens');
    });

    it('includes user_id foreign key referencing users', () => {
      const all = joined(sqls);
      expect(all).toContain('user_id');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('includes token, expires_at, and used_at columns', () => {
      const all = joined(sqls);
      expect(all).toContain('token');
      expect(all).toContain('expires_at');
      expect(all).toContain('used_at');
    });

    it('includes ON DELETE CASCADE on user_id', () => {
      expect(joined(sqls)).toContain('ON DELETE CASCADE');
    });

    it('creates unique partial index enforcing one token per user', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_email_verification_one_per_user');
      expect(all).toContain('WHERE used_at IS NULL');
    });

    it('creates index on token column', () => {
      expect(joined(sqls)).toContain('idx_email_verification_token');
    });
  });

  describe('down', () => {
    it('drops the email_verification_tokens table', () => {
      const sqls = captureSql(migration0012.down);
      expect(joined(sqls)).toContain('DROP TABLE IF EXISTS email_verification_tokens');
    });
  });
});

// ─── Migration 0013: password_reset_tokens ───────────────────────────────────

describe('Migration 0013: password_reset_tokens', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0013.up); });

    it('creates the password_reset_tokens table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE password_reset_tokens');
    });

    it('includes user_id foreign key referencing users with CASCADE', () => {
      const all = joined(sqls);
      expect(all).toContain('user_id');
      expect(all).toContain('REFERENCES users(id)');
      expect(all).toContain('ON DELETE CASCADE');
    });

    it('includes token, expires_at, used_at, ip_address columns', () => {
      const all = joined(sqls);
      expect(all).toContain('token');
      expect(all).toContain('expires_at');
      expect(all).toContain('used_at');
      expect(all).toContain('ip_address');
    });

    it('creates the trigger function for token limit', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE OR REPLACE FUNCTION check_password_reset_token_limit');
      expect(all).toContain('RAISE EXCEPTION');
      expect(all).toContain('maximum number of active password reset tokens');
    });

    it('creates the trigger on password_reset_tokens', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TRIGGER enforce_password_reset_token_limit');
      expect(all).toContain('BEFORE INSERT ON password_reset_tokens');
    });

    it('creates partial index for unused tokens', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_password_reset_unused');
      expect(all).toContain('WHERE used_at IS NULL');
    });
  });

  describe('down', () => {
    it('drops the trigger, function, and table in correct order', () => {
      const sqls = captureSql(migration0013.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TRIGGER IF EXISTS enforce_password_reset_token_limit');
      expect(all).toContain('DROP FUNCTION IF EXISTS check_password_reset_token_limit');
      expect(all).toContain('DROP TABLE IF EXISTS password_reset_tokens');
    });

    it('drops trigger before function (order matters)', () => {
      const sqls = captureSql(migration0013.down);
      const triggerIdx = sqls.findIndex((s) => s.includes('DROP TRIGGER'));
      const fnIdx = sqls.findIndex((s) => s.includes('DROP FUNCTION'));
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE'));
      expect(triggerIdx).toBeLessThan(fnIdx);
      expect(fnIdx).toBeLessThan(tableIdx);
    });
  });
});

// ─── Migration 0014: session_cleanup_index ───────────────────────────────────

describe('Migration 0014: session_cleanup_index', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0014.up); });

    it('creates cleanup index on sessions(expires_at)', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_sessions_expires_at_cleanup');
      expect(all).toContain('ON sessions(expires_at)');
    });

    it('creates active-session lookup index on sessions(user_id, is_revoked)', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_sessions_user_id_active');
      expect(all).toContain('ON sessions(user_id, is_revoked)');
    });
  });

  describe('down', () => {
    it('drops both indexes', () => {
      const sqls = captureSql(migration0014.down);
      const all = joined(sqls);
      expect(all).toContain('DROP INDEX IF EXISTS idx_sessions_expires_at_cleanup');
      expect(all).toContain('DROP INDEX IF EXISTS idx_sessions_user_id_active');
    });
  });
});

// ─── Migration 0015: assets ──────────────────────────────────────────────────

describe('Migration 0015: assets', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0015.up); });

    it('creates the asset_type_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE asset_type_enum AS ENUM');
      expect(all).toContain('carbon_credit');
      expect(all).toContain('loan_portion');
    });

    it('creates the asset_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE asset_status_enum AS ENUM');
      expect(all).toContain('draft');
      expect(all).toContain('pending_verification');
      expect(all).toContain('verified');
      expect(all).toContain('minted');
      expect(all).toContain('suspended');
    });

    it('creates the assets table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE assets');
    });

    it('includes core columns', () => {
      const all = joined(sqls);
      expect(all).toContain('id');
      expect(all).toContain('institution_id');
      expect(all).toContain('asset_type');
      expect(all).toContain('name');
      expect(all).toContain('status');
      expect(all).toContain('total_supply');
      expect(all).toContain('available_supply');
      expect(all).toContain('retired_supply');
    });

    it('includes blockchain columns', () => {
      const all = joined(sqls);
      expect(all).toContain('token_id');
      expect(all).toContain('minting_tx_hash');
      expect(all).toContain('minted_at');
      expect(all).toContain('metadata_uri');
    });

    it('includes carbon-specific columns', () => {
      const all = joined(sqls);
      expect(all).toContain('vintage');
      expect(all).toContain('standard');
      expect(all).toContain('geography');
    });

    it('references institutions(id)', () => {
      expect(joined(sqls)).toContain('REFERENCES institutions(id)');
    });

    it('creates index on institution_id', () => {
      expect(joined(sqls)).toContain('idx_assets_institution_id');
    });

    it('creates index on asset_type', () => {
      expect(joined(sqls)).toContain('idx_assets_asset_type');
    });

    it('creates index on status', () => {
      expect(joined(sqls)).toContain('idx_assets_status');
    });
  });

  describe('down', () => {
    it('drops the assets table and both enum types', () => {
      const sqls = captureSql(migration0015.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS assets');
      expect(all).toContain('DROP TYPE IF EXISTS asset_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS asset_type_enum');
    });

    it('drops table before types (order matters)', () => {
      const sqls = captureSql(migration0015.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE'));
      const statusIdx = sqls.findIndex((s) => s.includes('asset_status_enum'));
      const typeIdx = sqls.findIndex((s) => s.includes('asset_type_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(statusIdx).toBeLessThan(typeIdx);
    });
  });
});

// ─── Migration 0016: asset_verifications ─────────────────────────────────────

describe('Migration 0016: asset_verifications', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0016.up); });

    it('creates the verification_decision_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE verification_decision_enum AS ENUM');
      expect(all).toContain('approved');
      expect(all).toContain('rejected');
    });

    it('creates the asset_verifications table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE asset_verifications');
    });

    it('includes core columns', () => {
      const all = joined(sqls);
      expect(all).toContain('id');
      expect(all).toContain('asset_id');
      expect(all).toContain('decision');
      expect(all).toContain('verified_by');
      expect(all).toContain('notes');
      expect(all).toContain('created_at');
    });

    it('references assets(id) and users(id)', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES assets(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates index on asset_id', () => {
      expect(joined(sqls)).toContain('idx_asset_verifications_asset_id');
    });
  });

  describe('down', () => {
    it('drops the asset_verifications table and enum type', () => {
      const sqls = captureSql(migration0016.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS asset_verifications');
      expect(all).toContain('DROP TYPE IF EXISTS verification_decision_enum');
    });

    it('drops table before type (order matters)', () => {
      const sqls = captureSql(migration0016.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE'));
      const typeIdx = sqls.findIndex((s) => s.includes('verification_decision_enum'));
      expect(tableIdx).toBeLessThan(typeIdx);
    });
  });
});
