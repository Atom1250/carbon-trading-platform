// ─── Chart of Accounts (Session 6.1) ─────────────────────────────────────────

export type AccountCategory = 'asset' | 'liability' | 'revenue' | 'expense';

export interface GLAccount {
  id: string;
  code: string;
  name: string;
  category: AccountCategory;
  description: string | null;
  isActive: boolean;
  parentAccountId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateGLAccountDTO {
  code: string;
  name: string;
  category: AccountCategory;
  description?: string;
  parentAccountId?: string;
}

// ─── Journal Entries (Session 6.1) ────────────────────────────────────────────

export type JournalEntryStatus = 'pending' | 'posted' | 'reversed';

export interface JournalEntry {
  id: string;
  referenceType: string;
  referenceId: string;
  description: string;
  status: JournalEntryStatus;
  postedAt: Date | null;
  reversedAt: Date | null;
  reversalOfId: string | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface JournalEntryLine {
  id: string;
  journalEntryId: string;
  accountId: string;
  debitAmount: string;
  creditAmount: string;
  description: string | null;
  createdAt: Date;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
}

export interface CreateJournalEntryDTO {
  referenceType: string;
  referenceId: string;
  description: string;
  createdBy: string;
  lines: CreateJournalEntryLineDTO[];
}

export interface CreateJournalEntryLineDTO {
  accountId: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
}

// ─── Queries & Reports (Session 6.1) ─────────────────────────────────────────

export interface JournalEntryListQuery {
  referenceType?: string;
  referenceId?: string;
  status?: JournalEntryStatus;
  accountId?: string;
  startDate?: string;
  endDate?: string;
  limit: number;
  offset: number;
}

export interface AccountBalance {
  accountId: string;
  accountCode: string;
  accountName: string;
  category: AccountCategory;
  totalDebits: string;
  totalCredits: string;
  balance: string;
}

export interface GLAccountListQuery {
  category?: AccountCategory;
  isActive?: boolean;
  limit: number;
  offset: number;
}

export interface TrialBalance {
  accounts: AccountBalance[];
  totalDebits: string;
  totalCredits: string;
  isBalanced: boolean;
  asOf: Date;
}

// ─── Cache Interface (Session 6.2) ──────────────────────────────────────────

export interface ICacheClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;
  del(key: string): Promise<void>;
  delByPattern(pattern: string): Promise<void>;
}

// ─── Balance Summary (Session 6.2) ──────────────────────────────────────────

export interface BalanceSummary {
  totalAssets: string;
  totalLiabilities: string;
  totalRevenue: string;
  totalExpenses: string;
  netPosition: string;
  accountCount: number;
  asOf: Date;
}

// ─── Reconciliation (Session 6.2) ───────────────────────────────────────────

export type ReconciliationStatus = 'passed' | 'failed' | 'warning';

export interface ReconciliationVariance {
  accountId: string;
  accountCode: string;
  accountName: string;
  expectedBalance: string;
  actualBalance: string;
  variance: string;
  severity: 'error' | 'warning';
}

export interface ReconciliationRun {
  id: string;
  runType: string;
  status: ReconciliationStatus;
  totalAccounts: number;
  totalDebits: string;
  totalCredits: string;
  varianceCount: number;
  variances: ReconciliationVariance[] | null;
  tolerance: string;
  startedAt: Date;
  completedAt: Date;
  createdAt: Date;
}

export interface ReconciliationListQuery {
  status?: ReconciliationStatus;
  runType?: string;
  limit: number;
  offset: number;
}

// ─── Deposits (Session 6.3) ─────────────────────────────────────────────────

export type DepositMethod = 'card' | 'wire' | 'ach';
export type DepositStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

export interface Deposit {
  id: string;
  institutionId: string;
  userId: string;
  method: DepositMethod;
  status: DepositStatus;
  amount: string;
  currency: string;
  externalReference: string | null;
  stripePaymentIntent: string | null;
  description: string | null;
  journalEntryId: string | null;
  failureReason: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateDepositDTO {
  institutionId: string;
  userId: string;
  method: DepositMethod;
  amount: number;
  currency?: string;
  description?: string;
}

export interface DepositListQuery {
  institutionId?: string;
  userId?: string;
  status?: DepositStatus;
  method?: DepositMethod;
  limit: number;
  offset: number;
}

export interface IPaymentProvider {
  createPaymentIntent(amount: number, currency: string, metadata: Record<string, string>): Promise<{ id: string; clientSecret: string; status: string }>;
  confirmPaymentIntent(paymentIntentId: string): Promise<{ status: string }>;
  cancelPaymentIntent(paymentIntentId: string): Promise<{ status: string }>;
}

// ─── Withdrawals (Session 6.4) ──────────────────────────────────────────────

export type WithdrawalMethod = 'wire' | 'ach';
export type WithdrawalStatus = 'pending_approval' | 'approved' | 'processing' | 'completed' | 'failed' | 'rejected';

export interface Withdrawal {
  id: string;
  institutionId: string;
  userId: string;
  method: WithdrawalMethod;
  status: WithdrawalStatus;
  amount: string;
  feeAmount: string;
  netAmount: string;
  currency: string;
  externalReference: string | null;
  description: string | null;
  journalEntryId: string | null;
  feeJournalEntryId: string | null;
  requiresApproval: boolean;
  approvedBy: string | null;
  approvedAt: Date | null;
  rejectedBy: string | null;
  rejectedAt: Date | null;
  rejectionReason: string | null;
  failureReason: string | null;
  completedAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWithdrawalDTO {
  institutionId: string;
  userId: string;
  method: WithdrawalMethod;
  amount: number;
  currency?: string;
  description?: string;
}

export interface WithdrawalListQuery {
  institutionId?: string;
  userId?: string;
  status?: WithdrawalStatus;
  method?: WithdrawalMethod;
  limit: number;
  offset: number;
}
