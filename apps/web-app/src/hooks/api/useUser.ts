import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useUser() {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      const response = await apiClient.getMe();
      return response.data;
    },
    retry: false,
  });
}
