import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../services/eventService';
import { AnnouncementFilter, CreateEventData, SchoolEvent } from '../types/announcement';
import { useBranchStore } from '@/store/branchStore';
import { queryKeys } from '@/lib/queryKeys';
import {
  prependActivityCache,
  syncCreatedEventCache,
  syncPublishedEventCache,
} from '@/lib/dashboardCacheSync';

// ---------- Parent: published announcements ----------

/**
 * Fetches published non-expired announcements for the parent dashboard.
 * Cached for 5 minutes — no realtime listener needed for read-heavy, low-write data.
 * staleTime prevents redundant Firestore reads during tab switching or re-renders.
 */
export function useAnnouncements(filter: AnnouncementFilter = {}) {
  return useQuery({
    queryKey: queryKeys.announcements.list(filter),
    queryFn: () => eventService.getPublishedAnnouncements(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes — avoids repeated Firestore reads
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection window
    select: (data) => data.events, // expose only the array
  });
}

/**
 * Fetches the 3 nearest upcoming published announcements for the dashboard.
 * Scoped to the currently selected branch.
 */
export function useUpcomingAnnouncements(limit = 3) {
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  return useQuery({
    queryKey: queryKeys.announcements.upcoming(limit, selectedBranchId || 'all'),
    queryFn: () => eventService.getUpcomingAnnouncements(limit, selectedBranchId || undefined),
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- Admin/Teacher: all events management ----------

/**
 * Fetches all events (including drafts) for admin/teacher management.
 * Scoped to the currently selected branch.
 * Shorter staleTime so admin sees fresh data.
 */
export function useAdminEvents() {
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  return useQuery({
    queryKey: queryKeys.announcements.adminList(selectedBranchId || 'all'),
    queryFn: () => eventService.getAllEvents(50, selectedBranchId || undefined),
    staleTime: 60 * 1000, // 1 minute
    enabled: !!selectedBranchId,
  });
}

// ---------- Mutations ----------

/**
 * Helper to safely update cached announcement queries whether stored as SchoolEvent[] or { events: SchoolEvent[], lastDoc?: any }
 */
function updateAnnouncementsCache(old: unknown, updater: (events: SchoolEvent[]) => SchoolEvent[]): unknown {
  if (!old) return old;
  if (Array.isArray(old)) {
    return updater(old);
  }
  if (typeof old === 'object' && old !== null && 'events' in old && Array.isArray((old as any).events)) {
    return {
      ...old,
      events: updater((old as any).events),
    };
  }
  return old;
}

export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      data,
      createdBy,
      createdByName,
    }: {
      data: CreateEventData;
      createdBy: string;
      createdByName: string;
    }) => eventService.createEvent(data, createdBy, createdByName),
    onSuccess: (eventId, variables) => {
      syncCreatedEventCache(
        queryClient,
        eventId,
        variables.data,
        variables.createdBy,
        variables.createdByName
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all, refetchType: 'none' });
    },
  });
}

export function usePublishEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventService.publishEvent(eventId),
    onSuccess: (_, eventId) => {
      syncPublishedEventCache(queryClient, eventId);
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all, refetchType: 'none' });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<SchoolEvent> }) =>
      eventService.updateEvent(eventId, data),
    onSuccess: (_, variables) => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.announcements.all },
        (old) => updateAnnouncementsCache(old, (events) =>
          events.map((event) => (event.id === variables.eventId ? { ...event, ...variables.data } as SchoolEvent : event))
        )
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all, refetchType: 'none' });
    },
  });
}

export function useSoftDeleteEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (eventId: string) => eventService.softDeleteEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.announcements.all },
        (old) => updateAnnouncementsCache(old, (events) =>
          events.filter((event) => event.id !== eventId)
        )
      );

      prependActivityCache(queryClient, {
        action: 'event_deleted',
        entityType: 'event',
        entityId: eventId,
      });

      queryClient.invalidateQueries({
        queryKey: queryKeys.announcements.all,
        refetchType: 'none',
      });
    },
  });
}

export function useArchiveEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventService.archiveEvent(eventId),
    onSuccess: (_, eventId) => {
      queryClient.setQueriesData(
        { queryKey: queryKeys.announcements.all },
        (old) => updateAnnouncementsCache(old, (events) =>
          events.map((event) => (
            event.id === eventId
              ? { ...event, status: 'archived', publishedToParents: false }
              : event
          ))
        )
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all, refetchType: 'none' });
    },
  });
}
