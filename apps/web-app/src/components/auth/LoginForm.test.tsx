import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { LoginForm } from './LoginForm';
import { ApiError } from '@/lib/api';

const mockLogin = jest.fn();
const mockPush = jest.fn();

jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ login: mockLogin }),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const MOCK_USER = {
  id: 'a10e8400-e29b-41d4-a716-446655440001',
  email: 'trader@example.com',
  role: 'trader' as const,
  institutionId: null,
  mfaEnabled: false,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginForm', () => {
  it('renders email and password fields', () => {
    render(<LoginForm />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign in' })).toBeInTheDocument();
  });

  it('submits with email and password', async () => {
    mockLogin.mockResolvedValue({});

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'trader@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), {
      target: { value: 'password123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mockLogin).toHaveBeenCalledWith('trader@example.com', 'password123'));
  });

  it('redirects to dashboard on successful login', async () => {
    mockLogin.mockResolvedValue({});

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/dashboard'));
  });

  it('calls onMFARequired when MFA is needed', async () => {
    const onMFARequired = jest.fn();
    mockLogin.mockResolvedValue({ mfaRequired: true, mfaToken: 'mfa-abc' });

    render(<LoginForm onMFARequired={onMFARequired} />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => expect(onMFARequired).toHaveBeenCalledWith('mfa-abc'));
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows error message when login fails with ApiError', async () => {
    mockLogin.mockRejectedValue(new ApiError(401, 'Invalid credentials'));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Invalid credentials'),
    );
    expect(mockPush).not.toHaveBeenCalled();
  });

  it('shows generic error message when login fails with unknown error', async () => {
    mockLogin.mockRejectedValue(new Error('Network error'));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Login failed. Please try again.'),
    );
  });

  it('disables the button while loading', async () => {
    let resolveLogin!: () => void;
    mockLogin.mockReturnValue(new Promise<{ }>((res) => { resolveLogin = () => res({}); }));

    render(<LoginForm />);

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Signing in…' })).toBeDisabled(),
    );

    resolveLogin();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Sign in' })).not.toBeDisabled(),
    );
  });
});
