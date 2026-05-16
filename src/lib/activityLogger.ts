import { activityService } from '@/services/activityService';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { ActivityAction } from '@/types/activity';

export const logActivity = async (
  action: ActivityAction,
  entityType: string,
  entityId: string,
  metadata?: Record<string, unknown>
) => {
  try {
    const user = useAuthStore.getState().user;
    if (!user) return;

    // Only track admins, sub-admins, and teachers
    if (user.role === 'parent') return;

    const { selectedBranch } = useBranchStore.getState();
    const branchId = selectedBranch?.id || user.branchId || user.branchIds?.[0] || 'system';

   await activityService.logActivity({
  actorId: user.id,
  actorName: user.name,
  actorRole: user.role,
  branchId,
  action,
  entityType,
  entityId,
  ...(metadata ? { metadata } : {}),
});
  } catch (error) {
    // Silently fail to avoid breaking main application flows
    console.error('Failed to log activity:', error);
  }
};
