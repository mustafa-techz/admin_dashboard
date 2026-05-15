'use client';

import { useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { UserRole } from '@/types/user';

interface RoleGuardProps {
  /** Roles allowed to access the page */
  allowedRoles: UserRole[];
  /** Where to redirect if not authorized */
  redirectTo?: string;
  /** Page content */
  children: ReactNode;
  /** Optional fallback to show while checking */
  fallback?: ReactNode;
}

/**
 * Centralized role-based access guard for page-level components.
 * Redirects unauthorized users and renders nothing during the check.
 */
export default function RoleGuard({
  allowedRoles,
  redirectTo = '/dashboard',
  children,
  fallback = null,
}: RoleGuardProps) {
  const role = useAuthStore(state => state.role);
  const isAuthenticated = useAuthStore(state => state.isAuthenticated);
  const router = useRouter();

  useEffect(() => {
    // Only redirect once we know the role — prevent flash-redirect on hydration
    if (role && !allowedRoles.includes(role)) {
      router.replace(redirectTo);
    }
  }, [role, allowedRoles, redirectTo, router]);

  // Still loading auth state
  if (!isAuthenticated || !role) {
    return <>{fallback}</>;
  }

  // Role not in allowed list — show nothing while redirecting
  if (!allowedRoles.includes(role)) {
    return null;
  }

  return <>{children}</>;
}
