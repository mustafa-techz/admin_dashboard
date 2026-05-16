'use client';

import { useState, useMemo, useEffect } from 'react';
import { useInfiniteQuery, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { useAttendanceDraftStore } from '@/store/attendanceDraftStore';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { getAuthorizedClassIds } from '@/lib/teacherScope';
import { AttendanceStatus } from '@/types/attendance';
import {
  Check,
  X,
  Calendar as CalendarIcon,
  Edit3,
  CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import VirtualDataTable from '@/components/tables/VirtualDataTable';
import FilterBar from '@/components/tables/FilterBar';
import { Student } from '@/types/student';
import { classService, sectionService } from '@/services/firebase/masterDataService';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { syncAttendanceDashboardCache } from '@/lib/dashboardCacheSync';

export default function AttendancePage() {
  const [search, setSearch] = useState('');
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');

  const user = useAuthStore(state => state.user);
  const role = useAuthStore(state => state.role);
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  const queryClient = useQueryClient();
  const authorizedClassIds = useMemo(() => getAuthorizedClassIds(
    user ? { role: user.role, classIds: user.classIds } : null
  ), [user]);

  const currentDate = new Date().toISOString().split('T')[0];

  // ── Zustand draft store ───────────────────────────────────────────────
  const drafts = useAttendanceDraftStore(state => state.drafts);
  const setStatus = useAttendanceDraftStore(state => state.setStatus);
  const markAll = useAttendanceDraftStore(state => state.markAll);
  const clearDrafts = useAttendanceDraftStore(state => state.clearDrafts);
  const getChanges = useAttendanceDraftStore(state => state.getChanges);

  // ── Master Data ───────────────────────────────────────────────────────
  const { data: allClasses = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // Filter classes for teacher scope
  const classes = useMemo(() => {
    if (!authorizedClassIds) return allClasses;
    return allClasses.filter((c) => authorizedClassIds.includes(c.id));
  }, [allClasses, authorizedClassIds]);

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
  });

  // ── 1. Fetch students (infinite / paginated) ──────────────────────────
  const {
    data: pagesData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: isLoadingStudents,
  } = useInfiniteQuery({
    queryKey: ['students', 'infinite', selectedBranchId, authorizedClassIds],
    queryFn: ({ pageParam = null }) =>
      studentService.getStudentsPaginated(
        selectedBranchId || undefined,
        100,
        pageParam,
        authorizedClassIds
      ),
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    initialPageParam: null as any,
    enabled: !!selectedBranchId,
  });

  const students = useMemo(
    () => pagesData?.pages.flatMap((p) => p.students) ?? [],
    [pagesData]
  );

  // Filter students by class/section for the attendance list
  const displayStudents = useMemo(() => {
    return students.filter(s =>
      (!selectedClassId || s.classId === selectedClassId) &&
      (!selectedSectionId || s.sectionId === selectedSectionId)
    );
  }, [students, selectedClassId, selectedSectionId]);

  // Default selection
  useEffect(() => {
    if (classes.length > 0 && !selectedClassId) setSelectedClassId(classes[0].id);
    if (sections.length > 0 && !selectedSectionId) setSelectedSectionId(sections[0].id);
  }, [classes, sections, selectedClassId, selectedSectionId]);

  // ── 2. Fetch today's committed session (ONE Firestore read) ───────────
  const {
    data: committedAttendance = {},
  } = useQuery({
    queryKey: ['attendance_session', selectedClassId, selectedSectionId, currentDate],
    queryFn: () => attendanceService.getSession(currentDate, selectedClassId, selectedSectionId),
    enabled: !!selectedClassId && !!selectedSectionId,
    staleTime: 5 * 60 * 1000,
  });

  // ── 3. Live stats (draft-aware) ────────────────────────────────────────
  const stats = useMemo(() => {
    const merged: Record<string, AttendanceStatus> = {
      ...committedAttendance,
      ...drafts,
    };
    const values = Object.values(merged);
    return {
      total: displayStudents.length,
      present: values.filter((v) => v === 'present').length,
      absent: values.filter((v) => v === 'absent').length,
    };
  }, [displayStudents.length, committedAttendance, drafts]);

  // ── 4. Changes pending submission ────────────────────────────────────
  const rawChanges = useMemo(() => getChanges(committedAttendance), [getChanges, committedAttendance, drafts]);
  const hasChanges = Object.keys(rawChanges).length > 0;

  // ── 5. Submit mutation ───────────────────────────────────────────────
  const submitMutation = useMutation({
    mutationFn: () => {
      if (!user?.id) {
        return Promise.reject(new Error('User not authenticated'));
      }
      // Merge draft over committed to form the full new state
      const newStatuses: Record<string, AttendanceStatus> = {
        ...committedAttendance,
        ...rawChanges,
      };
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const selectedSection = sections.find(s => s.id === selectedSectionId);

      return attendanceService.saveSession(
        currentDate,
        selectedClassId,
        selectedSectionId,
        user.id,
        displayStudents.length,
        newStatuses,
        committedAttendance,
        selectedClass?.className,
        selectedSection?.sectionName
      );
    },
    onSuccess: () => {
      const selectedClass = classes.find(c => c.id === selectedClassId);
      const selectedSection = sections.find(s => s.id === selectedSectionId);
      const newStatuses: Record<string, AttendanceStatus> = {
        ...committedAttendance,
        ...rawChanges,
      };

      syncAttendanceDashboardCache(queryClient, {
        date: currentDate,
        classId: selectedClassId,
        sectionId: selectedSectionId,
        teacherId: user?.id ?? '',
        totalStudents: displayStudents.length,
        newStatuses,
        prevStatuses: committedAttendance,
        className: selectedClass?.className,
        sectionName: selectedSection?.sectionName,
        branchId: selectedBranchId,
      });
      clearDrafts();
      setIsEditing({});
      setIsModalOpen(true);
    },
  });

  // ── 6. Bulk actions ──────────────────────────────────────────────────
  const handleMarkAll = (status: AttendanceStatus) => {
    const ids = displayStudents
      .filter((s) => !committedAttendance[s.id] || isEditing[s.id])
      .map((s) => s.id);
    markAll(ids, status);
  };

  const toggleEdit = (id: string) =>
    setIsEditing((prev) => ({ ...prev, [id]: !prev[id] }));

  // ── 7. Filtered/search list ──────────────────────────────────────────
  const filteredStudents = useMemo(
    () =>
      displayStudents.filter((s) =>
        s.fullName?.toLowerCase().includes(search.toLowerCase())
      ),
    [displayStudents, search]
  );

  // ── 8. Table columns (UI unchanged) ──────────────────────────────────
  const columns = useMemo(() => [
    {
      header: 'S.No',
      cell: (student: Student) => {
        const index = filteredStudents.findIndex((s) => s.id === student.id);
        return (
          <span className="font-bold text-muted-foreground">{index + 1}</span>
        );
      },
    },
    {
      header: 'Student',
      cell: (student: Student) => (
        <div
          className={cn(
            'flex items-center gap-3 p-2 rounded-xl transition-all duration-300',
            drafts[student.id] &&
              drafts[student.id] !== committedAttendance[student.id]
              ? 'bg-blue-50/80 border-l-4 border-blue-500 shadow-sm'
              : 'border-l-4 border-transparent'
          )}
        >
          <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm border border-slate-200">
            {student.fullName?.charAt(0)}
          </div>
          <div>
            <p className="font-bold text-slate-800 leading-none">
              {student.fullName}
            </p>
            <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wider font-semibold">
              ID: {student.id.slice(0, 6)}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Status Today',
      cell: (student: Student) => {
        const currentStatus =
          drafts[student.id] ?? committedAttendance[student.id];
        const isLocked =
          !!committedAttendance[student.id] && !isEditing[student.id];

        if (isLocked) {
          return (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[11px] font-black uppercase border shadow-sm',
                currentStatus === 'present' &&
                'bg-green-50 text-green-700 border-green-200',
                currentStatus === 'absent' &&
                'bg-red-50 text-red-700 border-red-200',
                currentStatus === 'leave' &&
                'bg-amber-50 text-amber-700 border-amber-200'
              )}
            >
              <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
              {currentStatus}
            </motion.div>
          );
        }

        return (
          <div className="flex items-center gap-2">
            {(
              [
                {
                  id: 'present',
                  icon: Check,
                  color:
                    'hover:bg-green-600 hover:text-white text-green-600 border-green-200 bg-green-50',
                },
                {
                  id: 'absent',
                  icon: X,
                  color:
                    'hover:bg-red-600 hover:text-white text-red-600 border-red-200 bg-red-50',
                },
                {
                  id: 'leave',
                  icon: CalendarIcon,
                  color:
                    'hover:bg-amber-500 hover:text-white text-amber-600 border-amber-200 bg-amber-50',
                },
              ] as const
            ).map((btn) => (
              <button
                key={btn.id}
                onClick={() =>
                  setStatus(student.id, btn.id as AttendanceStatus)
                }
                className={cn(
                  'p-2.5 rounded-xl border transition-all duration-200 transform active:scale-90',
                  currentStatus === btn.id
                    ? 'bg-slate-900 text-white border-slate-900 shadow-lg scale-110 z-10'
                    : `${btn.color} opacity-80 hover:opacity-100 hover:shadow-md`
                )}
              >
                <btn.icon size={18} />
              </button>
            ))}
          </div>
        );
      },
    },
    {
      header: 'Actions',
      cell: (student: Student) => (
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleEdit(student.id)}
            disabled={!committedAttendance[student.id]}
            className={cn(
              'p-2 rounded-lg transition-all flex items-center gap-1.5 text-sm font-semibold',
              isEditing[student.id]
                ? 'bg-blue-100 text-blue-600'
                : 'text-slate-400 hover:text-blue-600 hover:bg-slate-100',
              !committedAttendance[student.id] && 'opacity-30 cursor-not-allowed'
            )}
          >
            <Edit3 size={15} /> Edit
          </button>
        </div>
      ),
    },
  ], [filteredStudents, drafts, committedAttendance, isEditing, setStatus]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-28 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight">Attendance</h2>
          <p className="text-muted-foreground mt-1 font-medium italic">
            Mark and track student presence for today.
          </p>
        </div>
        <div className="flex items-center gap-3 bg-card border border-border px-4 py-2.5 rounded-2xl shadow-soft">
          <CalendarIcon size={18} className="text-primary" />
          <span className="text-sm font-black">
            {new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      </div>

      {/* Selection Filters */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-card border border-border p-6 rounded-3xl shadow-soft">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Select Class
          </label>
          <Select
            value={selectedClassId}
            onValueChange={setSelectedClassId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.className}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
            Select Section
          </label>
          <Select
            value={selectedSectionId}
            onValueChange={setSelectedSectionId}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose Section" />
            </SelectTrigger>
            <SelectContent>
              {sections.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.sectionName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-green-50 border border-green-100 p-6 rounded-3xl">
          <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">
            Present Today
          </p>
          <h3 className="text-3xl font-black text-green-700">{stats.present}</h3>
        </div>
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl">
          <p className="text-[10px] font-black text-red-600 uppercase tracking-widest mb-1">
            Absent Today
          </p>
          <h3 className="text-3xl font-black text-red-700">{stats.absent}</h3>
        </div>
        <div className="bg-primary/5 border border-primary/10 p-6 rounded-3xl">
          <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
            Total Strength
          </p>
          <h3 className="text-3xl font-black text-foreground">{stats.total}</h3>
        </div>
      </div>

      {/* Bulk actions */}
      <div className="flex flex-wrap gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
        <button
          onClick={() => handleMarkAll('present')}
          className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl text-xs font-black hover:bg-green-700 transition-all active:scale-95"
        >
          <Check size={14} /> ALL PRESENT
        </button>
        <button
          onClick={() => handleMarkAll('absent')}
          className="flex items-center gap-2 px-5 py-2.5 bg-red-600 text-white rounded-xl text-xs font-black hover:bg-red-700 transition-all active:scale-95"
        >
          <X size={14} /> ALL ABSENT
        </button>
        <button
          onClick={() => handleMarkAll('leave')}
          className="flex items-center gap-2 px-5 py-2.5 bg-amber-500 text-white rounded-xl text-xs font-black hover:bg-amber-600 transition-all active:scale-95"
        >
          <CalendarIcon size={14} /> ALL LEAVE
        </button>
      </div>

      <FilterBar
        onSearch={setSearch}
        placeholder="Search by student name..."
      />

      <VirtualDataTable
        columns={columns}
        data={filteredStudents}
        isLoading={isLoadingStudents}
        onEndReached={() => {
          if (hasNextPage && !isFetchingNextPage) fetchNextPage();
        }}
      />

      {/* Floating submit button */}
      <div className="fixed bottom-8 right-8 z-40">
        <button
          disabled={!hasChanges || submitMutation.isPending || !user?.id}
          onClick={() => submitMutation.mutate()}
          className={cn(
            'px-8 py-3 rounded-2xl font-black text-sm transition-all duration-300 shadow-xl flex items-center gap-2',
            hasChanges && !submitMutation.isPending
              ? 'bg-foreground text-background hover:scale-105 cursor-pointer'
              : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-70'
          )}
        >
          {submitMutation.isPending ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-400 border-t-transparent" />
          ) : (
            hasChanges && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1, rotate: 360 }}
                transition={{
                  scale: { type: 'spring', stiffness: 200 },
                  rotate: { repeat: Infinity, duration: 4, ease: 'linear' },
                }}
              >
                <CheckCircle2 size={18} className="text-green-400" />
              </motion.div>
            )
          )}
          <span>
            {submitMutation.isPending
              ? 'Saving...'
              : hasChanges
                ? `Submit Changes (${Object.keys(rawChanges).length})`
                : 'No Changes'}
          </span>
        </button>
      </div>

      {/* Success modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ scale: 0.8, opacity: 0, y: 40 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 40 }}
              className="relative bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-3xl border border-slate-100"
            >
              <div className="mx-auto bg-green-50 w-24 h-24 rounded-full flex items-center justify-center mb-8 ring-8 ring-green-50/50">
                <CheckCircle2 className="h-12 w-12 text-green-600" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 tracking-tight">
                Session Saved!
              </h2>
              <p className="text-slate-500 mt-3 mb-8 leading-relaxed">
                Attendance session written to Firestore as a single document.
                <br />
                <span className="font-bold text-slate-800">
                  {Object.keys(rawChanges).length === 0
                    ? Object.keys(committedAttendance).length
                    : Object.keys(rawChanges).length}{' '}
                  student records updated.
                </span>
              </p>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full py-5 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-all shadow-xl active:scale-95"
              >
                Done
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
