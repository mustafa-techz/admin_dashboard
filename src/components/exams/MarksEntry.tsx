'use client';

import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Student } from '@/types/student';

const MarkRow = React.memo(function MarkRow({
  student,
  idx,
  maxMarks,
  marks,
  isAbsent,
  onUpdateMark,
  onToggleAbsent,
}: {
  student: Student;
  idx: number;
  maxMarks: number;
  marks: string;
  isAbsent: boolean;
  onUpdateMark: (id: string, value: string) => void;
  onToggleAbsent: (id: string) => void;
}) {
  const marksNum = marks === '' ? 0 : Number(marks);

  return (
    <tr
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
          max={maxMarks}
          value={isAbsent ? '0' : marks}
          placeholder="Enter marks"
          disabled={isAbsent}
          onChange={(e) => onUpdateMark(student.id, e.target.value)}
          className={cn(
            'w-24 px-3 py-1.5 rounded-lg border text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all',
            isAbsent
              ? 'bg-muted text-muted-foreground border-border cursor-not-allowed'
              : marksNum > maxMarks
              ? 'border-red-400 bg-red-50 text-red-700'
              : 'border-border bg-background'
          )}
        />
      </td>
      <td className="py-2.5 text-center">
        <button
          type="button"
          onClick={() => onToggleAbsent(student.id)}
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
});


export default function MarksEntry({ branchId }: { branchId: string }) {
  const user = useAuthStore(state => state.user);
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
    queryKey: ['students', branchId],
    queryFn: () => studentService.getStudents(branchId || undefined),
    enabled: !!branchId,
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
    Record<string, { marks: string; isAbsent: boolean }>
  >({});

  // Populate from existing marks when data loads
  // Use stable primitive dependencies to prevent infinite re-render loops


  // Clear local changes when subject/assessment changes
  useEffect(() => {
    setMarksMap({});
  }, [selectedAssessmentId, selectedSubject]);

  const { isLoading: isLoadingMarks } = useSubjectMarks(selectedAssessmentId, selectedSubject);

  // Compute dirty state by comparing local changes to database data
  const isDirty = useMemo(() => {
    if (Object.keys(marksMap).length === 0) return false;
    
    for (const studentId of Object.keys(marksMap)) {
      const entry = marksMap[studentId];
      const existing = existingMarks.find((m) => m.studentId === studentId);
      
      const existingMarksStr = existing?.marks.toString() || '';
      const existingAbsent = existing?.isAbsent || false;

      if (entry.marks !== existingMarksStr || entry.isAbsent !== existingAbsent) {
        return true;
      }
    }
    return false;
  }, [marksMap, existingMarks]);

  const updateMark = useCallback((studentId: string, value: string) => {
    setMarksMap((prev) => {
      let marksValue = value;
      if (marksValue !== '') {
        const num = Number(marksValue);
        if (num < 0) marksValue = '0';
      }
      return {
        ...prev,
        [studentId]: { ...prev[studentId], marks: marksValue },
      };
    });
  }, []);

  const toggleAbsent = useCallback((studentId: string) => {
    setMarksMap((prev) => {
      const isCurrentlyAbsent = prev[studentId]?.isAbsent;
      return {
        ...prev,
        [studentId]: {
          ...prev[studentId],
          isAbsent: !isCurrentlyAbsent,
          marks: !isCurrentlyAbsent ? '0' : prev[studentId]?.marks || '', // Automatically zero if marked absent
        },
      };
    });
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedAssessmentId || !selectedSubject || !selectedSlot || !user?.id) return;

    // Only send students that have local changes in marksMap
    const entries: SubjectMarkEntry[] = classStudents
      .filter((student) => marksMap[student.id] !== undefined)
      .map((student) => ({
        studentId: student.id,
        studentName: student.fullName,
        marks: Number(marksMap[student.id]?.marks) || 0,
        isAbsent: marksMap[student.id]?.isAbsent || false,
      }));

    if (entries.length === 0) return;

    await saveMutation.mutateAsync({
      assessmentId: selectedAssessmentId,
      subject: selectedSubject,
      maxMarks: selectedSlot.maxMarks,
      entries,
      enteredBy: user.id,
      enteredByName: user.name || user.email,
    });

    // Clear local changes after successful save to sync with database and stop flickering
    setMarksMap({});
  }, [selectedAssessmentId, selectedSubject, selectedSlot, user, classStudents, marksMap, saveMutation]);

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
            <Select
              value={selectedAssessmentId}
              onValueChange={(value) => {
                setSelectedAssessmentId(value);
                setSelectedSubject('');
              }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Assessment" />
              </SelectTrigger>
              <SelectContent>
                {openAssessments.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Subject *
            </label>
            <Select
              value={selectedSubject}
              onValueChange={setSelectedSubject}
              disabled={!selectedAssessmentId}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Subject" />
              </SelectTrigger>
              <SelectContent>
                {schedule.map((slot) => (
                  <SelectItem key={slot.id} value={slot.subject}>
                    {slot.subject} (Max: {slot.maxMarks})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              disabled={saveMutation.isPending || !isDirty}
              className={cn(
                "px-4 py-2 rounded-xl font-bold text-xs transition-all shadow-lg flex items-center gap-1.5",
                isDirty 
                  ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-primary/20" 
                  : "bg-muted text-muted-foreground shadow-none cursor-not-allowed"
              )}
            >
              {saveMutation.isPending ? (
                <><Loader2 size={14} className="animate-spin" /> Saving...</>
              ) : saveMutation.isSuccess && !isDirty ? (
                <><Check size={14} /> Saved!</>
              ) : (
                <><Save size={14} /> Save All Marks</>
              )}
            </button>
          </div>

          <div className="overflow-x-auto relative min-h-[200px]">
            {isLoadingMarks && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-xl">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Loading Marks...</p>
                </div>
              </div>
            )}
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
                  const existing = existingMarks.find((m) => m.studentId === student.id);
                  const entry = marksMap[student.id];
                  
                  const isAbsent = entry ? entry.isAbsent : (existing?.isAbsent || false);
                  const marks = entry ? entry.marks : (existing?.marks.toString() || '');

                  return (
                    <MarkRow
                      key={student.id}
                      student={student}
                      idx={idx}
                      maxMarks={selectedSlot.maxMarks}
                      marks={marks}
                      isAbsent={isAbsent}
                      onUpdateMark={updateMark}
                      onToggleAbsent={toggleAbsent}
                    />
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
