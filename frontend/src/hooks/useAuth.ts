import { useCallback, useEffect, useState } from 'react';
import { loginUser as apiLogin } from '@/store/auth/authApi';

const TOKEN_KEY = 'token';

// Small helper functions for non-React modules that need quick access
export function getStoredAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setStoredAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearStoredAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function useAuth() {
  const [token, setToken] = useState<string | null>(() => getStoredAuthToken());
  const isAuthenticated = !!token;

  const login = useCallback(async (email: string, password: string) => {
    const res = await apiLogin(email, password);
    const t = res.token as string;
    setStoredAuthToken(t);
    setToken(t);
    return res;
  }, []);

  const logout = useCallback(() => {
    clearStoredAuthToken();
    setToken(null);
  }, []);

  const authHeader = useCallback(
    () => (token ? { Authorization: `Bearer ${token}` } : {}),
    [token],
  );

  // keep token in sync with other tabs or direct storage changes
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === TOKEN_KEY) setToken(e.newValue);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return { token, isAuthenticated, login, logout, authHeader };
}

export default useAuth;
