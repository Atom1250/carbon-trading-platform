/**
 * Migration 0018: Asset Search & Discovery Indexes
 * Adds composite and partial indexes for efficient asset filtering, sorting, and discovery.
 */

exports.up = (pgm) => {
  pgm.sql('CREATE INDEX idx_assets_vintage ON assets(vintage) WHERE vintage IS NOT NULL');
  pgm.sql('CREATE INDEX idx_assets_geography ON assets(geography) WHERE geography IS NOT NULL');
  pgm.sql('CREATE INDEX idx_assets_standard ON assets(standard) WHERE standard IS NOT NULL');
  pgm.sql('CREATE INDEX idx_assets_available_supply ON assets(available_supply)');
  pgm.sql('CREATE INDEX idx_assets_created_at_desc ON assets(created_at DESC)');
  pgm.sql('CREATE INDEX idx_assets_total_supply_desc ON assets(total_supply DESC)');
  pgm.sql('CREATE INDEX idx_assets_type_status_created ON assets(asset_type, status, created_at DESC)');
};

exports.down = (pgm) => {
  pgm.sql('DROP INDEX IF EXISTS idx_assets_type_status_created');
  pgm.sql('DROP INDEX IF EXISTS idx_assets_total_supply_desc');
  pgm.sql('DROP INDEX IF EXISTS idx_assets_created_at_desc');
  pgm.sql('DROP INDEX IF EXISTS idx_assets_available_supply');
  pgm.sql('DROP INDEX IF EXISTS idx_assets_standard');
  pgm.sql('DROP INDEX IF EXISTS idx_assets_geography');
  pgm.sql('DROP INDEX IF EXISTS idx_assets_vintage');
};
