import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventService } from '../services/eventService';
import { AnnouncementFilter, CreateEventData, SchoolEvent } from '../types/announcement';

const QUERY_KEY = 'announcements';
const ADMIN_QUERY_KEY = 'events-admin';

// ---------- Parent: published announcements ----------

/**
 * Fetches published non-expired announcements for the parent dashboard.
 * Cached for 5 minutes — no realtime listener needed for read-heavy, low-write data.
 * staleTime prevents redundant Firestore reads during tab switching or re-renders.
 */
export function useAnnouncements(filter: AnnouncementFilter = {}) {
  return useQuery({
    queryKey: [QUERY_KEY, filter],
    queryFn: () => eventService.getPublishedAnnouncements(filter),
    staleTime: 5 * 60 * 1000, // 5 minutes — avoids repeated Firestore reads
    gcTime: 10 * 60 * 1000,   // 10 minutes garbage collection window
    select: (data) => data.events, // expose only the array
  });
}

/**
 * Fetches the 3 nearest upcoming published announcements for the dashboard.
 */
export function useUpcomingAnnouncements(limit = 3) {
  return useQuery({
    queryKey: [QUERY_KEY, 'upcoming', limit],
    queryFn: () => eventService.getUpcomingAnnouncements(limit),
    staleTime: 5 * 60 * 1000,
  });
}

// ---------- Admin/Teacher: all events management ----------

/**
 * Fetches all events (including drafts) for admin/teacher management.
 * Shorter staleTime so admin sees fresh data.
 */
export function useAdminEvents() {
  return useQuery({
    queryKey: [ADMIN_QUERY_KEY],
    queryFn: () => eventService.getAllEvents(),
    staleTime: 60 * 1000, // 1 minute
  });
}

// ---------- Mutations ----------

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY] });
    },
  });
}

export function usePublishEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventService.publishEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ eventId, data }: { eventId: string; data: Partial<SchoolEvent> }) =>
      eventService.updateEvent(eventId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useSoftDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventService.softDeleteEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}

export function useArchiveEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventId: string) => eventService.archiveEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_QUERY_KEY] });
      queryClient.invalidateQueries({ queryKey: [QUERY_KEY] });
    },
  });
}
