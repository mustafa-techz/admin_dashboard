'use client';

import AnnouncementList from '@/components/announcements/AnnouncementList';
import { useAuthStore } from '@/store/authStore';

/**
 * /announcements — main announcements page.
 *
 * For parents: automatically scoped to their child's classId/sectionId.
 * For admin/teacher: shows all events including drafts.
 *
 * The filter below is a stub — in production, connect the classId/sectionId
 * from the parent's student profile (e.g. from Firestore or Zustand store).
 */
export default function AnnouncementsPage() {
  const { role } = useAuthStore();

  // For parents: ideally fetch their child's classId/sectionId from their profile.
  // Here we pass no filter (shows school-wide events) as a safe default.
  // You can extend this by reading parent's profile from Zustand or a context.
  const parentFilter =
    role === 'parent'
      ? {
          // classId: parentProfile?.classId,
          // sectionId: parentProfile?.sectionId,
          limit: 15,
        }
      : {};

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Page heading */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">
          📢 Announcements & Events
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {role === 'parent'
            ? 'Upcoming events and notices from your school'
            : 'Manage school events, announcements, and notices'}
        </p>
      </div>

      {/* Main list */}
      <AnnouncementList filter={parentFilter} />
    </div>
  );
}
