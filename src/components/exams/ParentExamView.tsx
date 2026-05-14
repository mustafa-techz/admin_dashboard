'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { studentService } from '@/services/studentService';
import {
  usePublishedAssessments,
  useExamSchedule,
  useStudentSummary,
} from '@/hooks/useAssessments';
import { cn } from '@/lib/utils';
import { getGradeColor } from '@/lib/gradeUtils';
import { ASSESSMENT_STATUS_LABELS } from '@/types/assessment';
import type { Assessment } from '@/types/assessment';
import { ClipboardList, Calendar, Clock, Award, TrendingUp, BookOpen } from 'lucide-react';
import { useState } from 'react';

// ─────────────────────────────────────────────────────────────────
// Exam Schedule Card (read-only)
// ─────────────────────────────────────────────────────────────────
function ExamScheduleCard({ assessmentId }: { assessmentId: string }) {
  const { data: schedule = [], isLoading } = useExamSchedule(assessmentId);

  if (isLoading) {
    return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto my-4" />;
  }

  if (schedule.length === 0) return null;

  return (
    <div className="space-y-2">
      {schedule.map((slot) => (
        <div key={slot.id} className="flex items-center gap-3 px-3 py-2 bg-muted/30 rounded-lg">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-foreground">{slot.subject}</p>
            <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5" suppressHydrationWarning>
              <Calendar size={11} />
              {new Date(slot.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
              <span className="mx-0.5">·</span>
              <Clock size={11} />
              {slot.startTime} – {slot.endTime}
            </p>
          </div>
          <span className="text-xs font-bold text-muted-foreground shrink-0">
            {slot.maxMarks} marks
          </span>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Result Card
// ─────────────────────────────────────────────────────────────────
function ResultCard({ assessmentId, studentId }: { assessmentId: string; studentId: string }) {
  const { data: summary, isLoading } = useStudentSummary(assessmentId, studentId);

  if (isLoading) {
    return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent mx-auto my-4" />;
  }

  if (!summary) {
    return <p className="text-sm text-muted-foreground text-center py-4">Results not yet available.</p>;
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Total</p>
          <p className="text-lg font-black text-foreground">{summary.totalMarks}/{summary.totalMaxMarks}</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Percentage</p>
          <p className="text-lg font-black text-foreground">{summary.percentage}%</p>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Grade</p>
          <span className={cn('inline-block mt-1 px-3 py-0.5 rounded-full text-sm font-black', getGradeColor(summary.grade))}>
            {summary.grade}
          </span>
        </div>
        <div className="bg-muted/30 rounded-xl p-3 text-center">
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Status</p>
          <span
            className={cn(
              'inline-block mt-1 px-3 py-0.5 rounded-full text-sm font-black',
              summary.status === 'pass' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
            )}
          >
            {summary.status === 'pass' ? '✅ Pass' : '❌ Fail'}
          </span>
        </div>
      </div>

      {/* Subject-wise Breakdown */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Subject</th>
              <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Marks</th>
              <th className="text-right py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Max</th>
              <th className="text-center py-2 text-xs font-bold text-muted-foreground uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody>
            {summary.subjectResults.map((r) => (
              <tr key={r.subject} className="border-b border-border/50">
                <td className="py-2.5 font-medium">{r.subject}</td>
                <td className="py-2.5 text-right font-bold">{r.isAbsent ? '-' : r.marks}</td>
                <td className="py-2.5 text-right text-muted-foreground">{r.maxMarks}</td>
                <td className="py-2.5 text-center">
                  {r.isAbsent ? (
                    <span className="text-[10px] font-bold text-red-500 uppercase">Absent</span>
                  ) : r.marks >= r.maxMarks * 0.33 ? (
                    <span className="text-[10px] font-bold text-emerald-600 uppercase">Pass</span>
                  ) : (
                    <span className="text-[10px] font-bold text-red-500 uppercase">Fail</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Parent View
// ─────────────────────────────────────────────────────────────────
export default function ParentExamView() {
  const user = useAuthStore(state => state.user);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['studentByParent', user?.id],
    queryFn: () => (user?.id ? studentService.getStudentByParentUserId(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: assessments = [], isLoading: assessmentsLoading } = usePublishedAssessments(
    student?.classId || '',
    student?.sectionId || ''
  );

  const isLoading = studentLoading || assessmentsLoading;

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

  if (assessments.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <ClipboardList size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No Results Published</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Exam results have not been published for your child&apos;s class yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {assessments.map((a) => {
        const isExpanded = expandedId === a.id;

        return (
          <div key={a.id} className="bg-card rounded-2xl border border-border shadow-soft overflow-hidden">
            <div
              onClick={() => setExpandedId(isExpanded ? null : a.id)}
              className="p-5 cursor-pointer hover:bg-muted/20 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                    {a.publishedAt ? <Award size={20} className="text-primary" /> : <BookOpen size={20} className="text-primary" />}
                  </div>
                  <div>
                    <h3 className="text-base font-black text-foreground">{a.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {a.type === 'exam' ? 'Exam' : 'Test'} · {a.academicYear} · {a.subjects?.length || 0} subjects
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {a.publishedAt && (
                    <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider">
                      Results Available
                    </span>
                  )}
                </div>
              </div>
            </div>

            {isExpanded && (
              <div className="border-t border-border p-5 space-y-5 animate-in slide-in-from-top-1 duration-200">
                {/* Exam Schedule */}
                <div>
                  <h4 className="text-sm font-black text-muted-foreground uppercase tracking-wider mb-3">
                    📅 Exam Schedule
                  </h4>
                  <ExamScheduleCard assessmentId={a.id} />
                </div>

                {/* Results */}
                {a.publishedAt && (
                  <div>
                    <h4 className="text-sm font-black text-muted-foreground uppercase tracking-wider mb-3">
                      📊 Results — {student.fullName}
                    </h4>
                    <ResultCard assessmentId={a.id} studentId={student.id} />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
