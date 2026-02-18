/**
 * Migration 0023: SAR Reports Table
 * Stores Suspicious Activity Reports with review and filing workflow.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE sar_status_enum AS ENUM (
      'draft', 'pending_review', 'approved', 'filed', 'rejected'
    )
  `);

  pgm.sql(`
    CREATE TYPE sar_trigger_type_enum AS ENUM (
      'aml_alert', 'sanctions_match', 'pep_edd_failed', 'manual', 'threshold_exceeded'
    )
  `);

  pgm.sql(`
    CREATE TABLE sar_reports (
      id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id        UUID        REFERENCES institutions(id),
      subject_type          VARCHAR(50) NOT NULL,
      subject_id            UUID        NOT NULL,
      subject_name          VARCHAR(500) NOT NULL,
      trigger_type          sar_trigger_type_enum NOT NULL,
      trigger_reference_id  UUID,
      status                sar_status_enum NOT NULL DEFAULT 'draft',
      suspicious_amount_usd NUMERIC(20,2),
      activity_start_date   DATE,
      activity_end_date     DATE,
      narrative             TEXT        NOT NULL,
      supporting_data       JSONB       NOT NULL DEFAULT '{}',
      generated_by          UUID        REFERENCES users(id),
      reviewed_by           UUID        REFERENCES users(id),
      reviewed_at           TIMESTAMPTZ,
      review_notes          TEXT,
      filed_at              TIMESTAMPTZ,
      filing_reference      VARCHAR(200),
      filing_confirmation   JSONB,
      created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_sar_reports_status ON sar_reports(status)');
  pgm.sql('CREATE INDEX idx_sar_reports_institution_id ON sar_reports(institution_id)');
  pgm.sql('CREATE INDEX idx_sar_reports_trigger_type ON sar_reports(trigger_type)');
  pgm.sql('CREATE INDEX idx_sar_reports_subject ON sar_reports(subject_type, subject_id)');
  pgm.sql('CREATE INDEX idx_sar_reports_created_at ON sar_reports(created_at)');
  pgm.sql('CREATE INDEX idx_sar_reports_filed_at ON sar_reports(filed_at) WHERE filed_at IS NOT NULL');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS sar_reports');
  pgm.sql('DROP TYPE IF EXISTS sar_status_enum');
  pgm.sql('DROP TYPE IF EXISTS sar_trigger_type_enum');
};
