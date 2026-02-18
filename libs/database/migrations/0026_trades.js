/**
 * Migration 0026: Trades Table
 * Stores executed trades from accepted quotes with settlement and fee tracking.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE trade_status_enum AS ENUM (
      'pending_settlement', 'settled', 'failed'
    )
  `);

  pgm.sql(`
    CREATE TABLE trades (
      id                      UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      rfq_id                  UUID           NOT NULL REFERENCES rfq_requests(id),
      quote_id                UUID           NOT NULL UNIQUE REFERENCES quotes(id),
      asset_id                UUID           NOT NULL REFERENCES assets(id),
      buyer_institution_id    UUID           NOT NULL REFERENCES institutions(id),
      seller_institution_id   UUID           NOT NULL REFERENCES institutions(id),
      buyer_user_id           UUID           NOT NULL REFERENCES users(id),
      seller_user_id          UUID           NOT NULL REFERENCES users(id),
      quantity                NUMERIC(20,8)  NOT NULL,
      price_per_unit          NUMERIC(20,8)  NOT NULL,
      total_amount            NUMERIC(20,2)  NOT NULL,
      maker_fee               NUMERIC(20,2)  NOT NULL DEFAULT 0,
      taker_fee               NUMERIC(20,2)  NOT NULL DEFAULT 0,
      platform_fee            NUMERIC(20,2)  NOT NULL DEFAULT 0,
      status                  trade_status_enum NOT NULL DEFAULT 'pending_settlement',
      settlement_tx_hash      VARCHAR(66),
      settled_at              TIMESTAMPTZ,
      failed_at               TIMESTAMPTZ,
      failure_reason          TEXT,
      created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_trades_rfq_id ON trades(rfq_id)');
  pgm.sql('CREATE INDEX idx_trades_asset_id ON trades(asset_id)');
  pgm.sql('CREATE INDEX idx_trades_buyer_institution ON trades(buyer_institution_id)');
  pgm.sql('CREATE INDEX idx_trades_seller_institution ON trades(seller_institution_id)');
  pgm.sql('CREATE INDEX idx_trades_status ON trades(status)');
  pgm.sql('CREATE INDEX idx_trades_created_at ON trades(created_at)');
  pgm.sql('CREATE INDEX idx_trades_settled_at ON trades(settled_at) WHERE settled_at IS NOT NULL');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS trades');
  pgm.sql('DROP TYPE IF EXISTS trade_status_enum');
};
