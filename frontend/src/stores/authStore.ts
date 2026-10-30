import { create } from 'zustand';
import { User } from '../types';
import { api } from '../services/api';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (username: string, pass: string) => Promise<boolean>;
  logout: () => void;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('fyj_remote_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  token: localStorage.getItem('fyj_remote_token'),
  isAuthenticated: !!localStorage.getItem('fyj_remote_token'),
  isLoading: false,
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.login(username, password);
      localStorage.setItem('fyj_remote_token', res.token);
      localStorage.setItem('fyj_remote_user', JSON.stringify(res.user));
      set({
        user: res.user,
        token: res.token,
        isAuthenticated: true,
        isLoading: false,
      });
      return true;
    } catch (err: any) {
      set({ error: err.message || 'Login gagal', isLoading: false });
      return false;
    }
  },

  logout: () => {
    localStorage.removeItem('fyj_remote_token');
    localStorage.removeItem('fyj_remote_user');
    set({ user: null, token: null, isAuthenticated: false, error: null });
  },

  checkAuth: async () => {
    const token = localStorage.getItem('fyj_remote_token');
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }
    try {
      const res = await api.getProfile();
      if (res.user) {
        localStorage.setItem('fyj_remote_user', JSON.stringify(res.user));
        set({ user: res.user, isAuthenticated: true });
      }
    } catch {
      localStorage.removeItem('fyj_remote_token');
      localStorage.removeItem('fyj_remote_user');
      set({ user: null, isAuthenticated: false });
    }
  },
}));
