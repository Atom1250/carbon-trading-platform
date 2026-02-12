/**
 * Migration 0015: Assets Table
 * Carbon credits and loan portions managed by institutional clients.
 * Statuses: draft → pending_verification → verified → minted → suspended
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE asset_type_enum AS ENUM ('carbon_credit', 'loan_portion')
  `);

  pgm.sql(`
    CREATE TYPE asset_status_enum AS ENUM (
      'draft', 'pending_verification', 'verified', 'minted', 'suspended'
    )
  `);

  pgm.sql(`
    CREATE TABLE assets (
      id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id    UUID           NOT NULL REFERENCES institutions(id),
      asset_type        asset_type_enum NOT NULL,
      name              VARCHAR(255)   NOT NULL,
      description       TEXT,
      status            asset_status_enum NOT NULL DEFAULT 'draft',
      token_id          VARCHAR(78),
      minting_tx_hash   VARCHAR(66),
      minted_at         TIMESTAMPTZ,
      vintage           INTEGER,
      standard          VARCHAR(100),
      geography         VARCHAR(100),
      metadata_uri      VARCHAR(500),
      total_supply      NUMERIC(20, 8) NOT NULL,
      available_supply  NUMERIC(20, 8) NOT NULL,
      retired_supply    NUMERIC(20, 8) NOT NULL DEFAULT 0,
      created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_assets_institution_id ON assets(institution_id)');
  pgm.sql('CREATE INDEX idx_assets_asset_type ON assets(asset_type)');
  pgm.sql('CREATE INDEX idx_assets_status ON assets(status)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS assets');
  pgm.sql('DROP TYPE IF EXISTS asset_status_enum');
  pgm.sql('DROP TYPE IF EXISTS asset_type_enum');
};
