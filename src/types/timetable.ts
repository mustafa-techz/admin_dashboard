// ─────────────────────────────────────────────────────────────────
// Timetable Types
// ─────────────────────────────────────────────────────────────────

export type TimetableType = 'school' | 'class';
export type TimetableStatus = 'draft' | 'published' | 'archived';

export const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// ─────────────────────────────────────────────────────────────────
// Firestore: timetables/{timetableId}
// ─────────────────────────────────────────────────────────────────
export interface Timetable {
  id: string;
  type: TimetableType;
  name: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  branchId: string;
  status: TimetableStatus;
  createdBy: string;
  /** Display name of the creator */
  userName?: string;
  /** Role of the creator (admin, teacher, etc.) */
  userRole?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TimetableFormData {
  type: TimetableType;
  name: string;
  classId: string;
  sectionId: string;
  className?: string; // For activity logging context
  sectionName?: string; // For activity logging context
  academicYear: string;
  branchId: string;
}

// ─────────────────────────────────────────────────────────────────
// Firestore: timetables/{id}/slots/{slotId}
// ─────────────────────────────────────────────────────────────────
export interface TimetableSlot {
  id: string;
  day: Weekday;
  subject: string;
  startTime: string; // "09:00"
  endTime: string;   // "09:45"
  teacherId?: string;
  teacherName?: string;
  room?: string;
  order: number;
}

export interface TimetableSlotFormData {
  day: Weekday;
  subject: string;
  startTime: string;
  endTime: string;
  teacherId?: string;
  teacherName?: string;
  room?: string;
  order: number;
}

// ─────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────
export const TIMETABLE_STATUS_LABELS: Record<TimetableStatus, string> = {
  draft: 'Draft',
  published: 'Published',
  archived: 'Archived',
};

export const TIMETABLE_STATUS_COLORS: Record<TimetableStatus, string> = {
  draft: 'bg-amber-100 text-amber-700',
  published: 'bg-emerald-100 text-emerald-700',
  archived: 'bg-gray-100 text-gray-600',
};
