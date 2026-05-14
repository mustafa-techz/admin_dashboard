import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  where,
  runTransaction,
  QuerySnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { Teacher, TeacherFormData } from "../types/teacher";
import { userService } from "./userService";

const teacherCollection = collection(db, "teachers");

export const teacherService = {
  // Create with Sequential Employee ID
  // Uses auth UID as the Firestore doc ID so AuthProvider can fetch teachers/{uid}
  async addTeacher(teacher: TeacherFormData) {
    const counterDocRef = doc(db, "counters", "teachers");

    // Resolve classTeacher classId to a readable label (e.g. "10-A")
    let classTeacherOf: string | undefined;
    if (teacher.classTeacher) {
      const classDoc = await getDoc(doc(db, "classes", teacher.classTeacher));
      if (classDoc.exists()) {
        classTeacherOf = classDoc.data()?.className || teacher.classTeacher;
      }
    }

    // STEP 1: Create auth user FIRST to get the UID
    let createdUser: { success: boolean; uid: string };
    try {
      createdUser = await userService.createUser({
        name: teacher.fullName,
        email: teacher.email,
        password: teacher.email,
        role: 'teacher',
        classTeacherOf,
      });
    } catch (error) {
      console.error("Failed to create teacher auth user:", error);
      throw error;
    }

    if (!createdUser?.uid) {
      throw new Error("Failed to create teacher account — no UID returned");
    }

    // STEP 2: Create teacher doc with auth UID as doc ID (so AuthProvider can fetch by UID)
    const teacherId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);

      let newCount = 1;
      if (counterDoc.exists()) {
        newCount = (counterDoc.data()?.lastEmpId || 0) + 1;
      }

      transaction.set(counterDocRef, { lastEmpId: newCount }, { merge: true });

      const empId = `EMP${newCount.toString().padStart(3, '0')}`;

      // Use the auth UID as the teacher document ID
      const newTeacherRef = doc(db, "teachers", createdUser.uid);
      
      // Ensure branchIds is always stored as an array for multi-branch queries
      const branchIds = teacher.branchIds && teacher.branchIds.length > 0
        ? teacher.branchIds
        : teacher.branchId
          ? [teacher.branchId]
          : [];

      transaction.set(newTeacherRef, {
        ...teacher,
        branchIds,
        // Keep branchId as primary/first branch for backward compatibility
        branchId: teacher.branchId || (branchIds.length > 0 ? branchIds[0] : ''),
        empId,
        status: 'active',
        createdAt: serverTimestamp(),
      });

      return newTeacherRef.id;
    });

    return teacherId;
  },

  // Read
  async getTeachers(branchId?: string): Promise<Teacher[]> {
    try {
      if (branchId) {
        // Teachers can store branch in two ways:
        //   1. Legacy: branchId (single string)
        //   2. New: branchIds[] (multi-branch array)
        // We query both without orderBy to avoid needing composite indexes, then sort locally.
        const [byBranchIdResult, byBranchIdsResult] = await Promise.allSettled([
          getDocs(query(teacherCollection, where("branchId", "==", branchId))),
          getDocs(query(teacherCollection, where("branchIds", "array-contains", branchId))),
        ]);

        const seen = new Set<string>();
        const teachers: Teacher[] = [];

        const processResult = (result: PromiseSettledResult<QuerySnapshot<DocumentData>>) => {
          if (result.status === 'fulfilled') {
            for (const snap of result.value.docs) {
              if (seen.has(snap.id)) continue;
              seen.add(snap.id);
              teachers.push({
                id: snap.id,
                teacherId: snap.id,
                ...snap.data(),
              } as Teacher);
            }
          } else {
            console.warn("Teacher query failed:", result.reason);
          }
        };

        processResult(byBranchIdResult);
        processResult(byBranchIdsResult);

        // Sort by createdAt desc locally
        return teachers.sort((a, b) => {
          const timeA = (a as Teacher & { createdAt?: { seconds: number } }).createdAt?.seconds || 0;
          const timeB = (b as Teacher & { createdAt?: { seconds: number } }).createdAt?.seconds || 0;
          return timeB - timeA;
        });
      }

      // No branch filter — return all
      const q = query(teacherCollection);
      const querySnapshot = await getDocs(q);

      const teachers = querySnapshot.docs.map(doc => ({
        id: doc.id,
        teacherId: doc.id,
        ...doc.data()
      })) as Teacher[];

      // Sort by createdAt desc locally
      return teachers.sort((a, b) => {
        const timeA = (a as Teacher & { createdAt?: { seconds: number } }).createdAt?.seconds || 0;
        const timeB = (b as Teacher & { createdAt?: { seconds: number } }).createdAt?.seconds || 0;
        return timeB - timeA;
      });
    } catch (error) {
      console.error("Error fetching teachers:", error);
      return [];
    }
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
