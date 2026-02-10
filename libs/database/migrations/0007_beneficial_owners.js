/**
 * Migration 0007: Beneficial Owners Table
 * Stores beneficial ownership for KYB compliance.
 * Required per PROJECT_CONTEXT: legal name, registration number, beneficial owners.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE beneficial_owners (
      id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id       UUID        NOT NULL REFERENCES institutions(id),
      first_name           VARCHAR(100) NOT NULL,
      last_name            VARCHAR(100) NOT NULL,
      date_of_birth        DATE,
      nationality          CHAR(2),
      ownership_percentage NUMERIC(5, 2) NOT NULL
        CONSTRAINT beneficial_owners_percentage_check CHECK (
          ownership_percentage > 0 AND ownership_percentage <= 100
        ),
      is_pep               BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql(
    'CREATE INDEX idx_beneficial_owners_institution_id ON beneficial_owners(institution_id)',
  );
  pgm.sql('CREATE INDEX idx_beneficial_owners_is_pep ON beneficial_owners(is_pep)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS beneficial_owners');
};
