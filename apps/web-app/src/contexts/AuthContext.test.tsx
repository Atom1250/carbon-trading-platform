import { render, screen, act, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { AuthProvider, useAuth } from './AuthContext';
import { apiClient } from '@/lib/api';

jest.mock('@/lib/api', () => ({
  apiClient: {
    getMe: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    verifyMFA: jest.fn(),
  },
  ApiError: class ApiError extends Error {
    constructor(public status: number, message: string) { super(message); }
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

const MOCK_USER = {
  id: 'a10e8400-e29b-41d4-a716-446655440001',
  email: 'trader@example.com',
  role: 'trader' as const,
  institutionId: 'b10e8400-e29b-41d4-a716-446655440001',
  mfaEnabled: false,
};

const MOCK_TOKENS = {
  accessToken: 'access-token-123',
  refreshToken: 'refresh-token-456',
};

function TestComponent() {
  const auth = useAuth();
  return (
    <div>
      <span data-testid="email">{auth.user?.email ?? 'no-user'}</span>
      <span data-testid="loading">{String(auth.isLoading)}</span>
      <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
      <button onClick={() => auth.login('a@b.com', 'pass')}>Login</button>
      <button onClick={() => auth.logout()}>Logout</button>
    </div>
  );
}

beforeEach(() => {
  localStorage.clear();
  jest.clearAllMocks();
});

describe('AuthProvider', () => {
  it('starts loading and sets isLoading=false when no token', async () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
    expect(screen.getByTestId('email')).toHaveTextContent('no-user');
  });

  it('loads user from accessToken on mount', async () => {
    localStorage.setItem('accessToken', 'some-token');
    mockApiClient.getMe.mockResolvedValue({ data: MOCK_USER });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('email')).toHaveTextContent('trader@example.com'),
    );
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });

  it('clears tokens when getMe fails on mount', async () => {
    localStorage.setItem('accessToken', 'bad-token');
    localStorage.setItem('refreshToken', 'bad-refresh');
    mockApiClient.getMe.mockRejectedValue(new Error('Unauthorized'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(screen.getByTestId('authenticated')).toHaveTextContent('false');
  });

  it('login stores tokens and sets user', async () => {
    mockApiClient.login.mockResolvedValue({
      user: MOCK_USER,
      tokens: MOCK_TOKENS,
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('loading')).toHaveTextContent('false'),
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('email')).toHaveTextContent('trader@example.com'),
    );
    expect(localStorage.getItem('accessToken')).toBe('access-token-123');
    expect(localStorage.getItem('refreshToken')).toBe('refresh-token-456');
    expect(screen.getByTestId('authenticated')).toHaveTextContent('true');
  });

  it('login returns mfaRequired when server responds with MFA required', async () => {
    mockApiClient.login.mockResolvedValue({
      mfaRequired: true,
      mfaToken: 'mfa-token-abc',
      user: MOCK_USER,
      tokens: MOCK_TOKENS,
    });

    let loginResult: { mfaRequired?: boolean; mfaToken?: string } = {};

    function MFATestComponent() {
      const { login } = useAuth();
      return (
        <button
          onClick={async () => {
            loginResult = await login('a@b.com', 'pass');
          }}
        >
          Login
        </button>
      );
    }

    render(
      <AuthProvider>
        <MFATestComponent />
      </AuthProvider>,
    );

    await act(async () => {
      screen.getByText('Login').click();
    });

    expect(loginResult.mfaRequired).toBe(true);
    expect(loginResult.mfaToken).toBe('mfa-token-abc');
  });

  it('logout clears tokens and user', async () => {
    localStorage.setItem('accessToken', 'some-token');
    mockApiClient.getMe.mockResolvedValue({ data: MOCK_USER });
    mockApiClient.logout.mockResolvedValue(undefined);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>,
    );

    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('true'),
    );

    await act(async () => {
      screen.getByText('Logout').click();
    });

    await waitFor(() =>
      expect(screen.getByTestId('authenticated')).toHaveTextContent('false'),
    );
    expect(localStorage.getItem('accessToken')).toBeNull();
  });
});

describe('useAuth', () => {
  it('throws when used outside AuthProvider', () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(() => render(<TestComponent />)).toThrow(
      'useAuth must be used within AuthProvider',
    );
    spy.mockRestore();
  });
});
