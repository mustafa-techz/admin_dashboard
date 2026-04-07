import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  orderBy,
  runTransaction
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { Teacher, TeacherFormData } from "../types/teacher";
import { userService } from "./userService";

const teacherCollection = collection(db, "teachers");

export const teacherService = {
  // Create with Sequential Employee ID
  async addTeacher(teacher: TeacherFormData) {
    const counterDocRef = doc(db, "counters", "teachers");

    const teacherId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);

      let newCount = 1;
      if (counterDoc.exists()) {
        newCount = (counterDoc.data()?.lastEmpId || 0) + 1;
      }

      transaction.set(counterDocRef, { lastEmpId: newCount }, { merge: true });

      const empId = `EMP${newCount.toString().padStart(3, '0')}`;

      const newTeacherRef = doc(collection(db, "teachers"));
      transaction.set(newTeacherRef, {
        ...teacher,
        empId,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      return newTeacherRef.id;
    });

    // Create teacher role
    try {
      await userService.createUser({
        name: teacher.fullName,
        email: teacher.email,
        password: teacher.email,
        role: 'teacher'
      });
    } catch (error) {
      console.error("Failed to create teacher role:", error);
    }

    return teacherId;
  },

  // Read
  async getTeachers(): Promise<Teacher[]> {
    const q = query(teacherCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const teachers = querySnapshot.docs.map(doc => ({
      id: doc.id,
      teacherId: doc.id,
      ...doc.data()
    })) as Teacher[];

    return teachers;
  },

  // Get Single Teacher
  async getTeacherById(id: string): Promise<Teacher | null> {
    const docRef = doc(db, "teachers", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        teacherId: docSnap.id,
        ...data,
      } as Teacher;
    }
    return null;
  },

  // Update
  async updateTeacher(id: string, teacher: Partial<Teacher>) {
    const docRef = doc(db, "teachers", id);
    await updateDoc(docRef, {
      ...teacher,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete
  async deleteTeacher(id: string) {
    const docRef = doc(db, "teachers", id);
    await deleteDoc(docRef);
  }
};
