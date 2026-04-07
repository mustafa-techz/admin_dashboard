import { AddressDetails } from './student';

export interface Teacher {
  id: string; // Firestore document ID
  teacherId: string; // Same as id, but used in some contexts as docId
  fullName: string;
  empId: string;
  addressDetails: AddressDetails;
  dateOfBirth: string;
  branchId: string;
  status: 'active' | 'inactive';
  gender: string;
  joiningDate: string;
  email: string;
  classTeacher: string; // classId
  subjects: string[];
  classIds: string[];
}

export type TeacherFormData = Omit<Teacher, 'id' | 'teacherId' | 'empId' | 'status'> & {
  status?: string;
};
