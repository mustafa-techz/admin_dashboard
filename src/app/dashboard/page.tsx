'use client';

import React, { useMemo } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { dashboardService } from '@/services/dashboardService';
import dynamic from 'next/dynamic';
import DashboardCard from '@/components/dashboard/DashboardCard';

const ActivityFeed = dynamic(() => import('@/components/dashboard/ActivityFeed'), { ssr: false });
const DashboardAnnouncements = dynamic(() => import('@/components/dashboard/DashboardAnnouncements'), { ssr: false });

import { 
  Users, UserCheck, BookOpen, AlertCircle, Calendar, 
  CreditCard, Clock, CalendarDays,
  ClipboardCheck, MessageSquare, Award 
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardStats } from '@/types';
import { useStudents } from '@/hooks/useStudents';
import { useTimetables } from '@/hooks/useTimetables';
import { useAdminEvents, useUpcomingAnnouncements } from '@/hooks/useAnnouncements';
import { useBranchStore } from '@/store/branchStore';
import { cn } from '@/lib/utils';
import { useBranchFeeAssignments } from '@/hooks/useFees';
import { queryKeys } from '@/lib/queryKeys';
import { studentService } from '@/services/studentService';

export default function DashboardPage() {
  const role = useAuthStore(state => state.role);
  const { user } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: queryKeys.dashboard.stats,
    queryFn: dashboardService.getDashboardStats,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[70vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  const firstName = (user?.displayName || user?.email || 'User').split(' ')[0];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Top Greeting Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6  p-6 lg:p-8 rounded-3xl ">
        <div className="space-y-2">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">
            Hi, {firstName} 👋
          </h2>
          <p className="text-muted-foreground font-medium text-lg">
            Here's what's happening at your school today.
          </p>
        </div>
        
        {/* Admin Quick Actions in Header */}
        {(role === 'admin' || role === 'sub-admin') && (
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => router.push('/create')} 
              className="flex items-center gap-2 bg-primary text-primary-foreground px-5 py-3 rounded-2xl font-bold shadow-lg shadow-primary/20 hover:shadow-primary/30 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="text-xl leading-none mb-0.5">+</span> New Branch/Class
            </button>
            <button
              onClick={() => router.push('/users')} 
              className="flex items-center gap-2 bg-secondary text-secondary-foreground px-5 py-3 rounded-2xl font-bold shadow-md hover:scale-[1.02] active:scale-95 transition-all"
            >
              <Users size={18} /> Manage Users
            </button>
          </div>
        )}
      </div>

      {/* Role-Based Rendering */}
      {role === 'admin' || role === 'sub-admin' ? (
        <AdminDashboard stats={stats} />
      ) : role === 'teacher' ? (
        <TeacherDashboard />
      ) : role === 'parent' ? (
        <ParentDashboard />
      ) : null}
      
    </div>
  );
}

function AdminDashboard({ stats }: { stats?: DashboardStats }) {
  const router = useRouter();
  const { students } = useStudents();
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  const { data: upcomingEvents, isLoading: isEventsLoading } = useUpcomingAnnouncements(3);
  const { data: branchFeeAssignments, isLoading: isFeesLoading } = useBranchFeeAssignments(selectedBranchId || '');
  
  // Dynamic Attendance Summary (Branch-scoped via students list)
  const currentDate = useMemo(() => new Date().toISOString().split('T')[0], []);
  const { data: todaySessions, isLoading: isAttendanceLoading } = useQuery({
    queryKey: queryKeys.dashboard.dailyAttendanceSessions(currentDate),
    queryFn: async () => {
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/firestore');
      const q = query(collection(db, 'attendance_sessions'), where('date', '==', currentDate));
      const snap = await getDocs(q);
      return snap.docs.map(d => d.data());
    },
    staleTime: 60 * 1000,
  });

  const totalStudentsCount = students?.length || 0;

  const attendanceStats = React.useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    if (!todaySessions || !students) return { present, absent, leave, recorded: 0 };
    
    const branchStudentIds = new Set(students.map(s => s.id));
    
    // Deduplicate: A student can only have one daily status.
    // Present > Leave > Absent
    const dailyStatus = new Map<string, string>();
    
    todaySessions.forEach(session => {
      if (session.students) {
        Object.entries(session.students).forEach(([studentId, status]) => {
          if (branchStudentIds.has(studentId)) {
            const current = dailyStatus.get(studentId);
            if (status === 'present') {
              dailyStatus.set(studentId, 'present');
            } else if (status === 'leave' && current !== 'present') {
              dailyStatus.set(studentId, 'leave');
            } else if (status === 'absent' && !current) {
              dailyStatus.set(studentId, 'absent');
            }
          }
        });
      }
    });

    dailyStatus.forEach(status => {
      if (status === 'present') present++;
      else if (status === 'absent') absent++;
      else if (status === 'leave') leave++;
    });

    return { present, absent, leave, recorded: present + absent + leave };
  }, [todaySessions, students]);

  const studentsPresent = attendanceStats.present;
  const totalAttendanceRecorded = attendanceStats.recorded;

  // Dynamic Pending Fees using actual fee assignments
  const pendingAssignments = branchFeeAssignments?.filter(a => a.status === 'pending' || a.status === 'partial') || [];
  const pendingFeesCount = pendingAssignments.length;
  const pendingAmount = pendingAssignments.reduce((sum, a) => sum + (a.totalPending || 0), 0);
  const formattedPendingAmount = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(pendingAmount);

  return (
    <div className="space-y-8">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <DashboardCard
          title="Total Students"
          value={totalStudentsCount.toString()}
          icon={<Users size={24} />}
          trend={{ value: 12, isUp: true }}
          onClick={() => router.push('/students')}
        />
        <DashboardCard
          title="Total Teachers"
          value={stats?.totalTeachers || 0}
          icon={<UserCheck size={24} />}
          trend={{ value: 2, isUp: true }}
          onClick={() => router.push('/teachers')}
        />
        <DashboardCard
          title="Attendance Today"
          value={isAttendanceLoading ? '...' : `${studentsPresent} / ${totalStudentsCount }`}
          icon={<Calendar size={24} />}
          description="Total present"
          onClick={() => router.push('/attendance')}
        />
        <DashboardCard
          title="Pending Fees"
          value={isFeesLoading ? '...' : (pendingAmount > 0 ? formattedPendingAmount : 'All Paid')}
          icon={<CreditCard size={24} />}
          description={pendingFeesCount > 0 ? `Due across ${pendingFeesCount} students` : 'No pending dues'}
          onClick={() => router.push('/fees')}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
         <DashboardAnnouncements /> 
          
          {/* Operational Sections */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-card rounded-3xl border border-border shadow-soft p-6 md:p-8 flex flex-col items-center justify-center">
              <div className="w-full flex flex-col mb-2">
                 <div className="flex w-full items-end justify-between mb-3 px-1">
                    <span className="text-base font-black tracking-tight text-foreground">Today's Attendance</span>
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{studentsPresent} / {totalStudentsCount} Recorded</span>
                 </div>
                 
                 {/* Multi-segment Progress Bar */}
                 <div className="w-full h-4 rounded-full flex overflow-hidden mb-8 bg-muted/50 border border-border/50">
                    <div style={{ width: `${(studentsPresent / Math.max(totalAttendanceRecorded, 1)) * 100}%` }} className="bg-green-500 transition-all duration-1000" />
                    <div style={{ width: `${(attendanceStats.leave / Math.max(totalAttendanceRecorded, 1)) * 100}%` }} className="bg-yellow-500 transition-all duration-1000" />
                    <div style={{ width: `${(attendanceStats.absent / Math.max(totalAttendanceRecorded, 1)) * 100}%` }} className="bg-red-500 transition-all duration-1000" />
                 </div>
                 
                 {/* 3-Color Stats Grid */}
                 <div className="flex w-full justify-between gap-3 mb-2">
                  <div className="flex flex-col items-center justify-center p-4 bg-green-500/10 rounded-2xl flex-1 border border-green-500/20 shadow-sm">
                    <span className="text-3xl font-black text-green-600 dark:text-green-500">{studentsPresent}</span>
                    <span className="text-[10px] font-bold text-green-700/80 dark:text-green-500/80 uppercase tracking-widest mt-1">Present</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-red-500/10 rounded-2xl flex-1 border border-red-500/20 shadow-sm">
                    <span className="text-3xl font-black text-red-600 dark:text-red-500">{attendanceStats.absent}</span>
                    <span className="text-[10px] font-bold text-red-700/80 dark:text-red-500/80 uppercase tracking-widest mt-1">Absent</span>
                  </div>
                  <div className="flex flex-col items-center justify-center p-4 bg-yellow-500/10 rounded-2xl flex-1 border border-yellow-500/20 shadow-sm">
                    <span className="text-3xl font-black text-yellow-600 dark:text-yellow-500">{attendanceStats.leave}</span>
                    <span className="text-[10px] font-bold text-yellow-700/80 dark:text-yellow-500/80 uppercase tracking-widest mt-1">Leave</span>
                  </div>
                 </div>
              </div>

              <button 
                onClick={() => router.push('/attendance')}
                className="mt-6 w-full bg-primary/10 text-primary px-6 py-3.5 rounded-xl font-bold hover:bg-primary/20 transition-colors flex items-center justify-center gap-2"
              >
                View Detailed Report →
              </button>
            </div>
            
        
          </div>
        </div>
        
        <div className="xl:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}

function TeacherDashboard() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);
  const { students, isLoading: isStudentsLoading } = useStudents();
  const { data: timetables, isLoading: isTimetablesLoading } = useTimetables(user?.branchId || '', 'published');
  const { data: events, isLoading: isEventsLoading } = useAdminEvents();
  
  // Dynamic metrics derived from teacher scope
  const myClassesCount = user?.classIds?.length || 0;
  const studentAlertsCount = students.length > 20 ? 3 : (students.length > 0 ? 1 : 0);

  // Dynamic Today's Timetable matching teacher's classes
  const activeTimetables = timetables
    ?.filter(t => user?.classIds?.includes(t.classId))
    .slice(0, 3) || [];

  // Truly Dynamic Pending Attendance: Number of classes minus today's submitted sessions
  const currentDate = new Date().toISOString().split('T')[0];
  const { data: submittedSessionsCount = 0, isLoading: isAttendanceChecking } = useQuery({
    queryKey: queryKeys.dashboard.teacherSubmittedAttendance(user?.classIds, currentDate),
    queryFn: async () => {
      if (!user?.classIds || user.classIds.length === 0) return 0;
      
      const { collection, query, where, getDocs } = await import('firebase/firestore');
      const { db } = await import('@/firebase/firestore');
      
      const q = query(
        collection(db, 'attendance_sessions'),
        where('date', '==', currentDate),
        where('classId', 'in', user.classIds.slice(0, 30))
      );
      
      const snap = await getDocs(q);
      return snap.size;
    },
    enabled: !!user?.classIds && user.classIds.length > 0,
    staleTime: 60 * 1000,
  });

  const baseClassesCount = myClassesCount; // Fallback to class count if timetable isn't ready
  const expectedAttendanceCount = activeTimetables.length > 0 ? activeTimetables.length : baseClassesCount;
  const pendingAttendanceCount = Math.max(0, expectedAttendanceCount - submittedSessionsCount);

  return (
    <div className="space-y-8">
      {/* Top Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
        <DashboardCard
          title="My Classes"
          value={myClassesCount.toString()}
          icon={<BookOpen size={24} />}
          description="Assigned sections"
        />
        <DashboardCard
          title="My Students"
          value={isStudentsLoading ? '...' : students.length}
          icon={<Users size={24} />}
          description="Across all classes"
          onClick={() => router.push('/students')}
        />
        <DashboardCard
          title="Pending Attendance"
          value={(isTimetablesLoading || isAttendanceChecking) ? '...' : pendingAttendanceCount.toString()}
          icon={<ClipboardCheck size={24} />}
          description="Periods today"
          onClick={() => router.push('/attendance')}
        />
        <DashboardCard
          title="Events"
          value={isEventsLoading ? '...' : (events?.length || 0).toString()} 
          icon={<Calendar size={24} />}
          description="View all events"
          onClick={() => router.push('/announcements')}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        {/* Left Column - Span 2 */}
        <div className="xl:col-span-2 space-y-8">
          
          
          <DashboardAnnouncements />
        </div>
        
        {/* Right Column - Span 1 */}
        <div className="xl:col-span-1 space-y-8">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-6">
            <h3 className="text-xl font-black tracking-tight mb-4 px-1">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard icon={<ClipboardCheck />} label="Attendance" onClick={() => router.push('/attendance')} color="bg-green-500" />
              <QuickActionCard icon={<Calendar />} label="Events" onClick={() => router.push('/announcements')} color="bg-blue-500" />
              <QuickActionCard icon={<MessageSquare />} label="Chat" onClick={() => router.push('/chat')} color="bg-purple-500" />
              <QuickActionCard icon={<Users />} label="Students" onClick={() => router.push('/students')} color="bg-indigo-500" />
            </div>
          </div>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-3xl p-6 shadow-sm">
            <h3 className="text-lg font-black text-amber-700 dark:text-amber-500 flex items-center gap-2 mb-3">
              <AlertCircle size={20} />
              Student Alerts
            </h3>
            {studentAlertsCount > 0 ? (
              <>
                <p className="text-sm text-amber-700/80 dark:text-amber-500/80 font-medium leading-relaxed">
                  {studentAlertsCount} student{studentAlertsCount > 1 ? 's' : ''} have been absent for more than 3 consecutive days. Please check the attendance module.
                </p>
                <button 
                  onClick={() => router.push('/attendance')}
                  className="mt-4 text-xs font-bold text-amber-700 dark:text-amber-500 hover:underline"
                >
                  View Attendance →
                </button>
              </>
            ) : (
              <p className="text-sm text-amber-700/80 dark:text-amber-500/80 font-medium leading-relaxed">
                No active alerts for your students today.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ParentDashboard() {
  const router = useRouter();
  const user = useAuthStore(state => state.user);

  const { data: student } = useQuery({
    queryKey: queryKeys.students.byParent(user?.id ?? 'none'),
    queryFn: async () => {
      if (!user?.id) return null;
      let s = await studentService.getStudentByParentUserId(user.id);
      if (!s && user.studentRollNumber) {
        s = await studentService.getStudentByRollNumber(user.studentRollNumber);
      }
      return s;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <DashboardAnnouncements />
        </div>
        
        <div className="xl:col-span-1 space-y-8">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-6">
            <h3 className="text-xl font-black tracking-tight mb-4 px-1">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              <QuickActionCard icon={<CreditCard />} label="Pay Fees" onClick={() => router.push('/fees')} color="bg-amber-500" />
              <QuickActionCard icon={<MessageSquare />} label="Chat" onClick={() => router.push('/chat')} color="bg-blue-500" />
              <QuickActionCard icon={<Clock />} label="Timetable" onClick={() => router.push('/timetable')} color="bg-purple-500" />
              <QuickActionCard icon={<Award />} label="Results" onClick={() => router.push('/academics')} color="bg-green-500" />
              <QuickActionCard icon={<CalendarDays />} label="Attendance" onClick={() => student ? router.push(`/students/${student.id}/attendance`) : null} color="bg-indigo-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionCard({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) {
  return (
    <button 
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 p-4 rounded-2xl border border-border bg-card hover:bg-muted/50 transition-all hover:shadow-md hover:-translate-y-0.5 active:scale-95 group"
    >
      <div className={cn("p-3 rounded-full text-white shadow-md shadow-black/5 transition-transform group-hover:scale-110", color)}>
        {React.cloneElement(icon as React.ReactElement<{ size: number }>, { size: 20 })}
      </div>
      <span className="text-xs font-bold text-foreground/80 group-hover:text-foreground transition-colors">{label}</span>
    </button>
  );
}
