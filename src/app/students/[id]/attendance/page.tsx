'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { AttendanceSession, AttendanceStatus } from '@/types/attendance';
import { ChevronLeft, Loader2, CalendarDays } from 'lucide-react';
import { useMemo, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { format, subYears, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';

// ─── Inline colors (immune to Tailwind v4 purging) ───────────────────────────
const STATUS_BG: Record<AttendanceStatus | 'none', string> = {
  present: '#22c55e',
  absent: '#ef4444',
  leave: '#f59e0b',
  none: '#e2e8f0',
};

const STATUS_LABEL: Record<AttendanceStatus | 'none', string> = {
  present: 'Present',
  absent: 'Absent',
  leave: 'Leave',
  none: 'No Record',
};

// ─── Build 52-week grid ending at today ──────────────────────────────────────
function buildHeatmapGrid(sessions: AttendanceSession[], studentId: string) {
  // Build date → status lookup from sessions
  const map: Record<string, AttendanceStatus | 'none'> = {};
  sessions.forEach((s) => {
    const status = s.students?.[studentId];
    if (status) map[s.date] = status as AttendanceStatus;
  });

  const today = new Date();
  // Grid ends at the end of this week, starts 52 weeks (364 days) back from the start of this week
  const gridEnd = endOfWeek(today, { weekStartsOn: 1 });
  const gridStart = startOfWeek(subYears(today, 1), { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  // Build column-major array: each column = one week (Mon→Sun)
  const weeks: { date: Date; status: AttendanceStatus | 'none'; isFuture: boolean }[][] = [];
  let week: { date: Date; status: AttendanceStatus | 'none'; isFuture: boolean }[] = [];

  days.forEach((day, i) => {
    const iso = format(day, 'yyyy-MM-dd');
    const isFuture = day > today;
    week.push({
      date: day,
      status: isFuture ? 'none' : (map[iso] ?? 'none'),
      isFuture,
    });
    if ((i + 1) % 7 === 0) { weeks.push(week); week = []; }
  });
  if (week.length) weeks.push(week);

  return weeks;
}

// ─── Heatmap Component ────────────────────────────────────────────────────────
function AttendanceHeatmap({ sessions, studentId }: {
  sessions: AttendanceSession[];
  studentId: string;
}) {
  const weeks = useMemo(() => {
    const grid = buildHeatmapGrid(sessions, studentId);
    return grid.reverse(); // Newest (today) on the left
  }, [sessions, studentId]);

  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-card rounded-3xl border border-border shadow-soft p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-11 w-11 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
          <CalendarDays size={22} />
        </div>
        <div>
          <h3 className="text-xl font-black tracking-tight">Attendance Heatmap</h3>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
            Last 12 months · Today is leftmost
          </p>
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mb-5 flex-wrap">
        {(['present', 'absent', 'leave', 'none'] as const).map((s) => (
          <div key={s} className="flex items-center gap-1.5">
            <div className="h-3 w-3 rounded-sm" style={{ backgroundColor: STATUS_BG[s] }} />
            <span className="text-xs font-bold text-muted-foreground">{STATUS_LABEL[s]}</span>
          </div>
        ))}
      </div>

      {/* Grid — newest on the left */}
      <div className="overflow-x-auto pb-2">
        <div className="flex gap-1 min-w-max">
          {/* Day-of-week labels */}
          <div className="flex flex-col gap-1 pt-6 pr-2 shrink-0">
            {DAY_LABELS.map((d) => (
              <div key={d} className="h-3.5 text-[9px] font-bold text-muted-foreground flex items-center w-6">
                {d}
              </div>
            ))}
          </div>

          {/* Week columns */}
          {weeks.map((week, wi) => (
            <div key={wi} className="flex flex-col gap-1">
              {/* Month label only on the first week of each month (or when month changes) */}
              <div className="h-5 text-[9px] font-bold text-muted-foreground leading-none">
                {week[0] && (week[0].date.getDate() <= 7 || wi === 0)
                  ? format(week[0].date, 'MMM')
                  : ''}
              </div>
              {week.map((cell, di) => (
                <div
                  key={di}
                  title={`${format(cell.date, 'dd MMM yyyy')} — ${cell.isFuture ? 'Future' : STATUS_LABEL[cell.status]}`}
                  className="h-3.5 w-3.5 rounded-sm transition-transform hover:scale-125 cursor-default"
                  style={{
                    backgroundColor: cell.isFuture ? 'transparent' : STATUS_BG[cell.status],
                    border: cell.isFuture ? '1px dashed #cbd5e1' : 'none',
                  }}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentAttendanceHistoryPage() {
  const { id } = useParams();
  const router = useRouter();
  const studentId = id as string;

  const { data: student, isLoading: isLoadingStudent } = useQuery({
    queryKey: ['student', studentId],
    queryFn: () => studentService.getStudentById(studentId),
    enabled: !!studentId,
  });

  const academicYearStart = format(subYears(new Date(), 1), 'yyyy-MM-dd');

  // Diagnostic logging
  if (student) {
    console.log("🔍 [StudentAttendanceHistory] IDs from Student Doc:", {
      id,
      classId: student.classId,
      sectionId: student.sectionId
    });
  }

  // Heatmap — full year sessions
  const { data: heatmapSessions = [], isLoading: isLoadingHeatmap } = useQuery({
    queryKey: ['attendance_sessions_heatmap', student?.classId, student?.sectionId],
    queryFn: () =>
      attendanceService.getSessionsForHeatmap(
        student!.classId,
        student!.sectionId,
        academicYearStart
      ),
    enabled: !!student?.classId,
    staleTime: 10 * 60 * 1000,
  });

  // Paginated history table
  const {
    data: pagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingHistory,
  } = useInfiniteQuery({
    queryKey: ['attendance_sessions_history', student?.classId, student?.sectionId],
    queryFn: ({ pageParam = null }) =>
      attendanceService.getSessions(
        student!.classId,
        student!.sectionId,
        50,
        pageParam
      ),
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    initialPageParam: null as any,
    enabled: !!student?.classId,
  });

  // Flatten sessions → rows for this student
  const historyRows = useMemo(() => {
    return (
      pagesData?.pages
        .flatMap((p) => p.sessions)
        .map((session) => ({
          date: session.date,
          status: (session.students?.[studentId] as AttendanceStatus | undefined) ?? null,
        }))
        .filter((r) => r.status !== null) ?? []
    );
  }, [pagesData, studentId]);

  // Summary counts from heatmap sessions
  const summary = useMemo(() => {
    const counts = { present: 0, absent: 0, leave: 0 };
    console.log('heatmapSessions', heatmapSessions);

    heatmapSessions.forEach((s) => {
      const st = s.students?.[studentId] as AttendanceStatus | undefined;
      if (st && st in counts) counts[st]++;
    });
    const total = counts.present + counts.absent + counts.leave;
    return { ...counts, total, pct: total ? Math.round((counts.present / total) * 100) : 0 };
  }, [heatmapSessions, studentId]);

  // Virtualizer
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: historyRows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 56,
    overscan: 8,
  });
  const virtualItems = rowVirtualizer.getVirtualItems();

  const onScroll = useCallback(() => {
    if (!parentRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = parentRef.current;
    if (scrollHeight - scrollTop - clientHeight < 200 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoadingStudent)
    return (
      <div className="p-12 text-center flex flex-col items-center gap-2">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground">Loading student…</p>
      </div>
    );

  if (!student)
    return <div className="p-8 text-center text-red-500 font-bold">Student not found!</div>;

  const statusColors: Record<string, { bg: string; text: string; border: string }> = {
    present: { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
    absent: { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
    leave: { bg: '#fffbeb', text: '#b45309', border: '#fde68a' },
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
      >
        <ChevronLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        Back to Profile
      </button>

      {/* Header */}
      <div>
        <h2 className="text-3xl font-black tracking-tight">Attendance History</h2>
        <p className="text-muted-foreground mt-1 font-medium italic">
          {student.fullName} — complete record
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: summary.present, bg: '#f0fdf4', color: '#15803d', border: '#bbf7d0' },
          { label: 'Absent', value: summary.absent, bg: '#fef2f2', color: '#b91c1c', border: '#fecaca' },
          { label: 'Leave', value: summary.leave, bg: '#fffbeb', color: '#b45309', border: '#fde68a' },
          { label: 'Attendance', value: `${summary.pct}%`, bg: '#f5f3ff', color: '#7c3aed', border: '#ddd6fe' },
        ].map(({ label, value, bg, color, border }) => (
          <div key={label} className="rounded-2xl p-5 border" style={{ backgroundColor: bg, borderColor: border }}>
            <p className="text-[10px] font-black uppercase tracking-widest mb-1" style={{ color }}>{label}</p>
            <p className="text-3xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* Heatmap */}
      {isLoadingHeatmap ? (
        <div className="h-40 flex items-center justify-center bg-card rounded-3xl border border-border">
          <Loader2 size={28} className="animate-spin text-primary" />
        </div>
      ) : (
        <AttendanceHeatmap sessions={heatmapSessions} studentId={studentId} />
      )}

      {/* History Table */}
      <div className="bg-card rounded-3xl border border-border shadow-soft overflow-hidden">
        <div className="grid grid-cols-2 px-6 py-4 border-b border-border bg-muted/30">
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Date</span>
          <span className="text-xs font-black text-muted-foreground uppercase tracking-widest">Status</span>
        </div>

        {isLoadingHistory ? (
          <div className="h-48 flex items-center justify-center">
            <Loader2 size={28} className="animate-spin text-primary" />
          </div>
        ) : historyRows.length === 0 ? (
          <div className="px-6 py-16 text-center space-y-2">
            <CalendarDays size={32} className="mx-auto text-muted-foreground/40" />
            <p className="text-sm font-bold text-muted-foreground">No attendance records yet.</p>
            <p className="text-xs text-muted-foreground/60">Records will appear once attendance is submitted.</p>
          </div>
        ) : (
          <div ref={parentRef} onScroll={onScroll} className="h-[480px] overflow-y-auto">
            <div style={{ height: rowVirtualizer.getTotalSize(), position: 'relative' }}>
              {virtualItems.length > 0 && <div style={{ height: virtualItems[0].start }} />}
              {virtualItems.map((vRow) => {
                const row = historyRows[vRow.index];
                const sc = statusColors[row.status as string] ?? { bg: '#f1f5f9', text: '#64748b', border: '#e2e8f0' };
                return (
                  <div
                    key={vRow.index}
                    ref={rowVirtualizer.measureElement}
                    data-index={vRow.index}
                    className="grid grid-cols-2 px-6 py-4 border-b border-border/50 hover:bg-muted/20 transition-colors items-center"
                  >
                    <span className="text-sm font-bold text-foreground">
                      {format(new Date(row.date + 'T00:00:00'), 'dd MMM yyyy')}
                    </span>
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-black uppercase border w-fit"
                      style={{ backgroundColor: sc.bg, color: sc.text, borderColor: sc.border }}
                    >
                      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: sc.text }} />
                      {row.status}
                    </span>
                  </div>
                );
              })}
              {virtualItems.length > 0 && (
                <div style={{ height: rowVirtualizer.getTotalSize() - virtualItems[virtualItems.length - 1].end }} />
              )}
            </div>
            {isFetchingNextPage && (
              <div className="flex justify-center p-4">
                <Loader2 size={20} className="animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
