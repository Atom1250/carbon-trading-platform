/**
 * Migration 0001: PostgreSQL Extensions
 */

exports.up = (pgm) => {
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
  pgm.sql('CREATE EXTENSION IF NOT EXISTS "pg_trgm"');
};

exports.down = () => {
  // Extensions are not dropped to avoid breaking other databases
};
