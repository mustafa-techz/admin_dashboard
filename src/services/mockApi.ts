import { Student, Teacher, SubAdmin, Attendance, DashboardStats } from '../types';

export const mockStudents: Student[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    rollNumber: '101',
    class: '10',
    section: 'A',
    parentName: 'Bob Johnson',
    contact: '+1234567890',
    email: 'alice@example.com',
    address: '123 Maple St',
    admissionDate: '2023-09-01',
    feeStatus: 'paid',
    attendanceRate: 95,
  },
  {
    id: '2',
    name: 'Charlie Smith',
    rollNumber: '102',
    class: '10',
    section: 'A',
    parentName: 'Diana Smith',
    contact: '+1234567891',
    email: 'charlie@example.com',
    address: '456 Oak St',
    admissionDate: '2023-09-01',
    feeStatus: 'pending',
    attendanceRate: 88,
  },
  {
    id: '3',
    name: 'Eva Brown',
    rollNumber: '201',
    class: '9',
    section: 'B',
    parentName: 'Frank Brown',
    contact: '+1234567892',
    email: 'eva@example.com',
    address: '789 Pine St',
    admissionDate: '2023-09-02',
    feeStatus: 'paid',
    attendanceRate: 92,
  },
];

export const mockTeachers: Teacher[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john@school.com',
    subject: 'Mathematics',
    class: '10A',
    experience: '10 years',
    contact: '+1112223334',
  },
  {
    id: '2',
    name: 'Jane White',
    email: 'jane@school.com',
    subject: 'Science',
    class: '9B',
    experience: '8 years',
    contact: '+1112223335',
  },
];

export const mockSubAdmins: SubAdmin[] = [
  {
    id: '1',
    name: 'Sub-admin One',
    email: 'subadmin@school.com',
    role: 'sub-admin',
    permissions: ['manage-teachers', 'manage-students', 'track-attendance'],
  },
];

export const mockAttendance: Attendance[] = [
  {
    id: 'a1',
    studentId: '1',
    studentName: 'Alice Johnson',
    class: '10A',
    date: '2026-03-30',
    status: 'present',
  },
  {
    id: 'a2',
    studentId: '2',
    studentName: 'Charlie Smith',
    class: '10A',
    date: '2026-03-30',
    status: 'absent',
  },
];

// Mock API Functions
export const getStudents = async (): Promise<Student[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(mockStudents), 500));
};

export const getTeachers = async (): Promise<Teacher[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(mockTeachers), 500));
};

export const getSubAdmins = async (): Promise<SubAdmin[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(mockSubAdmins), 500));
};

export const getAttendance = async (): Promise<Attendance[]> => {
  return new Promise((resolve) => setTimeout(() => resolve(mockAttendance), 500));
};

export const getDashboardStats = async (): Promise<DashboardStats> => {
  return new Promise((resolve) =>
    setTimeout(
      () =>
        resolve({
          totalStudents: 400,
          totalTeachers: 25,
          totalSubAdmins: 5,
          attendanceToday: { present: 334, total: 400 },
        }),
      500
    )
  );
};

export const markAttendance = async (studentId: string, status: 'present' | 'absent'): Promise<void> => {
  return new Promise((resolve) => {
    console.log(`Marking student ${studentId} as ${status}`);
    setTimeout(resolve, 500);
  });
};
