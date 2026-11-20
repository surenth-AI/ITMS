import { create } from 'zustand';

interface User {
  id: string;
  full_name: string;
  role: string;
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('jwt_token'),
  user: JSON.parse(localStorage.getItem('user_data') || 'null'),
  login: (token, user) => {
    localStorage.setItem('jwt_token', token);
    localStorage.setItem('user_data', JSON.stringify(user));
    set({ token, user });
  },
  logout: () => {
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user_data');
    set({ token: null, user: null });
  },
}));
