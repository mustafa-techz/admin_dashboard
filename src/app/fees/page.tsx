'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import FeeCreationForm from '@/components/fees/FeeCreationForm';
import FeeStructuresList from '@/components/fees/FeeStructuresList';
import AdminStudentFeeOverview from '@/components/fees/AdminStudentFeeOverview';
import ParentFeeDashboard from '@/components/fees/ParentFeeDashboard';

import { cn } from '@/lib/utils';
import {
  IndianRupee,
  PlusCircle,
  LayoutList,
  Users,
  RefreshCw,
} from 'lucide-react';

import { studentService } from '@/services/studentService';

type AdminTab = 'structures' | 'create' | 'students';

const ADMIN_TABS: {
  key: AdminTab;
  label: string;
  icon: React.ReactNode;
}[] = [
    {
      key: 'structures',
      label: 'Fee Structures',
      icon: <LayoutList size={16} />,
    },
    {
      key: 'create',
      label: 'Create Fee',
      icon: <PlusCircle size={16} />,
    },
    {
      key: 'students',
      label: 'Student Fees',
      icon: <Users size={16} />,
    },
  ];

// Parent Dashboard Wrapper
function ParentFeeDashboardWrapper({
  userId,
}: {
  userId: string;
}) {
  const { data: student, isLoading } = useQuery({
    queryKey: ['studentByParent', userId],
    queryFn: () =>
      studentService.getStudentByParentUserId(userId),
    enabled: !!userId,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!student) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
        <h3 className="text-lg font-bold text-foreground">
          Student Not Found
        </h3>

        <p className="text-sm text-muted-foreground mt-1">
          We could not find a student record associated
          with your account.
        </p>
      </div>
    );
  }

  return <ParentFeeDashboard studentId={student.id} />;
}

export default function FeesPage() {
  const { role, user } = useAuthStore();

  const router = useRouter();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] =
    useState<AdminTab>('structures');

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const lastRefreshTime = useRef(0);

  // Block teachers
  useEffect(() => {
    if (role === 'teacher') {
      router.replace('/dashboard');
    }
  }, [role, router]);

  // Refresh Handler
  const handleRefresh = async () => {
    const now = Date.now();

    // Prevent spam clicking
    if (
      now - lastRefreshTime.current < 5000 ||
      isRefreshing
    ) {
      return;
    }

    lastRefreshTime.current = now;

    setIsRefreshing(true);

    try {
      // Refetch student query
      await queryClient.invalidateQueries({
        queryKey: ['studentByParent', user?.id],
      });

      // Refetch all fee data (assignments, installments, structures)
      await queryClient.invalidateQueries({
        queryKey: ['fees'],
      });
    } catch (error) {
      console.error('Refresh failed:', error);
    } finally {
      setTimeout(() => {
        setIsRefreshing(false);
      }, 1500);
    }
  };

  if (role === 'teacher') return null;

  // Parent View
  if (role === 'parent') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">

          {/* Left */}
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <IndianRupee
                size={20}
                className="text-primary"
              />
            </div>

            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">
                Fee Dashboard
              </h1>

              <p className="text-sm text-muted-foreground">
                View your child&apos;s fee details and
                payment status.
              </p>
            </div>
          </div>

          {/* Refresh Button */}
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className="bg-primary/10 px-4 py-3 rounded-xl border border-primary/20 hover:bg-primary/15 transition-all flex items-center justify-center gap-2 w-full sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw
              size={18}
              className={`text-primary ${isRefreshing ? 'animate-spin' : ''
                }`}
            />

            <p className="text-sm font-black text-foreground">
              {isRefreshing
                ? 'Refreshing...'
                : 'Refresh'}
            </p>
          </button>
        </div>

        {/* Content */}
        {!user?.id ? (
          <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
            <h3 className="text-lg font-bold text-foreground">
              Account Error
            </h3>

            <p className="text-sm text-muted-foreground mt-1">
              Your account is not properly authenticated.
            </p>
          </div>
        ) : (
          <ParentFeeDashboardWrapper
            userId={user.id}
          />
        )}
      </div>
    );
  }

  // Admin / Sub-admin View
  return (
    <div className="space-y-6 animate-in fade-in duration-500">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">

        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <IndianRupee
              size={20}
              className="text-primary"
            />
          </div>

          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">
              Fees Management
            </h1>

            <p className="text-sm text-muted-foreground">
              Create, manage, and track student fees.
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-1.5 flex gap-1 overflow-x-auto">

        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 min-w-fit flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 whitespace-nowrap',
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.icon}

            <span className="hidden sm:inline">
              {tab.label}
            </span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div>
        {activeTab === 'structures' && (
          <FeeStructuresList />
        )}

        {activeTab === 'create' && (
          <FeeCreationForm />
        )}

        {activeTab === 'students' && (
          <AdminStudentFeeOverview />
        )}
      </div>
    </div>
  );
}