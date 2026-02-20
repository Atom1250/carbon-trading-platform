import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { CreateAssetRequest } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export function useAssets() {
  return useQuery({
    queryKey: ['assets'],
    queryFn: async () => {
      const response = await apiClient.getAssets();
      return response.data;
    },
  });
}

export function useAsset(id: string) {
  return useQuery({
    queryKey: ['assets', id],
    queryFn: async () => {
      const response = await apiClient.getAsset(id);
      return response.data;
    },
    enabled: !!id,
  });
}

export function useCreateAsset() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateAssetRequest) => apiClient.createAsset(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      showToast('Asset created successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
}
