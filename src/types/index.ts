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

export interface Teacher {
  id: string;
  name: string;
  email: string;
  subject: string;
  class: string;
  experience: string;
  contact: string;
}

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
