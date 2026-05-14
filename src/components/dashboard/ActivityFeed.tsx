import { cn } from '@/lib/utils';
import { Calendar, User, CheckCircle, Clock, BookOpen, UserPlus, Info, Megaphone, RefreshCw } from 'lucide-react';
import { useActivityLogs } from '@/hooks/useActivityLogs';
import { formatDistanceToNow } from 'date-fns';
import { ActivityAction, ActivityLog } from '@/types/activity';
import { useRouter } from 'next/navigation';
import React from 'react';

const isFirestoreId = (val: any) => 
  typeof val === 'string' && val.length >= 15 && /^[a-zA-Z0-9_-]+$/.test(val);

const getActivityConfig = (action: ActivityAction) => {
  switch (action) {
    case 'attendance_submitted':
    case 'attendance_updated':
      return {
        icon: Calendar,
        colorClass: "bg-green-100 text-green-600",
        title: 'Attendance',
      };
    case 'marks_entered':
    case 'marks_updated':
    case 'exam_published':
      return {
        icon: BookOpen,
        colorClass: "bg-blue-100 text-blue-600",
        title: 'Academics',
      };
    case 'fee_created':
    case 'fee_updated':
    case 'fee_collected':
      return {
        icon: CheckCircle,
        colorClass: "bg-amber-100 text-amber-600",
        title: 'Fees',
      };
    case 'student_created':
    case 'student_updated':
    case 'teacher_created':
    case 'teacher_updated':
      return {
        icon: UserPlus,
        colorClass: "bg-purple-100 text-purple-600",
        title: 'Users',
      };
    case 'timetable_created':
    case 'timetable_updated':
    case 'event_created':
    case 'event_published':
    case 'event_deleted':
      return {
        icon: Clock,
        colorClass: "bg-indigo-100 text-indigo-600",
        title: 'Schedule',
      };
    case 'broadcast_sent':
      return {
        icon: Megaphone,
        colorClass: "bg-rose-100 text-rose-600",
        title: 'Broadcast',
      };
    default:
      return {
        icon: Info,
        colorClass: "bg-gray-100 text-gray-600",
        title: 'Activity',
      };
  }
};

const formatActionText = (log: ActivityLog): string => {
  const actor = log.actorName;
  const role = log.actorRole === 'sub-admin' ? 'Sub-admin' : log.actorRole === 'teacher' ? 'Teacher' : 'Admin';
  
  switch (log.action) {
    case 'attendance_submitted':
      return `${role} ${actor} submitted attendance for ${log.metadata?.className || 'Class'} ${log.metadata?.sectionName || ''}`;
    case 'attendance_updated':
      return `${role} ${actor} updated attendance for ${log.metadata?.className || 'Class'} ${log.metadata?.sectionName || ''}`;
    case 'marks_entered':
      return `${role} ${actor} entered marks for ${log.metadata?.assessmentName || 'assessment'}`;
    case 'exam_published':
      return `${role} ${actor} published exam results for ${log.metadata?.className || 'Class'}`;
    case 'fee_collected':
      return `${role} ${actor} collected fee for ${log.metadata?.studentName || 'student'}`;
    case 'fee_created':
      return `${role} ${actor} created a new fee structure`;
    case 'student_created':
      return `${role} ${actor} added a new student`;
    case 'teacher_created':
      return `${role} ${actor} added a new teacher`;
    case 'timetable_updated':
      return `${role} ${actor} updated timetable for ${log.metadata?.className || 'Class'} ${log.metadata?.sectionName || ''}`;
    case 'broadcast_sent':
      return `${role} ${actor} sent a broadcast message`;
    default:
      return `${role} ${actor} performed an action (${log.action.replace(/_/g, ' ')})`;
  }
};

const ActivityFeed = React.memo(function ActivityFeed({ branchId }: { branchId?: string }) {
  const { data, isLoading, isError, refetch, isFetching } = useActivityLogs(branchId, 5);
  const router = useRouter();

  // If error or no admin user, hide or show fallback
  if (isError) return null;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-soft p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold tracking-tight">Recent Activity</h3>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => refetch()}
            disabled={isFetching}
            className={cn(
              "p-1.5 hover:bg-muted rounded-full transition-all text-muted-foreground",
              isFetching && "animate-spin text-primary"
            )}
            title="Refresh"
          >
            <RefreshCw size={14} />
          </button>
          <button 
            onClick={() => router.push('/dashboard/activities')}
            className="text-xs font-semibold text-primary hover:underline"
          >
            View All
          </button>
        </div>
      </div>
      
      <div className="space-y-6">
        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="shrink-0 h-10 w-10 rounded-full bg-muted"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3"></div>
                  <div className="h-3 bg-muted rounded w-3/4"></div>
                </div>
              </div>
            ))}
          </div>
        ) : data?.activities.length === 0 ? (
          <div className="text-center py-6 text-sm text-muted-foreground">
            No recent activity found.
          </div>
        ) : (
          data?.activities.map((activity) => {
            const config = getActivityConfig(activity.action);
            const Icon = config.icon;
            
            return (
              <div key={activity.id} className="flex gap-4 group">
                <div className={cn(
                  "shrink-0 h-10 w-10 rounded-full flex items-center justify-center transition-transform group-hover:scale-110",
                  config.colorClass
                )}>
                  <Icon size={18} />
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-sm font-bold text-foreground tracking-tight truncate mr-2">
                      {config.title}
                    </h4>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase whitespace-nowrap">
                      {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {formatActionText(activity)}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
