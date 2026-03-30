import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  getDoc,
  serverTimestamp,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { Student } from "../types/student";

const studentCollection = collection(db, "students");

export const studentService = {
  // Create
  async addStudent(student: Omit<Student, 'id' | 'createdAt'>) {
    const docRef = await addDoc(studentCollection, {
      ...student,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  },

  // Read
  async getStudents(): Promise<Student[]> {
    const querySnapshot = await getDocs(studentCollection);

    const students = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];

    console.log("Students:", students);

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
        name: `${data.firstName} ${data.lastName}`,
        createdAt: data.createdAt?.toDate()?.toISOString(),
      } as Student;
    }
    return null;
  },

  // Update
  async updateStudent(id: string, student: Partial<Student>) {
    const docRef = doc(db, "students", id);
    await updateDoc(docRef, student);
  },

  // Delete
  async deleteStudent(id: string) {
    const docRef = doc(db, "students", id);
    await deleteDoc(docRef);
  }
};
