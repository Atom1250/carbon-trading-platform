import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RegisterForm } from './RegisterForm';
import { apiClient, ApiError } from '@/lib/api';

const mockPush = jest.fn();

jest.mock('@/lib/api', () => {
  class ApiError extends Error {
    constructor(public status: number, message: string) {
      super(message);
      this.name = 'ApiError';
    }
  }
  return {
    apiClient: { register: jest.fn() },
    ApiError,
  };
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockRegister = apiClient.register as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('RegisterForm', () => {
  it('renders all required fields', () => {
    render(<RegisterForm />);
    expect(screen.getByLabelText('First Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Last Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Create account' })).toBeInTheDocument();
  });

  it('submits with all fields', async () => {
    mockRegister.mockResolvedValue({ user: { id: '1', email: 'a@b.com' } });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'alice@example.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'SecurePass1!' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(mockRegister).toHaveBeenCalledWith({
        firstName: 'Alice',
        lastName: 'Smith',
        email: 'alice@example.com',
        password: 'SecurePass1!',
      }),
    );
  });

  it('redirects to login with registered param on success', async () => {
    mockRegister.mockResolvedValue({ user: { id: '1', email: 'a@b.com' } });

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() => expect(mockPush).toHaveBeenCalledWith('/login?registered=1'));
  });

  it('shows ApiError message on failure', async () => {
    mockRegister.mockRejectedValue(new ApiError(409, 'Email already in use'));

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Email already in use'),
    );
  });

  it('shows generic error on unknown failure', async () => {
    mockRegister.mockRejectedValue(new Error('Network down'));

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Registration failed. Please try again.'),
    );
  });

  it('disables the button while loading', async () => {
    let resolveRegister!: () => void;
    mockRegister.mockReturnValue(
      new Promise<{ user: object }>((res) => { resolveRegister = () => res({ user: {} }); }),
    );

    render(<RegisterForm />);

    fireEvent.change(screen.getByLabelText('First Name'), { target: { value: 'Alice' } });
    fireEvent.change(screen.getByLabelText('Last Name'), { target: { value: 'Smith' } });
    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'a@b.com' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'pass' } });

    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Creating account…' })).toBeDisabled(),
    );

    resolveRegister();
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Create account' })).not.toBeDisabled(),
    );
  });
});
