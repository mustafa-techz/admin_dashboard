import {
  collection,
  doc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { executeFirebaseOp } from '@/lib/api-errors';
import { tsToISO } from '@/lib/firestoreUtils';

import type {
  FeeStructure,
  FeeStructureFormData,
  FeeInstallment,
  FeeInstallmentFormData,
  StudentFeeAssignment,
  StudentFeeInstallment,
  Payment,
  RecordPaymentData,
  InstallmentStatus,
} from '@/types/fees';

// ─────────────────────────────────────────────────────────────────
// Collection References
// ─────────────────────────────────────────────────────────────────
const feeStructuresCol = collection(db, 'feeStructures');
const feeInstallmentsCol = collection(db, 'feeInstallments');
const studentFeeAssignmentsCol = collection(db, 'studentFeeAssignments');
const studentFeeInstallmentsCol = collection(db, 'studentFeeInstallments');
const paymentsCol = collection(db, 'payments');



// ─────────────────────────────────────────────────────────────────
// Fee Structures
// ─────────────────────────────────────────────────────────────────
export const feeService = {
  /**
   * Create a fee structure + its installments in a single batch write.
   */
  async createFeeStructure(
    data: FeeStructureFormData,
    installments: FeeInstallmentFormData[],
    createdBy: string
  ): Promise<string> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);

      // Create fee structure doc
      const feeStructureRef = doc(feeStructuresCol);
      batch.set(feeStructureRef, {
        feeName: data.feeName,
        academicYear: data.academicYear,
        totalAmount: data.totalAmount,
        splitType: data.splitType,
        installmentCount: installments.length,
        branchId: data.branchId,
        status: 'active',
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create installment docs
      installments.forEach((inst, index) => {
        const instRef = doc(feeInstallmentsCol);
        batch.set(instRef, {
          feeStructureId: feeStructureRef.id,
          installmentName: inst.installmentName,
          amount: inst.amount,
          dueDate: inst.dueDate,
          order: index + 1,
          branchId: data.branchId,
        });
      });

      await batch.commit();
      return feeStructureRef.id;
    }, 'createFeeStructure');
  },

  /**
   * Get all fee structures for a branch.
   */
  async getFeeStructures(branchId: string): Promise<FeeStructure[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        feeStructuresCol,
        where('branchId', '==', branchId),
        where('status', '==', 'active'),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToISO(d.data().createdAt),
        updatedAt: tsToISO(d.data().updatedAt),
      })) as FeeStructure[];
    }, 'getFeeStructures');
  },

  /**
   * Get installments for a fee structure.
   */
  async getFeeInstallments(feeStructureId: string): Promise<FeeInstallment[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        feeInstallmentsCol,
        where('feeStructureId', '==', feeStructureId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as FeeInstallment[];
    }, 'getFeeInstallments');
  },

  // ───────────────────────────────────────────────────────────────
  // Student Fee Assignments
  // ───────────────────────────────────────────────────────────────

  /**
   * Assign a fee structure to a student.
   * Creates the aggregate doc + individual installment tracking docs.
   */
  async assignFeeToStudent(
    studentId: string,
    studentName: string,
    feeStructure: FeeStructure,
    installments: FeeInstallment[],
  ): Promise<string> {
    return executeFirebaseOp(async () => {
      const { studentService } = await import('./studentService');
      const student = await studentService.getStudentById(studentId);
      if (!student) throw new Error('Student not found');
      const parentUserId = student?.parentDetails?.userId || '';

      const batch = writeBatch(db);

      // Aggregate assignment doc
      const assignmentRef = doc(studentFeeAssignmentsCol);
      batch.set(assignmentRef, {
        studentId,
        studentName,
        userId: parentUserId,
        feeStructureId: feeStructure.id,
        branchId: feeStructure.branchId,
        totalAmount: feeStructure.totalAmount,
        totalPaid: 0,
        totalPending: feeStructure.totalAmount,
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Per-installment tracking docs
      const sfiRefs: { inst: FeeInstallment, sfiId: string }[] = [];
      installments.forEach((inst) => {
        const sfiRef = doc(studentFeeInstallmentsCol);
        sfiRefs.push({ inst, sfiId: sfiRef.id });

        // Compute nextReminderDate: 5 days before dueDate for efficient Cloud Function queries
        const reminderDate = new Date(inst.dueDate);
        reminderDate.setDate(reminderDate.getDate() - 5);
        const nextReminderDate = reminderDate.toISOString().split('T')[0];

        batch.set(sfiRef, {
          studentId,
          userId: parentUserId,
          feeStructureId: feeStructure.id,
          feeInstallmentId: inst.id,
          installmentName: inst.installmentName,
          amount: inst.amount,
          amountPaid: 0,
          amountPending: inst.amount,
          dueDate: inst.dueDate,
          status: 'pending',
          order: inst.order,
          branchId: feeStructure.branchId,
          nextReminderDate,
        });
      });

      await batch.commit();



      return assignmentRef.id;
    }, 'assignFeeToStudent');
  },

  /**
   * Bulk-assign fee structure to multiple students.
   */
  async assignFeeToStudents(
    students: Array<{ id: string; fullName: string, userId: string }>,
    feeStructure: FeeStructure,
    installments: FeeInstallment[],
  ): Promise<void> {
    return executeFirebaseOp(async () => {
      // Firestore batches max 500 ops. Chunk if needed.
      const BATCH_LIMIT = 450;
      let batch = writeBatch(db);
      let opCount = 0;

      for (const student of students) {
        const assignmentRef = doc(studentFeeAssignmentsCol);
        batch.set(assignmentRef, {
          studentId: student.id,
          studentName: student.fullName,
          userId: student.userId,
          feeStructureId: feeStructure.id,
          branchId: feeStructure.branchId,
          totalAmount: feeStructure.totalAmount,
          totalPaid: 0,
          totalPending: feeStructure.totalAmount,
          status: 'pending',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        opCount++;

        const sfiRefsForStudent: { inst: FeeInstallment, sfiId: string }[] = [];
        for (const inst of installments) {
          const sfiRef = doc(studentFeeInstallmentsCol);
          sfiRefsForStudent.push({ inst, sfiId: sfiRef.id });

          // Compute nextReminderDate: 5 days before dueDate
          const reminderDate = new Date(inst.dueDate);
          reminderDate.setDate(reminderDate.getDate() - 5);
          const nextReminderDate = reminderDate.toISOString().split('T')[0];

          batch.set(sfiRef, {
            studentId: student.id,
            userId: student.userId,
            feeStructureId: feeStructure.id,
            feeInstallmentId: inst.id,
            installmentName: inst.installmentName,
            amount: inst.amount,
            amountPaid: 0,
            amountPending: inst.amount,
            dueDate: inst.dueDate,
            status: 'pending',
            order: inst.order,
            branchId: feeStructure.branchId,
            nextReminderDate,
          });
          opCount++;

          if (opCount >= BATCH_LIMIT) {
            await batch.commit();
            batch = writeBatch(db);
            opCount = 0;
          }
        }


      }

      if (opCount > 0) {
        await batch.commit();
      }


    }, 'assignFeeToStudents');
  },

  /**
   * Get fee assignments for a student (parent view).
   */
  async getStudentFeeAssignments(studentId: string): Promise<StudentFeeAssignment[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        studentFeeAssignmentsCol,
        where('studentId', '==', studentId)
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToISO(d.data().createdAt),
        updatedAt: tsToISO(d.data().updatedAt),
      })) as StudentFeeAssignment[];
    }, 'getStudentFeeAssignments');
  },

  /**
   * Get all fee assignments for a branch (admin view).
   */
  async getBranchFeeAssignments(
    branchId: string,
    feeStructureId?: string
  ): Promise<StudentFeeAssignment[]> {
    return executeFirebaseOp(async () => {
      let q;
      if (feeStructureId) {
        q = query(
          studentFeeAssignmentsCol,
          where('branchId', '==', branchId),
          where('feeStructureId', '==', feeStructureId)
        );
      } else {
        q = query(
          studentFeeAssignmentsCol,
          where('branchId', '==', branchId)
        );
      }
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToISO(d.data().createdAt),
        updatedAt: tsToISO(d.data().updatedAt),
      })) as StudentFeeAssignment[];
    }, 'getBranchFeeAssignments');
  },

  /**
   * Get student fee installments.
   */
  async getStudentFeeInstallments(
    studentId: string,
    feeStructureId: string
  ): Promise<StudentFeeInstallment[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        studentFeeInstallmentsCol,
        where('studentId', '==', studentId),
        where('feeStructureId', '==', feeStructureId)
      );
      const snapshot = await getDocs(q);
      // Sort in memory to avoid requiring a composite index that breaks loading
      return snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => ((a as unknown as { order?: number }).order || 0) - ((b as unknown as { order?: number }).order || 0)) as StudentFeeInstallment[];
    }, 'getStudentFeeInstallments');
  },

  /**
   * Get all pending fee installments for a student.
   */
  async getAllPendingStudentFeeInstallments(studentId: string): Promise<StudentFeeInstallment[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        studentFeeInstallmentsCol,
        where('studentId', '==', studentId),
        where('status', 'in', ['pending', 'partial'])
      );
      const snapshot = await getDocs(q);
      // Sort in memory by due date to avoid index requirements
      return snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
        }))
        .sort((a, b) => new Date((a as unknown as { dueDate: string }).dueDate).getTime() - new Date((b as unknown as { dueDate: string }).dueDate).getTime()) as StudentFeeInstallment[];
    }, 'getAllPendingStudentFeeInstallments');
  },

  // ───────────────────────────────────────────────────────────────
  // Payments
  // ───────────────────────────────────────────────────────────────

  /**
   * Record a payment against a student fee installment.
   * Updates:
   * 1. studentFeeInstallments (amountPaid, amountPending, status)
   * 2. studentFeeAssignments (totalPaid, totalPending, status)
   * 3. Creates a payment doc
   */
  async recordPayment(
    paymentData: RecordPaymentData,
    recordedBy: string
  ): Promise<string> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);

      // 1. Get current installment state
      const sfiRef = doc(studentFeeInstallmentsCol, paymentData.studentFeeInstallmentId);
      const sfiSnap = await getDoc(sfiRef);
      if (!sfiSnap.exists()) throw new Error('Student fee installment not found');

      const sfiData = sfiSnap.data() as Omit<StudentFeeInstallment, 'id'>;
      const newAmountPaid = sfiData.amountPaid + paymentData.amount;
      const newAmountPending = sfiData.amount - newAmountPaid;

      let newInstStatus: InstallmentStatus = 'pending';
      if (newAmountPending <= 0) {
        newInstStatus = 'paid';
      } else if (newAmountPaid > 0) {
        newInstStatus = 'partial';
      }

      batch.update(sfiRef, {
        amountPaid: newAmountPaid,
        amountPending: Math.max(0, newAmountPending),
        status: newInstStatus,
        lastPaymentDate: new Date().toISOString(),
        lastPaymentMode: paymentData.paymentMode,
        // Clear nextReminderDate once fully paid — stops future reminders
        ...(newInstStatus === 'paid' ? { nextReminderDate: null } : {}),
      });

      // 2. Update aggregate assignment
      const assignQ = query(
        studentFeeAssignmentsCol,
        where('studentId', '==', paymentData.studentId),
        where('feeStructureId', '==', paymentData.feeStructureId)
      );
      const assignSnap = await getDocs(assignQ);
      if (!assignSnap.empty) {
        const assignDoc = assignSnap.docs[0];
        const assignData = assignDoc.data() as Omit<StudentFeeAssignment, 'id'>;
        const newTotalPaid = assignData.totalPaid + paymentData.amount;
        const newTotalPending = assignData.totalAmount - newTotalPaid;

        let overallStatus: InstallmentStatus = 'pending';
        if (newTotalPending <= 0) {
          overallStatus = 'paid';
        } else if (newTotalPaid > 0) {
          overallStatus = 'partial';
        }

        batch.update(assignDoc.ref, {
          totalPaid: newTotalPaid,
          totalPending: Math.max(0, newTotalPending),
          status: overallStatus,
          updatedAt: serverTimestamp(),
        });
      }

      // 3. Create payment record
      const paymentRef = doc(paymentsCol);
      batch.set(paymentRef, {
        studentId: paymentData.studentId,
        feeStructureId: paymentData.feeStructureId,
        feeInstallmentId: paymentData.feeInstallmentId,
        studentFeeInstallmentId: paymentData.studentFeeInstallmentId,
        amount: paymentData.amount,
        paymentMode: paymentData.paymentMode,
        transactionId: paymentData.transactionId || '',
        notes: paymentData.notes || '',
        branchId: paymentData.branchId,
        recordedBy,
        createdAt: serverTimestamp(),
      });

      await batch.commit();



      return paymentRef.id;
    }, 'recordPayment');
  },

  /**
   * Get payment history for a student fee installment.
   */
  async getPaymentHistory(
    studentFeeInstallmentId: string
  ): Promise<Payment[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        paymentsCol,
        where('studentFeeInstallmentId', '==', studentFeeInstallmentId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToISO(d.data().createdAt),
      })) as Payment[];
    }, 'getPaymentHistory');
  },

  /**
   * Get all payments for a student across all fee structures.
   */
  async getStudentPayments(studentId: string): Promise<Payment[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        paymentsCol,
        where('studentId', '==', studentId),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        createdAt: tsToISO(d.data().createdAt),
      })) as Payment[];
    }, 'getStudentPayments');
  },

  /**
   * Get the fee structure document by id
   */
  async getFeeStructureById(id: string): Promise<FeeStructure | null> {
    return executeFirebaseOp(async () => {
      const docSnap = await getDoc(doc(feeStructuresCol, id));
      if (!docSnap.exists()) return null;
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: tsToISO(docSnap.data().createdAt),
        updatedAt: tsToISO(docSnap.data().updatedAt),
      } as FeeStructure;
    }, 'getFeeStructureById');
  },
  /**
   * Delete a fee structure and its associated installments.
   */
  async deleteFeeStructure(feeStructureId: string): Promise<void> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);

      // 1. Delete fee structure doc
      const feeStructureRef = doc(feeStructuresCol, feeStructureId);
      batch.delete(feeStructureRef);

      // 2. Delete all installments
      const instQ = query(feeInstallmentsCol, where('feeStructureId', '==', feeStructureId));
      const instSnap = await getDocs(instQ);
      instSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 3. Optional: we shouldn't delete if there are student assignments, but let's allow it
      // or we can just delete assignments too? Standard is not to allow deletion if assigned,
      // but to strictly meet the user request, we just delete the structure + its template installments.

      await batch.commit();
    }, 'deleteFeeStructure');
  },

  /**
   * Delete a student fee assignment and all its installments.
   */
  async deleteStudentFeeAssignment(assignmentId: string): Promise<void> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);

      // 1. Get the assignment doc to know studentId & feeStructureId
      const assignRef = doc(studentFeeAssignmentsCol, assignmentId);
      const assignSnap = await getDoc(assignRef);

      if (!assignSnap.exists()) return;

      const data = assignSnap.data() as Omit<StudentFeeAssignment, 'id'>;

      // 2. Delete the aggregate assignment doc
      batch.delete(assignRef);

      // 3. Delete all tracking installments for this student & structure
      const sfiQ = query(
        studentFeeInstallmentsCol,
        where('studentId', '==', data.studentId),
        where('feeStructureId', '==', data.feeStructureId)
      );
      const sfiSnap = await getDocs(sfiQ);
      sfiSnap.forEach((docSnap) => {
        batch.delete(docSnap.ref);
      });

      // 4. Optionally delete payments? Usually payments shouldn't be deleted, 
      // but we are removing the fee entirely for the student.

      await batch.commit();
    }, 'deleteStudentFeeAssignment');
  },
};
