/**
 * Migration 0032: Bank Reconciliation
 * Supports importing external bank statements and matching transactions
 * against internal deposits/withdrawals for automated reconciliation.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE bank_recon_status_enum AS ENUM ('pending', 'in_progress', 'completed', 'failed')
  `);

  pgm.sql(`
    CREATE TYPE bank_entry_match_status_enum AS ENUM ('unmatched', 'matched', 'disputed', 'resolved')
  `);

  pgm.sql(`
    CREATE TABLE bank_statements (
      id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id    UUID           NOT NULL REFERENCES institutions(id),
      bank_name         VARCHAR(255)   NOT NULL,
      account_number    VARCHAR(50)    NOT NULL,
      statement_date    DATE           NOT NULL,
      opening_balance   NUMERIC(20,2)  NOT NULL,
      closing_balance   NUMERIC(20,2)  NOT NULL,
      entry_count       INTEGER        NOT NULL DEFAULT 0,
      imported_by       UUID           NOT NULL REFERENCES users(id),
      file_name         VARCHAR(255),
      created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql(`
    CREATE TABLE bank_statement_entries (
      id                     UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      statement_id           UUID           NOT NULL REFERENCES bank_statements(id),
      transaction_date       DATE           NOT NULL,
      description            TEXT           NOT NULL,
      reference              VARCHAR(255),
      debit_amount           NUMERIC(20,2)  NOT NULL DEFAULT 0,
      credit_amount          NUMERIC(20,2)  NOT NULL DEFAULT 0,
      balance                NUMERIC(20,2),
      match_status           bank_entry_match_status_enum NOT NULL DEFAULT 'unmatched',
      matched_deposit_id     UUID           REFERENCES deposits(id),
      matched_withdrawal_id  UUID           REFERENCES withdrawals(id),
      match_confidence       NUMERIC(5,2),
      dispute_reason         TEXT,
      resolved_at            TIMESTAMPTZ,
      created_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at             TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_entry_amounts CHECK (debit_amount >= 0 AND credit_amount >= 0),
      CONSTRAINT chk_entry_one_direction CHECK (NOT (debit_amount > 0 AND credit_amount > 0))
    )
  `);

  pgm.sql(`
    CREATE TABLE bank_reconciliation_runs (
      id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      institution_id    UUID           NOT NULL REFERENCES institutions(id),
      statement_id      UUID           NOT NULL REFERENCES bank_statements(id),
      status            bank_recon_status_enum NOT NULL DEFAULT 'pending',
      total_entries     INTEGER        NOT NULL DEFAULT 0,
      matched_count     INTEGER        NOT NULL DEFAULT 0,
      unmatched_count   INTEGER        NOT NULL DEFAULT 0,
      disputed_count    INTEGER        NOT NULL DEFAULT 0,
      match_rate        NUMERIC(5,2),
      total_variance    NUMERIC(20,2)  NOT NULL DEFAULT 0,
      started_at        TIMESTAMPTZ,
      completed_at      TIMESTAMPTZ,
      run_by            UUID           REFERENCES users(id),
      created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_bank_statements_institution_id ON bank_statements(institution_id)');
  pgm.sql('CREATE INDEX idx_bank_statements_statement_date ON bank_statements(statement_date)');
  pgm.sql('CREATE INDEX idx_bank_statements_created_at ON bank_statements(created_at)');
  pgm.sql('CREATE INDEX idx_bank_statement_entries_statement_id ON bank_statement_entries(statement_id)');
  pgm.sql('CREATE INDEX idx_bank_statement_entries_match_status ON bank_statement_entries(match_status)');
  pgm.sql('CREATE INDEX idx_bank_statement_entries_transaction_date ON bank_statement_entries(transaction_date)');
  pgm.sql("CREATE INDEX idx_bank_statement_entries_unmatched ON bank_statement_entries(statement_id) WHERE match_status = 'unmatched'");
  pgm.sql('CREATE INDEX idx_bank_reconciliation_runs_institution_id ON bank_reconciliation_runs(institution_id)');
  pgm.sql('CREATE INDEX idx_bank_reconciliation_runs_statement_id ON bank_reconciliation_runs(statement_id)');
  pgm.sql('CREATE INDEX idx_bank_reconciliation_runs_status ON bank_reconciliation_runs(status)');
  pgm.sql('CREATE INDEX idx_bank_reconciliation_runs_created_at ON bank_reconciliation_runs(created_at)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS bank_reconciliation_runs');
  pgm.sql('DROP TABLE IF EXISTS bank_statement_entries');
  pgm.sql('DROP TABLE IF EXISTS bank_statements');
  pgm.sql('DROP TYPE IF EXISTS bank_entry_match_status_enum');
  pgm.sql('DROP TYPE IF EXISTS bank_recon_status_enum');
};
