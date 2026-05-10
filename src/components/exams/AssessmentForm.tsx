'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classService, sectionService } from '@/services/firebase/masterDataService';
import { useCreateAssessment } from '@/hooks/useAssessments';
import { useAuthStore } from '@/store/authStore';
import { getAuthorizedClassIds } from '@/lib/teacherScope';
import { getAcademicYearOptions } from '@/lib/feeUtils';
import { cn } from '@/lib/utils';
import type { ExamScheduleFormData, AssessmentType } from '@/types/assessment';
import { Plus, Trash2, Loader2, Save, Calendar } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_SCHEDULE: ExamScheduleFormData = {
  subject: '',
  date: '',
  startTime: '09:00',
  endTime: '11:00',
  maxMarks: 100,
};

export default function AssessmentForm({ branchId, onSuccess }: { branchId: string; onSuccess?: () => void }) {
  const { user } = useAuthStore();
  const createMutation = useCreateAssessment();
  const academicYears = useMemo(() => getAcademicYearOptions(), []);

  const authorizedClassIds = getAuthorizedClassIds(
    user ? { role: user.role, classIds: user.classIds } : null
  );

  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
  });

  // Filter classes for teacher scope
  const classes = useMemo(() => {
    if (!authorizedClassIds) return allClasses;
    return allClasses.filter((c) => authorizedClassIds.includes(c.id));
  }, [allClasses, authorizedClassIds]);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
  });

  const [form, setForm] = useState({
    type: 'exam' as AssessmentType,
    name: '',
    classId: '',
    sectionId: '',
    academicYear: academicYears[1] || '',
  });

  const [schedule, setSchedule] = useState<ExamScheduleFormData[]>([{ ...DEFAULT_SCHEDULE }]);

  const updateForm = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addScheduleSlot = () => {
    setSchedule((prev) => [...prev, { ...DEFAULT_SCHEDULE }]);
  };

  const removeScheduleSlot = (index: number) => {
    setSchedule((prev) => prev.filter((_, i) => i !== index));
  };

  const updateScheduleSlot = useCallback((index: number, key: keyof ExamScheduleFormData, value: string | number) => {
    setSchedule((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    );
  }, []);

  const subjects = useMemo(() => {
    return schedule.filter((s) => s.subject.trim()).map((s) => s.subject.trim());
  }, [schedule]);

  const isValid =
    form.name.trim() &&
    form.classId &&
    form.sectionId &&
    form.academicYear &&
    schedule.length > 0 &&
    schedule.every((s) => s.subject.trim() && s.date && s.maxMarks > 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !user?.id) return;

    await createMutation.mutateAsync({
      data: {
        type: form.type,
        name: form.name,
        classId: form.classId,
        sectionId: form.sectionId,
        academicYear: form.academicYear,
        branchId,
        subjects,
      },
      schedule,
      createdBy: user.id,
    });

    setForm({ type: 'exam', name: '', classId: '', sectionId: '', academicYear: academicYears[1] || '' });
    setSchedule([{ ...DEFAULT_SCHEDULE }]);
    onSuccess?.();
  };
  useEffect(() => {

  },[])

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Assessment Details */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-4">
        <h3 className="text-lg font-black text-foreground">Assessment Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Type *</label>
            <Select
              value={form.type}
              onValueChange={(value) => updateForm('type', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="exam">Full Exam</SelectItem>
                <SelectItem value="test">Test / Quiz</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="e.g. Quarterly Exam, Unit Test 1"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Academic Year *</label>
            <Select
              value={form.academicYear}
              onValueChange={(value) => updateForm('academicYear', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Year" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y} value={y}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Class *</label>
            <Select
              value={form.classId}
              onValueChange={(value) => updateForm('classId', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.className}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">Section *</label>
            <Select
              value={form.sectionId}
              onValueChange={(value) => updateForm('sectionId', value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select Section" />
              </SelectTrigger>
              <SelectContent>
                {sections.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.sectionName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Exam Schedule */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-foreground">Exam Schedule</h3>
          <button
            type="button"
            onClick={addScheduleSlot}
            className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Subject
          </button>
        </div>

        <div className="space-y-3">
          {schedule.map((slot, index) => (
            <div
              key={index}
              className="grid grid-cols-2 sm:grid-cols-6 gap-2 p-3 bg-muted/20 rounded-xl border border-border/50"
            >
              <input
                type="text"
                value={slot.subject}
                onChange={(e) => updateScheduleSlot(index, 'subject', e.target.value)}
                placeholder="Subject *"
                className="col-span-2 sm:col-span-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <div className="flex items-center gap-1">
                <Calendar size={12} className="text-muted-foreground shrink-0" />
                <input
                  type="date"
                  value={slot.date}
                  onChange={(e) => updateScheduleSlot(index, 'date', e.target.value)}
                  className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <input
                type="time"
                value={slot.startTime}
                onChange={(e) => updateScheduleSlot(index, 'startTime', e.target.value)}
                className="px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="time"
                value={slot.endTime}
                onChange={(e) => updateScheduleSlot(index, 'endTime', e.target.value)}
                className="px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <input
                type="number"
                value={slot.maxMarks}
                onChange={(e) => updateScheduleSlot(index, 'maxMarks', Number(e.target.value))}
                placeholder="Max Marks"
                min={1}
                className="px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <button
                type="button"
                onClick={() => removeScheduleSlot(index)}
                className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-center justify-self-end"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={!isValid || createMutation.isPending}
        className={cn(
          'w-full py-3 rounded-xl font-bold text-sm transition-all shadow-lg active:scale-[0.98]',
          isValid
            ? 'bg-primary text-primary-foreground shadow-primary/20 hover:bg-primary/90'
            : 'bg-muted text-muted-foreground cursor-not-allowed shadow-none'
        )}
      >
        {createMutation.isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 size={16} className="animate-spin" /> Creating...
          </span>
        ) : (
          <span className="flex items-center justify-center gap-2">
            <Save size={16} /> Create Assessment (as Draft)
          </span>
        )}
      </button>
    </form>
  );
}
