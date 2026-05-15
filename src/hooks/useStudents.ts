import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService } from "../services/studentService";
import { useBranchStore } from "@/store/branchStore";
import { useAuthStore } from "@/store/authStore";
import { getAuthorizedClassIds } from "@/lib/teacherScope";
import { Student } from "../types/student";

export const useStudents = () => {
  const queryClient = useQueryClient();
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  const user = useAuthStore(state => state.user);

  // Determine teacher-scoped classIds (undefined for admin/sub-admin)
  const classIds = useMemo(() => getAuthorizedClassIds(
    user ? { role: user.role, classIds: user.classIds } : null
  ), [user]);

  // Query: Get all students (branch + class scoped)
  const studentsQuery = useQuery({
    queryKey: ['students', selectedBranchId, classIds],
    queryFn: () => studentService.getStudents(
      selectedBranchId || undefined,
      classIds
    ),
    enabled: !!selectedBranchId,
    staleTime: 3 * 60 * 1000,
  });

  // Mutation: Add student
  const addStudentMutation = useMutation({
    mutationFn: (newStudent: Omit<Student, 'id' | 'createdAt'>) => 
      studentService.addStudent(newStudent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', selectedBranchId] });
    },
  });

  // Mutation: Update student
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => 
      studentService.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', selectedBranchId] });
    },
  });

  // Mutation: Delete student
  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => studentService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', selectedBranchId] });
    },
  });

  return {
    students: studentsQuery.data ?? [],
    isLoading: studentsQuery.isLoading,
    isError: studentsQuery.isError,
    addStudent: addStudentMutation.mutateAsync,
    updateStudent: updateStudentMutation.mutateAsync,
    deleteStudent: deleteStudentMutation.mutateAsync,
    isAdding: addStudentMutation.isPending,
    isUpdating: updateStudentMutation.isPending,
    isDeleting: deleteStudentMutation.isPending,
  };
};
