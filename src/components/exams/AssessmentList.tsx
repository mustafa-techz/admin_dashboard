'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useAssessments,
  useExamSchedule,
  useUpdateAssessmentStatus,
  useDeleteAssessment,
  useGenerateSummaries,
  usePublishResults,
} from '@/hooks/useAssessments';
import { useAuthStore } from '@/store/authStore';
import { classService, sectionService } from '@/services/firebase/masterDataService';
import { studentService } from '@/services/studentService';
import { assessmentService } from '@/services/assessmentService';
import { cn } from '@/lib/utils';
import { ASSESSMENT_STATUS_COLORS, ASSESSMENT_STATUS_LABELS } from '@/types/assessment';
import type { Assessment, AssessmentStatus } from '@/types/assessment';
import {
  ChevronRight,
  Globe,
  Trash2,
  Loader2,
  ClipboardList,
  Lock,
  Unlock,
  FileCheck,
  Calendar,
  Clock,
} from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

// ─────────────────────────────────────────────────────────────────
// Schedule Detail Sub-component
// ─────────────────────────────────────────────────────────────────
function ScheduleDetail({ assessmentId }: { assessmentId: string }) {
  const { data: schedule = [], isLoading } = useExamSchedule(assessmentId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (schedule.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-4">No schedule slots.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</th>
            <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Date</th>
            <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Time</th>
            <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Max Marks</th>
          </tr>
        </thead>
        <tbody>
          {schedule.map((slot) => (
            <tr key={slot.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
              <td className="py-3 font-bold">{slot.subject}</td>
              <td className="py-3 flex items-center gap-1.5 text-muted-foreground" suppressHydrationWarning>
                <Calendar size={12} />
                {new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </td>
              <td className="py-3 text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <Clock size={12} />
                  {slot.startTime} – {slot.endTime}
                </span>
              </td>
              <td className="py-3 text-right font-bold">{slot.maxMarks}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Status Action Buttons
// ─────────────────────────────────────────────────────────────────
function StatusActions({
  assessment,
  userId,
}: {
  assessment: Assessment;
  userId: string;
}) {
  const updateStatus = useUpdateAssessmentStatus();
  const generateSummaries = useGenerateSummaries();
  const publishResults = usePublishResults();
  const [errorModal, setErrorModal] = useState<{ title: string; message: string } | null>(null);

  const isPending = updateStatus.isPending || generateSummaries.isPending || publishResults.isPending;

  const nextAction = (() => {
    switch (assessment.status) {
      case 'draft':
        return {
          label: 'Publish Schedule',
          icon: <Globe size={12} />,
          color: 'bg-blue-600 text-white hover:bg-blue-700',
          action: () => updateStatus.mutate({ id: assessment.id, status: 'schedule_published' }),
        };
      case 'schedule_published':
        return {
          label: 'Open Marks Entry',
          icon: <Unlock size={12} />,
          color: 'bg-purple-600 text-white hover:bg-purple-700',
          action: () => updateStatus.mutate({ id: assessment.id, status: 'marks_open' }),
        };
      case 'marks_open':
        return {
          label: 'Lock & Generate Results',
          icon: <Lock size={12} />,
          color: 'bg-orange-600 text-white hover:bg-orange-700',
          action: async () => {
            try {
              // Validate all required marks are entered before locking
              const allStudents = await studentService.getStudents();
              const classStudents = allStudents.filter(
                (s) => s.classId === assessment.classId && s.sectionId === assessment.sectionId
              );

              if (classStudents.length === 0) {
                setErrorModal({
                  title: 'No Students Found',
                  message: 'No students found in this class/section. Cannot generate results for an empty class.',
                });
                return;
              }

              const allMarks = await assessmentService.getAllMarks(assessment.id);
              const requiredCount = classStudents.length * (assessment.subjects?.length || 0);

              if (allMarks.length < requiredCount) {
                const missingCount = requiredCount - allMarks.length;
                setErrorModal({
                  title: 'Incomplete Marks',
                  message: `Cannot lock assessment. Marks are not entered for all students/subjects. Missing ${missingCount} entries. Please ensure all marks are entered before locking.`,
                });
                return;
              }

              await updateStatus.mutateAsync({ id: assessment.id, status: 'locked' });
              await generateSummaries.mutateAsync(assessment.id);
            } catch (err) {
              console.error('Validation failed:', err);
              setErrorModal({
                title: 'Validation Failed',
                message: 'Failed to validate marks. Please check your connection and try again.',
              });
            }
          },
        };
      case 'locked':
        return {
          label: 'Publish Results',
          icon: <FileCheck size={12} />,
          color: 'bg-emerald-600 text-white hover:bg-emerald-700',
          action: () => publishResults.mutate({ assessmentId: assessment.id, publishedBy: userId }),
        };
      default:
        return null;
    }
  })();

  if (!nextAction) return null;

  return (
    <>
      <button
        type="button"
        disabled={isPending}
        onClick={(e) => {
          e.stopPropagation();
          nextAction.action();
        }}
        className={cn(
          'px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm',
          nextAction.color
        )}
      >
        {isPending ? <Loader2 size={12} className="animate-spin" /> : nextAction.icon}
        {nextAction.label}
      </button>

      {/* Validation Error Modal */}
      <ConfirmationModal
        isOpen={!!errorModal}
        onClose={() => setErrorModal(null)}
        onConfirm={() => setErrorModal(null)}
        title={errorModal?.title || 'Validation Error'}
        message={errorModal?.message || ''}
        confirmText="Understood"
        cancelText="Close"
      />
    </>
  );
}

// ─────────────────────────────────────────────────────────────────
// Assessment Card
// ─────────────────────────────────────────────────────────────────
const AssessmentCard = React.memo(function AssessmentCard({
  a,
  isSelected,
  onSelect,
  className,
  sectionName,
}: {
  a: Assessment;
  isSelected: boolean;
  onSelect: (id: string) => void;
  className: string;
  sectionName: string;
}) {
  return (
    <div
      onClick={() => onSelect(a.id)}
      className={cn(
        'text-left bg-card rounded-2xl border-2 shadow-soft p-5 transition-all duration-200 hover:shadow-md cursor-pointer',
        isSelected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="text-base font-black text-foreground truncate">{a.name}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {className} — {sectionName} · {a.academicYear}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span
            className={cn(
              'px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider whitespace-nowrap',
              ASSESSMENT_STATUS_COLORS[a.status]
            )}
          >
            {ASSESSMENT_STATUS_LABELS[a.status]}
          </span>
          <ChevronRight
            size={20}
            className={cn(
              'text-muted-foreground transition-transform',
              isSelected && 'rotate-90 text-primary'
            )}
          />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="px-2 py-0.5 bg-muted rounded-md font-bold uppercase">
          {a.type}
        </span>
        <span>{a.subjects?.length || 0} subjects</span>
      </div>
    </div>
  );
});

// ─────────────────────────────────────────────────────────────────
// Main Assessment List
// ─────────────────────────────────────────────────────────────────
export default function AssessmentList({ branchId }: { branchId: string }) {
  const { user } = useAuthStore();
  const { data: assessments = [], isLoading } = useAssessments(branchId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const deleteMutation = useDeleteAssessment();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
    staleTime: 10 * 60 * 1000,
  });

  const getClassName = React.useCallback((id: string) => classes.find((c) => c.id === id)?.className || id, [classes]);
  const getSectionName = React.useCallback((id: string) => sections.find((s) => s.id === id)?.sectionName || id, [sections]);

  const handleDelete = React.useCallback(() => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget, {
        onSuccess: () => {
          setDeleteTarget(null);
          if (selectedId === deleteTarget) setSelectedId(null);
        },
      });
    }
  }, [deleteTarget, deleteMutation, selectedId]);

  const handleSelect = React.useCallback((id: string) => {
    setSelectedId(prev => prev === id ? null : id);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (assessments.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <ClipboardList size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No Assessments Yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first assessment from the &quot;Create&quot; tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assessments.map((a) => {
          const isSelected = selectedId === a.id;

          return (
            <AssessmentCard
              key={a.id}
              a={a}
              isSelected={isSelected}
              onSelect={handleSelect}
              className={getClassName(a.classId)}
              sectionName={getSectionName(a.sectionId)}
            />
          );
        })}
      </div>

      {/* Selected Assessment Detail */}
      {selectedId && (() => {
        const a = assessments.find((x) => x.id === selectedId);
        if (!a) return null;

        return (
          <div className="bg-card rounded-2xl border border-border shadow-soft p-6 animate-in slide-in-from-top-2 duration-300 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h3 className="text-lg font-black text-foreground">
                {a.name} — Schedule & Actions
              </h3>
              <div className="flex items-center gap-2 flex-wrap">
                <StatusActions assessment={a} userId={user?.id || ''} />

                {a.status !== 'published' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(a.id);
                    }}
                    className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1.5"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                )}
              </div>
            </div>

            <ScheduleDetail assessmentId={a.id} />

            {a.status === 'marks_open' && (
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200/50">
                <p className="text-sm font-bold text-purple-700">
                  📝 Marks entry is open. Go to the &quot;Marks Entry&quot; tab to enter marks for each subject.
                </p>
              </div>
            )}

            {a.status === 'published' && a.publishedAt && (
              <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200/50">
                <p className="text-sm font-bold text-emerald-700" suppressHydrationWarning>
                  ✅ Results published on {new Date(a.publishedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            )}
          </div>
        );
      })()}

      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Assessment"
        message="Are you sure? This will delete the assessment, schedule, marks, and result summaries permanently."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
