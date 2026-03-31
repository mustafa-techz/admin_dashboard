import { Student, Teacher, SubAdmin, Attendance, DashboardStats } from '../types';

export const mockStudents: Student[] = [
  {
    id: '1',
    fullName: 'John Doe',
    rollNumber: '10A-001',
    classId: '10',
    sectionId: 'A',
    parentId: 'parent-1',
    parentDetails: {
      fatherName: 'Richard Doe',
      motherName: 'Mary Doe',
      phone: '+1 234 567 890',
    },
    addressDetails: {
      street: '123 Street',
      city: 'New York',
      state: 'NY',
      pincode: '100001',
    },
    dateOfBirth: '2011-05-15',
    admissionDate: '2023-09-01',
    branchId: 'Main Branch',
    bloodGroup: 'O+',
    gender: 'Male',
    feeStatus: 'paid',
    attendanceRate: 95,
  },
  {
    id: '2',
    fullName: 'Jane Smith',
    rollNumber: '10B-001',
    classId: '10',
    sectionId: 'B',
    parentId: 'parent-2',
    parentDetails: {
      fatherName: 'Robert Smith',
      motherName: 'Linda Smith',
      phone: '+1 234 567 891',
    },
    addressDetails: {
      street: '456 Avenue',
      city: 'Los Angeles',
      state: 'CA',
      pincode: '900001',
    },
    dateOfBirth: '2011-05-15',
    admissionDate: '2023-09-02',
    branchId: 'Main Branch',
    bloodGroup: 'A-',
    gender: 'Female',
    feeStatus: 'pending',
    attendanceRate: 88,
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

export const markAttendance = async (studentId: string, status: 'present' | 'absent'): Promise<void> => {
  return new Promise((resolve) => {
    console.log(`Marking student ${studentId} as ${status}`);
    setTimeout(resolve, 500);
  });
};
