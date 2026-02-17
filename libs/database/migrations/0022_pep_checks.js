/**
 * Migration 0022: PEP Checks Table
 * Stores Politically Exposed Person check results with enhanced due diligence workflow.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE pep_category_enum AS ENUM (
      'government_official', 'military', 'state_corp_executive',
      'political_party_official', 'family_member', 'close_associate'
    )
  `);

  pgm.sql(`
    CREATE TYPE pep_check_status_enum AS ENUM (
      'clear', 'pep_identified', 'edd_required', 'edd_completed', 'edd_failed'
    )
  `);

  pgm.sql(`
    CREATE TABLE pep_checks (
      id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      beneficial_owner_id  UUID        REFERENCES beneficial_owners(id),
      individual_name      VARCHAR(500) NOT NULL,
      date_of_birth        DATE,
      nationality          CHAR(2),
      institution_id       UUID        REFERENCES institutions(id),
      status               pep_check_status_enum NOT NULL DEFAULT 'clear',
      is_pep               BOOLEAN     NOT NULL DEFAULT FALSE,
      pep_category         pep_category_enum,
      pep_details          JSONB,
      risk_level           VARCHAR(20),
      checked_by           UUID        REFERENCES users(id),
      reviewed_by          UUID        REFERENCES users(id),
      reviewed_at          TIMESTAMPTZ,
      review_notes         TEXT,
      edd_required         BOOLEAN     NOT NULL DEFAULT FALSE,
      edd_completed_at     TIMESTAMPTZ,
      edd_notes            TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_pep_checks_beneficial_owner_id ON pep_checks(beneficial_owner_id)');
  pgm.sql('CREATE INDEX idx_pep_checks_institution_id ON pep_checks(institution_id)');
  pgm.sql('CREATE INDEX idx_pep_checks_status ON pep_checks(status)');
  pgm.sql('CREATE INDEX idx_pep_checks_is_pep ON pep_checks(is_pep)');
  pgm.sql('CREATE INDEX idx_pep_checks_individual_name ON pep_checks(individual_name)');
  pgm.sql('CREATE INDEX idx_pep_checks_created_at ON pep_checks(created_at)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS pep_checks');
  pgm.sql('DROP TYPE IF EXISTS pep_check_status_enum');
  pgm.sql('DROP TYPE IF EXISTS pep_category_enum');
};
