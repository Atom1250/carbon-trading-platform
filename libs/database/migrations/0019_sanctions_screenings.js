/**
 * Migration 0019: Sanctions Screenings Tables
 * Stores screening results and individual matches against sanctions lists.
 * Supports review workflow for potential matches.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE screening_entity_type_enum AS ENUM ('individual', 'organization')
  `);

  pgm.sql(`
    CREATE TYPE screening_status_enum AS ENUM ('clear', 'potential_match', 'confirmed_match', 'false_positive')
  `);

  pgm.sql(`
    CREATE TABLE sanctions_screenings (
      id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      entity_type          screening_entity_type_enum NOT NULL,
      entity_name          VARCHAR(500) NOT NULL,
      entity_country       CHAR(2),
      entity_date_of_birth DATE,
      entity_identifiers   JSONB,
      institution_id       UUID        REFERENCES institutions(id),
      user_id              UUID        REFERENCES users(id),
      status               screening_status_enum NOT NULL DEFAULT 'clear',
      match_count          INTEGER     NOT NULL DEFAULT 0,
      highest_score        NUMERIC(5,2) NOT NULL DEFAULT 0,
      screened_by          UUID        REFERENCES users(id),
      reviewed_by          UUID        REFERENCES users(id),
      reviewed_at          TIMESTAMPTZ,
      review_notes         TEXT,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql(`
    CREATE TABLE sanctions_screening_matches (
      id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      screening_id         UUID        NOT NULL REFERENCES sanctions_screenings(id),
      list_name            VARCHAR(200) NOT NULL,
      list_entry_id        VARCHAR(200),
      matched_name         VARCHAR(500) NOT NULL,
      match_score          NUMERIC(5,2) NOT NULL,
      match_details        JSONB,
      created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_sanctions_screenings_status ON sanctions_screenings(status)');
  pgm.sql('CREATE INDEX idx_sanctions_screenings_entity_name ON sanctions_screenings(entity_name)');
  pgm.sql('CREATE INDEX idx_sanctions_screenings_institution_id ON sanctions_screenings(institution_id)');
  pgm.sql('CREATE INDEX idx_sanctions_screenings_created_at ON sanctions_screenings(created_at)');
  pgm.sql('CREATE INDEX idx_sanctions_screening_matches_screening_id ON sanctions_screening_matches(screening_id)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS sanctions_screening_matches');
  pgm.sql('DROP TABLE IF EXISTS sanctions_screenings');
  pgm.sql('DROP TYPE IF EXISTS screening_status_enum');
  pgm.sql('DROP TYPE IF EXISTS screening_entity_type_enum');
};
