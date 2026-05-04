'use client';

import { useQuery } from '@tanstack/react-query';
import { studentService } from '@/services/studentService';
import { attendanceService } from '@/services/attendanceService';
import { useParams, useRouter } from 'next/navigation';
import {
  ChevronLeft,
  Phone,
  MapPin,
  Award,
  ArrowRight,
  Loader2,
  User,
  BookOpen,
  CalendarDays,
  TrendingUp,
} from 'lucide-react';
import StatCircle from '@/components/shared/StatCircle';
import { cn } from '@/lib/utils';
import { Student } from '@/types/student';
import { classService, sectionService } from '@/services/firebase/masterDataService';

export default function StudentDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: student, isLoading: isLoadingStudent } = useQuery<Student | null>({
    queryKey: ['student', id],
    queryFn: () => studentService.getStudentById(id as string),
    enabled: !!id,
  });

  // Single read: student_stats/{studentId}
  const { data: stats } = useQuery({
    queryKey: ['student_stats', id],
    queryFn: () => attendanceService.getStudentStats(id as string),
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });

  if (isLoadingStudent)
    return (
      <div className="p-12 text-center flex flex-col items-center gap-2">
        <Loader2 size={32} className="animate-spin text-primary" />
        <p className="text-sm font-bold text-muted-foreground">
          Fetching student data...
        </p>
      </div>
    );
  if (!student)
    return (
      <div className="p-8 text-center text-red-500 font-bold">
        Student not found!
      </div>
    );

  const className =
    classes.find((c) => c.id === student.classId)?.className || student.classId;
  const sectionName =
    sections.find((s) => s.id === student.sectionId)?.sectionName ||
    student.sectionId;

  const attendancePct = stats
    ? Math.round((stats.totalPresent / Math.max(stats.totalDays, 1)) * 100)
    : student.attendanceRate ?? 0;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary transition-colors group"
      >
        <ChevronLeft
          size={18}
          className="transition-transform group-hover:-translate-x-1"
        />
        Back to Students
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ── Left: Profile card ─────────────────────────────────────── */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8 text-center">
            <div className="relative inline-block mb-6">
              <div className="h-32 w-32 rounded-3xl bg-primary/10 flex items-center justify-center text-primary font-black text-5xl shadow-inner border border-primary/20">
                {student.fullName.charAt(0)}
              </div>
              <div className="absolute -bottom-2 -right-2 h-10 w-10 bg-green-500 rounded-2xl flex items-center justify-center text-white border-4 border-card">
                <Award size={18} />
              </div>
            </div>

            <h2 className="text-2xl font-black tracking-tight">
              {student.fullName}
            </h2>
            <p className="text-sm font-bold text-muted-foreground mb-6 uppercase tracking-widest">
              Roll NO: {student.rollNumber || 'N/A'}
            </p>

            <div className="p-4 bg-secondary rounded-2xl border border-border/50 text-left">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1">
                Class
              </p>
              <p className="text-lg font-black text-foreground">
                {className}
                {sectionName}
              </p>
            </div>
          </div>

          {/* Personal info */}
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8 space-y-4">
            <h3 className="text-sm font-black uppercase tracking-widest text-muted-foreground mb-2">
              Personal Information
            </h3>
            {[
              {
                icon: User,
                label: 'Gender / DOB',
                value: `${student.gender} / ${student.dateOfBirth}`,
              },
              {
                icon: Phone,
                label: 'Guardian Contact',
                value: student.parentDetails?.phone,
              },
              {
                icon: MapPin,
                label: 'Address',
                value: `${student.addressDetails?.street}, ${student.addressDetails?.city}`,
              },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center gap-4 group">
                <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center group-hover:bg-primary/10 transition-colors shrink-0">
                  <Icon
                    size={18}
                    className="text-muted-foreground group-hover:text-primary"
                  />
                </div>
                <div className="overflow-hidden">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-0.5">
                    {label}
                  </p>
                  <p className="text-sm font-bold truncate">{value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right: Stats + attendance ───────────────────────────────── */}
        <div className="lg:col-span-2 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Attendance Circle */}
            <div className="bg-card rounded-3xl border border-border shadow-soft p-8 flex flex-col items-center justify-center border-b-4 border-b-primary/50">
              <StatCircle
                value={attendancePct}
                total={100}
                label="Current Attendance"
                size={180}
              />
              <div className="mt-4 p-4 bg-primary/5 rounded-2xl w-full text-center">
                <p className="text-[10px] font-black text-primary uppercase tracking-widest mb-1">
                  Attendance Rate
                </p>
                <p className="text-sm font-bold text-foreground">
                  {attendancePct}%
                </p>
              </div>
            </div>

            {/* Academic summary */}
            <div className="bg-card rounded-3xl border border-border shadow-soft p-8 flex flex-col border-b-4 border-b-amber-400">
              <div className="flex items-center justify-between mb-8">
                <div className="h-12 w-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600">
                  <BookOpen size={24} />
                </div>
                <span
                  className={cn(
                    'px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest',
                    student.feeStatus === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  )}
                >
                  {student.feeStatus || 'pending'}
                </span>
              </div>

              <h3 className="text-xl font-black tracking-tight mb-2">
                Academic Summary
              </h3>
              <p className="text-sm text-muted-foreground font-medium mb-6">
                Enrolled in Class {className} — Section {sectionName}.
              </p>

              <div className="space-y-3 mt-auto">
                <div className="flex justify-between items-center p-3 bg-secondary rounded-xl">
                  <span className="text-xs font-bold text-muted-foreground">
                    Blood Group
                  </span>
                  <span className="text-sm font-black">{student.bloodGroup}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-secondary rounded-xl">
                  <span className="text-xs font-bold text-muted-foreground">
                    Father's Name
                  </span>
                  <span className="text-sm font-black">
                    {student.parentDetails?.fatherName}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Attendance Stats card (from student_stats) ────────────── */}
          <div className="bg-card rounded-3xl border border-border shadow-soft p-8">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-11 w-11 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600">
                  <CalendarDays size={22} />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">
                    Attendance Summary
                  </h3>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                    Live from Firestore
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/students/${id}/attendance`)}
                className="flex items-center gap-2 text-sm font-bold text-primary hover:underline group"
              >
                View History
                <ArrowRight
                  size={14}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </button>
            </div>

            {stats ? (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Present',
                    value: stats.totalPresent,
                    bg: 'bg-green-50',
                    text: 'text-green-700',
                    border: 'border-green-100',
                  },
                  {
                    label: 'Absent',
                    value: stats.totalAbsent,
                    bg: 'bg-red-50',
                    text: 'text-red-700',
                    border: 'border-red-100',
                  },
                  {
                    label: 'Leave',
                    value: stats.totalLeave,
                    bg: 'bg-amber-50',
                    text: 'text-amber-700',
                    border: 'border-amber-100',
                  },
                  {
                    label: 'Total Days',
                    value: stats.totalDays,
                    bg: 'bg-primary/5',
                    text: 'text-primary',
                    border: 'border-primary/10',
                  },
                ].map(({ label, value, bg, text, border }) => (
                  <div
                    key={label}
                    className={cn(
                      'p-5 rounded-2xl border flex flex-col gap-1',
                      bg,
                      border
                    )}
                  >
                    <p
                      className={cn(
                        'text-[10px] font-black uppercase tracking-widest',
                        text
                      )}
                    >
                      {label}
                    </p>
                    <p className={cn('text-3xl font-black', text)}>{value}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-3 text-sm text-muted-foreground font-medium p-4 bg-secondary rounded-2xl">
                <TrendingUp size={18} />
                No attendance records found yet.
              </div>
            )}
          </div>

          {/* Academic progress (unchanged) */}
          {/* <div className="bg-card rounded-3xl border border-border shadow-soft p-8">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-xl font-black tracking-tight">
                Academic Progress
              </h3>
              <button className="text-sm font-bold text-primary flex items-center gap-1 hover:underline">
                Download Report <ArrowRight size={14} />
              </button>
            </div>
            <div className="space-y-6">
              {[
                { subject: 'Mathematics', progress: 85, color: 'bg-primary' },
                { subject: 'Science', progress: 92, color: 'bg-green-500' },
                { subject: 'History', progress: 78, color: 'bg-amber-500' },
                { subject: 'English', progress: 88, color: 'bg-indigo-500' },
              ].map((item) => (
                <div key={item.subject} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold text-foreground">
                      {item.subject}
                    </span>
                    <span className="text-xs font-black text-muted-foreground uppercase">
                      {item.progress}%
                    </span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn(
                        'h-full rounded-full transition-all duration-1000',
                        item.color
                      )}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>
    </div>
  );
}
