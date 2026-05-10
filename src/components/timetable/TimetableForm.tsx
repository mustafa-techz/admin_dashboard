'use client';

import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { classService, sectionService } from '@/services/firebase/masterDataService';
import { teacherService } from '@/services/teacherService';
import { useCreateTimetable } from '@/hooks/useTimetables';
import { useAuthStore } from '@/store/authStore';
import { getAuthorizedClassIds } from '@/lib/teacherScope';
import { getAcademicYearOptions } from '@/lib/feeUtils';
import { cn } from '@/lib/utils';
import type { TimetableSlotFormData, Weekday } from '@/types/timetable';
import { WEEKDAYS } from '@/types/timetable';
import { Plus, Trash2, Clock, Loader2, Save } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const DEFAULT_SLOT: Omit<TimetableSlotFormData, 'order'> = {
  day: 'Monday',
  subject: '',
  startTime: '09:00',
  endTime: '09:45',
  teacherName: '',
  room: '',
};

export default function TimetableForm({ branchId, onSuccess }: { branchId: string; onSuccess?: () => void }) {
  const { user } = useAuthStore();
  const createMutation = useCreateTimetable();
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
    name: '',
    classId: '',
    sectionId: '',
    academicYear: academicYears[1] || '',
  });

  const { data: teachers = [] } = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherService.getTeachers(),
    staleTime: 10 * 60 * 1000,
    enabled: !!form.classId,
  });

  const classTeachers = useMemo(() => {
    if (!form.classId) return [];
    return teachers.filter(
      (t) => (t.classIds && t.classIds.includes(form.classId)) || t.classTeacher === form.classId
    );
  }, [teachers, form.classId]);

  const [slots, setSlots] = useState<TimetableSlotFormData[]>([
    { ...DEFAULT_SLOT, order: 1 },
  ]);

  const updateForm = useCallback((key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const addSlot = useCallback((day?: Weekday) => {
    setSlots((prev) => [
      ...prev,
      {
        ...DEFAULT_SLOT,
        day: day || 'Monday',
        order: prev.length + 1,
      },
    ]);
  }, []);

  const removeSlot = useCallback((index: number) => {
    setSlots((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateSlot = useCallback((index: number, key: keyof TimetableSlotFormData, value: string | number) => {
    setSlots((prev) =>
      prev.map((s, i) => (i === index ? { ...s, [key]: value } : s))
    );
  }, []);

  const isValid =
    form.name.trim() &&
    form.classId &&
    form.sectionId &&
    form.academicYear &&
    slots.length > 0 &&
    slots.every((s) => s.subject.trim() && s.startTime && s.endTime);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || !user?.id) return;

    await createMutation.mutateAsync({
      data: {
        type: 'class',
        name: form.name,
        classId: form.classId,
        sectionId: form.sectionId,
        academicYear: form.academicYear,
        branchId,
      },
      slots,
      createdBy: user.id,
      userRole: user.role,
      userName: user.name,
    });

    // Reset form
    setForm({ name: '', classId: '', sectionId: '', academicYear: academicYears[1] || '' });
    setSlots([{ ...DEFAULT_SLOT, order: 1 }]);
    onSuccess?.();
  };

  // Group slots by day for display
  const slotsByDay = useMemo(() => {
    const grouped: Record<string, { slot: TimetableSlotFormData; originalIndex: number }[]> = {};
    slots.forEach((slot, index) => {
      if (!grouped[slot.day]) grouped[slot.day] = [];
      grouped[slot.day].push({ slot, originalIndex: index });
    });
    return grouped;
  }, [slots]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Timetable Details */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-4">
        <h3 className="text-lg font-black text-foreground">Timetable Details</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Timetable Name *
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              placeholder="e.g. Weekly Timetable"
              className="w-full px-4 py-2.5 rounded-xl border border-border bg-background text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Academic Year *
            </label>
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
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Class *
            </label>
            <Select
              value={form.classId}
              onValueChange={(value) => {
                updateForm('classId', value);
                setSlots(prev => prev.map(s => ({ ...s, teacherName: '', teacherId: '' })));
              }}
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
            <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5 block">
              Section *
            </label>
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

      {/* Slots Editor — Day-wise */}
      <div className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-foreground">Schedule Slots</h3>
          <button
            type="button"
            onClick={() => addSlot()}
            className="px-3 py-1.5 bg-primary/10 text-primary rounded-lg text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1.5"
          >
            <Plus size={14} /> Add Slot
          </button>
        </div>

        {WEEKDAYS.map((day) => {
          const daySlots = slotsByDay[day] || [];
          if (daySlots.length === 0 && slots.length > 0) {
            return (
              <div key={day} className="flex items-center justify-between py-2 px-3 rounded-xl bg-muted/30">
                <span className="text-sm font-bold text-muted-foreground">{day}</span>
                <button
                  type="button"
                  onClick={() => addSlot(day)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  + Add Period
                </button>
              </div>
            );
          }

          return (
            <div key={day} className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-foreground">{day}</h4>
                <button
                  type="button"
                  onClick={() => addSlot(day)}
                  className="text-xs text-primary font-bold hover:underline"
                >
                  + Add Period
                </button>
              </div>

              {daySlots.map(({ slot, originalIndex }) => (
                <div
                  key={originalIndex}
                  className="grid grid-cols-2 sm:grid-cols-5 gap-2 p-3 bg-muted/20 rounded-xl border border-border/50"
                >
                  <input
                    type="text"
                    value={slot.subject}
                    onChange={(e) => updateSlot(originalIndex, 'subject', e.target.value)}
                    placeholder="Subject *"
                    className="col-span-2 sm:col-span-1 px-3 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                  <div className="flex items-center gap-1">
                    <Clock size={12} className="text-muted-foreground shrink-0" />
                    <input
                      type="time"
                      value={slot.startTime}
                      onChange={(e) => updateSlot(originalIndex, 'startTime', e.target.value)}
                      className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground text-xs">to</span>
                    <input
                      type="time"
                      value={slot.endTime}
                      onChange={(e) => updateSlot(originalIndex, 'endTime', e.target.value)}
                      className="flex-1 px-2 py-2 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <Select
                    value={slot.teacherName || ''}
                    onValueChange={(value) => {
                      const teacher = classTeachers.find(t => t.fullName === value);
                      updateSlot(originalIndex, 'teacherName', value);
                      updateSlot(originalIndex, 'teacherId', teacher?.id || '');
                    }}
                    disabled={!form.classId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={!form.classId ? 'Select class first' : 'Select Teacher'} />
                    </SelectTrigger>
                    <SelectContent>
                      {classTeachers.map(t => (
                        <SelectItem key={t.id} value={t.fullName}>{t.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button
                    type="button"
                    onClick={() => removeSlot(originalIndex)}
                    className="p-2 text-muted-foreground hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors self-center justify-self-end"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          );
        })}

        {slots.length === 0 && (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground mb-2">No slots added yet.</p>
            <button
              type="button"
              onClick={() => addSlot()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-sm font-bold hover:bg-primary/90 transition-all"
            >
              <Plus size={14} className="inline mr-1" /> Add First Slot
            </button>
          </div>
        )}
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
            <Save size={16} /> Create Timetable (as Draft)
          </span>
        )}
      </button>
    </form>
  );
}
