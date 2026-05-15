'use client';

import { useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';

const AssessmentForm = dynamic(() => import('@/components/exams/AssessmentForm'), { ssr: false });
const AssessmentList = dynamic(() => import('@/components/exams/AssessmentList'), { ssr: false });
const MarksEntry = dynamic(() => import('@/components/exams/MarksEntry'), { ssr: false });
const ParentExamView = dynamic(() => import('@/components/exams/ParentExamView'), { ssr: false });
import { ClipboardList, PlusCircle, LayoutList, PenLine } from 'lucide-react';
import RefreshButton from '@/components/shared/RefreshButton';
import { useMemo } from 'react';

type AdminTab = 'list' | 'create' | 'marks';

const ADMIN_TABS: { key: AdminTab; label: string; icon: React.ReactNode }[] = [
  { key: 'list', label: 'Assessments', icon: <LayoutList size={16} /> },
  { key: 'create', label: 'Create', icon: <PlusCircle size={16} /> },
  { key: 'marks', label: 'Marks Entry', icon: <PenLine size={16} /> },
];

export default function ExamsPage() {
  const role = useAuthStore(state => state.role);
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  const [activeTab, setActiveTab] = useState<AdminTab>('list');

  const branchId = selectedBranchId;
  
  const examQueryKeys = useMemo(() => [['assessments'], ['studentByParent']], []);
  const adminExamQueryKeys = useMemo(() => [['assessments']], []);

  // Parent view
  if (role === 'parent') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Exams & Results</h1>
            <p className="text-sm text-muted-foreground">View exam schedules and published results.</p>
          </div>
          <div className="ml-auto">
            <RefreshButton 
              label="Sync Results"
              queryKeys={examQueryKeys} 
            />
          </div>
        </div>

        <ParentExamView />
      </div>
    );
  }

  // Admin / Teacher view
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <ClipboardList size={20} className="text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Exam Management</h1>
            <p className="text-sm text-muted-foreground">Create exams, enter marks, and publish results.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <RefreshButton 
            label="Refresh Data"
            queryKeys={adminExamQueryKeys} 
          />
        </div>
      </div>

      {/* Tab Navigation */}
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
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'list' && <AssessmentList branchId={branchId} />}
        {activeTab === 'create' && (
          <AssessmentForm
            branchId={branchId}
            onSuccess={() => setActiveTab('list')}
          />
        )}
        {activeTab === 'marks' && <MarksEntry branchId={branchId} />}
      </div>
    </div>
  );
}
