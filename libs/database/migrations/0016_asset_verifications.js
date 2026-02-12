/**
 * Migration 0016: Asset Verifications Table
 * Tracks verification decisions (approved/rejected) for assets.
 * Supports the workflow: draft → pending_verification → verified/rejected.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE verification_decision_enum AS ENUM ('approved', 'rejected')
  `);

  pgm.sql(`
    CREATE TABLE asset_verifications (
      id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
      asset_id        UUID        NOT NULL REFERENCES assets(id),
      decision        verification_decision_enum NOT NULL,
      verified_by     UUID        NOT NULL REFERENCES users(id),
      notes           TEXT,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_asset_verifications_asset_id ON asset_verifications(asset_id)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS asset_verifications');
  pgm.sql('DROP TYPE IF EXISTS verification_decision_enum');
};
