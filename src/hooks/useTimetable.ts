import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { timetableService } from "../services/timetableService";
import { TimetableFormData } from "../types/timetable";

export const useTimetable = (classId?: string, sectionId?: string, teacherId?: string) => {
  const queryClient = useQueryClient();

  const classTimetableQuery = useQuery({
    queryKey: ['timetable', 'class', classId, sectionId],
    queryFn: () => timetableService.getTimetableByClass(classId!, sectionId!),
    enabled: !!classId && !!sectionId,
  });

  const teacherTimetableQuery = useQuery({
    queryKey: ['timetable', 'teacher', teacherId],
    queryFn: () => timetableService.getTimetableByTeacher(teacherId!),
    enabled: !!teacherId,
  });

  const addMutation = useMutation({
    mutationFn: (entry: TimetableFormData) => timetableService.addTimetableEntry(entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, entry }: { id: string; entry: TimetableFormData }) => 
      timetableService.updateTimetableEntry(id, entry),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => timetableService.deleteTimetableEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['timetable'] });
    },
  });

  return {
    classTimetable: classTimetableQuery.data ?? [],
    teacherTimetable: teacherTimetableQuery.data ?? [],
    isLoading: classTimetableQuery.isLoading || teacherTimetableQuery.isLoading,
    isAdding: addMutation.isPending,
    isUpdating: updateMutation.isPending,
    isDeleting: deleteMutation.isPending,
    addEntry: addMutation.mutateAsync,
    updateEntry: updateMutation.mutateAsync,
    deleteEntry: deleteMutation.mutateAsync,
    error: addMutation.error || updateMutation.error || deleteMutation.error,
  };
};
