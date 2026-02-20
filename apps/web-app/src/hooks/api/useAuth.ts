import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';
import type { LoginRequest, RegisterRequest, MFAVerifyRequest } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';

export function useLogin() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: LoginRequest) => apiClient.login(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
}

export function useRegister() {
  const { showToast } = useToast();

  return useMutation({
    mutationFn: (data: RegisterRequest) => apiClient.register(data),
    onSuccess: () => {
      showToast('Registration successful!', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
}

export function useVerifyMFA() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: MFAVerifyRequest) => apiClient.verifyMFA(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user'] });
      showToast('MFA verification successful', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
}

export function useLogout() {
  const { showToast } = useToast();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      queryClient.clear();
      showToast('Logged out successfully', 'success');
    },
    onError: (error: Error) => {
      showToast(error.message, 'error');
    },
  });
}
