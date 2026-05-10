import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  Timestamp,
  QueryDocumentSnapshot,
  DocumentData,
  startAfter,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import {
  SchoolEvent,
  CreateEventData,
  AnnouncementFilter,
} from '../types/announcement';

const EVENTS_COLLECTION = 'events';
const eventsRef = collection(db, EVENTS_COLLECTION);

/**
 * Normalizes a Firestore document snapshot into a SchoolEvent.
 */
function docToEvent(snap: QueryDocumentSnapshot<DocumentData>): SchoolEvent {
  const data = snap.data();
  return {
    id: snap.id,
    title: data.title,
    description: data.description,
    type: data.type,
    scope: data.scope,
    branchId: data.branchId ?? null,
    classId: data.classId ?? null,
    sectionId: data.sectionId ?? null,
    startAt: data.startAt as Timestamp,
    endAt: data.endAt as Timestamp,
    createdBy: data.createdBy,
    createdByName: data.createdByName,
    status: data.status,
    publishedToParents: data.publishedToParents,
    isDeleted: data.isDeleted,
    priority: data.priority,
    createdAt: data.createdAt as Timestamp,
    updatedAt: data.updatedAt as Timestamp | undefined,
  };
}

export const eventService = {
  /**
   * Fetch published announcements
   */
  async getPublishedAnnouncements(
    filter: AnnouncementFilter = {},
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<{ events: SchoolEvent[]; lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    try {
      const now = Timestamp.now();
      const pageSize = filter.limit ?? 15;

      // Build base constraints
      const constraints: any[] = [
        where('publishedToParents', '==', true),
        where('isDeleted', '==', false),
        where('endAt', '>=', now),
        orderBy('endAt'),
        orderBy('startAt'),
        limit(pageSize),
      ];

      // Branch scoping
      if (filter.branchId) {
        constraints.unshift(where('branchId', '==', filter.branchId));
      }

      // Class/section scoping
      if (filter.sectionId) {
        constraints.unshift(where('sectionId', '==', filter.sectionId));
      } else if (filter.classId) {
        constraints.unshift(where('classId', '==', filter.classId));
      }

      let q = query(eventsRef, ...constraints);

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
      }

      const snapshot = await getDocs(q);
      const events = snapshot.docs.map(docToEvent);
      const last =
        snapshot.docs.length > 0
          ? snapshot.docs[snapshot.docs.length - 1]
          : null;

      return { events, lastDoc: last };

    } catch (error) {
      console.error('❌ Error fetching announcements:', error);
      throw error;
    }
  },

  /**
   * Dashboard: Fetch 3 nearest upcoming published announcements.
   * Uses startAt for nearest upcoming sort.
   * Note: This assumes startAt >= now for "upcoming".
   * For events already started but not ended, they would be excluded if we only use startAt >= now.
   * However, to satisfy the user's requirement of "endAt >= now" AND "orderBy(startAt)",
   * we'll prioritize the nearest start times.
   */
  async getUpcomingAnnouncements(limitCount = 3, branchId?: string): Promise<SchoolEvent[]> {
    try {
      const now = Timestamp.now();
      
      const constraints: any[] = [
        where('publishedToParents', '==', true),
        where('isDeleted', '==', false),
        where('endAt', '>=', now),
        orderBy('endAt'), 
        orderBy('startAt'),
        limit(limitCount),
      ];

      if (branchId) {
        constraints.unshift(where('branchId', '==', branchId));
      }

      const q = query(eventsRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToEvent);

    } catch (error) {
      console.error('❌ Error fetching upcoming announcements:', error);
      throw error;
    }
  },

  /**
   * Admin/Teacher: fetch all events
   */
  async getAllEvents(limitCount = 50, branchId?: string): Promise<SchoolEvent[]> {
    try {
      const constraints: any[] = [
        where('isDeleted', '==', false),
        orderBy('createdAt', 'desc'),
        limit(limitCount),
      ];

      if (branchId) {
        constraints.unshift(where('branchId', '==', branchId));
      }

      const q = query(eventsRef, ...constraints);
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docToEvent);

    } catch (error) {
      console.error('❌ Error fetching all events:', error);
      throw error;
    }
  },

  /**
   * Create event
   */
  async createEvent(
    data: CreateEventData,
    createdBy: string,
    createdByName: string
  ): Promise<string> {
    try {
      const ref = await addDoc(eventsRef, {
        ...data,
        createdBy,
        createdByName,
        status: 'draft',
        publishedToParents: false,
        isDeleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return ref.id;

    } catch (error) {
      console.error('❌ Error creating event:', error);
      throw error;
    }
  },

  /**
   * Publish event
   */
  async publishEvent(eventId: string): Promise<void> {
    try {
      const ref = doc(db, EVENTS_COLLECTION, eventId);

      await updateDoc(ref, {
        status: 'published',
        publishedToParents: true,
        updatedAt: serverTimestamp(),
      });

    } catch (error) {
      console.error('❌ Error publishing event:', error);
      throw error;
    }
  },

  /**
   * Update event
   */
  async updateEvent(
    eventId: string,
    data: Partial<SchoolEvent>
  ): Promise<void> {
    try {
      const ref = doc(db, EVENTS_COLLECTION, eventId);

      const { id: _id, createdAt: _ca, ...rest } =
        data as Partial<SchoolEvent> & {
          id?: string;
          createdAt?: Timestamp;
        };

      await updateDoc(ref, {
        ...rest,
        updatedAt: serverTimestamp(),
      });

    } catch (error) {
      console.error('❌ Error updating event:', error);
      throw error;
    }
  },

  /**
   * Soft delete
   */
  async softDeleteEvent(eventId: string): Promise<void> {
    try {
      const ref = doc(db, EVENTS_COLLECTION, eventId);

      await updateDoc(ref, {
        isDeleted: true,
        updatedAt: serverTimestamp(),
      });

    } catch (error) {
      console.error('❌ Error deleting event:', error);
      throw error;
    }
  },

  /**
   * Archive event
   */
  async archiveEvent(eventId: string): Promise<void> {
    try {
      const ref = doc(db, EVENTS_COLLECTION, eventId);

      await updateDoc(ref, {
        status: 'archived',
        publishedToParents: false,
        updatedAt: serverTimestamp(),
      });

    } catch (error) {
      console.error('❌ Error archiving event:', error);
      throw error;
    }
  },
};