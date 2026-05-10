import { UserRole } from '@/types/user';

/**
 * Centralized permission checks for role-based access control.
 * Single source of truth for all role/scope logic in the application.
 */

/** Roles that can see and use the branch dropdown selector */
export const BRANCH_SELECTOR_ROLES: UserRole[] = ['admin', 'sub-admin', 'teacher'];

/** Roles that have unrestricted access to all branches */
export const ADMIN_ROLES: UserRole[] = ['admin', 'sub-admin'];

/** Check if a role can see the branch selector */
export function canSelectBranch(role: UserRole | null): boolean {
  return !!role && BRANCH_SELECTOR_ROLES.includes(role);
}

/** Check if a role has full admin-level access */
export function isAdminRole(role: UserRole | null): boolean {
  return !!role && ADMIN_ROLES.includes(role);
}

/** Check if the user is a teacher with scoped access */
export function isTeacherRole(role: UserRole | null): boolean {
  return role === 'teacher';
}

/** Check if the user is a parent */
export function isParentRole(role: UserRole | null): boolean {
  return role === 'parent';
}
