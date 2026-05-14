import { SubAdmin, DashboardStats } from '../types';

const mockSubAdmins: SubAdmin[] = [
  {
    id: '1',
    name: 'Sub-admin One',
    email: 'subadmin@school.com',
    role: 'sub-admin',
    permissions: ['manage-teachers', 'manage-students', 'track-attendance'],
  },
];

// ─────────────────────────────────────────────────────────────────
// Active Mock API Functions (still referenced by pages)
// ─────────────────────────────────────────────────────────────────

export const getSubAdmins = async (): Promise<SubAdmin[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(mockSubAdmins), 500));
};

import { studentService } from './studentService';

export const getDashboardStats = async (): Promise<DashboardStats> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  const students = await studentService.getStudents();

  return {
    totalStudents: students.length,
    totalTeachers: 12,
    totalSubAdmins: 4,
    attendanceToday: {
      present: Math.floor(students.length * 0.92),
      total: students.length
    }
  };
};
