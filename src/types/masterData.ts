export interface ClassMaster {
  id: string; // Firestore document ID
  classId: string;
  className: string;
}

export interface SectionMaster {
  id: string; // Firestore document ID
  sectionId: string;
  sectionName: string;
}

export interface BranchMaster {
  id: string; // Firestore document ID
  branchId: string;
  branchName: string;
}

export interface SubjectMaster {
  id: string; // Firestore document ID
  subjectId: string;
  subjectName: string;
}

export interface TimeSlotMaster {
  id: string; // Firestore document ID
  timeSlotId: string;
  startTime: string; // e.g., "07:00"
  endTime: string;   // e.g., "08:00"
  label: string;     // e.g., "7:00 AM - 8:00 AM"
}
