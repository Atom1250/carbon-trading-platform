/**
 * Migration 0011: Login Attempts Table
 * Tracks all login attempts for brute force protection and security monitoring.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE login_attempts (
      id              UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      email           VARCHAR(255) NOT NULL,
      ip_address      INET         NOT NULL,
      user_agent      TEXT,
      success         BOOLEAN      NOT NULL DEFAULT FALSE,
      failure_reason  VARCHAR(100),
      attempted_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_login_attempts_email         ON login_attempts(email)');
  pgm.sql('CREATE INDEX idx_login_attempts_ip            ON login_attempts(ip_address)');
  pgm.sql('CREATE INDEX idx_login_attempts_attempted_at  ON login_attempts(attempted_at)');
  pgm.sql(`
    CREATE INDEX idx_login_attempts_email_attempted
      ON login_attempts(email, attempted_at)
      WHERE success = FALSE
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS login_attempts');
};
