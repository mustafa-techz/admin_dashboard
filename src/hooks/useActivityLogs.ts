import { useQuery } from '@tanstack/react-query';
import { activityService } from '@/services/activityService';
import { useAuthStore } from '@/store/authStore';

export const queryKeys = {
  activityLogs: {
    all: ['activityLogs'] as const,
    byBranch: (branchId?: string) => ['activityLogs', { branchId }] as const,
  }
};

export const useActivityLogs = (branchId?: string, limitCount = 20) => {
  const { user } = useAuthStore();
  
  return useQuery({
    queryKey: queryKeys.activityLogs.byBranch(branchId),
    queryFn: () => activityService.getRecentActivities(branchId, limitCount),
    enabled: !!user && user.role === 'admin', // Only admins can view logs
    staleTime: 60 * 1000, // 1 minute
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};
