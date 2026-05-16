import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { timetableService } from '@/services/timetableService';
import type {
  Timetable,
  TimetableFormData,
  TimetableSlotFormData,
  TimetableStatus,
} from '@/types/timetable';
import { prependActivityCache } from '@/lib/dashboardCacheSync';

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
    onSuccess: (timetableId, variables) => {
      const now = new Date().toISOString();
      const timetable: Timetable = {
        id: timetableId,
        ...variables.data,
        status: 'draft',
        createdBy: variables.createdBy,
        userRole: variables.userRole,
        userName: variables.userName,
        createdAt: now,
        updatedAt: now,
      };

      queryClient.setQueryData<Timetable[]>(
        timetableKeys.list(variables.data.branchId, 'draft'),
        (old = []) => [timetable, ...old.filter((item) => item.id !== timetableId)]
      );
      queryClient.setQueryData<Timetable[]>(
        timetableKeys.list(variables.data.branchId),
        (old = []) => [timetable, ...old.filter((item) => item.id !== timetableId)]
      );
      prependActivityCache(queryClient, {
        action: 'timetable_created',
        entityType: 'timetable',
        entityId: timetableId,
        branchId: variables.data.branchId,
        metadata: {
          className: variables.data.className || variables.data.classId,
          sectionName: variables.data.sectionName || variables.data.sectionId,
        },
      });
      queryClient.invalidateQueries({ queryKey: timetableKeys.all, refetchType: 'none' });
    },
  });
}

export function useUpdateTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TimetableFormData> }) =>
      timetableService.updateTimetable(id, data),
    onSuccess: (_, variables) => {
      queryClient.setQueriesData<Timetable[]>(
        { queryKey: timetableKeys.all },
        (old) => old?.map((item) => (
          item.id === variables.id ? { ...item, ...variables.data, updatedAt: new Date().toISOString() } : item
        ))
      );
      prependActivityCache(queryClient, {
        action: 'timetable_updated',
        entityType: 'timetable',
        entityId: variables.id,
        branchId: variables.data.branchId,
      });
      queryClient.invalidateQueries({ queryKey: timetableKeys.all, refetchType: 'none' });
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
      prependActivityCache(queryClient, {
        action: 'timetable_updated',
        entityType: 'timetable',
        entityId: variables.timetableId,
      });
    },
  });
}

export function usePublishTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timetableService.publishTimetable(id),
    onSuccess: (_, id) => {
      const cachedTimetable = queryClient
        .getQueriesData<Timetable[]>({ queryKey: timetableKeys.all })
        .flatMap(([, data]) => data ?? [])
        .find((item) => item.id === id);
      const publishedTimetable = cachedTimetable
        ? { ...cachedTimetable, status: 'published' as TimetableStatus, updatedAt: new Date().toISOString() }
        : undefined;

      queryClient.setQueriesData<Timetable[]>(
        { queryKey: timetableKeys.all },
        (old) => old?.map((item) => (
          item.id === id ? { ...item, status: 'published', updatedAt: new Date().toISOString() } : item
        ))
      );
      if (publishedTimetable) {
        queryClient.setQueryData<Timetable[]>(
          timetableKeys.list(publishedTimetable.branchId, 'draft'),
          (old) => old?.filter((item) => item.id !== id)
        );
        queryClient.setQueryData<Timetable[]>(
          timetableKeys.list(publishedTimetable.branchId, 'published'),
          (old = []) => [publishedTimetable, ...old.filter((item) => item.id !== id)]
        );
      }
      queryClient.invalidateQueries({ queryKey: timetableKeys.all, refetchType: 'none' });
    },
  });
}

export function useUnpublishTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timetableService.unpublishTimetable(id),
    onSuccess: (_, id) => {
      const cachedTimetable = queryClient
        .getQueriesData<Timetable[]>({ queryKey: timetableKeys.all })
        .flatMap(([, data]) => data ?? [])
        .find((item) => item.id === id);
      const draftTimetable = cachedTimetable
        ? { ...cachedTimetable, status: 'draft' as TimetableStatus, updatedAt: new Date().toISOString() }
        : undefined;

      queryClient.setQueriesData<Timetable[]>(
        { queryKey: timetableKeys.all },
        (old) => old?.map((item) => (
          item.id === id ? { ...item, status: 'draft', updatedAt: new Date().toISOString() } : item
        ))
      );
      if (draftTimetable) {
        queryClient.setQueryData<Timetable[]>(
          timetableKeys.list(draftTimetable.branchId, 'published'),
          (old) => old?.filter((item) => item.id !== id)
        );
        queryClient.setQueryData<Timetable[]>(
          timetableKeys.list(draftTimetable.branchId, 'draft'),
          (old = []) => [draftTimetable, ...old.filter((item) => item.id !== id)]
        );
      }
      queryClient.invalidateQueries({ queryKey: timetableKeys.all, refetchType: 'none' });
    },
  });
}

export function useDeleteTimetable() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => timetableService.deleteTimetable(id),
    onSuccess: (_, id) => {
      queryClient.setQueriesData<Timetable[]>(
        { queryKey: timetableKeys.all },
        (old) => old?.filter((item) => item.id !== id)
      );
      queryClient.invalidateQueries({ queryKey: timetableKeys.all, refetchType: 'none' });
    },
  });
}
