import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => Promise<void>;
  restoreToken: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  isLoading: true,
  login: async (token, user) => {
    if (Platform.OS === 'web') {
      localStorage.setItem('jwt_token', token);
      localStorage.setItem('user_data', JSON.stringify(user));
    } else {
      await SecureStore.setItemAsync('jwt_token', token);
      await SecureStore.setItemAsync('user_data', JSON.stringify(user));
    }
    set({ token, user, isLoading: false });
  },
  logout: async () => {
    if (Platform.OS === 'web') {
      localStorage.removeItem('jwt_token');
      localStorage.removeItem('user_data');
    } else {
      await SecureStore.deleteItemAsync('jwt_token');
      await SecureStore.deleteItemAsync('user_data');
    }
    set({ token: null, user: null, isLoading: false });
  },
  restoreToken: async () => {
    try {
      let token = null;
      let userData = null;

      if (Platform.OS === 'web') {
        token = localStorage.getItem('jwt_token');
        userData = localStorage.getItem('user_data');
      } else {
        token = await SecureStore.getItemAsync('jwt_token');
        userData = await SecureStore.getItemAsync('user_data');
      }

      if (token && userData) {
        set({ token, user: JSON.parse(userData), isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (e) {
      set({ isLoading: false });
    }
  },
}));
