import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@/types/user';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

interface AuthState {
  user: AuthUser | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      login: (user, role) => set({ user, role, isAuthenticated: true }),
      logout: () => set({ user: null, role: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
