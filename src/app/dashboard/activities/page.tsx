'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { activityService } from '@/services/activityService';
import { useAuthStore } from '@/store/authStore';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  CheckCircle, 
  Clock, 
  BookOpen, 
  UserPlus, 
  Info, 
  Megaphone,
  ArrowLeft,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ActivityAction, ActivityLog } from '@/types/activity';
import { queryKeys } from '@/lib/queryKeys';

const isFirestoreId = (val: unknown): boolean => 
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

export default function ActivitiesPage() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  
  // For simplicity, we fetch 50 for the full page
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: queryKeys.activityLogs.full,
    queryFn: () => activityService.getRecentActivities(undefined, 50),
    enabled: !!user && user.role === 'admin',
  });

  if (isError) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load activities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={() => router.back()}
          className="p-2 hover:bg-muted rounded-full transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="flex-1">
          <h2 className="text-3xl font-black tracking-tight">System Logs</h2>
          <p className="text-muted-foreground mt-1 font-medium">Detailed audit trail of all recent school activities.</p>
        </div>
        <button 
          onClick={() => refetch()}
          disabled={isFetching}
          className={cn(
            "flex items-center gap-2 px-4 py-2 bg-muted hover:bg-muted/80 rounded-xl transition-all font-bold text-sm",
            isFetching && "opacity-50 cursor-not-allowed"
          )}
        >
          <RefreshCw size={16} className={cn(isFetching && "animate-spin")} />
          {isFetching ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
        <div className="divide-y divide-border">
          {isLoading ? (
            <div className="p-12 space-y-6">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="shrink-0 h-12 w-12 rounded-full bg-muted"></div>
                  <div className="flex-1 space-y-2 py-1">
                    <div className="h-4 bg-muted rounded w-1/4"></div>
                    <div className="h-3 bg-muted rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : data?.activities.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              No activities recorded yet.
            </div>
          ) : (
            data?.activities.map((activity) => {
              const config = getActivityConfig(activity.action);
              const Icon = config.icon;
              
              return (
                <div key={activity.id} className="p-6 flex items-start gap-4 hover:bg-muted/30 transition-colors group">
                  <div className={cn(
                    "shrink-0 h-12 w-12 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110",
                    config.colorClass
                  )}>
                    <Icon size={24} />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black text-foreground tracking-tight">
                          {config.title}
                        </h4>
                        <span className="h-1 w-1 rounded-full bg-border"></span>
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-wider">
                          {activity.actorRole}
                        </span>
                      </div>
                      <span className="text-xs font-medium text-muted-foreground">
                        {formatDistanceToNow(activity.createdAt, { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-foreground/80 font-medium leading-relaxed">
                      {formatActionText(activity)}
                    </p>
                    {activity.metadata && Object.keys(activity.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {Object.entries(activity.metadata).map(([key, value]) => (
                          value && !isFirestoreId(value) ? (
                            <span key={key} className="text-[10px] px-2 py-0.5 bg-muted rounded-md text-muted-foreground font-bold">
                              {key}: {String(value)}
                            </span>
                          ) : null
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="shrink-0 self-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </div>
                </div>
              );
            })
          )}
        </div>
        
        {data && data.activities.length >= 50 && (
          <div className="p-6 bg-muted/30 text-center">
            <p className="text-xs font-bold text-muted-foreground italic">
              Showing the latest 50 activities. Contact technical support for older logs.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
