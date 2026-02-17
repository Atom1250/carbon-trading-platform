/**
 * Migration 0020: AML Alerts & Transaction Checks
 * Stores AML monitoring alerts and individual transaction checks.
 * Supports investigation and resolution workflow.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE aml_alert_type_enum AS ENUM (
      'structuring', 'layering', 'rapid_trading', 'large_volume', 'round_amounts', 'velocity_anomaly'
    )
  `);

  pgm.sql(`
    CREATE TYPE aml_alert_severity_enum AS ENUM ('low', 'medium', 'high', 'critical')
  `);

  pgm.sql(`
    CREATE TYPE aml_alert_status_enum AS ENUM (
      'open', 'under_investigation', 'escalated', 'resolved_suspicious', 'resolved_legitimate'
    )
  `);

  pgm.sql(`
    CREATE TABLE aml_alerts (
      id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      alert_type          aml_alert_type_enum NOT NULL,
      severity            aml_alert_severity_enum NOT NULL DEFAULT 'medium',
      status              aml_alert_status_enum NOT NULL DEFAULT 'open',
      institution_id      UUID        REFERENCES institutions(id),
      user_id             UUID        REFERENCES users(id),
      description         TEXT        NOT NULL,
      transaction_ids     UUID[]      NOT NULL DEFAULT '{}',
      total_amount_usd    NUMERIC(20,2),
      pattern_details     JSONB       NOT NULL DEFAULT '{}',
      assigned_to         UUID        REFERENCES users(id),
      investigated_at     TIMESTAMPTZ,
      investigation_notes TEXT,
      resolved_at         TIMESTAMPTZ,
      resolution_notes    TEXT,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql(`
    CREATE TABLE aml_transaction_checks (
      id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      transaction_id      UUID        NOT NULL,
      institution_id      UUID        REFERENCES institutions(id),
      user_id             UUID        REFERENCES users(id),
      amount_usd          NUMERIC(20,2) NOT NULL,
      transaction_type    VARCHAR(50) NOT NULL,
      counterparty_id     UUID,
      is_suspicious       BOOLEAN     NOT NULL DEFAULT FALSE,
      risk_score          NUMERIC(5,2) NOT NULL DEFAULT 0,
      rules_triggered     TEXT[]      NOT NULL DEFAULT '{}',
      alert_id            UUID        REFERENCES aml_alerts(id),
      checked_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_aml_alerts_status ON aml_alerts(status)');
  pgm.sql('CREATE INDEX idx_aml_alerts_alert_type ON aml_alerts(alert_type)');
  pgm.sql('CREATE INDEX idx_aml_alerts_severity ON aml_alerts(severity)');
  pgm.sql('CREATE INDEX idx_aml_alerts_institution_id ON aml_alerts(institution_id)');
  pgm.sql('CREATE INDEX idx_aml_alerts_created_at ON aml_alerts(created_at)');
  pgm.sql('CREATE INDEX idx_aml_transaction_checks_transaction_id ON aml_transaction_checks(transaction_id)');
  pgm.sql('CREATE INDEX idx_aml_transaction_checks_institution_id ON aml_transaction_checks(institution_id)');
  pgm.sql('CREATE INDEX idx_aml_transaction_checks_alert_id ON aml_transaction_checks(alert_id)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS aml_transaction_checks');
  pgm.sql('DROP TABLE IF EXISTS aml_alerts');
  pgm.sql('DROP TYPE IF EXISTS aml_alert_status_enum');
  pgm.sql('DROP TYPE IF EXISTS aml_alert_severity_enum');
  pgm.sql('DROP TYPE IF EXISTS aml_alert_type_enum');
};
