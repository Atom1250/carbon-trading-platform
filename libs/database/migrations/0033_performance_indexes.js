/**
 * Migration 0033: Performance indexes for high-frequency query paths.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_order_book_entries_asset_side_status_price
      ON order_book_entries(asset_id, side, status, price)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_quotes_rfq_status_price
      ON quotes(rfq_id, status, price_per_unit)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_trades_status_created_at
      ON trades(status, created_at DESC)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_deposits_status_created_at
      ON deposits(status, created_at DESC)
  `);

  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_withdrawals_status_created_at
      ON withdrawals(status, created_at DESC)
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_withdrawals_status_created_at');
  pgm.sql('DROP INDEX IF EXISTS idx_deposits_status_created_at');
  pgm.sql('DROP INDEX IF EXISTS idx_trades_status_created_at');
  pgm.sql('DROP INDEX IF EXISTS idx_quotes_rfq_status_price');
  pgm.sql('DROP INDEX IF EXISTS idx_order_book_entries_asset_side_status_price');
};
