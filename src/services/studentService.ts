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
  runTransaction,
  limit,
  startAfter,
  where,
  DocumentData,
  QueryDocumentSnapshot
} from "firebase/firestore";
import { db } from "../firebase/firestore";
import { Student } from "../types/student";
import { userService } from "./userService";

const studentCollection = collection(db, "students");

export const studentService = {
  // Create with Sequential Roll Number
  async addStudent(student: Omit<Student, 'id' | 'createdAt'>) {
    try {
      const classKey = `${student.classId}${student.sectionId}`;

      const counterDocRef = doc(db, "counters", classKey);
      const classDocRef = doc(db, "classes", student.classId);
      const sectionDocRef = doc(db, "sections", student.sectionId);

      // Remove password from object before Firestore save
      const { password, ...safeParentDetails } = student.parentDetails;

      /**
       * STEP 1
       * Create parent auth user FIRST
       * This prevents orphan student docs
       */
      const createdUser = await userService.createUser({
        name: safeParentDetails.fatherName,
        email: safeParentDetails.email,
        password: password || safeParentDetails.email,
        role: 'parent',
      });

      if (!createdUser?.uid) {
        throw new Error("Failed to create parent account");
      }

      let generatedRollNumber = "";

      /**
       * STEP 2
       * Create student only AFTER auth success
       */
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

        transaction.set(
          counterDocRef,
          { lastRollNumber: newCount },
          { merge: true }
        );

        const rollNumber = `${className}${sectionName}-${newCount
          .toString()
          .padStart(3, '0')}`;

        generatedRollNumber = rollNumber;

        const newStudentRef = doc(collection(db, "students"));

        transaction.set(newStudentRef, {
          ...student,

          // NEVER store password
          parentDetails: {
            ...safeParentDetails,

            /**
             * IMPORTANT
             * Save Firebase Auth UID
             * This will be used for:
             * - reminders
             * - notifications
             * - chats
             * - fees
             * - attendance
             */
            userId: createdUser.uid,
          },

          rollNumber,
          createdAt: serverTimestamp(),
        });

        return newStudentRef.id;
      });

      /**
       * OPTIONAL:
       * Update user with roll number if needed
       */
      try {
        await userService.updateUser({
          uid: createdUser.uid,
          studentRollNumber: generatedRollNumber,
        });
      } catch (updateError) {
        console.warn(
          "Failed to update user with roll number:",
          updateError
        );
      }

      return studentId;

    } catch (error: any) {
      console.error("🔥 ADD STUDENT ERROR:", error);

      /**
       * Better duplicate email handling
       */
      if (
        error?.message?.includes("email") ||
        error?.message?.includes("already")
      ) {
        throw new Error("Parent email already exists");
      }

      throw error;
    }
  },

  // Read
  async getStudents(): Promise<Student[]> {
    try {

      const q = query(studentCollection, orderBy("createdAt", "desc"));
      const querySnapshot = await getDocs(q);

      const students = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];

      return students;
    } catch (err) {
      console.error("🔥 FIRESTORE ERROR:", err);
      throw err;
    }
  },

  // Read Paginated for 2000+ Students Virtualization
  async getStudentsPaginated(limitCount = 100, lastDoc?: QueryDocumentSnapshot<DocumentData> | null): Promise<{ students: Student[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    let q = query(studentCollection, orderBy("createdAt", "desc"), limit(limitCount));

    if (lastDoc) {
      q = query(studentCollection, orderBy("createdAt", "desc"), startAfter(lastDoc), limit(limitCount));
    }

    const querySnapshot = await getDocs(q);
    const students = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Student[];

    return {
      students,
      lastDoc: querySnapshot.docs.length > 0 ? querySnapshot.docs[querySnapshot.docs.length - 1] : null
    };
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

  // Get Student by Roll Number
  async getStudentByRollNumber(rollNumber: string): Promise<Student | null> {
    try {
      const q = query(studentCollection, where("rollNumber", "==", rollNumber), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString(),
        } as unknown as Student;
      }
      return null;
    } catch (err) {
      console.error("Error getting student by roll number:", err);
      return null;
    }
  },

  // Get Student by Parent User ID
  async getStudentByParentUserId(userId: string): Promise<Student | null> {
    try {
      const q = query(studentCollection, where("parentDetails.userId", "==", userId), limit(1));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const docSnap = querySnapshot.docs[0];
        const data = docSnap.data();
        return {
          id: docSnap.id,
          ...data,
          createdAt: data.createdAt?.toDate()?.toISOString(),
        } as unknown as Student;
      }
      return null;
    } catch (err) {
      console.error("Error getting student by parent userId:", err);
      return null;
    }
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
