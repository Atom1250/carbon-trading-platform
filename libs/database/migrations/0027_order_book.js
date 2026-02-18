/**
 * Migration 0027: Order Book Entries Table
 * Framework for order book aggregation (read-only in Phase 1).
 * Supports bid/ask entries with price levels for future limit order matching.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE order_side_enum AS ENUM ('bid', 'ask')
  `);

  pgm.sql(`
    CREATE TYPE order_status_enum AS ENUM (
      'open', 'filled', 'partially_filled', 'cancelled', 'expired'
    )
  `);

  pgm.sql(`
    CREATE TABLE order_book_entries (
      id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      asset_id              UUID           NOT NULL REFERENCES assets(id),
      institution_id        UUID           NOT NULL REFERENCES institutions(id),
      user_id               UUID           NOT NULL REFERENCES users(id),
      side                  order_side_enum NOT NULL,
      price                 NUMERIC(20,8)  NOT NULL,
      quantity              NUMERIC(20,8)  NOT NULL,
      filled_quantity       NUMERIC(20,8)  NOT NULL DEFAULT 0,
      status                order_status_enum NOT NULL DEFAULT 'open',
      expires_at            TIMESTAMPTZ,
      created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_order_book_asset_id ON order_book_entries(asset_id)');
  pgm.sql('CREATE INDEX idx_order_book_status ON order_book_entries(status)');
  pgm.sql('CREATE INDEX idx_order_book_side_price ON order_book_entries(asset_id, side, price)');
  pgm.sql('CREATE INDEX idx_order_book_created_at ON order_book_entries(created_at)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS order_book_entries');
  pgm.sql('DROP TYPE IF EXISTS order_status_enum');
  pgm.sql('DROP TYPE IF EXISTS order_side_enum');
};
