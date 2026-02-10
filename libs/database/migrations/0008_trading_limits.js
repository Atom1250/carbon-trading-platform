/**
 * Migration 0008: Trading Limits Table
 * Per-institution daily and per-trade limits derived from PROJECT_CONTEXT:
 *   Tier 1: Unlimited
 *   Tier 2: $5,000,000/day
 *   Tier 3: $500,000/day
 *   Tier 4: $50,000/day
 *   All tiers: min $1,000 / max $10,000,000 per trade
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE trading_limits (
      id                    UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id        UUID         NOT NULL UNIQUE REFERENCES institutions(id),
      daily_limit_usd       NUMERIC(20, 2) NOT NULL,
      single_trade_min_usd  NUMERIC(20, 2) NOT NULL DEFAULT 1000.00,
      single_trade_max_usd  NUMERIC(20, 2) NOT NULL DEFAULT 10000000.00,
      created_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql(
    'CREATE INDEX idx_trading_limits_institution_id ON trading_limits(institution_id)',
  );
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS trading_limits');
};
