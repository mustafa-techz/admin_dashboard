import { UserRole } from '@/types/user';

/**
 * Teacher-scoped data filtering utilities.
 * Used across modules to restrict class/section dropdowns and data queries.
 */

interface TeacherScopeUser {
  role: UserRole;
  classIds?: string[];
  branchIds?: string[];
  branchId?: string;
  classTeacherOf?: string;
}

/**
 * Get the classIds a user is authorized to access.
 * - Admin/Sub-admin: undefined (no restriction — see all classes)
 * - Teacher: their assigned classIds array
 * - Parent: undefined (scoped differently via studentId)
 */
export function getAuthorizedClassIds(
  user: TeacherScopeUser | null
): string[] | undefined {
  if (!user) return undefined;
  if (user.role === 'teacher') {
    // Return empty array if teacher has no assigned classes, rather than undefined (which implies admin/all)
    return user.classIds || [];
  }
  return undefined;
}

/**
 * Get the branchIds a user is authorized to access.
 * - Admin/Sub-admin: undefined (no restriction — see all branches)
 * - Teacher: their assigned branchIds array (or single branchId wrapped)
 */
export function getAuthorizedBranchIds(
  user: TeacherScopeUser | null
): string[] | undefined {
  if (!user) return undefined;
  if (user.role === 'teacher') {
    if (user.branchIds && user.branchIds.length > 0) return user.branchIds;
    if (user.branchId) return [user.branchId];
    return []; // Strict fallback: no branch info = no access, not admin access
  }
  return undefined;
}

/**
 * Filter a list of items by classId, restricting to teacher's assigned classes.
 * Returns the full list for admin/sub-admin roles.
 */
export function filterByTeacherClasses<T extends { id: string }>(
  items: T[],
  authorizedClassIds: string[] | undefined
): T[] {
  if (!authorizedClassIds) return items; // No restriction
  return items.filter((item) => authorizedClassIds.includes(item.id));
}
