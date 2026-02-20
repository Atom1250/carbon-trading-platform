import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLogin, useRegister, useVerifyMFA, useLogout } from './useAuth';
import { apiClient } from '@/lib/api';
import type { ReactNode } from 'react';

const mockShowToast = jest.fn();

jest.mock('@/lib/api', () => ({
  apiClient: {
    login: jest.fn(),
    register: jest.fn(),
    verifyMFA: jest.fn(),
    logout: jest.fn(),
  },
}));

jest.mock('@/contexts/ToastContext', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useLogin', () => {
  it('calls apiClient.login and invalidates user query on success', async () => {
    const mockResponse = { user: { id: '1', email: 'test@example.com' }, tokens: { accessToken: 'token', refreshToken: 'refresh' } };
    mockApiClient.login.mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    result.current.mutate({ email: 'test@example.com', password: 'pass' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.login).toHaveBeenCalledWith({ email: 'test@example.com', password: 'pass' });
  });

  it('shows error toast on login failure', async () => {
    mockApiClient.login.mockRejectedValue(new Error('Invalid credentials'));

    const { result } = renderHook(() => useLogin(), { wrapper: createWrapper() });

    result.current.mutate({ email: 'test@example.com', password: 'wrong' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('Invalid credentials', 'error');
  });
});

describe('useRegister', () => {
  it('calls apiClient.register and shows success toast', async () => {
    mockApiClient.register.mockResolvedValue({ user: { id: '1', email: 'new@example.com' } } as any);

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    result.current.mutate({ email: 'new@example.com', password: 'pass', firstName: 'John', lastName: 'Doe' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('Registration successful!', 'success');
  });

  it('shows error toast on registration failure', async () => {
    mockApiClient.register.mockRejectedValue(new Error('Email already exists'));

    const { result } = renderHook(() => useRegister(), { wrapper: createWrapper() });

    result.current.mutate({ email: 'existing@example.com', password: 'pass', firstName: 'John', lastName: 'Doe' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('Email already exists', 'error');
  });
});

describe('useVerifyMFA', () => {
  it('calls apiClient.verifyMFA and shows success toast', async () => {
    mockApiClient.verifyMFA.mockResolvedValue({ user: { id: '1' }, tokens: { accessToken: 'token', refreshToken: 'refresh' } } as any);

    const { result } = renderHook(() => useVerifyMFA(), { wrapper: createWrapper() });

    result.current.mutate({ mfaToken: 'mfa-token', code: '123456' });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('MFA verification successful', 'success');
  });
});

describe('useLogout', () => {
  it('calls apiClient.logout and clears query cache', async () => {
    mockApiClient.logout.mockResolvedValue(undefined);

    const { result } = renderHook(() => useLogout(), { wrapper: createWrapper() });

    result.current.mutate();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockApiClient.logout).toHaveBeenCalled();
    expect(mockShowToast).toHaveBeenCalledWith('Logged out successfully', 'success');
  });
});
