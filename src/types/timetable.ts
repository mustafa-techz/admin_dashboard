export interface TimetableEntry {
  id: string; // Firestore document ID (timetableId)
  classId: string;
  sectionId: string;
  day: string; // "Monday", "Tuesday", etc.
  timeSlotId: string;
  subjectId: string;
  teacherId: string;
  branchId: string;
}

export type TimetableFormData = Omit<TimetableEntry, 'id'>;

export interface TimetableConflict {
  type: 'class' | 'teacher';
  message: string;
}
