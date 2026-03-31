'use client';

import { useAuthStore } from '@/store/authStore';
import { useAuth } from '@/hooks/useAuth';
import { useQuery } from '@tanstack/react-query';
import { getDashboardStats } from '@/services/mockApi';
import DashboardCard from '@/components/dashboard/DashboardCard';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import StatCircle from '@/components/shared/StatCircle';
import { Users, UserCheck, BookOpen, AlertCircle, Calendar, Activity as ActivityIcon } from 'lucide-react';
import { DashboardStats } from '@/types';

export default function DashboardPage() {
  const { role } = useAuthStore();
  const { user, loading } = useAuth();

  const { data: stats, isLoading } = useQuery<DashboardStats>({
    queryKey: ['dashboardStats'],
    queryFn: getDashboardStats,
  });

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
            Here's what's happening at your school today.
          </p>
        </div>
        <div className="bg-primary/10 px-4 py-2 rounded-xl border border-primary/20 self-start md:self-center">
          <p className="text-xs font-bold text-primary uppercase tracking-widest leading-none mb-1">Current Role</p>
          <p className="text-sm font-black text-foreground capitalize">{role}</p>
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
            />
            <DashboardCard
              title="Total Teachers"
              value={stats?.totalTeachers || 0}
              icon={<UserCheck size={24} />}
              trend={{ value: 2, isUp: true }}
            />
          </>
        )}

        {role === 'teacher' && (
          <>
            <DashboardCard
              title="My Students"
              value="42"
              icon={<BookOpen size={24} />}
            />
            <DashboardCard
              title="Student Alerts"
              value="3"
              icon={<AlertCircle size={24} />}
              description="Action required for 3 students"
              className="border-red-100"
            />
          </>
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
        <div className="lg:col-span-2">
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
        </div>

        <div className="lg:col-span-1">
          <ActivityFeed />
        </div>
      </div>
    </div>
  );
}
