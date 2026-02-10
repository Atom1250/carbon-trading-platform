/**
 * Migration 0002: Institutions Table
 * Stores institutional clients (KYB-verified organisations).
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE institution_status_enum AS ENUM (
      'pending', 'active', 'suspended', 'closed'
    )
  `);

  pgm.sql(`
    CREATE TYPE institution_tier_enum AS ENUM (
      'tier1', 'tier2', 'tier3', 'tier4'
    )
  `);

  pgm.sql(`
    CREATE TABLE institutions (
      id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      name                VARCHAR(255) NOT NULL,
      legal_name          VARCHAR(255) NOT NULL,
      registration_number VARCHAR(100),
      tier                institution_tier_enum   NOT NULL DEFAULT 'tier4',
      status              institution_status_enum NOT NULL DEFAULT 'pending',
      country_code        CHAR(2) NOT NULL,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_institutions_status ON institutions(status)');
  pgm.sql('CREATE INDEX idx_institutions_tier   ON institutions(tier)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS institutions');
  pgm.sql('DROP TYPE IF EXISTS institution_tier_enum');
  pgm.sql('DROP TYPE IF EXISTS institution_status_enum');
};
