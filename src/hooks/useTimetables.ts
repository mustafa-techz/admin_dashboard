import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { timetableService } from '@/services/timetableService';
import type {
  TimetableFormData,
  TimetableSlotFormData,
  TimetableStatus,
} from '@/types/timetable';

// ─────────────────────────────────────────────────────────────────
// Query Keys
// ─────────────────────────────────────────────────────────────────
export const timetableKeys = {
  all: ['timetables'] as const,
  list: (branchId: string, status?: TimetableStatus) =>
    [...timetableKeys.all, 'list', branchId, status ?? 'all'] as const,
  published: (classId: string, sectionId: string) =>
    [...timetableKeys.all, 'published', classId, sectionId] as const,
  detail: (id: string) => [...timetableKeys.all, 'detail', id] as const,
  slots: (id: string) => [...timetableKeys.all, 'slots', id] as const,
};

// ─────────────────────────────────────────────────────────────────
// Query Hooks
// ─────────────────────────────────────────────────────────────────
export function useTimetables(branchId: string, status?: TimetableStatus) {
  return useQuery({
    queryKey: timetableKeys.list(branchId, status),
    queryFn: () => timetableService.getTimetables(branchId, status),
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
  });
}

export function usePublishedTimetables(classId: string, sectionId: string) {
  return useQuery({
    queryKey: timetableKeys.published(classId, sectionId),
    queryFn: () => timetableService.getPublishedTimetables(classId, sectionId),
    enabled: !!classId && !!sectionId,
    staleTime: 10 * 60 * 1000, // Parents don't need frequent refresh
  });
}

export function useTimetableById(id: string) {
  return useQuery({
    queryKey: timetableKeys.detail(id),
    queryFn: () => timetableService.getTimetableById(id),
    enabled: !!id,
  });
}

export function useTimetableSlots(timetableId: string) {
  return useQuery({
    queryKey: timetableKeys.slots(timetableId),
    queryFn: () => timetableService.getSlots(timetableId),
    enabled: !!timetableId,
    placeholderData: keepPreviousData,
  });
}

// ─────────────────────────────────────────────────────────────────
// Mutation Hooks
// ─────────────────────────────────────────────────────────────────
export function useCreateTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      data,
      slots,
      createdBy,
      userRole,
      userName,
    }: {
      data: TimetableFormData;
      slots: TimetableSlotFormData[];
      createdBy: string;
      userRole: string;
      userName: string;
    }) => timetableService.createTimetable(data, slots, createdBy, userRole, userName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
  });
}

export function useUpdateTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimetableFormData> }) =>
      timetableService.updateTimetable(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
  });
}

export function useSaveTimetableSlots() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ timetableId, slots }: { timetableId: string; slots: TimetableSlotFormData[] }) =>
      timetableService.saveSlots(timetableId, slots),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.slots(variables.timetableId) });
    },
  });
}

export function usePublishTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timetableService.publishTimetable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
  });
}

export function useUnpublishTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timetableService.unpublishTimetable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
  });
}

export function useDeleteTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timetableService.deleteTimetable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: timetableKeys.all });
    },
  });
}
