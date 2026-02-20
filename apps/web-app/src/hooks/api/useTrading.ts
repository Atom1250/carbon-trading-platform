import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { CreateRFQRequest } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export function useRFQs() {
  return useQuery({
    queryKey: ['rfqs'],
    queryFn: async () => {
      const response = await apiClient.getRFQs();
      return response.rfqs;
    },
  });
}

export function useCreateRFQ() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateRFQRequest) => apiClient.createRFQ(data),
    onMutate: async (newRFQ) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['rfqs'] });

      // Snapshot previous value
      const previousRFQs = queryClient.getQueryData(['rfqs']);

      // Optimistically update to the new value
      queryClient.setQueryData(['rfqs'], (old: any) => {
        if (!old) return [newRFQ];
        return [...old, { ...newRFQ, id: 'temp-' + Date.now(), status: 'open' }];
      });

      return { previousRFQs };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rfqs'] });
      showToast('RFQ created successfully', 'success');
    },
    onError: (error: Error, _newRFQ, context) => {
      // Rollback on error
      if (context?.previousRFQs) {
        queryClient.setQueryData(['rfqs'], context.previousRFQs);
      }
      showToast(error.message, 'error');
    },
  });
}
