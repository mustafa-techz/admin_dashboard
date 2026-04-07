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
import { Student } from "../types/student";
import { userService } from "./userService";

const studentCollection = collection(db, "students");

export const studentService = {
  // Create with Sequential Roll Number
  async addStudent(student: Omit<Student, 'id' | 'createdAt'>) {
    const classKey = `${student.classId}${student.sectionId}`;
    const counterDocRef = doc(db, "counters", classKey);
    const classDocRef = doc(db, "classes", student.classId);
    const sectionDocRef = doc(db, "sections", student.sectionId);

    const studentId = await runTransaction(db, async (transaction) => {
      const counterDoc = await transaction.get(counterDocRef);
      const classDoc = await transaction.get(classDocRef);
      const sectionDoc = await transaction.get(sectionDocRef);

      if (!classDoc.exists() || !sectionDoc.exists()) {
        throw new Error("Class or Section not found");
      }

      const className = classDoc.data()?.className || '';
      const sectionName = sectionDoc.data()?.sectionName || '';

      let newCount = 1;
      if (counterDoc.exists()) {
        newCount = (counterDoc.data()?.lastRollNumber || 0) + 1;
      }

      transaction.set(counterDocRef, { lastRollNumber: newCount }, { merge: true });

      const rollNumber = `${className}${sectionName}-${newCount.toString().padStart(3, '0')}`;

      const newStudentRef = doc(collection(db, "students"));
      transaction.set(newStudentRef, {
        ...student,
        rollNumber,
        createdAt: serverTimestamp(),
      });

      return newStudentRef.id;
    });

    try {
      await userService.createUser({
        name: student.parentDetails.fatherName,
        email: student.parentDetails.email,
        password: student.parentDetails.email,
        role: 'parent'
      });
    } catch (error) {
      console.error("Failed to create parent role:", error);
    }

    return studentId;
  },

  // Read
  async getStudents(): Promise<Student[]> {
    const q = query(studentCollection, orderBy("createdAt", "desc"));
    const querySnapshot = await getDocs(q);

    const students = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];

    return students;
  },

  // Get Single Student
  async getStudentById(id: string): Promise<Student | null> {
    const docRef = doc(db, "students", id);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt?.toDate()?.toISOString(),
      } as unknown as Student;
    }
    return null;
  },

  // Update
  async updateStudent(id: string, student: Partial<Student>) {
    const docRef = doc(db, "students", id);
    await updateDoc(docRef, {
      ...student,
      updatedAt: serverTimestamp(),
    });
  },

  // Delete
  async deleteStudent(id: string) {
    const docRef = doc(db, "students", id);
    await deleteDoc(docRef);
  }
};
