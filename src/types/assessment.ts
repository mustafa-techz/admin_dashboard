// ─────────────────────────────────────────────────────────────────
// Assessment & Exam Types
// ─────────────────────────────────────────────────────────────────

export type AssessmentType = 'exam' | 'test';

export type AssessmentStatus =
  | 'draft'
  | 'schedule_published'
  | 'marks_open'
  | 'locked'
  | 'published';

export const ASSESSMENT_STATUS_ORDER: AssessmentStatus[] = [
  'draft',
  'schedule_published',
  'marks_open',
  'locked',
  'published',
];

// ─────────────────────────────────────────────────────────────────
// Firestore: assessments/{assessmentId}
// ─────────────────────────────────────────────────────────────────
export interface Assessment {
  id: string;
  type: AssessmentType;
  name: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  branchId: string;
  status: AssessmentStatus;
  subjects: string[];
  publishedAt?: string | null;
  publishedBy?: string | null;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface AssessmentFormData {
  type: AssessmentType;
  name: string;
  classId: string;
  sectionId: string;
  academicYear: string;
  branchId: string;
  subjects: string[];
}

// ─────────────────────────────────────────────────────────────────
// Firestore: assessments/{id}/schedule/{slotId}
// ─────────────────────────────────────────────────────────────────
export interface ExamScheduleSlot {
  id: string;
  subject: string;
  date: string; // ISO date
  startTime: string;
  endTime: string;
  maxMarks: number;
}

export interface ExamScheduleFormData {
  subject: string;
  date: string;
  startTime: string;
  endTime: string;
  maxMarks: number;
}

// ─────────────────────────────────────────────────────────────────
// Firestore: assessments/{id}/subjectMarks/{studentId_subject}
// ─────────────────────────────────────────────────────────────────
export interface SubjectMark {
  id: string; // studentId_subject
  studentId: string;
  studentName: string;
  subject: string;
  marks: number;
  maxMarks: number;
  isAbsent: boolean;
  enteredBy: string;
  enteredByName: string;
  updatedAt: string;
}

export interface SubjectMarkEntry {
  studentId: string;
  studentName: string;
  marks: number;
  isAbsent: boolean;
}

// ─────────────────────────────────────────────────────────────────
// Firestore: assessments/{id}/studentSummary/{studentId}
// ─────────────────────────────────────────────────────────────────
export interface SubjectResult {
  subject: string;
  marks: number;
  maxMarks: number;
  isAbsent: boolean;
}

export interface StudentResultSummary {
  id: string; // studentId
  studentId: string;
  studentName: string;
  rollNumber: string;
  classId: string;
  sectionId: string;
  subjectResults: SubjectResult[];
  totalMarks: number;
  totalMaxMarks: number;
  percentage: number;
  grade: string;
  status: 'pass' | 'fail';
  generatedAt: string;
}

// ─────────────────────────────────────────────────────────────────
// UI Helpers
// ─────────────────────────────────────────────────────────────────
export const ASSESSMENT_STATUS_LABELS: Record<AssessmentStatus, string> = {
  draft: 'Draft',
  schedule_published: 'Schedule Published',
  marks_open: 'Marks Entry Open',
  locked: 'Locked',
  published: 'Results Published',
};

export const ASSESSMENT_STATUS_COLORS: Record<AssessmentStatus, string> = {
  draft: 'bg-amber-100 text-amber-700',
  schedule_published: 'bg-blue-100 text-blue-700',
  marks_open: 'bg-purple-100 text-purple-700',
  locked: 'bg-orange-100 text-orange-700',
  published: 'bg-emerald-100 text-emerald-700',
};
