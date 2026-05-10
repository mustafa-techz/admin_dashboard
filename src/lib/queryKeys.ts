/**
 * Centralized Query Keys for TanStack Query
 * Ensures consistent caching and scoped invalidation across the app.
 */
export const queryKeys = {
  // Auth & User
  user: (uid: string) => ['user', uid] as const,
  users: (role?: string) => ['users', { role }] as const,
  
  // Students & Parents
  students: () => ['students'] as const,
  student: (id: string) => ['student', id] as const,
  studentByRoll: (roll: string) => ['studentByRoll', roll] as const,
  studentByParent: (parentId: string) => ['studentByParent', parentId] as const,

  // Staff
  teachers: () => ['teachers'] as const,
  teacher: (id: string) => ['teacher', id] as const,

  // Academics
  classes: () => ['classes'] as const,
  sections: () => ['sections'] as const,
  subjects: () => ['subjects'] as const,
  
  // Timetable
  timetable: (classId: string, sectionId: string) => ['timetable', classId, sectionId] as const,
  teacherTimetable: (teacherId: string) => ['teacherTimetable', teacherId] as const,

  // Attendance
  attendance: (classId: string, sectionId: string, date: string) => ['attendance', classId, sectionId, date] as const,
  studentAttendance: (rollNumber: string) => ['studentAttendance', rollNumber] as const,

  // Fees
  feeStructures: () => ['feeStructures'] as const,
  studentFees: (rollNumber: string) => ['studentFees', rollNumber] as const,

  // Exams
  assessments: () => ['assessments'] as const,
  assessmentMarks: (assessmentId: string, classId: string, sectionId: string) => ['marks', assessmentId, classId, sectionId] as const,
  studentResults: (rollNumber: string) => ['studentResults', rollNumber] as const,

  // Master Data
  branches: () => ['branches'] as const,
  
  // Chat & Communication
  chatChannels: (userId: string) => ['chatChannels', userId] as const,
  chatMessages: (channelId: string) => ['chatMessages', channelId] as const,
  announcements: () => ['announcements'] as const,
};
