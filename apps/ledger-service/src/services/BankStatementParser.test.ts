import { BankStatementParser } from './BankStatementParser';

jest.mock('@libs/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

describe('BankStatementParser', () => {
  let parser: BankStatementParser;

  beforeEach(() => {
    parser = new BankStatementParser();
  });

  describe('parse', () => {
    it('should parse valid CSV with standard columns', () => {
      const csv = [
        'date,description,reference,debit,credit,balance',
        '2025-01-15,Wire deposit,WIRE-001,,5000.00,15000.00',
        '2025-01-16,ACH withdrawal,ACH-002,2500.00,,12500.00',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries).toHaveLength(2);
      expect(entries[0]).toEqual({
        transactionDate: '2025-01-15',
        description: 'Wire deposit',
        reference: 'WIRE-001',
        debitAmount: 0,
        creditAmount: 5000,
        balance: 15000,
      });
      expect(entries[1]).toEqual({
        transactionDate: '2025-01-16',
        description: 'ACH withdrawal',
        reference: 'ACH-002',
        debitAmount: 2500,
        creditAmount: 0,
        balance: 12500,
      });
    });

    it('should parse US date format (MM/DD/YYYY)', () => {
      const csv = [
        'date,description,debit,credit',
        '1/15/2025,Wire deposit,,5000.00',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries[0].transactionDate).toBe('2025-01-15');
    });

    it('should handle quoted CSV fields', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-15,"Wire deposit, large",,"$5,000.00"',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries[0].description).toBe('Wire deposit, large');
      expect(entries[0].creditAmount).toBe(5000);
    });

    it('should work without optional reference and balance columns', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-15,Payment,,1000.00',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries[0].reference).toBeUndefined();
      expect(entries[0].balance).toBeUndefined();
    });

    it('should strip dollar signs and commas from amounts', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-15,Payment,,"$10,500.25"',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries[0].creditAmount).toBe(10500.25);
    });

    it('should parse multiple entries', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-10,Deposit A,,1000.00',
        '2025-01-11,Withdrawal B,500.00,',
        '2025-01-12,Deposit C,,2000.00',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries).toHaveLength(3);
    });

    it('should skip empty lines', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-15,Payment,,1000.00',
        '',
        '   ',
        '2025-01-16,Withdrawal,500.00,',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries).toHaveLength(2);
    });

    it('should throw for CSV with only header', () => {
      expect(() => parser.parse('date,description,debit,credit')).toThrow('at least one data row');
    });

    it('should throw for empty CSV', () => {
      expect(() => parser.parse('')).toThrow('at least one data row');
    });

    it('should throw for missing required headers', () => {
      const csv = [
        'date,description,amount',
        '2025-01-15,Payment,1000',
      ].join('\n');

      expect(() => parser.parse(csv)).toThrow('Missing required CSV headers');
    });

    it('should throw for rows with too few columns', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-15,Payment',
      ].join('\n');

      expect(() => parser.parse(csv)).toThrow('too few columns');
    });

    it('should throw for empty description', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-15,,,1000.00',
      ].join('\n');

      expect(() => parser.parse(csv)).toThrow('empty description');
    });

    it('should throw for zero amounts in both debit and credit', () => {
      const csv = [
        'date,description,debit,credit',
        '2025-01-15,Payment,,',
      ].join('\n');

      expect(() => parser.parse(csv)).toThrow('no debit or credit amount');
    });

    it('should throw for invalid date format', () => {
      const csv = [
        'date,description,debit,credit',
        '15-01-2025,Payment,,1000',
      ].join('\n');

      expect(() => parser.parse(csv)).toThrow('invalid date format');
    });

    it('should handle case-insensitive headers', () => {
      const csv = [
        'Date,Description,Debit,Credit',
        '2025-01-15,Payment,,1000.00',
      ].join('\n');

      const entries = parser.parse(csv);

      expect(entries).toHaveLength(1);
    });
  });
});
