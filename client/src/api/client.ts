import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Axios instance pre-configured with base URL and auth token injection.
 */
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// Request interceptor: attach auth token & handle FormData
api.interceptors.request.use(
  async (config) => {
    // Try appToken first (from direct login), then firebaseToken
    const token = localStorage.getItem('appToken') || localStorage.getItem('firebaseToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // When sending FormData, let the browser set Content-Type with multipart boundary
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: handle common errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired — clear storage and redirect to login
      localStorage.removeItem('firebaseToken');
      localStorage.removeItem('appToken');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
