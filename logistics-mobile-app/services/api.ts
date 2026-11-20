import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Backend address from EXPO_PUBLIC_API_URL (e.g. http://192.168.1.85:5000 for a phone on the LAN).
export const API_ORIGIN = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.1.85:5000';
const API_BASE_URL = `${API_ORIGIN}/api`;

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
});

api.interceptors.request.use(
  async (config) => {
    let token = null;
    if (Platform.OS === 'web') {
      token = localStorage.getItem('jwt_token');
    } else {
      token = await SecureStore.getItemAsync('jwt_token');
    }
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      if (Platform.OS === 'web') {
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_data');
        if (window.location.pathname !== '/login') {
          window.location.href = '/login';
        }
      } else {
        await SecureStore.deleteItemAsync('jwt_token');
        // A full app restart or state management hook is typically needed here.
        // For now, removing the token forces the user to log in next time they open the app.
      }
    }
    return Promise.reject(error);
  }
);

export { api };
export default api;
