export interface Student {
  id: string;
  firstName: string;
  lastName: string;
  name: string; // Required full name for UI
  rollNumber: string;
  class: string;
  section: string;
  parentName: string;
  contact: string;
  email: string;
  address: string;
  admissionDate: string;
  feeStatus: 'paid' | 'pending';
  attendanceRate: number;
  createdAt?: string;
  classId?: string;
}
