const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export interface LoginResponse {
  token: string;
  [key: string]: unknown;
}

export async function loginUser(email: string, password: string): Promise<LoginResponse> {
  console.log('Attempting login to:', `${API_BASE}/auth/login`);

  try {
    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    console.log('Response status:', response.status);

    if (!response.ok) {
      // extracting server error message for better UX
      try {
        const err = await response.json();
        throw new Error(err?.message || 'Login failed');
      } catch (e) {
        throw new Error('Login failed');
      }
    }

    return (await response.json()) as LoginResponse;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
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

export function authHeader(): HeadersInit {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
