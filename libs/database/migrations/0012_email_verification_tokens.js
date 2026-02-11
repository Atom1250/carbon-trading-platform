/**
 * Migration 0012: Email Verification Tokens
 * Stores tokens for email verification during user registration.
 * Enforces one active (unused) token per user via a unique partial index.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE email_verification_tokens (
      id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       VARCHAR(255) NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ  NOT NULL,
      used_at     TIMESTAMPTZ,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_email_verification_user_id    ON email_verification_tokens(user_id)');
  pgm.sql('CREATE INDEX idx_email_verification_token      ON email_verification_tokens(token)');
  pgm.sql('CREATE INDEX idx_email_verification_expires_at ON email_verification_tokens(expires_at)');

  // Enforce only one unused token per user at a time
  pgm.sql(`
    CREATE UNIQUE INDEX idx_email_verification_one_per_user
      ON email_verification_tokens(user_id)
      WHERE used_at IS NULL
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS email_verification_tokens');
};
