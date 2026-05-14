'use client';

import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import { studentService } from '@/services/studentService';
import { usePublishedTimetables } from '@/hooks/useTimetables';
import TimetableGrid from './TimetableGrid';
import { CalendarDays, BookOpen } from 'lucide-react';

/**
 * Parent-facing read-only timetable view.
 * Fetches the student's class/section, then shows published timetables.
 */
export default function TimetableView() {
  const user = useAuthStore(state => state.user);

  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['studentByParent', user?.id],
    queryFn: () => (user?.id ? studentService.getStudentByParentUserId(user.id) : Promise.resolve(null)),
    enabled: !!user?.id,
    staleTime: 10 * 60 * 1000,
  });

  const { data: timetables = [], isLoading: ttLoading } = usePublishedTimetables(
    student?.classId || '',
    student?.sectionId || ''
  );

  const isLoading = studentLoading || ttLoading;

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

  if (timetables.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <CalendarDays size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No Timetable Published</h3>
        <p className="text-sm text-muted-foreground mt-1">
          The school has not published a timetable for your child&apos;s class yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {timetables.map((tt) => (
        <div key={tt.id} className="bg-card rounded-2xl border border-border shadow-soft p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen size={20} className="text-primary" />
            </div>
            <div>
              <h3 className="text-lg font-black text-foreground">{tt.name}</h3>
              <p className="text-xs text-muted-foreground">{tt.academicYear}</p>
            </div>
          </div>

          <TimetableGrid timetableId={tt.id} isReadOnly />
        </div>
      ))}
    </div>
  );
}
