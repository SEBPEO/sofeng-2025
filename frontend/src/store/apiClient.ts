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

// Response interceptor for better error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const { status, data, statusText } = error.response;
      console.error(`API Error ${status}:`, {
        url: error.config?.url,
        method: error.config?.method,
        status,
        statusText,
        data,
      });
      
      // Improve error message
      if (data && typeof data === 'object') {
        error.message = data.message || data.error || statusText || 'Request failed';
      } else if (typeof data === 'string') {
        error.message = data;
      } else {
        error.message = `Request failed: ${status} ${statusText}`;
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('No response received:', error.request);
      error.message = 'No response from server. Please check if the backend is running.';
    } else {
      // Something else happened
      console.error('Request setup error:', error.message);
    }
    return Promise.reject(error);
  },
);

export default apiClient;
