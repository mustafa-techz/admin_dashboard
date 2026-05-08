'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import FeeCreationForm from '@/components/fees/FeeCreationForm';
import FeeStructuresList from '@/components/fees/FeeStructuresList';
import AdminStudentFeeOverview from '@/components/fees/AdminStudentFeeOverview';
import ParentFeeDashboard from '@/components/fees/ParentFeeDashboard';
import { cn } from '@/lib/utils';
import { IndianRupee, PlusCircle, LayoutList, Users } from 'lucide-react';

type AdminTab = 'structures' | 'create' | 'students';

const ADMIN_TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'structures', label: 'Fee Structures', icon: <LayoutList size={16} /> },
  { key: 'create', label: 'Create Fee', icon: <PlusCircle size={16} /> },
  { key: 'students', label: 'Student Fees', icon: <Users size={16} /> },
];

import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';

// Wrapper for parent dashboard to fetch student ID
function ParentFeeDashboardWrapper({ rollNumber }: { rollNumber: string }) {
  const { data: student, isLoading } = useQuery({
    queryKey: ['studentByRoll', rollNumber],
    queryFn: () => studentService.getStudentByRollNumber(rollNumber),
    enabled: !!rollNumber,
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
        <h3 className="text-lg font-bold text-foreground">Student Not Found</h3>
        <p className="text-sm text-muted-foreground mt-1">
          We could not find a student record associated with your account.
        </p>
      </div>
    );
  }

  return <ParentFeeDashboard studentId={student.id} />;
}

export default function FeesPage() {
  const { role, user } = useAuthStore();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>('structures');

  // Block teachers from accessing this page
  useEffect(() => {
    if (role === 'teacher') {
      router.replace('/dashboard');
    }
  }, [role, router]);

  if (role === 'teacher') return null;

  // Parent view
  if (role === 'parent') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <IndianRupee size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Fee Dashboard</h1>
            <p className="text-sm text-muted-foreground">View your child&apos;s fee details and payment status.</p>
          </div>
        </div>
        
        {!user?.studentRollNumber ? (
          <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
            <h3 className="text-lg font-bold text-foreground">No Linked Student</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Your account is not linked to any student roll number.
            </p>
          </div>
        ) : (
          <ParentFeeDashboardWrapper rollNumber={user.studentRollNumber} />
        )}
      </div>
    );
  }

  // Admin / Sub-admin view
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <IndianRupee size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Fees Management</h1>
            <p className="text-sm text-muted-foreground">Create, manage, and track student fees.</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-1.5 flex gap-1">
        {ADMIN_TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              'flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200',
              activeTab === tab.key
                ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {tab.icon}
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'structures' && <FeeStructuresList />}
        {activeTab === 'create' && <FeeCreationForm />}
        {activeTab === 'students' && <AdminStudentFeeOverview />}
      </div>
    </div>
  );
}
