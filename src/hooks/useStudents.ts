import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { studentService } from "../services/studentService";
import { Student } from "../types/student";

export const useStudents = () => {
  const queryClient = useQueryClient();

  // Query: Get all students
  const studentsQuery = useQuery({
    queryKey: ['students'],
    queryFn: () => studentService.getStudents(),
  });

  // Mutation: Add student
  const addStudentMutation = useMutation({
    mutationFn: (newStudent: Omit<Student, 'id' | 'createdAt'>) => 
      studentService.addStudent(newStudent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Mutation: Update student
  const updateStudentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Student> }) => 
      studentService.updateStudent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
    },
  });

  // Mutation: Delete student
  const deleteStudentMutation = useMutation({
    mutationFn: (id: string) => studentService.deleteStudent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students'] });
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
