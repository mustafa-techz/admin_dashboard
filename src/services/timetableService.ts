import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  getDoc,
  setDoc
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { TimetableEntry, TimetableFormData } from "../types/timetable";

const timetableCollection = collection(db, "timetables");

export const timetableService = {
  async getTimetableByClass(classId: string, sectionId: string): Promise<TimetableEntry[]> {
    const q = query(
      timetableCollection,
      where("classId", "==", classId),
      where("sectionId", "==", sectionId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimetableEntry[];
  },

  async getTimetableByTeacher(teacherId: string): Promise<TimetableEntry[]> {
    const q = query(
      timetableCollection,
      where("teacherId", "==", teacherId)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as TimetableEntry[];
  },

  async addTimetableEntry(entry: TimetableFormData) {
    const conflict = await this.checkConflicts(entry);
    if (conflict) {
      throw new Error(conflict);
    }
    return await addDoc(timetableCollection, entry);
  },

  async updateTimetableEntry(id: string, entry: TimetableFormData) {
    const conflict = await this.checkConflicts(entry, id);
    if (conflict) {
      throw new Error(conflict);
    }
    const docRef = doc(db, "timetables", id);
    return await updateDoc(docRef, { ...entry });
  },

  async deleteTimetableEntry(id: string) {
    const docRef = doc(db, "timetables", id);
    return await deleteDoc(docRef);
  },

  async checkConflicts(entry: TimetableFormData, excludeId?: string): Promise<string | null> {
    // 1. Class conflict: Same class + section + day + timeSlot
    const classQuery = query(
      timetableCollection,
      where("classId", "==", entry.classId),
      where("sectionId", "==", entry.sectionId),
      where("day", "==", entry.day),
      where("timeSlotId", "==", entry.timeSlotId)
    );
    const classSnapshot = await getDocs(classQuery);
    const classConflict = classSnapshot.docs.find(doc => doc.id !== excludeId);
    if (classConflict) {
      return "This class and section already have a subject assigned for this time slot.";
    }

    // 2. Teacher conflict: Same teacher assigned at same time in another class
    const teacherQuery = query(
      timetableCollection,
      where("teacherId", "==", entry.teacherId),
      where("day", "==", entry.day),
      where("timeSlotId", "==", entry.timeSlotId)
    );
    const teacherSnapshot = await getDocs(teacherQuery);
    const teacherConflict = teacherSnapshot.docs.find(doc => doc.id !== excludeId);
    if (teacherConflict) {
      return "This teacher is already assigned to another class at this time.";
    }

    return null;
  }
};
