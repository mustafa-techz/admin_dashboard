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
import { Student, ParentDetails } from "../types/student";
import { userService } from "./userService";
import { executeFirebaseOp } from "@/lib/api-errors";
import { logActivity } from "@/lib/activityLogger";

const studentCollection = collection(db, "students");

export const studentService = {
  // Create with Sequential Roll Number
  async addStudent(student: Omit<Student, 'id' | 'createdAt'>) {
    return executeFirebaseOp(async () => {
      const classKey = `${student.classId}${student.sectionId}`;

      const counterDocRef = doc(db, "counters", classKey);
      const classDocRef = doc(db, "classes", student.classId);
      const sectionDocRef = doc(db, "sections", student.sectionId);

      // Remove password from object before Firestore save
      const { password, ...safeParentDetails } = (student?.parentDetails || {}) as ParentDetails & { password?: string };

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

      await logActivity('student_created', 'student', studentId, {
        studentName: student.fullName,
      });

      return studentId;

    }, "addStudent");
  },

  // Read
  async getStudents(branchId?: string, classIds?: string[]): Promise<Student[]> {
    return executeFirebaseOp(async () => {
      // Security Check: If teacher has explicitly 0 assigned classes, return empty to prevent data leak
      if (classIds && classIds.length === 0) {
        return [];
      }

      let q = query(studentCollection, orderBy("createdAt", "desc"));
      
      if (branchId) {
        q = query(q, where("branchId", "==", branchId));
      }
      
      if (classIds && classIds.length > 0) {
        // Firestore 'in' operator supports up to 30 items
        q = query(q, where("classId", "in", classIds.slice(0, 30)));
      }

      const querySnapshot = await getDocs(q);
      const students = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Student[];

      return students;
    }, 'getStudents');
  },

  // Read Paginated for 2000+ Students Virtualization
  async getStudentsPaginated(
    branchId?: string,
    limitCount = 100, 
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null,
    classIds?: string[]
  ): Promise<{ students: Student[], lastDoc: QueryDocumentSnapshot<DocumentData> | null }> {
    return executeFirebaseOp(async () => {
      let q = query(studentCollection, orderBy("createdAt", "desc"), limit(limitCount));
      
      if (branchId) {
        q = query(q, where("branchId", "==", branchId));
      }
      
      if (classIds && classIds.length > 0) {
        q = query(q, where("classId", "in", classIds.slice(0, 30)));
      }

      if (lastDoc) {
        q = query(q, startAfter(lastDoc));
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
    }, 'getStudentsPaginated');
  },

  // Get Single Student
  async getStudentById(id: string): Promise<Student | null> {
    return executeFirebaseOp(async () => {
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
    }, 'getStudentById');
  },

  // Get Student by Roll Number
  async getStudentByRollNumber(rollNumber: string): Promise<Student | null> {
    return executeFirebaseOp(async () => {
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
    }, 'getStudentByRollNumber');
  },

  // Get Student by Parent User ID
  async getStudentByParentUserId(userId: string): Promise<Student | null> {
    return executeFirebaseOp(async () => {
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
    }, 'getStudentByParentUserId');
  },

  // Update
  async updateStudent(id: string, student: Partial<Student>) {
    return executeFirebaseOp(async () => {
      const docRef = doc(db, "students", id);
      await updateDoc(docRef, {
        ...student,
        updatedAt: serverTimestamp(),
      });

      await logActivity('student_updated', 'student', id, {
        studentName: student.fullName || 'Student',
      });
    }, 'updateStudent');
  },

  // Delete
  async deleteStudent(id: string) {
    return executeFirebaseOp(async () => {
      const student = await this.getStudentById(id);
      const docRef = doc(db, "students", id);
      await deleteDoc(docRef);

      if (student) {
        await logActivity('student_updated', 'student', id, {
          studentName: student.fullName,
          status: 'deleted'
        });
      }
    }, 'deleteStudent');
  }
};
