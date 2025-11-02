import axios from 'axios';

const API_BASE: string = import.meta.env.VITE_API_URL || 'http://localhost:3000';
const TOKEN_KEY = 'token';

const apiClient = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Attach token from localStorage on each request (reads directly to avoid circular imports)
apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      config.headers = config.headers || {};
      (config.headers as Record<string, string>).Authorization = `Bearer ${token}`;
    }
  } catch {
    console.log('Error while attaching auth token to request');
  }
  return config;
});

export default apiClient;
