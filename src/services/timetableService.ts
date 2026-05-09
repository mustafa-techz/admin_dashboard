import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { studentService } from './studentService';
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
    createdBy: string
  ): Promise<string> {
    try {
      const batch = writeBatch(db);
      const timetableRef = doc(timetablesCol);

      batch.set(timetableRef, {
        type: data.type,
        name: data.name,
        classId: data.classId,
        sectionId: data.sectionId,
        academicYear: data.academicYear,
        branchId: data.branchId,
        status: 'draft' as TimetableStatus,
        createdBy,
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
      return timetableRef.id;
    } catch (error) {
      console.error('Error creating timetable:', error);
      throw error;
    }
  },

  /**
   * Get timetables for a branch filtered by status.
   */
  async getTimetables(branchId: string, status?: TimetableStatus): Promise<Timetable[]> {
    try {
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
    } catch (error) {
      console.error('Error getting timetables:', error);
      throw error;
    }
  },

  /**
   * Get timetables for a specific class/section (parent view).
   */
  async getPublishedTimetables(classId: string, sectionId: string): Promise<Timetable[]> {
    try {
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
    } catch (error) {
      console.error('Error getting published timetables:', error);
      throw error;
    }
  },

  /**
   * Get a single timetable by ID.
   */
  async getTimetableById(id: string): Promise<Timetable | null> {
    try {
      const docSnap = await getDoc(doc(timetablesCol, id));
      if (!docSnap.exists()) return null;
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: tsToISO(docSnap.data().createdAt),
        updatedAt: tsToISO(docSnap.data().updatedAt),
      } as Timetable;
    } catch (error) {
      console.error('Error getting timetable:', error);
      throw error;
    }
  },

  /**
   * Get all slots for a timetable.
   */
  async getSlots(timetableId: string): Promise<TimetableSlot[]> {
    try {
      const snapshot = await getDocs(slotsCol(timetableId));
      return snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a: any, b: any) => (a.order || 0) - (b.order || 0)) as TimetableSlot[];
    } catch (error) {
      console.error('Error getting timetable slots:', error);
      throw error;
    }
  },

  /**
   * Update timetable metadata.
   */
  async updateTimetable(id: string, data: Partial<TimetableFormData>): Promise<void> {
    try {
      await updateDoc(doc(timetablesCol, id), {
        ...data,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error updating timetable:', error);
      throw error;
    }
  },

  /**
   * Replace all slots for a timetable (full save).
   * Deletes existing slots and writes new ones in a batch.
   */
  async saveSlots(timetableId: string, slots: TimetableSlotFormData[]): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error saving timetable slots:', error);
      throw error;
    }
  },

  /**
   * Publish a timetable (draft → published).
   * After publish, sends reminder notifications to all parents in the class/section.
   */
  async publishTimetable(id: string): Promise<void> {
    try {
      const timetable = await this.getTimetableById(id);
      if (!timetable) throw new Error('Timetable not found');
      if (timetable.status === 'published') return; // Already published

      await updateDoc(doc(timetablesCol, id), {
        status: 'published' as TimetableStatus,
        updatedAt: serverTimestamp(),
      });

      // Send reminder notifications to parents (best-effort, don't block on failure)
      try {
        const allStudents = await studentService.getStudents();
        const classStudents = allStudents.filter(
          (s) => s.classId === timetable.classId && s.sectionId === timetable.sectionId
        );

        const BATCH_LIMIT = 450;
        let batch = writeBatch(db);
        let opCount = 0;

        for (const student of classStudents) {
          const parentUserId = student.parentDetails?.userId;
          if (!parentUserId) continue;

          const reminderRef = doc(collection(db, 'reminders'));
          batch.set(reminderRef, {
            type: 'EXAM',
            title: `📅 New Timetable Published`,
            message: `The class timetable "${timetable.name}" has been published. Tap to view your child's schedule.`,
            targetRole: 'PARENT',
            targetUserIds: [parentUserId],
            branchId: timetable.branchId,
            priority: 'MEDIUM',
            deliveryChannels: ['DASHBOARD', 'POPUP'],
            scheduledAt: Date.now(),
            status: 'PENDING',
            metadata: {
              timetableId: id,
              timetableName: timetable.name,
              route: '/timetable',
            },
            createdAt: serverTimestamp(),
          });

          opCount++;
          if (opCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }

        if (opCount > 0) {
          await batch.commit();
        }
      } catch (reminderErr) {
        console.error('Failed to send timetable publish reminders:', reminderErr);
        // Don't throw — publish succeeded, reminders are best-effort
      }
    } catch (error) {
      console.error('Error publishing timetable:', error);
      throw error;
    }
  },

  /**
   * Unpublish a timetable (published → draft).
   */
  async unpublishTimetable(id: string): Promise<void> {
    try {
      await updateDoc(doc(timetablesCol, id), {
        status: 'draft' as TimetableStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error unpublishing timetable:', error);
      throw error;
    }
  },

  /**
   * Archive a timetable.
   */
  async archiveTimetable(id: string): Promise<void> {
    try {
      await updateDoc(doc(timetablesCol, id), {
        status: 'archived' as TimetableStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error('Error archiving timetable:', error);
      throw error;
    }
  },

  /**
   * Delete a timetable and all its slots.
   */
  async deleteTimetable(id: string): Promise<void> {
    try {
      const batch = writeBatch(db);

      // Delete all slots
      const slotsSnapshot = await getDocs(slotsCol(id));
      slotsSnapshot.docs.forEach((d) => batch.delete(d.ref));

      // Delete the timetable doc
      batch.delete(doc(timetablesCol, id));

      await batch.commit();
    } catch (error) {
      console.error('Error deleting timetable:', error);
      throw error;
    }
  },
};
