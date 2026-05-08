import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
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
// Helper: Timestamp → ISO string
// ─────────────────────────────────────────────────────────────────
function tsToISO(ts: unknown): string {
  if (ts instanceof Timestamp) return ts.toDate().toISOString();
  if (typeof ts === 'string') return ts;
  return new Date().toISOString();
}

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
    try {
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
    } catch (error) {
      console.error('Error creating fee structure:', error);
      throw error;
    }
  },

  /**
   * Get all fee structures for a branch.
   */
  async getFeeStructures(branchId: string): Promise<FeeStructure[]> {
    try {
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
    } catch (error) {
      console.error('Error getting fee structures:', error);
      throw error;
    }
  },

  /**
   * Get installments for a fee structure.
   */
  async getFeeInstallments(feeStructureId: string): Promise<FeeInstallment[]> {
    try {
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
    } catch (error) {
      console.error('Error getting fee installments:', error);
      throw error;
    }
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
    installments: FeeInstallment[]
  ): Promise<string> {
    try {
      const batch = writeBatch(db);

      // Aggregate assignment doc
      const assignmentRef = doc(studentFeeAssignmentsCol);
      batch.set(assignmentRef, {
        studentId,
        studentName,
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
      installments.forEach((inst) => {
        const sfiRef = doc(studentFeeInstallmentsCol);
        batch.set(sfiRef, {
          studentId,
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
        });
      });

      await batch.commit();
      return assignmentRef.id;
    } catch (error) {
      console.error('Error assigning fee to student:', error);
      throw error;
    }
  },

  /**
   * Bulk-assign fee structure to multiple students.
   */
  async assignFeeToStudents(
    students: Array<{ id: string; fullName: string }>,
    feeStructure: FeeStructure,
    installments: FeeInstallment[]
  ): Promise<void> {
    try {
      // Firestore batches max 500 ops. Chunk if needed.
      const BATCH_LIMIT = 450;
      let batch = writeBatch(db);
      let opCount = 0;

      for (const student of students) {
        const assignmentRef = doc(studentFeeAssignmentsCol);
        batch.set(assignmentRef, {
          studentId: student.id,
          studentName: student.fullName,
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

        for (const inst of installments) {
          const sfiRef = doc(studentFeeInstallmentsCol);
          batch.set(sfiRef, {
            studentId: student.id,
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
    } catch (error) {
      console.error('Error assigning fee to multiple students:', error);
      throw error;
    }
  },

  /**
   * Get fee assignments for a student (parent view).
   */
  async getStudentFeeAssignments(studentId: string): Promise<StudentFeeAssignment[]> {
    try {
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
    } catch (error) {
      console.error('Error getting student fee assignments:', error);
      throw error;
    }
  },

  /**
   * Get all fee assignments for a branch (admin view).
   */
  async getBranchFeeAssignments(
    branchId: string,
    feeStructureId?: string
  ): Promise<StudentFeeAssignment[]> {
    try {
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
    } catch (error) {
      console.error('Error getting branch fee assignments:', error);
      throw error;
    }
  },

  /**
   * Get student fee installments.
   */
  async getStudentFeeInstallments(
    studentId: string,
    feeStructureId: string
  ): Promise<StudentFeeInstallment[]> {
    try {
      const q = query(
        studentFeeInstallmentsCol,
        where('studentId', '==', studentId),
        where('feeStructureId', '==', feeStructureId),
        orderBy('order', 'asc')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      })) as StudentFeeInstallment[];
    } catch (error) {
      console.error('Error getting student fee installments:', error);
      throw error;
    }
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
    try {
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
    } catch (error) {
      console.error('Error recording payment:', error);
      throw error;
    }
  },

  /**
   * Get payment history for a student fee installment.
   */
  async getPaymentHistory(
    studentFeeInstallmentId: string
  ): Promise<Payment[]> {
    try {
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
    } catch (error) {
      console.error('Error getting payment history:', error);
      throw error;
    }
  },

  /**
   * Get all payments for a student across all fee structures.
   */
  async getStudentPayments(studentId: string): Promise<Payment[]> {
    try {
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
    } catch (error) {
      console.error('Error getting student payments:', error);
      throw error;
    }
  },

  /**
   * Get the fee structure document by id
   */
  async getFeeStructureById(id: string): Promise<FeeStructure | null> {
    try {
      const docSnap = await getDoc(doc(feeStructuresCol, id));
      if (!docSnap.exists()) return null;
      return {
        id: docSnap.id,
        ...docSnap.data(),
        createdAt: tsToISO(docSnap.data().createdAt),
        updatedAt: tsToISO(docSnap.data().updatedAt),
      } as FeeStructure;
    } catch (error) {
      console.error('Error getting fee structure by id:', error);
      throw error;
    }
  },
  /**
   * Delete a fee structure and its associated installments.
   */
  async deleteFeeStructure(feeStructureId: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error deleting fee structure:', error);
      throw error;
    }
  },

  /**
   * Delete a student fee assignment and all its installments.
   */
  async deleteStudentFeeAssignment(assignmentId: string): Promise<void> {
    try {
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
    } catch (error) {
      console.error('Error deleting student fee assignment:', error);
      throw error;
    }
  },
};
