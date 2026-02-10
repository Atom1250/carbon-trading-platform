/**
 * Migration 0009: Audit Logs Table
 * Immutable audit trail. Record-keeping for 7 years per AML requirements.
 * Covers: user actions, KYC events, trade events, asset events.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE audit_event_type_enum AS ENUM (
      'user_login',
      'user_logout',
      'user_created',
      'user_updated',
      'institution_created',
      'institution_updated',
      'institution_approved',
      'kyc_submitted',
      'kyc_approved',
      'kyc_rejected',
      'api_key_created',
      'api_key_revoked',
      'trade_created',
      'trade_settled',
      'trade_cancelled',
      'asset_listed',
      'asset_verified'
    )
  `);

  pgm.sql(`
    CREATE TABLE audit_logs (
      id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      event_type           audit_event_type_enum NOT NULL,
      actor_id             UUID        REFERENCES users(id),
      actor_institution_id UUID        REFERENCES institutions(id),
      target_type          VARCHAR(50),
      target_id            UUID,
      metadata             JSONB,
      ip_address           INET,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_audit_logs_actor_id    ON audit_logs(actor_id)');
  pgm.sql('CREATE INDEX idx_audit_logs_event_type  ON audit_logs(event_type)');
  pgm.sql('CREATE INDEX idx_audit_logs_created_at  ON audit_logs(created_at)');
  pgm.sql('CREATE INDEX idx_audit_logs_target       ON audit_logs(target_type, target_id)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS audit_logs');
  pgm.sql('DROP TYPE IF EXISTS audit_event_type_enum');
};
