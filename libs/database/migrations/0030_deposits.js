/**
 * Migration 0030: Deposits
 * Tracks deposit transactions (Stripe card, wire transfer, ACH) with status lifecycle.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE deposit_method_enum AS ENUM ('card', 'wire', 'ach')
  `);

  pgm.sql(`
    CREATE TYPE deposit_status_enum AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled')
  `);

  pgm.sql(`
    CREATE TABLE deposits (
      id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id        UUID           NOT NULL REFERENCES institutions(id),
      user_id               UUID           NOT NULL REFERENCES users(id),
      method                deposit_method_enum NOT NULL,
      status                deposit_status_enum NOT NULL DEFAULT 'pending',
      amount                NUMERIC(20,2)  NOT NULL,
      currency              VARCHAR(3)     NOT NULL DEFAULT 'USD',
      external_reference    VARCHAR(255),
      stripe_payment_intent VARCHAR(255),
      description           TEXT,
      journal_entry_id      UUID           REFERENCES journal_entries(id),
      failure_reason        TEXT,
      completed_at          TIMESTAMPTZ,
      failed_at             TIMESTAMPTZ,
      created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_deposit_amount_positive CHECK (amount > 0)
    )
  `);

  pgm.sql('CREATE INDEX idx_deposits_institution_id ON deposits(institution_id)');
  pgm.sql('CREATE INDEX idx_deposits_user_id ON deposits(user_id)');
  pgm.sql('CREATE INDEX idx_deposits_status ON deposits(status)');
  pgm.sql('CREATE INDEX idx_deposits_method ON deposits(method)');
  pgm.sql('CREATE INDEX idx_deposits_created_at ON deposits(created_at)');
  pgm.sql("CREATE INDEX idx_deposits_completed_at ON deposits(completed_at) WHERE completed_at IS NOT NULL");
  pgm.sql('CREATE INDEX idx_deposits_external_reference ON deposits(external_reference) WHERE external_reference IS NOT NULL');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS deposits');
  pgm.sql('DROP TYPE IF EXISTS deposit_status_enum');
  pgm.sql('DROP TYPE IF EXISTS deposit_method_enum');
};
