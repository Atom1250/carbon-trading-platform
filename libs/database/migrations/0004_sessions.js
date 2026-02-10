/**
 * Migration 0004: Sessions Table
 * Stores JWT refresh tokens.
 * Access tokens (15 min) are stateless; refresh tokens (7 days) are stored here.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE sessions (
      id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id             UUID        NOT NULL REFERENCES users(id),
      refresh_token_hash  VARCHAR(255) NOT NULL UNIQUE,
      expires_at          TIMESTAMPTZ NOT NULL,
      ip_address          INET,
      user_agent          TEXT,
      is_revoked          BOOLEAN     NOT NULL DEFAULT FALSE,
      created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_sessions_user_id            ON sessions(user_id)');
  pgm.sql('CREATE INDEX idx_sessions_refresh_token_hash ON sessions(refresh_token_hash)');
  pgm.sql('CREATE INDEX idx_sessions_expires_at         ON sessions(expires_at)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS sessions');
};
