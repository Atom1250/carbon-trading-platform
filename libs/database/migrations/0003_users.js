/**
 * Migration 0003: Users Table
 * Individual users belonging to an institution.
 * Roles: developer, investor, compliance_officer, operations
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE user_role_enum AS ENUM (
      'developer', 'investor', 'compliance_officer', 'operations'
    )
  `);

  pgm.sql(`
    CREATE TABLE users (
      id                   UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id       UUID         NOT NULL REFERENCES institutions(id),
      email                VARCHAR(255) NOT NULL UNIQUE,
      password_hash        VARCHAR(255) NOT NULL,
      first_name           VARCHAR(100) NOT NULL,
      last_name            VARCHAR(100) NOT NULL,
      role                 user_role_enum NOT NULL,
      is_active            BOOLEAN      NOT NULL DEFAULT TRUE,
      has_verified_email   BOOLEAN      NOT NULL DEFAULT FALSE,
      mfa_secret           VARCHAR(255),
      has_enabled_mfa      BOOLEAN      NOT NULL DEFAULT FALSE,
      created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_users_email          ON users(email)');
  pgm.sql('CREATE INDEX idx_users_institution_id ON users(institution_id)');
  pgm.sql('CREATE INDEX idx_users_role           ON users(role)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS users');
  pgm.sql('DROP TYPE IF EXISTS user_role_enum');
};
