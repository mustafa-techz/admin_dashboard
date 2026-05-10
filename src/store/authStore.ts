import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserRole } from '@/types/user';

interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  studentRollNumber?: string;
  /** Teacher: assigned branch IDs (multi-branch support) */
  branchIds?: string[];
  /** Teacher: legacy single branch ID */
  branchId?: string;
  /** Teacher: assigned class IDs */
  classIds?: string[];
  /** Teacher: class teacher of (classId) */
  classTeacherOf?: string;
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
