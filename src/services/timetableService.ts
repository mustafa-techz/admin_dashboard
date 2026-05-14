import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { executeFirebaseOp } from '@/lib/api-errors';
import { logActivity } from '@/lib/activityLogger';
import type {
  Timetable,
  TimetableFormData,
  TimetableSlot,
  TimetableSlotFormData,
  TimetableStatus,
} from '@/types/timetable';

// ─────────────────────────────────────────────────────────────────
// Collection References
// ─────────────────────────────────────────────────────────────────
const timetablesCol = collection(db, 'timetables');

function slotsCol(timetableId: string) {
  return collection(db, 'timetables', timetableId, 'slots');
}

// ─────────────────────────────────────────────────────────────────
// Helper: Timestamp → ISO string
// ─────────────────────────────────────────────────────────────────
function tsToISO(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}

// ─────────────────────────────────────────────────────────────────
// Timetable Service
// ─────────────────────────────────────────────────────────────────
export const timetableService = {
  /**
   * Create a timetable with its slots in a single batch.
   */
  async createTimetable(
    data: TimetableFormData,
    slots: TimetableSlotFormData[],
    createdBy: string,
    userRole: string,
    userName: string
  ): Promise<string> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);
      const timetableRef = doc(timetablesCol);

      batch.set(timetableRef, {
        type: data.type,
        name: data.name,
        classId: data.classId,
        sectionId: data.sectionId,
        className: data.className || '',
        sectionName: data.sectionName || '',
        academicYear: data.academicYear,
        branchId: data.branchId,
        status: 'draft' as TimetableStatus,
        createdBy,
        userRole,
        userName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create slot docs
      for (const slot of slots) {
        const slotRef = doc(slotsCol(timetableRef.id));
        batch.set(slotRef, {
          day: slot.day,
          subject: slot.subject,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: slot.teacherId || '',
          teacherName: slot.teacherName || '',
          room: slot.room || '',
          order: slot.order,
        });
      }

      await batch.commit();

      // Resolve names if missing or look like IDs
      let resolvedClassName = data.className;
      let resolvedSectionName = data.sectionName;

      if (!resolvedClassName || resolvedClassName === data.classId) {
        const classSnap = await getDoc(doc(db, 'classes', data.classId));
        if (classSnap.exists()) resolvedClassName = classSnap.data().className;
      }
      if (!resolvedSectionName || resolvedSectionName === data.sectionId) {
        const sectionSnap = await getDoc(doc(db, 'sections', data.sectionId));
        if (sectionSnap.exists()) resolvedSectionName = sectionSnap.data().sectionName;
      }

      await logActivity('timetable_created', 'timetable', timetableRef.id, {
        className: resolvedClassName || data.classId,
        sectionName: resolvedSectionName || data.sectionId,
      });

      return timetableRef.id;
    }, 'createTimetable');
  },

  /**
   * Get timetables for a branch filtered by status.
   */
  async getTimetables(branchId: string, status?: TimetableStatus): Promise<Timetable[]> {
    return executeFirebaseOp(async () => {
      let q;
      if (status) {
        q = query(timetablesCol, where('branchId', '==', branchId), where('status', '==', status));
      } else {
        q = query(timetablesCol, where('branchId', '==', branchId));
      }

      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: tsToISO(d.data().createdAt),
          updatedAt: tsToISO(d.data().updatedAt),
        }))
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()) as Timetable[];
    }, 'getTimetables');
  },

  /**
   * Get timetables for a specific class/section (parent view).
   */
  async getPublishedTimetables(classId: string, sectionId: string): Promise<Timetable[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        timetablesCol,
        where('classId', '==', classId),
        where('sectionId', '==', sectionId),
        where('status', '==', 'published')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToISO(d.data().createdAt),
        updatedAt: tsToISO(d.data().updatedAt),
      })) as Timetable[];
    }, 'getPublishedTimetables');
  },

  /**
   * Get a single timetable by ID.
   */
  async getTimetableById(id: string): Promise<Timetable | null> {
    return executeFirebaseOp(async () => {
      const docSnap = await getDoc(doc(timetablesCol, id));
      if (!docSnap.exists()) return null;
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: tsToISO(docSnap.data().createdAt),
        updatedAt: tsToISO(docSnap.data().updatedAt),
      } as Timetable;
    }, 'getTimetableById');
  },

  /**
   * Get all slots for a timetable.
   */
  async getSlots(timetableId: string): Promise<TimetableSlot[]> {
    return executeFirebaseOp(async () => {
      const snapshot = await getDocs(slotsCol(timetableId));
      return snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) as TimetableSlot[];
    }, 'getSlots');
  },

  /**
   * Update timetable metadata.
   */
  async updateTimetable(id: string, data: Partial<TimetableFormData>): Promise<void> {
    return executeFirebaseOp(async () => {
      await updateDoc(doc(timetablesCol, id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    }, 'updateTimetable');
  },

  /**
   * Replace all slots for a timetable (full save).
   * Deletes existing slots and writes new ones in a batch.
   */
  async saveSlots(timetableId: string, slots: TimetableSlotFormData[]): Promise<void> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);

      // Delete existing slots
      const existingSnapshot = await getDocs(slotsCol(timetableId));
      existingSnapshot.docs.forEach((d) => batch.delete(d.ref));

      // Write new slots
      for (const slot of slots) {
        const slotRef = doc(slotsCol(timetableId));
        batch.set(slotRef, {
          day: slot.day,
          subject: slot.subject,
          startTime: slot.startTime,
          endTime: slot.endTime,
          teacherId: slot.teacherId || '',
          teacherName: slot.teacherName || '',
          room: slot.room || '',
          order: slot.order,
        });
      }

      // Update parent doc timestamp
      batch.update(doc(timetablesCol, timetableId), {
        updatedAt: serverTimestamp(),
      });

      await batch.commit();

      await logActivity('timetable_updated', 'timetable', timetableId);
    }, 'saveSlots');
  },

  /**
   * Publish a timetable (draft → published).

   */
  async publishTimetable(id: string): Promise<void> {
    return executeFirebaseOp(async () => {
      const timetable = await this.getTimetableById(id);
      if (!timetable) throw new Error('Timetable not found');
      if (timetable.status === 'published') return; // Already published

      await updateDoc(doc(timetablesCol, id), {
        status: 'published' as TimetableStatus,
        updatedAt: serverTimestamp(),
      });

      await logActivity('timetable_updated', 'timetable', id, {
        className: (timetable as any).className || timetable.classId,
        sectionName: (timetable as any).sectionName || timetable.sectionId,
        status: 'published'
      });
    }, 'publishTimetable');
  },

  /**
   * Unpublish a timetable (published → draft).
   */
  async unpublishTimetable(id: string): Promise<void> {
    return executeFirebaseOp(async () => {
      const timetable = await this.getTimetableById(id);
      await updateDoc(doc(timetablesCol, id), {
        status: 'draft' as TimetableStatus,
        updatedAt: serverTimestamp(),
      });

      if (timetable) {
        await logActivity('timetable_updated', 'timetable', id, {
          className: (timetable as any).className || timetable.classId,
          sectionName: (timetable as any).sectionName || timetable.sectionId,
          status: 'draft'
        });
      }
    }, 'unpublishTimetable');
  },

  /**
   * Archive a timetable.
   */
  async archiveTimetable(id: string): Promise<void> {
    return executeFirebaseOp(async () => {
      await updateDoc(doc(timetablesCol, id), {
        status: 'archived' as TimetableStatus,
        updatedAt: serverTimestamp(),
      });
    }, 'archiveTimetable');
  },

  /**
   * Delete a timetable and all its slots.
   */
  async deleteTimetable(id: string): Promise<void> {
    return executeFirebaseOp(async () => {
      const timetable = await this.getTimetableById(id);
      const batch = writeBatch(db);

      // Delete all slots
      const slotsSnapshot = await getDocs(slotsCol(id));
      slotsSnapshot.docs.forEach((d) => batch.delete(d.ref));

      // Delete the timetable doc
      batch.delete(doc(timetablesCol, id));

      await batch.commit();

      if (timetable) {
        await logActivity('timetable_updated', 'timetable', id, {
          className: (timetable as any).className || timetable.classId,
          sectionName: (timetable as any).sectionName || timetable.sectionId,
          status: 'deleted'
        });
      }
    }, 'deleteTimetable');
  },
};
