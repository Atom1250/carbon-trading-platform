import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useRFQs, useCreateRFQ } from './useTrading';
import { apiClient } from '@/lib/api';
import type { ReactNode } from 'react';

const mockShowToast = jest.fn();

jest.mock('@/lib/api', () => ({
  apiClient: {
    getRFQs: jest.fn(),
    createRFQ: jest.fn(),
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

describe('useRFQs', () => {
  it('fetches RFQs list successfully', async () => {
    const mockRFQs = [
      { id: '1', assetId: 'a1', requesterInstitutionId: 'i1', requesterUserId: 'u1', side: 'buy' as const, quantity: '100', status: 'open', expiresAt: '2024-12-31', createdAt: '2024-01-01' },
    ];
    mockApiClient.getRFQs.mockResolvedValue({ rfqs: mockRFQs, total: 1 });

    const { result } = renderHook(() => useRFQs(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockRFQs);
  });
});

describe('useCreateRFQ', () => {
  it('creates RFQ with optimistic update', async () => {
    const newRFQ = { id: '2', assetId: 'a2', requesterInstitutionId: 'i2', requesterUserId: 'u2', side: 'sell' as const, quantity: '50', status: 'open', expiresAt: '2024-12-31', createdAt: '2024-01-02' };
    mockApiClient.createRFQ.mockResolvedValue(newRFQ);

    const { result } = renderHook(() => useCreateRFQ(), { wrapper: createWrapper() });

    result.current.mutate({ assetId: 'a2', requesterInstitutionId: 'i2', requesterUserId: 'u2', side: 'sell', quantity: 50 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('RFQ created successfully', 'success');
  });

  it('shows error toast and rolls back on failure', async () => {
    mockApiClient.createRFQ.mockRejectedValue(new Error('RFQ creation failed'));

    const { result } = renderHook(() => useCreateRFQ(), { wrapper: createWrapper() });

    result.current.mutate({ assetId: 'a2', requesterInstitutionId: 'i2', requesterUserId: 'u2', side: 'sell', quantity: 50 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('RFQ creation failed', 'error');
  });
});
