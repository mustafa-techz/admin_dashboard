export type UserRole = 'admin' | 'sub-admin' | 'teacher';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
}

import { Student } from './student';
export type { Student };

import { Teacher, TeacherFormData } from './teacher';
export type { Teacher, TeacherFormData };

export interface SubAdmin {
  id: string;
  name: string;
  email: string;
  role: 'sub-admin';
  permissions: string[];
}

export interface Attendance {
  id: string;
  studentId: string;
  studentName: string;
  class: string;
  date: string;
  status: 'present' | 'absent';
}

export interface DashboardStats {
  totalStudents: number;
  totalTeachers: number;
  totalSubAdmins: number;
  attendanceToday: {
    present: number;
    total: number;
  };
}
