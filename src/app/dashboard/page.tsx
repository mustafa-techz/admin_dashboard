'use client';

import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/services/mockApi';
import DashboardCard from '@/components/dashboard/DashboardCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import DashboardAnnouncements from '@/components/dashboard/DashboardAnnouncements';
import StatCircle from '@/components/shared/StatCircle';
import { Users, UserCheck, BookOpen, AlertCircle, Calendar, Activity as ActivityIcon, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { DashboardStats } from '@/types';
import { fetchUserDashboardReminders } from '@/services/reminderService';
import { DashboardReminderCard } from '@/components/reminders/DashboardReminderCard';
import { ReminderPopup } from '@/components/reminders/ReminderPopup';
import { studentService } from '@/services/studentService';
import { usePendingFeeInstallments } from '@/hooks/useFees';
import { useStudents } from '@/hooks/useStudents';
import { useMemo } from 'react';
import { Reminder } from '@/types/reminder';


export default function DashboardPage() {
  const { role } = useAuthStore();
  const { user } = useAuth();
  const router = useRouter();

  const { data: stats, isLoading: statsLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

  // Fetch reminders for the logged-in user (from Firestore)
  const { data: dbReminders = [], isLoading: remindersLoading } = useQuery({
    queryKey: ['dashboardReminders', user?.uid],
    queryFn: () => user?.uid ? fetchUserDashboardReminders(user.uid) : Promise.resolve([]),
    enabled: !!user?.uid,
  });

  // Dynamically fetch pending fee installments for parents
  const { data: student } = useQuery({
    queryKey: ['studentByParent', user?.uid],
    queryFn: () => user?.uid ? studentService.getStudentByParentUserId(user.uid) : Promise.resolve(null),
    enabled: role === 'parent' && !!user?.uid,
  });

  const { data: pendingInstallments = [], isLoading: pendingFeesLoading } = usePendingFeeInstallments(student?.id || '');

  // Generate dynamic reminders from pending fees (Sequential: Only next active unpaid installment)
  const dynamicFeeReminders: Reminder[] = useMemo(() => {
    // pendingInstallments is already sorted by dueDate from the service
    const nextInst = pendingInstallments[0] as any;
    if (!nextInst) return [];

    const due = new Date(nextInst.dueDate).getTime();
    const now = new Date();
    now.setHours(0, 0, 0, 0); // Start of today
    const dueDate = new Date(nextInst.dueDate);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - now.getTime();
    const daysToDue = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    // Reminder Conditions
    // 5 days or less -> Dashboard
    // 3 days or less -> Popup
    // 0 days or less -> High Priority

    if (daysToDue > 7) return []; // Not yet time for dashboard/popup

    const channels: string[] = ['DASHBOARD'];
    if (daysToDue <= 3) {
      channels.push('POPUP');
    }

    const title = daysToDue === 0
      ? '⚠ Fee Due Today'
      : daysToDue === 1
        ? '⚠ Fee Due Tomorrow'
        : daysToDue < 0
          ? '🚨 Fee Overdue'
          : `⚠ Fee Due in ${daysToDue} Days`;

    return [{
      id: `dynamic-fee-${nextInst.id}`,
      type: 'FEE',
      title,
      message: `Your installment "${nextInst.installmentName}" of ₹${nextInst.amountPending} is ${daysToDue < 0 ? 'overdue' : 'pending'}. Please pay to avoid late fees.`,
      targetRole: 'PARENT',
      targetUserIds: [user?.uid || ''],
      branchId: nextInst.branchId,
      priority: daysToDue <= 0 ? 'HIGH' : 'MEDIUM',
      deliveryChannels: channels as any[],
      scheduledAt: due,
      status: 'PENDING',
      createdAt: Date.now(),
      metadata: {
        dueDate: nextInst.dueDate,
        amount: nextInst.amountPending,
        studentFeeInstallmentId: nextInst.id,
      }
    }];
  }, [pendingInstallments, user?.uid]);

  // Combine Firestore reminders with dynamic ones
  const reminders = useMemo(() => {
    // BEST PRACTICE: Ignore Firestore FEE reminders to prevent duplicates
    // and rely 100% on dynamic zero-cost calculation which enforces the 7-day rule perfectly.
    const nonFeeDbReminders = dbReminders.filter(r => r.type !== 'FEE');
    return [...nonFeeDbReminders, ...dynamicFeeReminders];
  }, [dbReminders, dynamicFeeReminders]);

  const isLoading = statsLoading || remindersLoading;
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-foreground">
            Hi, {(user?.displayName || user?.email || 'User').split(' ')[0]} 👋
          </h2>
          <p className="text-muted-foreground mt-1 font-medium">
            Here&apos;s what&apos;s happening at your school today.
          </p>
        </div>
        {role === 'admin' && (
          <div className="flex items-center gap-3 self-start md:self-center">
            <button
              onClick={() => router.push('/create')} className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 self-start md:self-center">
              <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-1">Create +</p>
              <p className="text-sm font-black text-foreground">Class / Section / Branch</p>
            </button>
            <button
              onClick={() => router.push('/users')} className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 self-start md:self-center">
              <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-1">Create +</p>
              <p className="text-sm font-black text-foreground">Users</p>
            </button>
          </div>
        )}
      </div>

      {/* Reminders Section */}
      {(role === 'teacher' || role === 'parent') && reminders.length > 0 && (
        <div className="space-y-4 animate-in slide-in-from-bottom-4">
          {reminders
            .filter((r) => r.deliveryChannels.includes('DASHBOARD'))
            .map((reminder) => (
              <DashboardReminderCard key={reminder.id} reminder={reminder} />
            ))}
        </div>
      )}

      <div className="lg:col-span-2">
        <DashboardAnnouncements />
      </div>

      <div className="bg-card rounded-2xl border border-border shadow-soft p-8 flex flex-col md:flex-row items-center justify-around gap-8">
        <StatCircle
          value={stats?.attendanceToday.present || 0}
          total={stats?.attendanceToday.total || 400}
          label="Students Present"
          subLabel="Last updated 10m ago"
        />

        <div className="flex-1 space-y-4 max-w-sm">
          <h3 className="text-xl font-black tracking-tight">Daily Attendance</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The attendance rate for today is <span className="text-primary font-bold">83.5%</span>.
            This is a <span className="text-green-600 font-bold">2.4% increase</span> compared to yesterday.
          </p>
          <div className="pt-2">
            <button className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
              View Detailed Report
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Role-based Widgets */}
        {(role === 'admin' || role === 'sub-admin') && (
          <>
            <DashboardCard
              title="Total Students"
              value={stats?.totalStudents || 0}
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
          </>
        )}

        {role === 'teacher' && (
          <TeacherDashboardCards />
        )}

        <DashboardCard
          title="Attendance Today"
          value={`${stats?.attendanceToday.present} / ${stats?.attendanceToday.total}`}
          icon={<Calendar size={24} />}
          description="83% average attendance"
        />

        {(role === 'admin') && (
          <DashboardCard
            title="Global Activity"
            value="High"
            icon={<ActivityIcon size={24} />}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          {role === "admin" ? <ActivityFeed /> : (
            <div className="bg-primary/5 rounded-2xl border border-primary/10 p-6 flex flex-col items-center justify-center text-center space-y-3 h-full">
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                <Calendar size={24} />
              </div>
              <h4 className="text-sm font-bold">School Calendar</h4>
              <p className="text-xs text-muted-foreground">Check out the upcoming school events and holidays in the announcements section.</p>
            </div>
          )}
        </div>
      </div>

      {/* Render the Popup */}
      <ReminderPopup reminders={reminders} />
    </div>
  );
}

/** Isolated teacher dashboard cards — scoped student count */
function TeacherDashboardCards() {
  const { students, isLoading } = useStudents();
  return (
    <>
      <DashboardCard
        title="My Students"
        value={isLoading ? '...' : students.length}
        icon={<BookOpen size={24} />}
      />
      <DashboardCard
        title="Student Alerts"
        value="0"
        icon={<AlertCircle size={24} />}
        description="No alerts at this time"
      />
    </>
  );
}
