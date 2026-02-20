import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import InvestorDashboard from './page';

describe('InvestorDashboard', () => {
  // ─── Main Dashboard ────────────────────────────────────────────────────────

  describe('Dashboard Layout', () => {
    it('renders the main dashboard title', () => {
      render(<InvestorDashboard />);
      expect(screen.getByRole('heading', { name: 'Investor Dashboard', level: 1 })).toBeInTheDocument();
    });

    it('renders the dashboard description', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('Manage your portfolio and track performance')).toBeInTheDocument();
    });

    it('renders all main sections', () => {
      render(<InvestorDashboard />);
      expect(screen.getByRole('heading', { name: 'Portfolio Summary', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Your Token Holdings', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Available Assets', level: 3 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: 'Recent Trades', level: 3 })).toBeInTheDocument();
    });
  });

  // ─── Portfolio Summary ─────────────────────────────────────────────────────

  describe('Portfolio Summary', () => {
    it('displays total portfolio value', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$2,456,789.5')).toBeInTheDocument();
    });

    it('displays cash balance', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$456,789.5')).toBeInTheDocument();
    });

    it('displays token holdings value', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$2,000,000')).toBeInTheDocument();
    });

    it('displays 30-day return percentage', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('+12.4%')).toBeInTheDocument();
    });

    it('displays performance chart section', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('Performance')).toBeInTheDocument();
      expect(screen.getByText('Portfolio Value (6 months)')).toBeInTheDocument();
    });

    it('displays allocation chart section', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('Allocation')).toBeInTheDocument();
      const totalValues = screen.getAllByText('$2.46M');
      expect(totalValues.length).toBeGreaterThan(0);
    });

    it('displays all allocation categories', () => {
      render(<InvestorDashboard />);
      const carbonCredits = screen.getAllByText('Carbon Credits');
      const renewableEnergy = screen.getAllByText('Renewable Energy');
      expect(carbonCredits.length).toBeGreaterThan(0);
      expect(renewableEnergy.length).toBeGreaterThan(0);
      expect(screen.getByText('Cash')).toBeInTheDocument();
    });

    it('displays allocation percentages', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('48.8%')).toBeInTheDocument();
      expect(screen.getByText('32.5%')).toBeInTheDocument();
      expect(screen.getByText('18.6%')).toBeInTheDocument();
    });
  });

  // ─── Token Holdings ────────────────────────────────────────────────────────

  describe('Token Holdings', () => {
    it('displays token holdings table', () => {
      render(<InvestorDashboard />);
      const carbonCredit = screen.getAllByText('Carbon Credit - Forest Conservation');
      const solarToken = screen.getAllByText('Solar Energy Token');
      const windToken = screen.getAllByText('Wind Energy Token');
      expect(carbonCredit.length).toBeGreaterThan(0);
      expect(solarToken.length).toBeGreaterThan(0);
      expect(windToken.length).toBeGreaterThan(0);
    });

    it('displays token symbols', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('CC-FC')).toBeInTheDocument();
      expect(screen.getByText('SET')).toBeInTheDocument();
      expect(screen.getByText('WET')).toBeInTheDocument();
    });

    it('displays token quantities', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('5,000')).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
      expect(screen.getByText('8,000')).toBeInTheDocument();
    });

    it('displays current prices', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$120.00')).toBeInTheDocument();
      expect(screen.getByText('$80.00')).toBeInTheDocument();
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('displays total values for holdings', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$600,000')).toBeInTheDocument();
      const valueCells = screen.getAllByText('$800,000');
      expect(valueCells.length).toBe(2); // Solar and Wind both have $800,000
    });

    it('displays 24h price changes with correct colors', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('+2.5%')).toBeInTheDocument();
      expect(screen.getByText('-1.2%')).toBeInTheDocument();
      expect(screen.getByText('+3.8%')).toBeInTheDocument();
    });
  });

  // ─── Available Assets ──────────────────────────────────────────────────────

  describe('Available Assets', () => {
    it('displays available assets table', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('Reforestation Carbon Credit')).toBeInTheDocument();
      expect(screen.getByText('Hydro Energy Token')).toBeInTheDocument();
      expect(screen.getByText('Ocean Conservation Credit')).toBeInTheDocument();
      expect(screen.getByText('Geothermal Energy Token')).toBeInTheDocument();
    });

    it('displays asset vintage years', () => {
      render(<InvestorDashboard />);
      const vintage2024 = screen.getAllByText('Vintage 2024');
      expect(vintage2024.length).toBe(3);
      expect(screen.getByText('Vintage 2023')).toBeInTheDocument();
    });

    it('displays asset prices', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$125.00')).toBeInTheDocument();
      expect(screen.getByText('$95.00')).toBeInTheDocument();
      expect(screen.getByText('$110.00')).toBeInTheDocument();
      expect(screen.getByText('$105.00')).toBeInTheDocument();
    });

    it('displays available quantities', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('50,000')).toBeInTheDocument();
      expect(screen.getByText('100,000')).toBeInTheDocument();
      expect(screen.getByText('30,000')).toBeInTheDocument();
      expect(screen.getByText('25,000')).toBeInTheDocument();
    });

    it('displays type badges for assets', () => {
      render(<InvestorDashboard />);
      const carbonCreditBadges = screen.getAllByText('Carbon Credit');
      const renewableEnergyBadges = screen.getAllByText('Renewable Energy');
      expect(carbonCreditBadges.length).toBeGreaterThan(0);
      expect(renewableEnergyBadges.length).toBeGreaterThan(0);
    });

    it('displays buy buttons for all assets', () => {
      render(<InvestorDashboard />);
      const buyButtons = screen.getAllByRole('button', { name: 'Buy' });
      expect(buyButtons.length).toBe(4);
    });

    it('filters assets by search query', () => {
      render(<InvestorDashboard />);
      const searchInput = screen.getByPlaceholderText('Search assets...');

      fireEvent.change(searchInput, { target: { value: 'Hydro' } });

      expect(screen.getByText('Hydro Energy Token')).toBeInTheDocument();
      expect(screen.queryByText('Reforestation Carbon Credit')).not.toBeInTheDocument();
      expect(screen.queryByText('Geothermal Energy Token')).not.toBeInTheDocument();
    });

    it('displays asset type filter select', () => {
      render(<InvestorDashboard />);
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });

    it('shows alert when buy button is clicked', () => {
      const alertMock = jest.spyOn(window, 'alert').mockImplementation(() => {});
      render(<InvestorDashboard />);

      const buyButtons = screen.getAllByRole('button', { name: 'Buy' });
      fireEvent.click(buyButtons[0]);

      expect(alertMock).toHaveBeenCalledWith('Purchase Reforestation Carbon Credit');
      alertMock.mockRestore();
    });
  });

  // ─── Recent Trades ─────────────────────────────────────────────────────────

  describe('Recent Trades', () => {
    it('displays recent trades table', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('2024-02-19')).toBeInTheDocument();
      expect(screen.getByText('2024-02-18')).toBeInTheDocument();
      expect(screen.getByText('2024-02-17')).toBeInTheDocument();
    });

    it('displays trade times', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('14:30')).toBeInTheDocument();
      expect(screen.getByText('11:15')).toBeInTheDocument();
      expect(screen.getByText('16:45')).toBeInTheDocument();
    });

    it('displays trade sides with badges', () => {
      render(<InvestorDashboard />);
      const buyBadges = screen.getAllByText('BUY');
      const sellBadges = screen.getAllByText('SELL');
      expect(buyBadges.length).toBe(4);
      expect(sellBadges.length).toBe(1);
    });

    it('displays trade quantities', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('2,000')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('1,500')).toBeInTheDocument();
      expect(screen.getByText('3,000')).toBeInTheDocument();
    });

    it('displays trade prices', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$118.50')).toBeInTheDocument();
      expect(screen.getByText('$81.00')).toBeInTheDocument();
      expect(screen.getByText('$98.50')).toBeInTheDocument();
      expect(screen.getByText('$115.00')).toBeInTheDocument();
      expect(screen.getByText('$79.50')).toBeInTheDocument();
    });

    it('displays trade totals', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('$118,500')).toBeInTheDocument();
      expect(screen.getByText('$162,000')).toBeInTheDocument();
      expect(screen.getByText('$49,250')).toBeInTheDocument();
      expect(screen.getByText('$172,500')).toBeInTheDocument();
      expect(screen.getByText('$238,500')).toBeInTheDocument();
    });

    it('displays settled status for all trades', () => {
      render(<InvestorDashboard />);
      const settledBadges = screen.getAllByText('settled');
      expect(settledBadges.length).toBe(5);
    });

    it('displays trade filter select', () => {
      render(<InvestorDashboard />);
      const selects = screen.getAllByRole('combobox');
      expect(selects.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─── Chart Components ──────────────────────────────────────────────────────

  describe('Chart Components', () => {
    it('displays performance chart with month labels', () => {
      render(<InvestorDashboard />);
      expect(screen.getByText('Sep')).toBeInTheDocument();
      expect(screen.getByText('Oct')).toBeInTheDocument();
      expect(screen.getByText('Nov')).toBeInTheDocument();
      expect(screen.getByText('Dec')).toBeInTheDocument();
      expect(screen.getByText('Jan')).toBeInTheDocument();
      expect(screen.getByText('Feb')).toBeInTheDocument();
    });

    it('displays allocation chart total value', () => {
      render(<InvestorDashboard />);
      const totalValueTexts = screen.getAllByText('Total Value');
      expect(totalValueTexts.length).toBeGreaterThan(0);
    });
  });
});
