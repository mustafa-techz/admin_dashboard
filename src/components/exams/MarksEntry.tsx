'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  useAssessments,
  useExamSchedule,
  useSubjectMarks,
  useSaveSubjectMarks,
} from '@/hooks/useAssessments';
import { useAuthStore } from '@/store/authStore';
import { studentService } from '@/services/studentService';
import { cn } from '@/lib/utils';
import type { SubjectMarkEntry } from '@/types/assessment';
import { Save, Loader2, Check, AlertTriangle } from 'lucide-react';

export default function MarksEntry({ branchId }: { branchId: string }) {
  const { user } = useAuthStore();
  const { data: assessments = [] } = useAssessments(branchId);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState('');
  const [selectedSubject, setSelectedSubject] = useState('');

  // Only show assessments in marks_open state
  const openAssessments = useMemo(
    () => assessments.filter((a) => a.status === 'marks_open'),
    [assessments]
  );

  const selectedAssessment = openAssessments.find((a) => a.id === selectedAssessmentId);

  const { data: schedule = [] } = useExamSchedule(selectedAssessmentId);
  const { data: existingMarks = [] } = useSubjectMarks(selectedAssessmentId, selectedSubject);
  const saveMutation = useSaveSubjectMarks();

  const selectedSlot = schedule.find((s) => s.subject === selectedSubject);

  // Get students for the selected assessment's class/section
  const { data: allStudents = [] } = useQuery({
    queryKey: ['students'],
    queryFn: () => studentService.getStudents(),
    staleTime: 5 * 60 * 1000,
  });

  const classStudents = useMemo(() => {
    if (!selectedAssessment) return [];
    return allStudents
      .filter(
        (s) =>
          s.classId === selectedAssessment.classId &&
          s.sectionId === selectedAssessment.sectionId
      )
      .sort((a, b) => a.rollNumber.localeCompare(b.rollNumber));
  }, [allStudents, selectedAssessment]);

  // Local marks state for the spreadsheet
  const [marksMap, setMarksMap] = useState<
    Record<string, { marks: number; isAbsent: boolean }>
  >({});

  // Populate from existing marks when data loads
  // Use stable primitive dependencies to prevent infinite re-render loops
  const marksInitKey = `${selectedAssessmentId}_${selectedSubject}_${classStudents.length}_${existingMarks.length}`;
  const prevMarksInitKey = useRef('');

  useEffect(() => {
    if (marksInitKey === prevMarksInitKey.current) return;
    prevMarksInitKey.current = marksInitKey;

    if (!selectedAssessmentId || !selectedSubject || classStudents.length === 0) {
      setMarksMap({});
      return;
    }

    const newMap: Record<string, { marks: number; isAbsent: boolean }> = {};
    for (const student of classStudents) {
      const existing = existingMarks.find((m) => m.studentId === student.id);
      newMap[student.id] = existing
        ? { marks: existing.marks, isAbsent: existing.isAbsent }
        : { marks: 0, isAbsent: false };
    }
    setMarksMap(newMap);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [marksInitKey]);

  const updateMark = (studentId: string, marks: number) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: { ...prev[studentId], marks: Math.max(0, marks) },
    }));
  };

  const toggleAbsent = (studentId: string) => {
    setMarksMap((prev) => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        isAbsent: !prev[studentId]?.isAbsent,
        marks: !prev[studentId]?.isAbsent ? 0 : prev[studentId]?.marks || 0,
      },
    }));
  };

  const handleSave = async () => {
    if (!selectedAssessmentId || !selectedSubject || !selectedSlot || !user?.id) return;

    const entries: SubjectMarkEntry[] = classStudents.map((student) => ({
      studentId: student.id,
      studentName: student.fullName,
      marks: marksMap[student.id]?.marks || 0,
      isAbsent: marksMap[student.id]?.isAbsent || false,
    }));

    await saveMutation.mutateAsync({
      assessmentId: selectedAssessmentId,
      subject: selectedSubject,
      maxMarks: selectedSlot.maxMarks,
      entries,
      enteredBy: user.id,
      enteredByName: user.name || user.email,
    });
  };

  return (
    <div className="space-y-6">
      {/* Selectors */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-4">
        <h3 className="text-lg font-black text-foreground">Marks Entry</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Assessment *
            </label>
            <select
              value={selectedAssessmentId}
              onChange={(e) => {
                setSelectedAssessmentId(e.target.value);
                setSelectedSubject('');
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            >
              <option value="">Select Assessment</option>
              {openAssessments.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Subject *
            </label>
            <select
              value={selectedSubject}
              onChange={(e) => setSelectedSubject(e.target.value)}
              disabled={!selectedAssessmentId}
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all disabled:opacity-50"
            >
              <option value="">Select Subject</option>
              {schedule.map((slot) => (
                <option key={slot.id} value={slot.subject}>
                  {slot.subject} (Max: {slot.maxMarks})
                </option>
              ))}
            </select>
          </div>
        </div>

        {openAssessments.length === 0 && (
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-200/50">
            <p className="text-sm font-bold text-amber-700 flex items-center gap-2">
              <AlertTriangle size={14} />
              No assessments with marks entry open. Transition an assessment to &quot;Marks Open&quot; first.
            </p>
          </div>
        )}
      </div>

      {/* Spreadsheet */}
      {selectedAssessmentId && selectedSubject && selectedSlot && classStudents.length > 0 && (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-foreground">
                {selectedSubject} — Max Marks: {selectedSlot.maxMarks}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {classStudents.length} students · Enter marks and click Save
              </p>
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl font-bold text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 flex items-center gap-1.5"
            >
              {saveMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Saving...</>
              ) : saveMutation.isSuccess ? (
                <><Check size={14} /> Saved!</>
              ) : (
                <><Save size={14} /> Save All Marks</>
              )}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-border">
                  <th className="text-left py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-12">#</th>
                  <th className="text-left py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Roll No.</th>
                  <th className="text-left py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">Student Name</th>
                  <th className="text-center py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-32">
                    Marks / {selectedSlot.maxMarks}
                  </th>
                  <th className="text-center py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider w-20">Absent</th>
                </tr>
              </thead>
              <tbody>
                {classStudents.map((student, idx) => {
                  const entry = marksMap[student.id];
                  const isAbsent = entry?.isAbsent || false;
                  const marks = entry?.marks || 0;

                  return (
                    <tr
                      key={student.id}
                      className={cn(
                        'border-b border-border/50 transition-colors',
                        isAbsent ? 'bg-red-50/50' : 'hover:bg-muted/30'
                      )}
                    >
                      <td className="py-2.5 text-muted-foreground">{idx + 1}</td>
                      <td className="py-2.5 font-mono text-xs">{student.rollNumber}</td>
                      <td className="py-2.5 font-medium">{student.fullName}</td>
                      <td className="py-2.5 text-center">
                        <input
                          type="number"
                          min={0}
                          max={selectedSlot.maxMarks}
                          value={isAbsent ? 0 : marks}
                          disabled={isAbsent}
                          onChange={(e) => updateMark(student.id, Number(e.target.value))}
                          className={cn(
                            'w-20 px-3 py-1.5 rounded-lg border text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
                            isAbsent
                              ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
                              : marks > selectedSlot.maxMarks
                              ? 'border-red-400 bg-red-50 text-red-700'
                              : 'border-border bg-background'
                          )}
                        />
                      </td>
                      <td className="py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleAbsent(student.id)}
                          className={cn(
                            'h-5 w-5 rounded-md border-2 flex items-center justify-center transition-all mx-auto',
                            isAbsent
                              ? 'bg-red-500 border-red-500'
                              : 'border-border hover:border-red-300'
                          )}
                        >
                          {isAbsent && <Check size={12} className="text-white" />}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
