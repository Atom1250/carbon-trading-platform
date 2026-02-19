import { ValidationError } from '@libs/errors';
import type { ParsedBankEntry } from '../types/ledger.types.js';

const REQUIRED_HEADERS = ['date', 'description', 'debit', 'credit'];

/**
 * Parses CSV bank statement data into structured entries.
 *
 * Expected CSV format (header row required):
 *   date,description,reference,debit,credit,balance
 *
 * - date: YYYY-MM-DD or MM/DD/YYYY
 * - description: free text
 * - reference: optional transaction reference
 * - debit: amount debited (money out) or empty
 * - credit: amount credited (money in) or empty
 * - balance: running balance (optional column)
 */
export class BankStatementParser {
  parse(csvContent: string): ParsedBankEntry[] {
    const lines = csvContent
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length < 2) {
      throw new ValidationError('CSV must contain a header row and at least one data row', [
        { field: 'csv', message: 'Too few rows', code: 'custom' },
      ]);
    }

    const headers = this.parseRow(lines[0]).map((h) => h.toLowerCase().trim());
    this.validateHeaders(headers);

    const dateIdx = headers.indexOf('date');
    const descIdx = headers.indexOf('description');
    const refIdx = headers.indexOf('reference');
    const debitIdx = headers.indexOf('debit');
    const creditIdx = headers.indexOf('credit');
    const balanceIdx = headers.indexOf('balance');

    const entries: ParsedBankEntry[] = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.parseRow(lines[i]);

      if (values.length < REQUIRED_HEADERS.length) {
        throw new ValidationError(`Row ${i + 1} has too few columns`, [
          { field: `row_${i + 1}`, message: `Expected at least ${REQUIRED_HEADERS.length} columns, got ${values.length}`, code: 'custom' },
        ]);
      }

      const transactionDate = this.normalizeDate(values[dateIdx], i + 1);
      const description = values[descIdx];
      const reference = refIdx >= 0 ? values[refIdx] || undefined : undefined;
      const debitAmount = this.parseAmount(values[debitIdx]);
      const creditAmount = this.parseAmount(values[creditIdx]);
      const balance = balanceIdx >= 0 ? this.parseAmount(values[balanceIdx]) : undefined;

      if (!description) {
        throw new ValidationError(`Row ${i + 1} has empty description`, [
          { field: `row_${i + 1}.description`, message: 'Description is required', code: 'custom' },
        ]);
      }

      if (debitAmount === 0 && creditAmount === 0) {
        throw new ValidationError(`Row ${i + 1} has no debit or credit amount`, [
          { field: `row_${i + 1}`, message: 'Must have debit or credit amount', code: 'custom' },
        ]);
      }

      entries.push({
        transactionDate,
        description,
        reference,
        debitAmount,
        creditAmount,
        balance: balance || undefined,
      });
    }

    return entries;
  }

  private validateHeaders(headers: string[]): void {
    const missing = REQUIRED_HEADERS.filter((h) => !headers.includes(h));
    if (missing.length > 0) {
      throw new ValidationError(`Missing required CSV headers: ${missing.join(', ')}`, [
        { field: 'headers', message: `Missing: ${missing.join(', ')}`, code: 'custom' },
      ]);
    }
  }

  private parseRow(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  }

  private normalizeDate(value: string, rowNum: number): string {
    // Try YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      return value;
    }

    // Try MM/DD/YYYY
    const usMatch = value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (usMatch) {
      const month = usMatch[1].padStart(2, '0');
      const day = usMatch[2].padStart(2, '0');
      return `${usMatch[3]}-${month}-${day}`;
    }

    throw new ValidationError(`Row ${rowNum} has invalid date format: ${value}`, [
      { field: `row_${rowNum}.date`, message: 'Expected YYYY-MM-DD or MM/DD/YYYY', code: 'custom' },
    ]);
  }

  private parseAmount(value: string): number {
    if (!value || value.trim() === '') return 0;
    const cleaned = value.replace(/[$,]/g, '').trim();
    const num = parseFloat(cleaned);
    if (isNaN(num) || num < 0) return 0;
    return parseFloat(num.toFixed(2));
  }
}
