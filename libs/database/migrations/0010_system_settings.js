/**
 * Migration 0010: System Settings Table
 * Key-value store for platform-wide configuration.
 * Pre-seeded with fee rates and trade limits from PROJECT_CONTEXT business rules.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE system_settings (
      id          UUID         PRIMARY KEY DEFAULT uuid_generate_v4(),
      key         VARCHAR(100) NOT NULL UNIQUE,
      value       TEXT         NOT NULL,
      description TEXT,
      updated_by  UUID         REFERENCES users(id),
      created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
      updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_system_settings_key ON system_settings(key)');

  // Seed initial business rules from PROJECT_CONTEXT.md
  pgm.sql(`
    INSERT INTO system_settings (key, value, description) VALUES
      ('platform_fee_rate',       '0.0025',    'Platform fee rate — 0.25% per trade total'),
      ('maker_fee_rate',          '0.00125',   'Maker fee rate — 0.125%'),
      ('taker_fee_rate',          '0.00125',   'Taker fee rate — 0.125%'),
      ('min_trade_usd',           '1000',      'Minimum trade size in USD'),
      ('max_trade_usd',           '10000000',  'Maximum trade size per transaction in USD'),
      ('quote_validity_minutes',  '5',         'Quote validity period in minutes'),
      ('settlement_type',         'T+0',       'Settlement timing — same day'),
      ('daily_limit_tier1_usd',   'unlimited', 'Daily trading limit for Tier 1 institutions'),
      ('daily_limit_tier2_usd',   '5000000',   'Daily trading limit for Tier 2 institutions'),
      ('daily_limit_tier3_usd',   '500000',    'Daily trading limit for Tier 3 institutions'),
      ('daily_limit_tier4_usd',   '50000',     'Daily trading limit for Tier 4 institutions')
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS system_settings');
};
