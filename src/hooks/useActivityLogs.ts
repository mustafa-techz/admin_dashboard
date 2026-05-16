import { useQuery } from '@tanstack/react-query';
import { activityService } from '@/services/activityService';
import { useAuthStore } from '@/store/authStore';
import { queryKeys } from '@/lib/queryKeys';

export const useActivityLogs = (branchId?: string, limitCount = 20) => {
  const user = useAuthStore(state => state.user);
  
  return useQuery({
    queryKey: queryKeys.activityLogs.byBranch(branchId),
    queryFn: () => activityService.getRecentActivities(branchId, limitCount),
    enabled: !!user && user.role === 'admin', // Only admins can view logs
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};
