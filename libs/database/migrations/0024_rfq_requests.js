/**
 * Migration 0024: RFQ Requests Table
 * Stores Request-for-Quote entries for carbon credit trading.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE rfq_side_enum AS ENUM ('buy', 'sell')
  `);

  pgm.sql(`
    CREATE TYPE rfq_status_enum AS ENUM (
      'open', 'quoted', 'accepted', 'expired', 'cancelled'
    )
  `);

  pgm.sql(`
    CREATE TABLE rfq_requests (
      id                       UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      asset_id                 UUID           NOT NULL REFERENCES assets(id),
      requester_institution_id UUID           NOT NULL REFERENCES institutions(id),
      requester_user_id        UUID           NOT NULL REFERENCES users(id),
      side                     rfq_side_enum  NOT NULL,
      quantity                 NUMERIC(20,8)  NOT NULL,
      status                   rfq_status_enum NOT NULL DEFAULT 'open',
      expires_at               TIMESTAMPTZ    NOT NULL,
      cancelled_at             TIMESTAMPTZ,
      cancellation_reason      TEXT,
      created_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at               TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_rfq_requests_asset_id ON rfq_requests(asset_id)');
  pgm.sql('CREATE INDEX idx_rfq_requests_requester_institution ON rfq_requests(requester_institution_id)');
  pgm.sql('CREATE INDEX idx_rfq_requests_status ON rfq_requests(status)');
  pgm.sql("CREATE INDEX idx_rfq_requests_expires_at ON rfq_requests(expires_at) WHERE status = 'open'");
  pgm.sql('CREATE INDEX idx_rfq_requests_created_at ON rfq_requests(created_at)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS rfq_requests');
  pgm.sql('DROP TYPE IF EXISTS rfq_status_enum');
  pgm.sql('DROP TYPE IF EXISTS rfq_side_enum');
};
