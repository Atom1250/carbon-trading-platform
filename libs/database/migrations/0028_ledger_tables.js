/**
 * Migration 0028: Ledger Tables
 * Double-entry accounting ledger with chart of accounts, journal entries,
 * and entry lines for tracking all cash movements.
 */

exports.up = (pgm) => {
  // ─── Enums ───────────────────────────────────────────────────────────────────

  pgm.sql(`
    CREATE TYPE account_category_enum AS ENUM ('asset', 'liability', 'revenue', 'expense')
  `);

  pgm.sql(`
    CREATE TYPE journal_entry_status_enum AS ENUM ('pending', 'posted', 'reversed')
  `);

  // ─── Chart of Accounts ───────────────────────────────────────────────────────

  pgm.sql(`
    CREATE TABLE gl_accounts (
      id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      code              VARCHAR(20)    NOT NULL UNIQUE,
      name              VARCHAR(200)   NOT NULL,
      category          account_category_enum NOT NULL,
      description       TEXT,
      is_active         BOOLEAN        NOT NULL DEFAULT true,
      parent_account_id UUID           REFERENCES gl_accounts(id),
      created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_gl_accounts_category ON gl_accounts(category)');
  pgm.sql('CREATE INDEX idx_gl_accounts_code ON gl_accounts(code)');
  pgm.sql('CREATE INDEX idx_gl_accounts_parent ON gl_accounts(parent_account_id) WHERE parent_account_id IS NOT NULL');

  // ─── Journal Entries ─────────────────────────────────────────────────────────

  pgm.sql(`
    CREATE TABLE journal_entries (
      id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      reference_type    VARCHAR(50)    NOT NULL,
      reference_id      UUID           NOT NULL,
      description       TEXT           NOT NULL,
      status            journal_entry_status_enum NOT NULL DEFAULT 'pending',
      posted_at         TIMESTAMPTZ,
      reversed_at       TIMESTAMPTZ,
      reversal_of_id    UUID           REFERENCES journal_entries(id),
      created_by        UUID           NOT NULL REFERENCES users(id),
      created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW()
    )
  `);

  pgm.sql('CREATE INDEX idx_journal_entries_reference ON journal_entries(reference_type, reference_id)');
  pgm.sql('CREATE INDEX idx_journal_entries_status ON journal_entries(status)');
  pgm.sql('CREATE INDEX idx_journal_entries_created_at ON journal_entries(created_at)');
  pgm.sql('CREATE INDEX idx_journal_entries_posted_at ON journal_entries(posted_at) WHERE posted_at IS NOT NULL');
  pgm.sql('CREATE INDEX idx_journal_entries_reversal ON journal_entries(reversal_of_id) WHERE reversal_of_id IS NOT NULL');

  // ─── Journal Entry Lines ─────────────────────────────────────────────────────

  pgm.sql(`
    CREATE TABLE journal_entry_lines (
      id                UUID           PRIMARY KEY DEFAULT uuid_generate_v4(),
      journal_entry_id  UUID           NOT NULL REFERENCES journal_entries(id) ON DELETE CASCADE,
      account_id        UUID           NOT NULL REFERENCES gl_accounts(id),
      debit_amount      NUMERIC(20,2)  NOT NULL DEFAULT 0,
      credit_amount     NUMERIC(20,2)  NOT NULL DEFAULT 0,
      description       TEXT,
      created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
      CONSTRAINT chk_debit_or_credit CHECK (
        (debit_amount > 0 AND credit_amount = 0) OR
        (debit_amount = 0 AND credit_amount > 0)
      )
    )
  `);

  pgm.sql('CREATE INDEX idx_journal_entry_lines_entry ON journal_entry_lines(journal_entry_id)');
  pgm.sql('CREATE INDEX idx_journal_entry_lines_account ON journal_entry_lines(account_id)');

  // ─── Seed Default Chart of Accounts ──────────────────────────────────────────

  pgm.sql(`
    INSERT INTO gl_accounts (code, name, category, description) VALUES
      ('1000', 'Cash',                       'asset',     'Cash and cash equivalents'),
      ('1100', 'Accounts Receivable',        'asset',     'Amounts owed by customers'),
      ('1200', 'Carbon Credit Inventory',    'asset',     'Carbon credits held for trading'),
      ('1300', 'Platform Escrow',            'asset',     'Funds held in escrow for settlement'),
      ('2000', 'Accounts Payable',           'liability', 'Amounts owed to vendors'),
      ('2100', 'Client Deposits',            'liability', 'Customer deposit balances'),
      ('2200', 'Settlement Payable',         'liability', 'Pending settlement obligations'),
      ('3000', 'Trading Revenue',            'revenue',   'Revenue from trading commissions'),
      ('3100', 'Platform Fee Revenue',       'revenue',   'Revenue from platform fees'),
      ('3200', 'Withdrawal Fee Revenue',     'revenue',   'Revenue from withdrawal fees'),
      ('4000', 'Operating Expenses',         'expense',   'General operating costs'),
      ('4100', 'Payment Processing Fees',    'expense',   'Third-party payment processing costs'),
      ('4200', 'Settlement Costs',           'expense',   'Costs associated with trade settlement')
  `);
};

exports.down = (pgm) => {
  pgm.sql('DROP TABLE IF EXISTS journal_entry_lines');
  pgm.sql('DROP TABLE IF EXISTS journal_entries');
  pgm.sql('DROP TABLE IF EXISTS gl_accounts');
  pgm.sql('DROP TYPE IF EXISTS journal_entry_status_enum');
  pgm.sql('DROP TYPE IF EXISTS account_category_enum');
};
