import { z } from 'zod';

export const AttendanceStatusEnum = z.enum(['present', 'absent', 'leave']);
export type AttendanceStatus = z.infer<typeof AttendanceStatusEnum>;

export const AttendanceDraftSchema = z.object({
  studentId: z.string(),
  status: AttendanceStatusEnum,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format, use YYYY-MM-DD"),
  classId: z.string(),
  sectionId: z.string().optional(),
});

export type AttendanceDraftRecord = z.infer<typeof AttendanceDraftSchema>;

/**
 * Session/Class model document.
 * ID format: {date}_{classId}_{section}
 * e.g. attendance_sessions/2026-04-07_10_A
 */
export interface AttendanceSession {
  date: string;
  classId: string;
  section: string;
  teacherId: string;
  totalStudents: number;
  createdAt: any;
  /** Map of studentId → status */
  students: Record<string, AttendanceStatus>;
}

export interface StudentStats {
  studentId: string;
  totalPresent: number;
  totalAbsent: number;
  totalLeave: number;
  totalDays: number;
  attendancePercentage: number;
}

export interface DailySummary {
  date: string;
  totalPresentToday: number;
  totalAbsentToday: number;
  totalLeaveToday: number;
  totalStrength: number;
}
