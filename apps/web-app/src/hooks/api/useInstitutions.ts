import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useInstitutions() {
  return useQuery({
    queryKey: ['institutions'],
    queryFn: async () => {
      const response = await apiClient.getInstitutions();
      return response.data;
    },
  });
}

export function useInstitution(id: string) {
  return useQuery({
    queryKey: ['institutions', id],
    queryFn: async () => {
      const response = await apiClient.getInstitution(id);
      return response.data;
    },
    enabled: !!id,
  });
}
