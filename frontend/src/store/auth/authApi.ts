import apiClient from '@/store/apiClient';

export interface LoginResponse {
  token: string;
  [key: string]: unknown;
}

// ============================================================================
// TEMPORARY DEV MODE: Auto-login with kemplent user
// TODO: RESTORE AUTH VALIDATION - Remove this dev mode and restore proper login flow
// ============================================================================
export async function devAutoLogin(): Promise<void> {
  try {
    const { data } = await apiClient.get('/auth/dev/login');
    if (data.token) {
      setAuthToken(data.token);
      console.log('[DEV MODE] Auto-logged in as kemplent user');
    } else {
      console.warn('[DEV MODE] Failed to auto-login:', data.error || 'Unknown error');
    }
  } catch (err: any) {
    console.warn('[DEV MODE] Failed to auto-login:', err?.message || 'Unknown error');
  }
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  try {
    const { data } = await apiClient.post('/auth/login', { email, password });
    return data as LoginResponse;
  } catch (err: any) {
    // Try to extract meaningful message from axios error
    const msg = err?.response?.data?.message || err?.message || 'Login failed';
    throw new Error(msg);
  }
}

//token helpers for localStorage management
const TOKEN_KEY = 'token';

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}
