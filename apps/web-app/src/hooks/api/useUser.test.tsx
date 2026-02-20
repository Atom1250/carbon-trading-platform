import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useUser } from './useUser';
import { apiClient } from '@/lib/api';
import type { ReactNode } from 'react';

jest.mock('@/lib/api', () => ({
  apiClient: {
    getMe: jest.fn(),
  },
}));

const mockApiClient = apiClient as jest.Mocked<typeof apiClient>;

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('useUser', () => {
  it('fetches user data successfully', async () => {
    const mockUser = { id: '1', email: 'user@example.com', role: 'trader' as const, institutionId: null, mfaEnabled: false };
    mockApiClient.getMe.mockResolvedValue({ data: mockUser });

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockUser);
    expect(mockApiClient.getMe).toHaveBeenCalled();
  });

  it('handles error when fetching user fails', async () => {
    mockApiClient.getMe.mockRejectedValue(new Error('Unauthorized'));

    const { result } = renderHook(() => useUser(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toEqual(new Error('Unauthorized'));
  });
});
