'use client';

import { useMemo } from 'react';
import { useTimetableSlots } from '@/hooks/useTimetables';
import { cn } from '@/lib/utils';
import { WEEKDAYS } from '@/types/timetable';
import type { TimetableSlot } from '@/types/timetable';
import { Clock, BookOpen, User } from 'lucide-react';

interface TimetableGridProps {
  timetableId: string;
  isReadOnly?: boolean;
}

export default function TimetableGrid({ timetableId, isReadOnly = false }: TimetableGridProps) {
  const { data: slots = [], isLoading } = useTimetableSlots(timetableId);

  // Group slots by day
  const slotsByDay = useMemo(() => {
    const grouped: Record<string, TimetableSlot[]> = {};
    for (const day of WEEKDAYS) {
      grouped[day] = slots
        .filter((s) => s.day === day)
        .sort((a, b) => a.order - b.order);
    }
    return grouped;
  }, [slots]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-6 w-6 animate-spin rounded-full border-3 border-primary border-t-transparent" />
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="text-center py-8">
        <BookOpen size={32} className="mx-auto text-muted-foreground mb-2" />
        <p className="text-sm text-muted-foreground">No schedule slots found.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {WEEKDAYS.map((day) => {
        const daySlots = slotsByDay[day];
        if (!daySlots || daySlots.length === 0) return null;

        return (
          <div key={day} className="space-y-2">
            <h4 className="text-sm font-black text-foreground uppercase tracking-wider px-1">
              {day}
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
              {daySlots.map((slot) => (
                <div
                  key={slot.id}
                  className={cn(
                    'rounded-xl border p-3 transition-all duration-200',
                    isReadOnly
                      ? 'bg-card border-border'
                      : 'bg-card border-border hover:shadow-md hover:border-primary/30'
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h5 className="text-sm font-bold text-foreground leading-tight">
                      {slot.subject}
                    </h5>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock size={11} />
                      {slot.startTime} – {slot.endTime}
                    </span>
                    {slot.teacherName && (
                      <span className="flex items-center gap-1">
                        <User size={11} />
                        {slot.teacherName}
                      </span>
                    )}
                    {slot.room && (
                      <span className="text-muted-foreground/60">
                        Room: {slot.room}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
