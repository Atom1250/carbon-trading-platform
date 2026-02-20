import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAssets, useAsset, useCreateAsset } from './useAssets';
import { apiClient } from '@/lib/api';
import type { ReactNode } from 'react';

const mockShowToast = jest.fn();

jest.mock('@/lib/api', () => ({
  apiClient: {
    getAssets: jest.fn(),
    getAsset: jest.fn(),
    createAsset: jest.fn(),
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

describe('useAssets', () => {
  it('fetches assets list successfully', async () => {
    const mockAssets = [
      { id: '1', name: 'Carbon Credit A', type: 'VCS', status: 'minted', totalSupply: '1000', availableSupply: '800', createdAt: '2024-01-01' },
    ];
    mockApiClient.getAssets.mockResolvedValue({ data: mockAssets, total: 1 });

    const { result } = renderHook(() => useAssets(), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAssets);
  });
});

describe('useAsset', () => {
  it('fetches single asset successfully', async () => {
    const mockAsset = { id: '1', name: 'Carbon Credit A', type: 'VCS', status: 'minted', totalSupply: '1000', availableSupply: '800', createdAt: '2024-01-01' };
    mockApiClient.getAsset.mockResolvedValue({ data: mockAsset });

    const { result } = renderHook(() => useAsset('1'), { wrapper: createWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toEqual(mockAsset);
  });
});

describe('useCreateAsset', () => {
  it('creates asset and invalidates cache', async () => {
    const newAsset = { id: '2', name: 'New Asset', type: 'GS', status: 'pending', totalSupply: '500', availableSupply: '500', createdAt: '2024-01-02' };
    mockApiClient.createAsset.mockResolvedValue({ data: newAsset });

    const { result } = renderHook(() => useCreateAsset(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'New Asset', type: 'GS', description: 'Test asset', totalSupply: 500 });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('Asset created successfully', 'success');
  });

  it('shows error toast when creation fails', async () => {
    mockApiClient.createAsset.mockRejectedValue(new Error('Asset creation failed'));

    const { result } = renderHook(() => useCreateAsset(), { wrapper: createWrapper() });

    result.current.mutate({ name: 'New Asset', type: 'GS', description: 'Test', totalSupply: 500 });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(mockShowToast).toHaveBeenCalledWith('Asset creation failed', 'error');
  });
});
