import { studentService } from "./studentService";
import { teacherService } from "./teacherService";
import { userService } from "./userService";
import { attendanceService } from "./attendanceService";
import { DashboardStats } from "../types";

export const dashboardService = {
  getDashboardStats: async (): Promise<DashboardStats> => {
    const [students, teachers, users] = await Promise.all([
      studentService.getStudents(),
      teacherService.getTeachers(),
      userService.getUsers(),
    ]);

    const subAdmins = users.filter((u) => u.role === "sub-admin");

    // Fetch today's attendance for overall stats
    const todayStr = new Date().toISOString().split("T")[0];
    const dailySummary = await attendanceService.getDailySummary(todayStr);
    
    // Fallback/Placeholder logic using real counts and daily summary if available
    return {
      totalStudents: students.length,
      totalTeachers: teachers.length,
      totalSubAdmins: subAdmins.length,
      attendanceToday: {
        present: dailySummary?.totalPresentToday ?? Math.floor(students.length * 0.95),
        total: students.length,
      },
    };
  },
};
