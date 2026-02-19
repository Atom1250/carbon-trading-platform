/**
 * Migration 0031: Withdrawals
 * Tracks withdrawal transactions (wire, ACH) with approval workflow for large amounts.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE withdrawal_method_enum AS ENUM ('wire', 'ach')
  `);

  pgm.sql(`
    CREATE TYPE withdrawal_status_enum AS ENUM ('pending_approval', 'approved', 'processing', 'completed', 'failed', 'rejected')
  `);

  pgm.sql(`
    CREATE TABLE withdrawals (
      id                    UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id        UUID           NOT NULL REFERENCES institutions(id),
      user_id               UUID           NOT NULL REFERENCES users(id),
      method                withdrawal_method_enum NOT NULL,
      status                withdrawal_status_enum NOT NULL DEFAULT 'pending_approval',
      amount                NUMERIC(20,2)  NOT NULL,
      fee_amount            NUMERIC(20,2)  NOT NULL DEFAULT 0,
      net_amount            NUMERIC(20,2)  NOT NULL,
      currency              VARCHAR(3)     NOT NULL DEFAULT 'USD',
      external_reference    VARCHAR(255),
      description           TEXT,
      journal_entry_id      UUID           REFERENCES journal_entries(id),
      fee_journal_entry_id  UUID           REFERENCES journal_entries(id),
      requires_approval     BOOLEAN        NOT NULL DEFAULT FALSE,
      approved_by           UUID           REFERENCES users(id),
      approved_at           TIMESTAMPTZ,
      rejected_by           UUID           REFERENCES users(id),
      rejected_at           TIMESTAMPTZ,
      rejection_reason      TEXT,
      failure_reason        TEXT,
      completed_at          TIMESTAMPTZ,
      failed_at             TIMESTAMPTZ,
      created_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at            TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_withdrawal_amount_positive CHECK (amount > 0),
      CONSTRAINT chk_withdrawal_net_positive CHECK (net_amount >= 0)
    )
  `);

  pgm.sql('CREATE INDEX idx_withdrawals_institution_id ON withdrawals(institution_id)');
  pgm.sql('CREATE INDEX idx_withdrawals_user_id ON withdrawals(user_id)');
  pgm.sql('CREATE INDEX idx_withdrawals_status ON withdrawals(status)');
  pgm.sql('CREATE INDEX idx_withdrawals_method ON withdrawals(method)');
  pgm.sql('CREATE INDEX idx_withdrawals_created_at ON withdrawals(created_at)');
  pgm.sql("CREATE INDEX idx_withdrawals_completed_at ON withdrawals(completed_at) WHERE completed_at IS NOT NULL");
  pgm.sql("CREATE INDEX idx_withdrawals_requires_approval ON withdrawals(requires_approval) WHERE status = 'pending_approval'");
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS withdrawals');
  pgm.sql('DROP TYPE IF EXISTS withdrawal_status_enum');
  pgm.sql('DROP TYPE IF EXISTS withdrawal_method_enum');
};
