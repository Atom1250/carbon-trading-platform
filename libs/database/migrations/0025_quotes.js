/**
 * Migration 0025: Quotes Table
 * Stores quotes submitted against RFQ requests for carbon credit trading.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE quote_status_enum AS ENUM (
      'pending', 'accepted', 'rejected', 'expired', 'withdrawn'
    )
  `);

  pgm.sql(`
    CREATE TABLE quotes (
      id                      UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      rfq_id                  UUID           NOT NULL REFERENCES rfq_requests(id),
      quoter_institution_id   UUID           NOT NULL REFERENCES institutions(id),
      quoter_user_id          UUID           NOT NULL REFERENCES users(id),
      price_per_unit          NUMERIC(20,8)  NOT NULL,
      quantity                NUMERIC(20,8)  NOT NULL,
      total_amount            NUMERIC(20,2)  NOT NULL,
      status                  quote_status_enum NOT NULL DEFAULT 'pending',
      expires_at              TIMESTAMPTZ    NOT NULL,
      accepted_at             TIMESTAMPTZ,
      withdrawn_at            TIMESTAMPTZ,
      created_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at              TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_quotes_rfq_id ON quotes(rfq_id)');
  pgm.sql('CREATE INDEX idx_quotes_quoter_institution ON quotes(quoter_institution_id)');
  pgm.sql('CREATE INDEX idx_quotes_status ON quotes(status)');
  pgm.sql("CREATE INDEX idx_quotes_expires_at ON quotes(expires_at) WHERE status = 'pending'");
  pgm.sql('CREATE INDEX idx_quotes_created_at ON quotes(created_at)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS quotes');
  pgm.sql('DROP TYPE IF EXISTS quote_status_enum');
};
