import { useQuery } from "@tanstack/react-query";
import { subjectService, timeSlotService, classService, sectionService, branchService } from "../services/firebase/masterDataService";
import { teacherService } from "../services/teacherService";

export const useMasterData = () => {
  const subjectsQuery = useQuery({
    queryKey: ['subjects'],
    queryFn: () => subjectService.getSubjects(),
  });

  const timeSlotsQuery = useQuery({
    queryKey: ['timeSlots'],
    queryFn: () => timeSlotService.getTimeSlots(),
  });

  const classesQuery = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
  });

  const sectionsQuery = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
  });

  const teachersQuery = useQuery({
    queryKey: ['teachers'],
    queryFn: () => teacherService.getTeachers(),
  });

  const branchesQuery = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  });

  return {
    subjects: subjectsQuery.data ?? [],
    timeSlots: timeSlotsQuery.data ?? [],
    classes: classesQuery.data ?? [],
    sections: sectionsQuery.data ?? [],
    teachers: teachersQuery.data ?? [],
    branches: branchesQuery.data ?? [],
    isLoading: 
      subjectsQuery.isLoading || 
      timeSlotsQuery.isLoading || 
      classesQuery.isLoading || 
      sectionsQuery.isLoading || 
      teachersQuery.isLoading ||
      branchesQuery.isLoading,
  };
};
