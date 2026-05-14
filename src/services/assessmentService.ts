import {
  collection,
  doc,
  getDocs,
  getDoc,
  updateDoc,
  query,
  where,
  writeBatch,
  serverTimestamp,
  runTransaction,
} from 'firebase/firestore';
import { db } from '@/firebase/firestore';
import { executeFirebaseOp } from '@/lib/api-errors';
import { logActivity } from '@/lib/activityLogger';
import { tsToISO } from '@/lib/firestoreUtils';


import { calculatePercentage, getGrade, getPassStatus } from '@/lib/gradeUtils';
import type {
  Assessment,
  AssessmentFormData,
  AssessmentStatus,
  ExamScheduleSlot,
  ExamScheduleFormData,
  SubjectMark,
  SubjectMarkEntry,
  StudentResultSummary,
  SubjectResult,
} from '@/types/assessment';

// ─────────────────────────────────────────────────────────────────
// Collection References
// ─────────────────────────────────────────────────────────────────
const assessmentsCol = collection(db, 'assessments');

function scheduleCol(assessmentId: string) {
  return collection(db, 'assessments', assessmentId, 'schedule');
}

function subjectMarksCol(assessmentId: string) {
  return collection(db, 'assessments', assessmentId, 'subjectMarks');
}

function studentSummaryCol(assessmentId: string) {
  return collection(db, 'assessments', assessmentId, 'studentSummary');
}



// ─────────────────────────────────────────────────────────────────
// Assessment Service
// ─────────────────────────────────────────────────────────────────
export const assessmentService = {
  // ─────────────────────────────────────────────────────────────
  // CRUD: Assessments
  // ─────────────────────────────────────────────────────────────

  /**
   * Create an assessment with its exam schedule in a single batch.
   */
  async createAssessment(
    data: AssessmentFormData,
    schedule: ExamScheduleFormData[],
    createdBy: string
  ): Promise<string> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);
      const assessmentRef = doc(assessmentsCol);

      batch.set(assessmentRef, {
        type: data.type,
        name: data.name,
        classId: data.classId,
        sectionId: data.sectionId,
        academicYear: data.academicYear,
        branchId: data.branchId,
        status: 'draft' as AssessmentStatus,
        subjects: data.subjects,
        publishedAt: null,
        publishedBy: null,
        createdBy,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Create schedule slots
      for (const slot of schedule) {
        const slotRef = doc(scheduleCol(assessmentRef.id));
        batch.set(slotRef, {
          subject: slot.subject,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxMarks: slot.maxMarks,
        });
      }

      await batch.commit();

      await logActivity('exam_published', 'assessment', assessmentRef.id, {
        assessmentName: data.name,
        classId: data.classId,
      });

      return assessmentRef.id;
    }, 'createAssessment');
  },

  /**
   * Get assessments for a branch.
   */
  async getAssessments(branchId: string, status?: AssessmentStatus): Promise<Assessment[]> {
    return executeFirebaseOp(async () => {
      let q;
      if (status) {
        q = query(assessmentsCol, where('branchId', '==', branchId), where('status', '==', status));
      } else {
        q = query(assessmentsCol, where('branchId', '==', branchId));
      }
      const snapshot = await getDocs(q);
      return snapshot.docs
        .map((d) => ({
          id: d.id,
          ...d.data(),
          createdAt: tsToISO(d.data().createdAt),
          updatedAt: tsToISO(d.data().updatedAt),
          publishedAt: d.data().publishedAt ? tsToISO(d.data().publishedAt) : null,
        }))
        .sort((a, b) => new Date(b.createdAt as string).getTime() - new Date(a.createdAt as string).getTime()) as Assessment[];
    }, 'getAssessments');
  },

  /**
   * Get published assessments for a class/section (parent view).
   */
  async getPublishedAssessments(classId: string, sectionId: string): Promise<Assessment[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        assessmentsCol,
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
        publishedAt: d.data().publishedAt ? tsToISO(d.data().publishedAt) : null,
      })) as Assessment[];
    }, 'getPublishedAssessments');
  },

  /**
   * Get a single assessment by ID.
   */
  async getAssessmentById(id: string): Promise<Assessment | null> {
    return executeFirebaseOp(async () => {
      const docSnap = await getDoc(doc(assessmentsCol, id));
      if (!docSnap.exists()) return null;
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: tsToISO(data.createdAt),
        updatedAt: tsToISO(data.updatedAt),
        publishedAt: data.publishedAt ? tsToISO(data.publishedAt) : null,
      } as Assessment;
    }, 'getAssessmentById');
  },

  // ─────────────────────────────────────────────────────────────
  // Schedule
  // ─────────────────────────────────────────────────────────────

  /**
   * Get exam schedule for an assessment.
   */
  async getSchedule(assessmentId: string): Promise<ExamScheduleSlot[]> {
    return executeFirebaseOp(async () => {
      const snapshot = await getDocs(scheduleCol(assessmentId));
      return snapshot.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()) as ExamScheduleSlot[];
    }, 'getSchedule');
  },

  /**
   * Replace all schedule slots (full save).
   */
  async saveSchedule(assessmentId: string, slots: ExamScheduleFormData[]): Promise<void> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);

      // Delete existing
      const existing = await getDocs(scheduleCol(assessmentId));
      existing.docs.forEach((d) => batch.delete(d.ref));

      // Write new
      const subjects: string[] = [];
      for (const slot of slots) {
        const slotRef = doc(scheduleCol(assessmentId));
        batch.set(slotRef, {
          subject: slot.subject,
          date: slot.date,
          startTime: slot.startTime,
          endTime: slot.endTime,
          maxMarks: slot.maxMarks,
        });
        if (!subjects.includes(slot.subject)) subjects.push(slot.subject);
      }

      // Update subjects list + timestamp
      batch.update(doc(assessmentsCol, assessmentId), {
        subjects,
        updatedAt: serverTimestamp(),
      });

      await batch.commit();
    }, 'saveSchedule');
  },

  // ─────────────────────────────────────────────────────────────
  // Status Transitions
  // ─────────────────────────────────────────────────────────────

  /**
   * Transition assessment status.
   */
  async updateStatus(id: string, status: AssessmentStatus): Promise<void> {
    return executeFirebaseOp(async () => {
      const updateData: Record<string, any> = {
        status,
        updatedAt: serverTimestamp(),
      };
      if (status === 'published') {
        updateData.publishedAt = serverTimestamp();
      }
      await updateDoc(doc(assessmentsCol, id), updateData);
    }, 'updateStatus');
  },

  // ─────────────────────────────────────────────────────────────
  // Marks Entry
  // ─────────────────────────────────────────────────────────────

  /**
   * Batch save marks for a specific subject.
   * Uses composite doc ID: studentId_subject to prevent conflicts.
   */
  async saveSubjectMarks(
    assessmentId: string,
    subject: string,
    maxMarks: number,
    entries: SubjectMarkEntry[],
    enteredBy: string,
    enteredByName: string
  ): Promise<void> {
    return executeFirebaseOp(async () => {
      const BATCH_LIMIT = 450;
      let batch = writeBatch(db);
      let opCount = 0;

      for (const entry of entries) {
        // Composite ID prevents conflicts between teachers
        const docId = `${entry.studentId}_${subject}`;
        const markRef = doc(subjectMarksCol(assessmentId), docId);

        batch.set(markRef, {
          studentId: entry.studentId,
          studentName: entry.studentName,
          subject,
          marks: entry.isAbsent ? 0 : entry.marks,
          maxMarks,
          isAbsent: entry.isAbsent,
          enteredBy,
          enteredByName,
          updatedAt: serverTimestamp(),
        }, { merge: true });

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

      await logActivity('marks_entered', 'assessment', assessmentId, {
        subject,
        assessmentName: 'Assessment',
      });
    }, 'saveSubjectMarks');
  },

  /**
   * Get all marks for an assessment (for summary generation).
   */
  async getAllMarks(assessmentId: string): Promise<SubjectMark[]> {
    return executeFirebaseOp(async () => {
      const snapshot = await getDocs(subjectMarksCol(assessmentId));
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        updatedAt: tsToISO(d.data().updatedAt),
      })) as SubjectMark[];
    }, 'getAllMarks');
  },

  /**
   * Get marks for a specific subject.
   */
  async getSubjectMarks(assessmentId: string, subject: string): Promise<SubjectMark[]> {
    return executeFirebaseOp(async () => {
      const q = query(subjectMarksCol(assessmentId), where('subject', '==', subject));
      const snapshot = await getDocs(q);
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        updatedAt: tsToISO(d.data().updatedAt),
      })) as SubjectMark[];
    }, 'getSubjectMarks');
  },

  // ─────────────────────────────────────────────────────────────
  // Result Summary Generation + Publish
  // ─────────────────────────────────────────────────────────────

  /**
   * Generate student summaries from all entered marks.
   * Called when transitioning to 'locked' state.
   */
  async generateSummaries(assessmentId: string): Promise<number> {
    return executeFirebaseOp(async () => {
      const assessment = await this.getAssessmentById(assessmentId);
      if (!assessment) throw new Error('Assessment not found');

      const allMarks = await this.getAllMarks(assessmentId);
      if (allMarks.length === 0) throw new Error('No marks entered');

      // Group marks by student
      const byStudent = new Map<string, SubjectMark[]>();
      for (const mark of allMarks) {
        const existing = byStudent.get(mark.studentId) || [];
        existing.push(mark);
        byStudent.set(mark.studentId, existing);
      }

      const BATCH_LIMIT = 450;
      let batch = writeBatch(db);
      let opCount = 0;
      let summaryCount = 0;

      for (const [studentId, marks] of byStudent) {
        const subjectResults: SubjectResult[] = marks.map((m) => ({
          subject: m.subject,
          marks: m.marks,
          maxMarks: m.maxMarks,
          isAbsent: m.isAbsent,
        }));

        const totalMarks = subjectResults.reduce((s, r) => s + r.marks, 0);
        const totalMaxMarks = subjectResults.reduce((s, r) => s + r.maxMarks, 0);
        const percentage = calculatePercentage(totalMarks, totalMaxMarks);
        const grade = getGrade(percentage);
        const status = getPassStatus(percentage);

        const firstMark = marks[0];
        const summaryRef = doc(studentSummaryCol(assessmentId), studentId);

        batch.set(summaryRef, {
          studentId,
          studentName: firstMark.studentName,
          rollNumber: '', // Will be populated if available
          classId: assessment.classId,
          sectionId: assessment.sectionId,
          subjectResults,
          totalMarks,
          totalMaxMarks,
          percentage,
          grade,
          status,
          generatedAt: serverTimestamp(),
        });

        opCount++;
        summaryCount++;
        if (opCount >= BATCH_LIMIT) {
          await batch.commit();
          batch = writeBatch(db);
          opCount = 0;
        }
      }

      if (opCount > 0) {
        await batch.commit();
      }

      return summaryCount;
    }, 'generateSummaries');
  },

  /**
   * Get student summary for a specific student.
   */
  async getStudentSummary(assessmentId: string, studentId: string): Promise<StudentResultSummary | null> {
    return executeFirebaseOp(async () => {
      const docSnap = await getDoc(doc(studentSummaryCol(assessmentId), studentId));
      if (!docSnap.exists()) return null;
      return {
        id: docSnap.id,
        ...docSnap.data(),
        generatedAt: tsToISO(docSnap.data().generatedAt),
      } as StudentResultSummary;
    }, 'getStudentSummary');
  },

  /**
   * Get all summaries for an assessment.
   */
  async getAllSummaries(assessmentId: string): Promise<StudentResultSummary[]> {
    return executeFirebaseOp(async () => {
      const snapshot = await getDocs(studentSummaryCol(assessmentId));
      return snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
        generatedAt: tsToISO(d.data().generatedAt),
      })) as StudentResultSummary[];
    }, 'getAllSummaries');
  },

  /**
   * Publish results.
   * Uses transaction to prevent double-publish.
   */
  async publishResults(assessmentId: string, publishedBy: string): Promise<void> {
    return executeFirebaseOp(async () => {
      const assessmentRef = doc(assessmentsCol, assessmentId);

      // Transaction: check status + publish atomically
      await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(assessmentRef);
        if (!docSnap.exists()) throw new Error('Assessment not found');

        const current = docSnap.data();
        if (current.status === 'published') {
          throw new Error('Already published');
        }

        transaction.update(assessmentRef, {
          status: 'published',
          publishedAt: serverTimestamp(),
          publishedBy,
          updatedAt: serverTimestamp(),
        });
      });

      await logActivity('exam_published', 'assessment', assessmentId, {
        status: 'published'
      });


    }, 'publishResults');
  },

  /**
   * Delete an assessment and all subcollections.
   */
  async deleteAssessment(id: string): Promise<void> {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);

      // Delete schedule
      const scheduleSnap = await getDocs(scheduleCol(id));
      scheduleSnap.docs.forEach((d) => batch.delete(d.ref));

      // Delete marks
      const marksSnap = await getDocs(subjectMarksCol(id));
      marksSnap.docs.forEach((d) => batch.delete(d.ref));

      // Delete summaries
      const summarySnap = await getDocs(studentSummaryCol(id));
      summarySnap.docs.forEach((d) => batch.delete(d.ref));

      // Delete assessment doc
      batch.delete(doc(assessmentsCol, id));

      await batch.commit();
    }, 'deleteAssessment');
  },
};
