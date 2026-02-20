import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useInstitutions, useInstitution } from './useInstitutions';
import { apiClient } from '@/lib/api';
import type { ReactNode } from 'react';

jest.mock('@/lib/api', () => ({
  apiClient: {
    getInstitutions: jest.fn(),
    getInstitution: jest.fn(),
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

describe('useInstitutions', () => {
  it('fetches institutions list successfully', async () => {
    const mockInstitutions = [
      { id: '1', name: 'Bank A', type: 'bank', status: 'active', country: 'US', createdAt: '2024-01-01' },
      { id: '2', name: 'Fund B', type: 'fund', status: 'active', country: 'UK', createdAt: '2024-01-02' },
    ];
    mockApiClient.getInstitutions.mockResolvedValue({ data: mockInstitutions, total: 2 });

    const { result } = renderHook(() => useInstitutions(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockInstitutions);
  });
});

describe('useInstitution', () => {
  it('fetches single institution successfully', async () => {
    const mockInstitution = { id: '1', name: 'Bank A', type: 'bank', status: 'active', country: 'US', createdAt: '2024-01-01' };
    mockApiClient.getInstitution.mockResolvedValue({ data: mockInstitution });

    const { result } = renderHook(() => useInstitution('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockInstitution);
    expect(mockApiClient.getInstitution).toHaveBeenCalledWith('1');
  });

  it('does not fetch when id is empty', () => {
    const { result } = renderHook(() => useInstitution(''), { wrapper: createWrapper() });

    expect(result.current.isPending).toBe(true);
    expect(result.current.fetchStatus).toBe('idle');
    expect(mockApiClient.getInstitution).not.toHaveBeenCalled();
  });
});
