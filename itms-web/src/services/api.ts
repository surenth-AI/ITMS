import axios from 'axios';

// Backend address comes from VITE_API_URL (see .env.example); localhost:5000 by default.
export const API_ORIGIN = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:5000';

const api = axios.create({
  baseURL: `${API_ORIGIN}/api`,
  timeout: 10000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
