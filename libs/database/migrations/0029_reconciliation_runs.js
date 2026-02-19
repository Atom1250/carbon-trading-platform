/**
 * Migration 0029: Reconciliation Runs
 * Stores daily reconciliation results for audit trail and variance tracking.
 */

exports.up = (pgm) => {
  pgm.sql(`
    CREATE TYPE reconciliation_status_enum AS ENUM ('passed', 'failed', 'warning')
  `);

  pgm.sql(`
    CREATE TABLE reconciliation_runs (
      id               UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      run_type         VARCHAR(50)    NOT NULL DEFAULT 'daily',
      status           reconciliation_status_enum NOT NULL,
      total_accounts   INT            NOT NULL DEFAULT 0,
      total_debits     NUMERIC(20,2)  NOT NULL DEFAULT 0,
      total_credits    NUMERIC(20,2)  NOT NULL DEFAULT 0,
      variance_count   INT            NOT NULL DEFAULT 0,
      variances        JSONB,
      tolerance        NUMERIC(10,2)  NOT NULL DEFAULT 0.01,
      started_at       TIMESTAMPTZ    NOT NULL,
      completed_at     TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      created_at       TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_reconciliation_runs_status ON reconciliation_runs(status)');
  pgm.sql('CREATE INDEX idx_reconciliation_runs_run_type ON reconciliation_runs(run_type)');
  pgm.sql('CREATE INDEX idx_reconciliation_runs_created_at ON reconciliation_runs(created_at)');
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS reconciliation_runs');
  pgm.sql('DROP TYPE IF EXISTS reconciliation_status_enum');
};
