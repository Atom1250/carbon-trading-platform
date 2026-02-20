import { render, screen, fireEvent, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import DeveloperDashboard from './page';

describe('DeveloperDashboard', () => {
  it('renders dashboard title', () => {
    render(<DeveloperDashboard />);
    expect(screen.getByText('Developer Dashboard')).toBeInTheDocument();
  });

  describe('API Keys Section', () => {
    it('renders API Keys section', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByText('API Keys')).toBeInTheDocument();
    });

    it('displays existing API keys', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByText('Production Key')).toBeInTheDocument();
      expect(screen.getByText('Development Key')).toBeInTheDocument();
      expect(screen.getByText('pk_live_•••••••••••••••••')).toBeInTheDocument();
    });

    it('shows Create API Key button', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByRole('button', { name: 'Create API Key' })).toBeInTheDocument();
    });

    it('opens create API key dialog when button clicked', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Create API Key' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Create a new API key for programmatic access to the platform.')).toBeInTheDocument();
    });

    it('has revoke button for each API key', () => {
      render(<DeveloperDashboard />);
      const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
      expect(revokeButtons).toHaveLength(2);
    });

    it('shows alert when revoke button clicked', () => {
      const alertSpy = jest.spyOn(window, 'alert').mockImplementation(() => {});
      render(<DeveloperDashboard />);
      const revokeButtons = screen.getAllByRole('button', { name: 'Revoke' });
      fireEvent.click(revokeButtons[0]);
      expect(alertSpy).toHaveBeenCalledWith('Revoke Production Key');
      alertSpy.mockRestore();
    });
  });

  describe('Create API Key Dialog', () => {
    it('allows entering key name', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Create API Key' }));

      const input = screen.getByPlaceholderText('e.g., Production Key');
      fireEvent.change(input, { target: { value: 'My Test Key' } });
      expect(input).toHaveValue('My Test Key');
    });

    it('disables create button when name is empty', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Create API Key' }));

      const dialog = screen.getByRole('dialog');
      const createButton = within(dialog).getByRole('button', { name: 'Create Key' });
      expect(createButton).toBeDisabled();
    });

    it('enables create button when name is provided', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Create API Key' }));

      const input = screen.getByPlaceholderText('e.g., Production Key');
      fireEvent.change(input, { target: { value: 'My Test Key' } });

      const dialog = screen.getByRole('dialog');
      const createButton = within(dialog).getByRole('button', { name: 'Create Key' });
      expect(createButton).not.toBeDisabled();
    });

    it('closes dialog when cancel button clicked', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Create API Key' }));

      const dialog = screen.getByRole('dialog');
      const cancelButton = within(dialog).getByRole('button', { name: 'Cancel' });
      fireEvent.click(cancelButton);

      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
  });

  describe('Webhooks Section', () => {
    it('renders Webhooks section', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByRole('heading', { name: 'Webhooks', level: 2 })).toBeInTheDocument();
    });

    it('displays existing webhooks', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByText('https://api.example.com/webhooks/trades')).toBeInTheDocument();
      expect(screen.getByText('https://api.example.com/webhooks/assets')).toBeInTheDocument();
    });

    it('shows Add Webhook button', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByRole('button', { name: 'Add Webhook' })).toBeInTheDocument();
    });

    it('opens add webhook dialog when button clicked', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Webhook' }));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Configure a webhook endpoint to receive real-time events.')).toBeInTheDocument();
    });

    it('has edit and delete buttons for each webhook', () => {
      render(<DeveloperDashboard />);
      const editButtons = screen.getAllByRole('button', { name: 'Edit' });
      const deleteButtons = screen.getAllByRole('button', { name: 'Delete' });
      expect(editButtons).toHaveLength(2);
      expect(deleteButtons).toHaveLength(2);
    });
  });

  describe('Add Webhook Dialog', () => {
    it('allows entering webhook URL', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Webhook' }));

      const input = screen.getByPlaceholderText('https://api.example.com/webhooks');
      fireEvent.change(input, { target: { value: 'https://test.com/webhook' } });
      expect(input).toHaveValue('https://test.com/webhook');
    });

    it('disables add button when URL is empty', () => {
      render(<DeveloperDashboard />);
      fireEvent.click(screen.getByRole('button', { name: 'Add Webhook' }));

      const dialog = screen.getByRole('dialog');
      const addButton = within(dialog).getByRole('button', { name: 'Add Webhook' });
      expect(addButton).toBeDisabled();
    });
  });

  describe('Rate Limits Section', () => {
    it('renders Rate Limits section', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByText('Rate Limits')).toBeInTheDocument();
    });

    it('displays rate limit data for endpoints', () => {
      render(<DeveloperDashboard />);
      const assetsEndpoints = screen.getAllByText('/api/v1/assets');
      expect(assetsEndpoints.length).toBeGreaterThan(0);
      expect(screen.getByText('/api/v1/auth/*')).toBeInTheDocument();
    });

    it('shows limit, used, and remaining counts', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByText('1000/hour')).toBeInTheDocument();
      expect(screen.getByText('234')).toBeInTheDocument();
      expect(screen.getByText('766')).toBeInTheDocument();
    });
  });

  describe('Activity Logs Section', () => {
    it('renders Activity Logs section', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByText('Activity Logs')).toBeInTheDocument();
    });

    it('displays activity log entries', () => {
      render(<DeveloperDashboard />);
      expect(screen.getAllByText('GET').length).toBeGreaterThan(0);
      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.getByText('PUT')).toBeInTheDocument();
      expect(screen.getByText('DELETE')).toBeInTheDocument();
    });

    it('has filter input', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByPlaceholderText('Filter by endpoint or method...')).toBeInTheDocument();
    });

    it('filters logs by endpoint', () => {
      render(<DeveloperDashboard />);
      const filterInput = screen.getByPlaceholderText('Filter by endpoint or method...');

      fireEvent.change(filterInput, { target: { value: 'trading' } });

      const tradingEndpoints = screen.getAllByText(/\/api\/v1\/trading\/rfq/);
      expect(tradingEndpoints.length).toBeGreaterThan(0);
      expect(screen.queryByText('/api/v1/auth/me')).not.toBeInTheDocument();
    });

    it('filters logs by method', () => {
      render(<DeveloperDashboard />);
      const filterInput = screen.getByPlaceholderText('Filter by endpoint or method...');

      fireEvent.change(filterInput, { target: { value: 'POST' } });

      // Should only show the POST log entry
      expect(screen.getByText('POST')).toBeInTheDocument();
      expect(screen.queryByText('PUT')).not.toBeInTheDocument();
      expect(screen.queryByText('DELETE')).not.toBeInTheDocument();
    });

    it('shows status codes with appropriate styling', () => {
      render(<DeveloperDashboard />);
      const successStatus = screen.getAllByText('200');
      expect(successStatus[0]).toHaveClass('text-success-600');
    });
  });

  describe('API Documentation Section', () => {
    it('renders API Documentation section', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByText('API Documentation')).toBeInTheDocument();
    });

    it('has View API Reference button', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByRole('button', { name: 'View API Reference' })).toBeInTheDocument();
    });

    it('has Download OpenAPI Spec button', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByRole('button', { name: 'Download OpenAPI Spec' })).toBeInTheDocument();
    });

    it('displays quick links to documentation sections', () => {
      render(<DeveloperDashboard />);
      expect(screen.getByRole('link', { name: 'Authentication' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Assets API' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Trading API' })).toBeInTheDocument();
      expect(screen.getByRole('link', { name: 'Webhooks' })).toBeInTheDocument();
    });
  });
});
