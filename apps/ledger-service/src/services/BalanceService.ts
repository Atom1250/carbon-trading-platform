import type { IDatabaseClient } from '@libs/database';
import { NotFoundError } from '@libs/errors';
import type {
  AccountBalance,
  BalanceSummary,
  ICacheClient,
} from '../types/ledger.types.js';

const GL_ACCOUNT_COLUMNS = `
  id,
  code,
  name,
  category,
  description,
  is_active          AS "isActive",
  parent_account_id  AS "parentAccountId",
  created_at         AS "createdAt",
  updated_at         AS "updatedAt"
`;

const CACHE_PREFIX = 'ledger:balance:';
const BALANCE_TTL = 300; // 5 minutes
const SUMMARY_TTL = 600; // 10 minutes

export class BalanceService {
  constructor(
    private readonly db: IDatabaseClient,
    private readonly cache?: ICacheClient,
  ) {}

  async getAccountBalance(accountId: string): Promise<AccountBalance> {
    const cacheKey = `${CACHE_PREFIX}account:${accountId}`;

    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as AccountBalance;
      }
    }

    const accountRows = await this.db.query<{
      id: string;
      code: string;
      name: string;
      category: string;
    }>(
      `SELECT ${GL_ACCOUNT_COLUMNS} FROM gl_accounts WHERE id = $1`,
      [accountId],
    );

    if (accountRows.length === 0) {
      throw new NotFoundError('GL Account', accountId);
    }

    const account = accountRows[0];

    const balanceRows = await this.db.query<{ totalDebits: string; totalCredits: string }>(
      `SELECT
         COALESCE(SUM(jel.debit_amount), 0)  AS "totalDebits",
         COALESCE(SUM(jel.credit_amount), 0) AS "totalCredits"
       FROM journal_entry_lines jel
       JOIN journal_entries je ON je.id = jel.journal_entry_id
       WHERE jel.account_id = $1
         AND je.status = 'posted'`,
      [accountId],
    );

    const totalDebits = parseFloat(balanceRows[0].totalDebits);
    const totalCredits = parseFloat(balanceRows[0].totalCredits);

    const isDebitNormal = account.category === 'asset' || account.category === 'expense';
    const balance = isDebitNormal
      ? totalDebits - totalCredits
      : totalCredits - totalDebits;

    const result: AccountBalance = {
      accountId: account.id,
      accountCode: account.code,
      accountName: account.name,
      category: account.category as AccountBalance['category'],
      totalDebits: totalDebits.toFixed(2),
      totalCredits: totalCredits.toFixed(2),
      balance: balance.toFixed(2),
    };

    if (this.cache) {
      await this.cache.set(cacheKey, JSON.stringify(result), BALANCE_TTL);
    }

    return result;
  }

  async getBalanceSummary(): Promise<BalanceSummary> {
    const cacheKey = `${CACHE_PREFIX}summary`;

    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as BalanceSummary;
      }
    }

    const rows = await this.db.query<{
      category: string;
      totalDebits: string;
      totalCredits: string;
      accountCount: string;
    }>(
      `SELECT
         ga.category,
         COALESCE(SUM(jel.debit_amount), 0)  AS "totalDebits",
         COALESCE(SUM(jel.credit_amount), 0) AS "totalCredits",
         COUNT(DISTINCT ga.id)                AS "accountCount"
       FROM gl_accounts ga
       LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
       LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
       WHERE ga.is_active = true
       GROUP BY ga.category`,
    );

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;
    let accountCount = 0;

    for (const row of rows) {
      const debits = parseFloat(row.totalDebits);
      const credits = parseFloat(row.totalCredits);
      const count = parseInt(row.accountCount, 10);
      accountCount += count;

      switch (row.category) {
        case 'asset':
          totalAssets = debits - credits;
          break;
        case 'liability':
          totalLiabilities = credits - debits;
          break;
        case 'revenue':
          totalRevenue = credits - debits;
          break;
        case 'expense':
          totalExpenses = debits - credits;
          break;
      }
    }

    const netPosition = totalAssets - totalLiabilities + totalRevenue - totalExpenses;

    const result: BalanceSummary = {
      totalAssets: totalAssets.toFixed(2),
      totalLiabilities: totalLiabilities.toFixed(2),
      totalRevenue: totalRevenue.toFixed(2),
      totalExpenses: totalExpenses.toFixed(2),
      netPosition: netPosition.toFixed(2),
      accountCount,
      asOf: new Date(),
    };

    if (this.cache) {
      await this.cache.set(cacheKey, JSON.stringify(result), SUMMARY_TTL);
    }

    return result;
  }

  async getBalancesByCategory(category: string): Promise<AccountBalance[]> {
    const cacheKey = `${CACHE_PREFIX}category:${category}`;

    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as AccountBalance[];
      }
    }

    const rows = await this.db.query<{
      accountId: string;
      accountCode: string;
      accountName: string;
      category: string;
      totalDebits: string;
      totalCredits: string;
    }>(
      `SELECT
         ga.id                                    AS "accountId",
         ga.code                                  AS "accountCode",
         ga.name                                  AS "accountName",
         ga.category                              AS "category",
         COALESCE(SUM(jel.debit_amount), 0)       AS "totalDebits",
         COALESCE(SUM(jel.credit_amount), 0)      AS "totalCredits"
       FROM gl_accounts ga
       LEFT JOIN journal_entry_lines jel ON jel.account_id = ga.id
       LEFT JOIN journal_entries je ON je.id = jel.journal_entry_id AND je.status = 'posted'
       WHERE ga.is_active = true AND ga.category = $1
       GROUP BY ga.id, ga.code, ga.name, ga.category
       ORDER BY ga.code ASC`,
      [category],
    );

    const result: AccountBalance[] = rows.map((row) => {
      const totalDebits = parseFloat(row.totalDebits);
      const totalCredits = parseFloat(row.totalCredits);
      const isDebitNormal = row.category === 'asset' || row.category === 'expense';
      const balance = isDebitNormal ? totalDebits - totalCredits : totalCredits - totalDebits;

      return {
        accountId: row.accountId,
        accountCode: row.accountCode,
        accountName: row.accountName,
        category: row.category as AccountBalance['category'],
        totalDebits: totalDebits.toFixed(2),
        totalCredits: totalCredits.toFixed(2),
        balance: balance.toFixed(2),
      };
    });

    if (this.cache) {
      await this.cache.set(cacheKey, JSON.stringify(result), BALANCE_TTL);
    }

    return result;
  }

  async invalidateCache(accountId?: string): Promise<void> {
    if (!this.cache) return;

    if (accountId) {
      await this.cache.del(`${CACHE_PREFIX}account:${accountId}`);
    }

    // Always invalidate summary and category caches on any change
    await this.cache.del(`${CACHE_PREFIX}summary`);
    await this.cache.delByPattern(`${CACHE_PREFIX}category:*`);
  }
}
