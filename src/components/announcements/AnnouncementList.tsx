'use client';

import { memo, useState, useCallback } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Plus, Megaphone, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import {
  useAnnouncements,
  useAdminEvents,
  useCreateEvent,
  usePublishEvent,
  useUpdateEvent,
  useSoftDeleteEvent,
} from '@/hooks/useAnnouncements';
import { AnnouncementFilter, SchoolEvent } from '@/types/announcement';
import AnnouncementItem from './AnnouncementItem';
import EventFormModal from './EventFormModal';

interface AnnouncementListProps {
  /** Pass parent's classId/sectionId to scope the query */
  filter?: AnnouncementFilter;
}

// Skeleton loader for initial load — avoids layout shift
const SkeletonItem = () => (
  <div className="bg-card rounded-2xl border border-border p-4 md:p-5 animate-pulse">
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 bg-muted rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-3 bg-muted rounded w-1/4" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-1/3" />
      </div>
      <div className="h-6 w-20 bg-muted rounded-full shrink-0" />
    </div>
  </div>
);

function AnnouncementList({ filter = {} }: AnnouncementListProps) {
  const role = useAuthStore(state => state.role);
  const user = useAuthStore(state => state.user);
  const isAdminOrTeacher = role === 'admin' || role === 'sub-admin' || role === 'teacher';

  // Use admin query for staff, parent query for parents
  const parentQuery = useAnnouncements(filter);
  const adminQuery = useAdminEvents();

  const events: SchoolEvent[] = isAdminOrTeacher
    ? (adminQuery.data ?? [])
    : (parentQuery.data ?? []);

  const isLoading = isAdminOrTeacher ? adminQuery.isLoading : parentQuery.isLoading;
  const isError = isAdminOrTeacher ? adminQuery.isError : parentQuery.isError;
  const refetch = isAdminOrTeacher ? adminQuery.refetch : parentQuery.refetch;

  // Mutations
  const createEvent = useCreateEvent();
  const publishEvent = usePublishEvent();
  const updateEvent = useUpdateEvent();
  const softDelete = useSoftDeleteEvent();

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | undefined>(undefined);

  const openCreateModal = useCallback(() => {
    setEditingEvent(undefined);
    setIsModalOpen(true);
  }, []);

  const openEditModal = useCallback((event: SchoolEvent) => {
    setEditingEvent(event);
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
    setEditingEvent(undefined);
  }, []);

  const handleFormSubmit = useCallback(async (data: Omit<SchoolEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'status' | 'publishedToParents' | 'isDeleted'>) => {
    if (editingEvent?.id) {
      await updateEvent.mutateAsync({ eventId: editingEvent.id, data });
    } else {
      await createEvent.mutateAsync({
        data: { ...data, status: 'draft', publishedToParents: false, isDeleted: false },
        createdBy: user?.id ?? '',
        createdByName: user?.name ?? 'Admin',
      });
    }
  }, [editingEvent, createEvent, updateEvent, user]);

  const handlePublish = useCallback(async (eventId: string) => {
    await publishEvent.mutateAsync(eventId);
  }, [publishEvent]);

  const handleDelete = useCallback(async (eventId: string) => {
    if (!confirm('Archive this event? It will be hidden from all users.')) return;
    await softDelete.mutateAsync(eventId);
  }, [softDelete]);

  const publishedCount = events.filter(e => e.status === 'published').length;
  const displayCount = isAdminOrTeacher ? events.length : events.length;

  return (
    <div className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Megaphone size={20} className="text-primary" />
          <h2 className="text-lg font-black text-foreground tracking-tight">
            Announcements
          </h2>
          {displayCount > 0 && (
            <span className="inline-flex items-center justify-center min-w-[22px] h-[22px] px-1.5 bg-primary text-primary-foreground text-[11px] font-black rounded-full">
              {displayCount}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh */}
          <button
            id="refresh-announcements"
            onClick={() => refetch()}
            className="p-2 rounded-xl hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          {/* Create (admin/teacher only) */}
          {isAdminOrTeacher && (
            <button
              id="create-announcement-btn"
              onClick={openCreateModal}
              className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-black hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
            >
              <Plus size={14} />
              New Event
            </button>
          )}
        </div>
      </div>

      {/* Admin info bar */}
      {isAdminOrTeacher && events.length > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-primary/5 border border-primary/10 rounded-xl text-xs text-muted-foreground">
          <span>
            <span className="font-bold text-primary">{publishedCount}</span> published ·{' '}
            <span className="font-bold text-foreground">{events.length - publishedCount}</span> drafts
          </span>
        </div>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <SkeletonItem key={i} />)}
        </div>
      )}

      {/* Error state */}
      {isError && !isLoading && (
        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
          <p className="text-4xl">⚠️</p>
          <p className="text-sm font-bold text-foreground">Failed to load announcements</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !isError && events.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-16 text-center space-y-3"
        >
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Megaphone size={28} className="text-primary" />
          </div>
          <p className="text-base font-black text-foreground">No announcements yet</p>
          <p className="text-sm text-muted-foreground max-w-xs">
            {isAdminOrTeacher
              ? 'Create your first event or announcement for parents and students.'
              : 'No upcoming announcements from your school.'}
          </p>
          {isAdminOrTeacher && (
            <button
              onClick={openCreateModal}
              className="mt-2 flex items-center gap-1.5 px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-black hover:bg-primary/90 transition-all hover:scale-105 shadow-lg shadow-primary/20"
            >
              <Plus size={16} />
              Create First Event
            </button>
          )}
        </motion.div>
      )}

      {/* Announcement list */}
      {!isLoading && !isError && events.length > 0 && (
        <AnimatePresence mode="popLayout">
          <div className="space-y-3">
            {events.map((event) => (
              <AnnouncementItem
                key={event.id}
                event={event}
                isAdminOrTeacher={isAdminOrTeacher}
                onEdit={isAdminOrTeacher ? openEditModal : undefined}
                onDelete={isAdminOrTeacher ? handleDelete : undefined}
                onPublish={isAdminOrTeacher ? handlePublish : undefined}
              />
            ))}
          </div>
        </AnimatePresence>
      )}

      {/* Event Form Modal */}
      <EventFormModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSubmit={handleFormSubmit}
        initialData={editingEvent}
        isSubmitting={createEvent.isPending || updateEvent.isPending}
      />
    </div>
  );
}

export default memo(AnnouncementList);
