import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MFAForm } from './MFAForm';
import { ApiError } from '@/lib/api';

const mockVerifyMFA = jest.fn();
const mockPush = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ verifyMFA: mockVerifyMFA }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe('MFAForm', () => {
  it('renders code input and verify button', () => {
    render(<MFAForm mfaToken="token-xyz" />);
    expect(screen.getByLabelText('Authentication Code')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Verify' })).toBeInTheDocument();
  });

  it('submits with mfaToken and code', async () => {
    mockVerifyMFA.mockResolvedValue(undefined);

    render(<MFAForm mfaToken="token-abc" />);

    fireEvent.change(screen.getByLabelText('Authentication Code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(mockVerifyMFA).toHaveBeenCalledWith('token-abc', '123456'),
    );
  });

  it('redirects to dashboard on success', async () => {
    mockVerifyMFA.mockResolvedValue(undefined);

    render(<MFAForm mfaToken="token-abc" />);

    fireEvent.change(screen.getByLabelText('Authentication Code'), {
      target: { value: '654321' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('shows ApiError message on failure', async () => {
    mockVerifyMFA.mockRejectedValue(new ApiError(401, 'Invalid code'));

    render(<MFAForm mfaToken="token-abc" />);

    fireEvent.change(screen.getByLabelText('Authentication Code'), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid code'),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows generic error on unknown failure', async () => {
    mockVerifyMFA.mockRejectedValue(new Error('Timeout'));

    render(<MFAForm mfaToken="token-abc" />);

    fireEvent.change(screen.getByLabelText('Authentication Code'), {
      target: { value: '000000' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'MFA verification failed. Please try again.',
      ),
    );
  });

  it('disables button while loading', async () => {
    let resolveVerify!: () => void;
    mockVerifyMFA.mockReturnValue(
      new Promise<void>((res) => { resolveVerify = res; }),
    );

    render(<MFAForm mfaToken="token-abc" />);

    fireEvent.change(screen.getByLabelText('Authentication Code'), {
      target: { value: '123456' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Verify' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Verifying…' })).toBeDisabled(),
    );

    resolveVerify();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Verify' })).not.toBeDisabled(),
    );
  });
});
