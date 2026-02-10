/**
 * Migration 0005: API Keys Table
 * Programmatic access for Tier 1/2 institutions.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE api_key_status_enum AS ENUM ('active', 'revoked', 'expired')
  `);

  pgm.sql(`
    CREATE TABLE api_keys (
      id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id UUID        NOT NULL REFERENCES institutions(id),
      user_id        UUID        NOT NULL REFERENCES users(id),
      name           VARCHAR(100) NOT NULL,
      key_hash       VARCHAR(255) NOT NULL UNIQUE,
      key_prefix     VARCHAR(10)  NOT NULL,
      status         api_key_status_enum NOT NULL DEFAULT 'active',
      last_used_at   TIMESTAMPTZ,
      expires_at     TIMESTAMPTZ,
      created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_api_keys_institution_id ON api_keys(institution_id)');
  pgm.sql('CREATE INDEX idx_api_keys_user_id        ON api_keys(user_id)');
  pgm.sql('CREATE INDEX idx_api_keys_key_hash       ON api_keys(key_hash)');
  pgm.sql('CREATE INDEX idx_api_keys_status         ON api_keys(status)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS api_keys');
  pgm.sql('DROP TYPE IF EXISTS api_key_status_enum');
};
