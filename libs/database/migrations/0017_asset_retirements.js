/**
 * Migration 0017: Asset Retirements Table
 * Tracks carbon credit retirements (burns) with amounts and on-chain tx hashes.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TABLE asset_retirements (
      id                  UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      asset_id            UUID           NOT NULL REFERENCES assets(id),
      amount              NUMERIC(20, 8) NOT NULL,
      retired_by_user_id  UUID           NOT NULL REFERENCES users(id),
      reason              TEXT,
      transaction_hash    VARCHAR(66)    NOT NULL,
      created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_asset_retirements_asset_id ON asset_retirements(asset_id)');
  pgm.sql('CREATE INDEX idx_asset_retirements_user_id ON asset_retirements(retired_by_user_id)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS asset_retirements');
};
