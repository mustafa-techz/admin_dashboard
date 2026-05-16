/**
 * Centralized Query Key Factory
 * 
 * Provides a standardized, typed way to generate React Query keys
 * across the entire application to ensure consistency and scoped invalidations.
 */

export const queryKeys = {
  // Master Data
  master: {
    classes: ['classes'] as const,
    sections: ['sections'] as const,
    branches: ['branches'] as const,
  },

  // Auth & Users
  users: {
    all: ['users'] as const,
    detail: (id: string) => [...queryKeys.users.all, id] as const,
    byRole: (role: string) => [...queryKeys.users.all, { role }] as const,
  },

  // Students
  students: {
    all: ['students'] as const,
    byBranch: (branchId: string, classIds?: string[]) => 
      [...queryKeys.students.all, branchId, classIds] as const,
    detail: (id: string) => [...queryKeys.students.all, id] as const,
    byParent: (parentId: string) => [...queryKeys.students.all, 'parent', parentId] as const,
  },

  // Teachers
  teachers: {
    all: ['teachers'] as const,
    byBranch: (branchId: string) => [...queryKeys.teachers.all, branchId] as const,
    detail: (id: string) => [...queryKeys.teachers.all, id] as const,
  },

  // Announcements
  announcements: {
    all: ['announcements'] as const,
    list: (filter?: unknown) => [...queryKeys.announcements.all, filter] as const,
    upcoming: (limit: number, branchId?: string) => 
      [...queryKeys.announcements.all, 'upcoming', limit, branchId] as const,
    adminList: (branchId?: string) => [...queryKeys.announcements.all, 'admin', branchId] as const,
  },

  // Dashboard
  dashboard: {
    stats: ['dashboardStats'] as const,
    dailyAttendanceSessions: (date: string) =>
      ['daily-attendance-sessions', date] as const,
    teacherSubmittedAttendance: (classIds: string[] | undefined, date: string) =>
      ['teacher-submitted-attendance', classIds, date] as const,
  },

  // Activity Logs
  activityLogs: {
    all: ['activityLogs'] as const,
    byBranch: (branchId?: string) => ['activityLogs', { branchId }] as const,
    full: ['activityLogs', 'full'] as const,
  },
};
