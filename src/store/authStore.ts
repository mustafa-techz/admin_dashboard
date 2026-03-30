import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, UserRole } from '../types';

interface AuthState {
  user: User | null;
  role: UserRole | null;
  isAuthenticated: boolean;
  login: (email: string, role: UserRole) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      isAuthenticated: false,
      login: (email, role) => {
        const dummyUser: User = {
          id: 'u1',
          name: role.charAt(0).toUpperCase() + role.slice(1) + ' User',
          email: email,
          role: role,
        };
        set({ user: dummyUser, role, isAuthenticated: true });
      },
      logout: () => set({ user: null, role: null, isAuthenticated: false }),
    }),
    {
      name: 'auth-storage',
    }
  )
);
