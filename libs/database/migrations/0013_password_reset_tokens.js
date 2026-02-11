/**
 * Migration 0013: Password Reset Tokens
 * Stores tokens for the password reset flow.
 * A trigger limits each user to at most 3 active (unused, unexpired) tokens
 * to prevent abuse.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE password_reset_tokens (
      id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      user_id     UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      token       VARCHAR(255) NOT NULL UNIQUE,
      expires_at  TIMESTAMPTZ  NOT NULL,
      used_at     TIMESTAMPTZ,
      ip_address  INET,
      user_agent  TEXT,
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_password_reset_user_id   ON password_reset_tokens(user_id)');
  pgm.sql('CREATE INDEX idx_password_reset_token     ON password_reset_tokens(token)');
  pgm.sql('CREATE INDEX idx_password_reset_expires_at ON password_reset_tokens(expires_at)');
  pgm.sql(`
    CREATE INDEX idx_password_reset_unused
      ON password_reset_tokens(user_id, expires_at)
      WHERE used_at IS NULL
  `);

  // Trigger function: limit to 3 active tokens per user
  pgm.sql(`
    CREATE OR REPLACE FUNCTION check_password_reset_token_limit()
    RETURNS TRIGGER AS $$
    BEGIN
      IF (
        SELECT COUNT(*)
        FROM password_reset_tokens
        WHERE user_id = NEW.user_id
          AND used_at IS NULL
          AND expires_at > NOW()
      ) >= 3 THEN
        RAISE EXCEPTION 'User has reached maximum number of active password reset tokens';
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  pgm.sql(`
    CREATE TRIGGER enforce_password_reset_token_limit
      BEFORE INSERT ON password_reset_tokens
      FOR EACH ROW
      EXECUTE FUNCTION check_password_reset_token_limit()
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TRIGGER IF EXISTS enforce_password_reset_token_limit ON password_reset_tokens');
  pgm.sql('DROP FUNCTION IF EXISTS check_password_reset_token_limit()');
  pgm.sql('DROP TABLE IF EXISTS password_reset_tokens');
};
