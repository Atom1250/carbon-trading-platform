'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import type { ReactNode } from 'react';
import { apiClient } from '@/lib/api';
import type { User, AuthTokens } from '@/lib/api';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<{ mfaRequired?: boolean; mfaToken?: string }>;
  logout: () => Promise<void>;
  verifyMFA: (mfaToken: string, code: string) => Promise<void>;
  setTokens: (tokens: AuthTokens, user: User) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function storeTokens(tokens: AuthTokens): void {
  localStorage.setItem('accessToken', tokens.accessToken);
  localStorage.setItem('refreshToken', tokens.refreshToken);
}

function clearTokens(): void {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    apiClient
      .getMe()
      .then((res) => setUser(res.data))
      .catch(() => clearTokens())
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiClient.login({ email, password });
    if (res.mfaRequired) {
      return { mfaRequired: true, mfaToken: res.mfaToken };
    }
    storeTokens(res.tokens);
    setUser(res.user);
    return {};
  }, []);

  const logout = useCallback(async () => {
    await apiClient.logout();
    clearTokens();
    setUser(null);
  }, []);

  const verifyMFA = useCallback(async (mfaToken: string, code: string) => {
    const res = await apiClient.verifyMFA({ mfaToken, code });
    storeTokens(res.tokens);
    setUser(res.user);
  }, []);

  const setTokens = useCallback((tokens: AuthTokens, newUser: User) => {
    storeTokens(tokens);
    setUser(newUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        logout,
        verifyMFA,
        setTokens,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
