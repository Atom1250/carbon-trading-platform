/**
 * Migration tests for 0011–0029.
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0017 = require('../migrations/0017_asset_retirements.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0018 = require('../migrations/0018_asset_search_indexes.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0019 = require('../migrations/0019_sanctions_screenings.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0020 = require('../migrations/0020_aml_alerts.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0021 = require('../migrations/0021_kyc_documents_expiry.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0022 = require('../migrations/0022_pep_checks.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0023 = require('../migrations/0023_sar_reports.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0024 = require('../migrations/0024_rfq_requests.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0025 = require('../migrations/0025_quotes.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0026 = require('../migrations/0026_trades.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0027 = require('../migrations/0027_order_book.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0028 = require('../migrations/0028_ledger_tables.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0029 = require('../migrations/0029_reconciliation_runs.js');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const migration0030 = require('../migrations/0030_deposits.js');

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

// ─── Migration 0017: asset_retirements ───────────────────────────────────────

describe('Migration 0017: asset_retirements', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0017.up); });

    it('creates the asset_retirements table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE asset_retirements');
    });

    it('includes core columns', () => {
      const all = joined(sqls);
      expect(all).toContain('id');
      expect(all).toContain('asset_id');
      expect(all).toContain('amount');
      expect(all).toContain('retired_by_user_id');
      expect(all).toContain('reason');
      expect(all).toContain('transaction_hash');
      expect(all).toContain('created_at');
    });

    it('references assets(id) and users(id)', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES assets(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates index on asset_id', () => {
      expect(joined(sqls)).toContain('idx_asset_retirements_asset_id');
    });

    it('creates index on retired_by_user_id', () => {
      expect(joined(sqls)).toContain('idx_asset_retirements_user_id');
    });
  });

  describe('down', () => {
    it('drops the asset_retirements table', () => {
      const sqls = captureSql(migration0017.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS asset_retirements');
    });
  });
});

// ─── Migration 0018: asset_search_indexes ────────────────────────────────────

describe('Migration 0018: asset_search_indexes', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0018.up); });

    it('creates partial index on vintage', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_assets_vintage');
      expect(all).toContain('ON assets(vintage)');
    });

    it('creates partial index on geography', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_assets_geography');
      expect(all).toContain('ON assets(geography)');
    });

    it('creates partial index on standard', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_assets_standard');
      expect(all).toContain('ON assets(standard)');
    });

    it('creates index on available_supply', () => {
      expect(joined(sqls)).toContain('idx_assets_available_supply');
    });

    it('creates composite index on asset_type, status, created_at', () => {
      expect(joined(sqls)).toContain('idx_assets_type_status_created');
    });

    it('creates 7 indexes total', () => {
      expect(sqls).toHaveLength(7);
    });
  });

  describe('down', () => {
    it('drops all 7 indexes', () => {
      const sqls = captureSql(migration0018.down);
      expect(sqls).toHaveLength(7);
      const all = joined(sqls);
      expect(all).toContain('DROP INDEX IF EXISTS idx_assets_vintage');
      expect(all).toContain('DROP INDEX IF EXISTS idx_assets_geography');
      expect(all).toContain('DROP INDEX IF EXISTS idx_assets_standard');
      expect(all).toContain('DROP INDEX IF EXISTS idx_assets_available_supply');
      expect(all).toContain('DROP INDEX IF EXISTS idx_assets_type_status_created');
    });
  });
});

// ─── Migration 0019: sanctions_screenings ─────────────────────────────────────

describe('Migration 0019: sanctions_screenings', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0019.up); });

    it('creates the screening_entity_type_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE screening_entity_type_enum AS ENUM');
      expect(all).toContain('individual');
      expect(all).toContain('organization');
    });

    it('creates the screening_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE screening_status_enum AS ENUM');
      expect(all).toContain('clear');
      expect(all).toContain('potential_match');
      expect(all).toContain('confirmed_match');
      expect(all).toContain('false_positive');
    });

    it('creates the sanctions_screenings table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE sanctions_screenings');
    });

    it('includes core screening columns', () => {
      const all = joined(sqls);
      expect(all).toContain('entity_type');
      expect(all).toContain('entity_name');
      expect(all).toContain('entity_country');
      expect(all).toContain('entity_date_of_birth');
      expect(all).toContain('entity_identifiers');
      expect(all).toContain('status');
      expect(all).toContain('match_count');
      expect(all).toContain('highest_score');
    });

    it('includes review columns', () => {
      const all = joined(sqls);
      expect(all).toContain('screened_by');
      expect(all).toContain('reviewed_by');
      expect(all).toContain('reviewed_at');
      expect(all).toContain('review_notes');
    });

    it('references institutions and users tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates the sanctions_screening_matches table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE sanctions_screening_matches');
    });

    it('includes match columns', () => {
      const all = joined(sqls);
      expect(all).toContain('screening_id');
      expect(all).toContain('list_name');
      expect(all).toContain('list_entry_id');
      expect(all).toContain('matched_name');
      expect(all).toContain('match_score');
      expect(all).toContain('match_details');
    });

    it('creates index on status', () => {
      expect(joined(sqls)).toContain('idx_sanctions_screenings_status');
    });

    it('creates index on entity_name', () => {
      expect(joined(sqls)).toContain('idx_sanctions_screenings_entity_name');
    });

    it('creates index on institution_id', () => {
      expect(joined(sqls)).toContain('idx_sanctions_screenings_institution_id');
    });

    it('creates index on created_at', () => {
      expect(joined(sqls)).toContain('idx_sanctions_screenings_created_at');
    });

    it('creates index on screening_id for matches table', () => {
      expect(joined(sqls)).toContain('idx_sanctions_screening_matches_screening_id');
    });
  });

  describe('down', () => {
    it('drops both tables and both enum types', () => {
      const sqls = captureSql(migration0019.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS sanctions_screening_matches');
      expect(all).toContain('DROP TABLE IF EXISTS sanctions_screenings');
      expect(all).toContain('DROP TYPE IF EXISTS screening_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS screening_entity_type_enum');
    });

    it('drops matches table before screenings table (order matters)', () => {
      const sqls = captureSql(migration0019.down);
      const matchesIdx = sqls.findIndex((s) => s.includes('sanctions_screening_matches'));
      const screeningsIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS sanctions_screenings'));
      expect(matchesIdx).toBeLessThan(screeningsIdx);
    });

    it('drops tables before types (order matters)', () => {
      const sqls = captureSql(migration0019.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS sanctions_screenings'));
      const statusIdx = sqls.findIndex((s) => s.includes('screening_status_enum'));
      const entityIdx = sqls.findIndex((s) => s.includes('screening_entity_type_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(statusIdx).toBeLessThan(entityIdx);
    });
  });
});

// ─── Migration 0020: aml_alerts ───────────────────────────────────────────────

describe('Migration 0020: aml_alerts', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0020.up); });

    it('creates the aml_alert_type_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE aml_alert_type_enum AS ENUM');
      expect(all).toContain('structuring');
      expect(all).toContain('layering');
      expect(all).toContain('rapid_trading');
      expect(all).toContain('large_volume');
      expect(all).toContain('round_amounts');
      expect(all).toContain('velocity_anomaly');
    });

    it('creates the aml_alert_severity_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE aml_alert_severity_enum AS ENUM');
      expect(all).toContain('low');
      expect(all).toContain('medium');
      expect(all).toContain('high');
      expect(all).toContain('critical');
    });

    it('creates the aml_alert_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE aml_alert_status_enum AS ENUM');
      expect(all).toContain('open');
      expect(all).toContain('under_investigation');
      expect(all).toContain('escalated');
      expect(all).toContain('resolved_suspicious');
      expect(all).toContain('resolved_legitimate');
    });

    it('creates the aml_alerts table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE aml_alerts');
    });

    it('includes core alert columns', () => {
      const all = joined(sqls);
      expect(all).toContain('alert_type');
      expect(all).toContain('severity');
      expect(all).toContain('status');
      expect(all).toContain('description');
      expect(all).toContain('transaction_ids');
      expect(all).toContain('total_amount_usd');
      expect(all).toContain('pattern_details');
    });

    it('includes investigation columns', () => {
      const all = joined(sqls);
      expect(all).toContain('assigned_to');
      expect(all).toContain('investigated_at');
      expect(all).toContain('investigation_notes');
      expect(all).toContain('resolved_at');
      expect(all).toContain('resolution_notes');
    });

    it('creates the aml_transaction_checks table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE aml_transaction_checks');
    });

    it('includes transaction check columns', () => {
      const all = joined(sqls);
      expect(all).toContain('transaction_id');
      expect(all).toContain('amount_usd');
      expect(all).toContain('transaction_type');
      expect(all).toContain('is_suspicious');
      expect(all).toContain('risk_score');
      expect(all).toContain('rules_triggered');
    });

    it('references institutions, users, and aml_alerts tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
      expect(all).toContain('REFERENCES aml_alerts(id)');
    });

    it('creates indexes on aml_alerts', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_aml_alerts_status');
      expect(all).toContain('idx_aml_alerts_alert_type');
      expect(all).toContain('idx_aml_alerts_severity');
      expect(all).toContain('idx_aml_alerts_institution_id');
      expect(all).toContain('idx_aml_alerts_created_at');
    });

    it('creates indexes on aml_transaction_checks', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_aml_transaction_checks_transaction_id');
      expect(all).toContain('idx_aml_transaction_checks_institution_id');
      expect(all).toContain('idx_aml_transaction_checks_alert_id');
    });
  });

  describe('down', () => {
    it('drops both tables and all three enum types', () => {
      const sqls = captureSql(migration0020.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS aml_transaction_checks');
      expect(all).toContain('DROP TABLE IF EXISTS aml_alerts');
      expect(all).toContain('DROP TYPE IF EXISTS aml_alert_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS aml_alert_severity_enum');
      expect(all).toContain('DROP TYPE IF EXISTS aml_alert_type_enum');
    });

    it('drops transaction_checks before alerts (order matters)', () => {
      const sqls = captureSql(migration0020.down);
      const checksIdx = sqls.findIndex((s) => s.includes('aml_transaction_checks'));
      const alertsIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS aml_alerts'));
      expect(checksIdx).toBeLessThan(alertsIdx);
    });

    it('drops tables before types (order matters)', () => {
      const sqls = captureSql(migration0020.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS aml_alerts'));
      const statusIdx = sqls.findIndex((s) => s.includes('aml_alert_status_enum'));
      const typeIdx = sqls.findIndex((s) => s.includes('aml_alert_type_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(statusIdx).toBeLessThan(typeIdx);
    });
  });
});

// ─── Migration 0021: kyc_documents_expiry ─────────────────────────────────────

describe('Migration 0021: kyc_documents_expiry', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0021.up); });

    it('adds document_expiry_date column to kyc_documents', () => {
      const all = joined(sqls);
      expect(all).toContain('ALTER TABLE kyc_documents ADD COLUMN document_expiry_date');
    });

    it('creates partial index on document_expiry_date', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_kyc_documents_expiry');
      expect(all).toContain('WHERE document_expiry_date IS NOT NULL');
    });

    it('creates composite index on institution_id, status', () => {
      expect(joined(sqls)).toContain('idx_kyc_documents_institution_status');
    });

    it('creates composite index on user_id, status', () => {
      expect(joined(sqls)).toContain('idx_kyc_documents_user_status');
    });

    it('creates 4 SQL statements', () => {
      expect(sqls).toHaveLength(4);
    });
  });

  describe('down', () => {
    it('drops indexes and column in correct order', () => {
      const sqls = captureSql(migration0021.down);
      const all = joined(sqls);
      expect(all).toContain('DROP INDEX IF EXISTS idx_kyc_documents_user_status');
      expect(all).toContain('DROP INDEX IF EXISTS idx_kyc_documents_institution_status');
      expect(all).toContain('DROP INDEX IF EXISTS idx_kyc_documents_expiry');
      expect(all).toContain('ALTER TABLE kyc_documents DROP COLUMN IF EXISTS document_expiry_date');
    });

    it('drops column last (after indexes)', () => {
      const sqls = captureSql(migration0021.down);
      const lastIdx = sqls.length - 1;
      expect(sqls[lastIdx]).toContain('DROP COLUMN');
    });
  });
});

// ─── Migration 0022: pep_checks ───────────────────────────────────────────────

describe('Migration 0022: pep_checks', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0022.up); });

    it('creates the pep_category_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE pep_category_enum');
      expect(all).toContain('government_official');
      expect(all).toContain('military');
      expect(all).toContain('state_corp_executive');
      expect(all).toContain('political_party_official');
      expect(all).toContain('family_member');
      expect(all).toContain('close_associate');
    });

    it('creates the pep_check_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE pep_check_status_enum');
      expect(all).toContain('clear');
      expect(all).toContain('pep_identified');
      expect(all).toContain('edd_required');
      expect(all).toContain('edd_completed');
      expect(all).toContain('edd_failed');
    });

    it('creates the pep_checks table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE pep_checks');
    });

    it('includes core PEP check columns', () => {
      const all = joined(sqls);
      expect(all).toContain('beneficial_owner_id');
      expect(all).toContain('individual_name');
      expect(all).toContain('date_of_birth');
      expect(all).toContain('nationality');
      expect(all).toContain('is_pep');
      expect(all).toContain('pep_category');
      expect(all).toContain('pep_details');
      expect(all).toContain('risk_level');
    });

    it('includes EDD columns', () => {
      const all = joined(sqls);
      expect(all).toContain('edd_required');
      expect(all).toContain('edd_completed_at');
      expect(all).toContain('edd_notes');
    });

    it('includes review columns', () => {
      const all = joined(sqls);
      expect(all).toContain('checked_by');
      expect(all).toContain('reviewed_by');
      expect(all).toContain('reviewed_at');
      expect(all).toContain('review_notes');
    });

    it('references beneficial_owners, institutions, and users tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES beneficial_owners(id)');
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_pep_checks_beneficial_owner_id');
      expect(all).toContain('idx_pep_checks_institution_id');
      expect(all).toContain('idx_pep_checks_status');
      expect(all).toContain('idx_pep_checks_is_pep');
      expect(all).toContain('idx_pep_checks_individual_name');
      expect(all).toContain('idx_pep_checks_created_at');
    });

    it('creates enums before table (order matters)', () => {
      const categoryIdx = sqls.findIndex((s) => s.includes('pep_category_enum'));
      const statusIdx = sqls.findIndex((s) => s.includes('pep_check_status_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE pep_checks'));
      expect(categoryIdx).toBeLessThan(tableIdx);
      expect(statusIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and both enum types', () => {
      const sqls = captureSql(migration0022.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS pep_checks');
      expect(all).toContain('DROP TYPE IF EXISTS pep_check_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS pep_category_enum');
    });

    it('drops table before types (order matters)', () => {
      const sqls = captureSql(migration0022.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS pep_checks'));
      const statusIdx = sqls.findIndex((s) => s.includes('pep_check_status_enum'));
      const categoryIdx = sqls.findIndex((s) => s.includes('pep_category_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(tableIdx).toBeLessThan(categoryIdx);
    });
  });
});

// ─── Migration 0023: sar_reports ──────────────────────────────────────────────

describe('Migration 0023: sar_reports', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0023.up); });

    it('creates the sar_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE sar_status_enum');
      expect(all).toContain('draft');
      expect(all).toContain('pending_review');
      expect(all).toContain('approved');
      expect(all).toContain('filed');
      expect(all).toContain('rejected');
    });

    it('creates the sar_trigger_type_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE sar_trigger_type_enum');
      expect(all).toContain('aml_alert');
      expect(all).toContain('sanctions_match');
      expect(all).toContain('pep_edd_failed');
      expect(all).toContain('manual');
      expect(all).toContain('threshold_exceeded');
    });

    it('creates the sar_reports table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE sar_reports');
    });

    it('includes core SAR columns', () => {
      const all = joined(sqls);
      expect(all).toContain('subject_type');
      expect(all).toContain('subject_id');
      expect(all).toContain('subject_name');
      expect(all).toContain('trigger_type');
      expect(all).toContain('trigger_reference_id');
      expect(all).toContain('narrative');
      expect(all).toContain('supporting_data');
    });

    it('includes financial columns', () => {
      const all = joined(sqls);
      expect(all).toContain('suspicious_amount_usd');
      expect(all).toContain('activity_start_date');
      expect(all).toContain('activity_end_date');
    });

    it('includes review and filing columns', () => {
      const all = joined(sqls);
      expect(all).toContain('reviewed_by');
      expect(all).toContain('reviewed_at');
      expect(all).toContain('review_notes');
      expect(all).toContain('filed_at');
      expect(all).toContain('filing_reference');
      expect(all).toContain('filing_confirmation');
    });

    it('references institutions and users tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_sar_reports_status');
      expect(all).toContain('idx_sar_reports_institution_id');
      expect(all).toContain('idx_sar_reports_trigger_type');
      expect(all).toContain('idx_sar_reports_subject');
      expect(all).toContain('idx_sar_reports_created_at');
      expect(all).toContain('idx_sar_reports_filed_at');
    });

    it('creates partial index on filed_at', () => {
      const all = joined(sqls);
      expect(all).toContain('WHERE filed_at IS NOT NULL');
    });

    it('creates enums before table (order matters)', () => {
      const statusIdx = sqls.findIndex((s) => s.includes('sar_status_enum'));
      const triggerIdx = sqls.findIndex((s) => s.includes('sar_trigger_type_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE sar_reports'));
      expect(statusIdx).toBeLessThan(tableIdx);
      expect(triggerIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and both enum types', () => {
      const sqls = captureSql(migration0023.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS sar_reports');
      expect(all).toContain('DROP TYPE IF EXISTS sar_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS sar_trigger_type_enum');
    });

    it('drops table before types (order matters)', () => {
      const sqls = captureSql(migration0023.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS sar_reports'));
      const statusIdx = sqls.findIndex((s) => s.includes('sar_status_enum'));
      const triggerIdx = sqls.findIndex((s) => s.includes('sar_trigger_type_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(tableIdx).toBeLessThan(triggerIdx);
    });
  });
});

// ─── Migration 0024: rfq_requests ─────────────────────────────────────────────

describe('Migration 0024: rfq_requests', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0024.up); });

    it('creates the rfq_side_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE rfq_side_enum AS ENUM');
      expect(all).toContain('buy');
      expect(all).toContain('sell');
    });

    it('creates the rfq_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE rfq_status_enum AS ENUM');
      expect(all).toContain('open');
      expect(all).toContain('quoted');
      expect(all).toContain('accepted');
      expect(all).toContain('expired');
      expect(all).toContain('cancelled');
    });

    it('creates the rfq_requests table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE rfq_requests');
    });

    it('includes core RFQ columns', () => {
      const all = joined(sqls);
      expect(all).toContain('asset_id');
      expect(all).toContain('requester_institution_id');
      expect(all).toContain('requester_user_id');
      expect(all).toContain('side');
      expect(all).toContain('quantity');
      expect(all).toContain('status');
      expect(all).toContain('expires_at');
    });

    it('includes cancellation columns', () => {
      const all = joined(sqls);
      expect(all).toContain('cancelled_at');
      expect(all).toContain('cancellation_reason');
    });

    it('references assets, institutions, and users tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES assets(id)');
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_rfq_requests_asset_id');
      expect(all).toContain('idx_rfq_requests_requester_institution');
      expect(all).toContain('idx_rfq_requests_status');
      expect(all).toContain('idx_rfq_requests_expires_at');
      expect(all).toContain('idx_rfq_requests_created_at');
    });

    it('creates partial index on expires_at for open RFQs', () => {
      const all = joined(sqls);
      expect(all).toContain("WHERE status = 'open'");
    });

    it('creates enums before table (order matters)', () => {
      const sideIdx = sqls.findIndex((s) => s.includes('rfq_side_enum'));
      const statusIdx = sqls.findIndex((s) => s.includes('rfq_status_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE rfq_requests'));
      expect(sideIdx).toBeLessThan(tableIdx);
      expect(statusIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and both enum types', () => {
      const sqls = captureSql(migration0024.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS rfq_requests');
      expect(all).toContain('DROP TYPE IF EXISTS rfq_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS rfq_side_enum');
    });

    it('drops table before types (order matters)', () => {
      const sqls = captureSql(migration0024.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS rfq_requests'));
      const statusIdx = sqls.findIndex((s) => s.includes('rfq_status_enum'));
      const sideIdx = sqls.findIndex((s) => s.includes('rfq_side_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(tableIdx).toBeLessThan(sideIdx);
    });
  });
});

// ─── Migration 0025: quotes ───────────────────────────────────────────────────

describe('Migration 0025: quotes', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0025.up); });

    it('creates the quote_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE quote_status_enum AS ENUM');
      expect(all).toContain('pending');
      expect(all).toContain('accepted');
      expect(all).toContain('rejected');
      expect(all).toContain('expired');
      expect(all).toContain('withdrawn');
    });

    it('creates the quotes table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE quotes');
    });

    it('includes core quote columns', () => {
      const all = joined(sqls);
      expect(all).toContain('rfq_id');
      expect(all).toContain('quoter_institution_id');
      expect(all).toContain('quoter_user_id');
      expect(all).toContain('price_per_unit');
      expect(all).toContain('quantity');
      expect(all).toContain('total_amount');
      expect(all).toContain('status');
      expect(all).toContain('expires_at');
    });

    it('includes lifecycle columns', () => {
      const all = joined(sqls);
      expect(all).toContain('accepted_at');
      expect(all).toContain('withdrawn_at');
    });

    it('references rfq_requests, institutions, and users tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES rfq_requests(id)');
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_quotes_rfq_id');
      expect(all).toContain('idx_quotes_quoter_institution');
      expect(all).toContain('idx_quotes_status');
      expect(all).toContain('idx_quotes_expires_at');
      expect(all).toContain('idx_quotes_created_at');
    });

    it('creates partial index on expires_at for pending quotes', () => {
      const all = joined(sqls);
      expect(all).toContain("WHERE status = 'pending'");
    });

    it('creates enum before table (order matters)', () => {
      const enumIdx = sqls.findIndex((s) => s.includes('quote_status_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE quotes'));
      expect(enumIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and enum type', () => {
      const sqls = captureSql(migration0025.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS quotes');
      expect(all).toContain('DROP TYPE IF EXISTS quote_status_enum');
    });

    it('drops table before type (order matters)', () => {
      const sqls = captureSql(migration0025.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS quotes'));
      const typeIdx = sqls.findIndex((s) => s.includes('quote_status_enum'));
      expect(tableIdx).toBeLessThan(typeIdx);
    });
  });
});

// ─── Migration 0026: trades ───────────────────────────────────────────────────

describe('Migration 0026: trades', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0026.up); });

    it('creates the trade_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE trade_status_enum AS ENUM');
      expect(all).toContain('pending_settlement');
      expect(all).toContain('settled');
      expect(all).toContain('failed');
    });

    it('creates the trades table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE trades');
    });

    it('includes core trade columns', () => {
      const all = joined(sqls);
      expect(all).toContain('rfq_id');
      expect(all).toContain('quote_id');
      expect(all).toContain('asset_id');
      expect(all).toContain('buyer_institution_id');
      expect(all).toContain('seller_institution_id');
      expect(all).toContain('buyer_user_id');
      expect(all).toContain('seller_user_id');
      expect(all).toContain('quantity');
      expect(all).toContain('price_per_unit');
      expect(all).toContain('total_amount');
    });

    it('includes fee columns', () => {
      const all = joined(sqls);
      expect(all).toContain('maker_fee');
      expect(all).toContain('taker_fee');
      expect(all).toContain('platform_fee');
    });

    it('includes settlement columns', () => {
      const all = joined(sqls);
      expect(all).toContain('settlement_tx_hash');
      expect(all).toContain('settled_at');
      expect(all).toContain('failed_at');
      expect(all).toContain('failure_reason');
    });

    it('has UNIQUE constraint on quote_id', () => {
      expect(joined(sqls)).toContain('UNIQUE');
    });

    it('references rfq_requests, quotes, assets, institutions, and users tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES rfq_requests(id)');
      expect(all).toContain('REFERENCES quotes(id)');
      expect(all).toContain('REFERENCES assets(id)');
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_trades_rfq_id');
      expect(all).toContain('idx_trades_asset_id');
      expect(all).toContain('idx_trades_buyer_institution');
      expect(all).toContain('idx_trades_seller_institution');
      expect(all).toContain('idx_trades_status');
      expect(all).toContain('idx_trades_created_at');
      expect(all).toContain('idx_trades_settled_at');
    });

    it('creates partial index on settled_at', () => {
      expect(joined(sqls)).toContain('WHERE settled_at IS NOT NULL');
    });

    it('creates enum before table (order matters)', () => {
      const enumIdx = sqls.findIndex((s) => s.includes('trade_status_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE trades'));
      expect(enumIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and enum type', () => {
      const sqls = captureSql(migration0026.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS trades');
      expect(all).toContain('DROP TYPE IF EXISTS trade_status_enum');
    });

    it('drops table before type (order matters)', () => {
      const sqls = captureSql(migration0026.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS trades'));
      const typeIdx = sqls.findIndex((s) => s.includes('trade_status_enum'));
      expect(tableIdx).toBeLessThan(typeIdx);
    });
  });
});

// ─── Migration 0027: order_book_entries ────────────────────────────────────────

describe('Migration 0027: order_book_entries', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0027.up); });

    it('creates the order_side_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE order_side_enum AS ENUM');
      expect(all).toContain('bid');
      expect(all).toContain('ask');
    });

    it('creates the order_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE order_status_enum AS ENUM');
      expect(all).toContain('open');
      expect(all).toContain('filled');
      expect(all).toContain('partially_filled');
      expect(all).toContain('cancelled');
      expect(all).toContain('expired');
    });

    it('creates the order_book_entries table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE order_book_entries');
    });

    it('includes core order columns', () => {
      const all = joined(sqls);
      expect(all).toContain('asset_id');
      expect(all).toContain('institution_id');
      expect(all).toContain('user_id');
      expect(all).toContain('side');
      expect(all).toContain('price');
      expect(all).toContain('quantity');
      expect(all).toContain('filled_quantity');
      expect(all).toContain('status');
      expect(all).toContain('expires_at');
    });

    it('references assets, institutions, and users tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES assets(id)');
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_order_book_asset_id');
      expect(all).toContain('idx_order_book_status');
      expect(all).toContain('idx_order_book_side_price');
      expect(all).toContain('idx_order_book_created_at');
    });

    it('creates composite index on asset_id, side, price', () => {
      expect(joined(sqls)).toContain('order_book_entries(asset_id, side, price)');
    });

    it('creates enums before table (order matters)', () => {
      const sideEnumIdx = sqls.findIndex((s) => s.includes('order_side_enum'));
      const statusEnumIdx = sqls.findIndex((s) => s.includes('order_status_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE order_book_entries'));
      expect(sideEnumIdx).toBeLessThan(tableIdx);
      expect(statusEnumIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and both enum types', () => {
      const sqls = captureSql(migration0027.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS order_book_entries');
      expect(all).toContain('DROP TYPE IF EXISTS order_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS order_side_enum');
    });

    it('drops table before types (order matters)', () => {
      const sqls = captureSql(migration0027.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS order_book_entries'));
      const statusIdx = sqls.findIndex((s) => s.includes('order_status_enum'));
      const sideIdx = sqls.findIndex((s) => s.includes('order_side_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(tableIdx).toBeLessThan(sideIdx);
    });
  });
});

// ─── Migration 0028: ledger_tables ────────────────────────────────────────────

describe('Migration 0028: ledger_tables', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0028.up); });

    it('creates the account_category_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE account_category_enum AS ENUM');
      expect(all).toContain('asset');
      expect(all).toContain('liability');
      expect(all).toContain('revenue');
      expect(all).toContain('expense');
    });

    it('creates the journal_entry_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE journal_entry_status_enum AS ENUM');
      expect(all).toContain('pending');
      expect(all).toContain('posted');
      expect(all).toContain('reversed');
    });

    it('creates the gl_accounts table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE gl_accounts');
    });

    it('creates the journal_entries table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE journal_entries');
    });

    it('creates the journal_entry_lines table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE journal_entry_lines');
    });

    it('includes core gl_accounts columns', () => {
      const all = joined(sqls);
      expect(all).toContain('code');
      expect(all).toContain('name');
      expect(all).toContain('category');
      expect(all).toContain('is_active');
      expect(all).toContain('parent_account_id');
    });

    it('includes core journal_entries columns', () => {
      const all = joined(sqls);
      expect(all).toContain('reference_type');
      expect(all).toContain('reference_id');
      expect(all).toContain('status');
      expect(all).toContain('posted_at');
      expect(all).toContain('reversed_at');
      expect(all).toContain('reversal_of_id');
      expect(all).toContain('created_by');
    });

    it('includes core journal_entry_lines columns', () => {
      const all = joined(sqls);
      expect(all).toContain('journal_entry_id');
      expect(all).toContain('account_id');
      expect(all).toContain('debit_amount');
      expect(all).toContain('credit_amount');
    });

    it('references users table from journal_entries', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES users(id)');
    });

    it('references gl_accounts from journal_entry_lines', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES gl_accounts(id)');
    });

    it('references journal_entries from journal_entry_lines', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES journal_entries(id)');
    });

    it('includes check constraint for debit/credit exclusivity', () => {
      const all = joined(sqls);
      expect(all).toContain('chk_debit_or_credit');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_gl_accounts_category');
      expect(all).toContain('idx_gl_accounts_code');
      expect(all).toContain('idx_journal_entries_reference');
      expect(all).toContain('idx_journal_entries_status');
      expect(all).toContain('idx_journal_entry_lines_entry');
      expect(all).toContain('idx_journal_entry_lines_account');
    });

    it('seeds default chart of accounts', () => {
      const all = joined(sqls);
      expect(all).toContain("'1000'");
      expect(all).toContain("'Cash'");
      expect(all).toContain("'3000'");
      expect(all).toContain("'Trading Revenue'");
      expect(all).toContain("'4000'");
      expect(all).toContain("'Operating Expenses'");
    });

    it('creates enums before tables (order matters)', () => {
      const categoryEnumIdx = sqls.findIndex((s) => s.includes('account_category_enum'));
      const statusEnumIdx = sqls.findIndex((s) => s.includes('journal_entry_status_enum'));
      const glTableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE gl_accounts'));
      const jeTableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE journal_entries'));
      expect(categoryEnumIdx).toBeLessThan(glTableIdx);
      expect(statusEnumIdx).toBeLessThan(jeTableIdx);
    });
  });

  describe('down', () => {
    it('drops all tables and enum types', () => {
      const sqls = captureSql(migration0028.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS journal_entry_lines');
      expect(all).toContain('DROP TABLE IF EXISTS journal_entries');
      expect(all).toContain('DROP TABLE IF EXISTS gl_accounts');
      expect(all).toContain('DROP TYPE IF EXISTS journal_entry_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS account_category_enum');
    });

    it('drops tables before types (order matters)', () => {
      const sqls = captureSql(migration0028.down);
      const linesIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS journal_entry_lines'));
      const entriesIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS journal_entries'));
      const glIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS gl_accounts'));
      const statusIdx = sqls.findIndex((s) => s.includes('journal_entry_status_enum'));
      const categoryIdx = sqls.findIndex((s) => s.includes('account_category_enum'));
      expect(linesIdx).toBeLessThan(entriesIdx);
      expect(entriesIdx).toBeLessThan(glIdx);
      expect(glIdx).toBeLessThan(statusIdx);
      expect(glIdx).toBeLessThan(categoryIdx);
    });
  });
});

// ─── Migration 0029: reconciliation_runs ──────────────────────────────────────

describe('Migration 0029: reconciliation_runs', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0029.up); });

    it('creates the reconciliation_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE reconciliation_status_enum AS ENUM');
      expect(all).toContain('passed');
      expect(all).toContain('failed');
      expect(all).toContain('warning');
    });

    it('creates the reconciliation_runs table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE reconciliation_runs');
    });

    it('includes core reconciliation columns', () => {
      const all = joined(sqls);
      expect(all).toContain('run_type');
      expect(all).toContain('status');
      expect(all).toContain('total_accounts');
      expect(all).toContain('total_debits');
      expect(all).toContain('total_credits');
      expect(all).toContain('variance_count');
      expect(all).toContain('variances');
      expect(all).toContain('tolerance');
      expect(all).toContain('started_at');
      expect(all).toContain('completed_at');
    });

    it('uses JSONB for variances', () => {
      const all = joined(sqls);
      expect(all).toContain('JSONB');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_reconciliation_runs_status');
      expect(all).toContain('idx_reconciliation_runs_run_type');
      expect(all).toContain('idx_reconciliation_runs_created_at');
    });

    it('creates enum before table (order matters)', () => {
      const enumIdx = sqls.findIndex((s) => s.includes('reconciliation_status_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE reconciliation_runs'));
      expect(enumIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and enum type', () => {
      const sqls = captureSql(migration0029.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS reconciliation_runs');
      expect(all).toContain('DROP TYPE IF EXISTS reconciliation_status_enum');
    });

    it('drops table before type (order matters)', () => {
      const sqls = captureSql(migration0029.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS reconciliation_runs'));
      const enumIdx = sqls.findIndex((s) => s.includes('reconciliation_status_enum'));
      expect(tableIdx).toBeLessThan(enumIdx);
    });
  });
});

// ─── Migration 0030: deposits ─────────────────────────────────────────────────

describe('Migration 0030: deposits', () => {
  describe('up', () => {
    let sqls: string[];
    beforeEach(() => { sqls = captureSql(migration0030.up); });

    it('creates the deposit_method_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE deposit_method_enum AS ENUM');
      expect(all).toContain('card');
      expect(all).toContain('wire');
      expect(all).toContain('ach');
    });

    it('creates the deposit_status_enum type', () => {
      const all = joined(sqls);
      expect(all).toContain('CREATE TYPE deposit_status_enum AS ENUM');
      expect(all).toContain('pending');
      expect(all).toContain('processing');
      expect(all).toContain('completed');
      expect(all).toContain('failed');
      expect(all).toContain('cancelled');
    });

    it('creates the deposits table', () => {
      expect(joined(sqls)).toContain('CREATE TABLE deposits');
    });

    it('includes core deposit columns', () => {
      const all = joined(sqls);
      expect(all).toContain('institution_id');
      expect(all).toContain('user_id');
      expect(all).toContain('method');
      expect(all).toContain('status');
      expect(all).toContain('amount');
      expect(all).toContain('currency');
      expect(all).toContain('external_reference');
      expect(all).toContain('stripe_payment_intent');
      expect(all).toContain('description');
      expect(all).toContain('journal_entry_id');
      expect(all).toContain('failure_reason');
    });

    it('includes lifecycle columns', () => {
      const all = joined(sqls);
      expect(all).toContain('completed_at');
      expect(all).toContain('failed_at');
    });

    it('references institutions, users, and journal_entries tables', () => {
      const all = joined(sqls);
      expect(all).toContain('REFERENCES institutions(id)');
      expect(all).toContain('REFERENCES users(id)');
      expect(all).toContain('REFERENCES journal_entries(id)');
    });

    it('includes check constraint for positive amount', () => {
      expect(joined(sqls)).toContain('chk_deposit_amount_positive');
    });

    it('creates indexes', () => {
      const all = joined(sqls);
      expect(all).toContain('idx_deposits_institution_id');
      expect(all).toContain('idx_deposits_user_id');
      expect(all).toContain('idx_deposits_status');
      expect(all).toContain('idx_deposits_method');
      expect(all).toContain('idx_deposits_created_at');
      expect(all).toContain('idx_deposits_completed_at');
      expect(all).toContain('idx_deposits_external_reference');
    });

    it('creates partial index on completed_at', () => {
      expect(joined(sqls)).toContain('WHERE completed_at IS NOT NULL');
    });

    it('creates partial index on external_reference', () => {
      expect(joined(sqls)).toContain('WHERE external_reference IS NOT NULL');
    });

    it('creates enums before table (order matters)', () => {
      const methodIdx = sqls.findIndex((s) => s.includes('deposit_method_enum'));
      const statusIdx = sqls.findIndex((s) => s.includes('deposit_status_enum'));
      const tableIdx = sqls.findIndex((s) => s.includes('CREATE TABLE deposits'));
      expect(methodIdx).toBeLessThan(tableIdx);
      expect(statusIdx).toBeLessThan(tableIdx);
    });
  });

  describe('down', () => {
    it('drops table and both enum types', () => {
      const sqls = captureSql(migration0030.down);
      const all = joined(sqls);
      expect(all).toContain('DROP TABLE IF EXISTS deposits');
      expect(all).toContain('DROP TYPE IF EXISTS deposit_status_enum');
      expect(all).toContain('DROP TYPE IF EXISTS deposit_method_enum');
    });

    it('drops table before types (order matters)', () => {
      const sqls = captureSql(migration0030.down);
      const tableIdx = sqls.findIndex((s) => s.includes('DROP TABLE IF EXISTS deposits'));
      const statusIdx = sqls.findIndex((s) => s.includes('deposit_status_enum'));
      const methodIdx = sqls.findIndex((s) => s.includes('deposit_method_enum'));
      expect(tableIdx).toBeLessThan(statusIdx);
      expect(tableIdx).toBeLessThan(methodIdx);
    });
  });
});
