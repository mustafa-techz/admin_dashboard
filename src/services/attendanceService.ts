import {
  collection,
  doc,
  getDoc,
  getDocs,
  writeBatch,
  query,
  where,
  orderBy,
  limit,
  startAfter,
  serverTimestamp,
  increment,
  QueryDocumentSnapshot,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { executeFirebaseOp } from '@/lib/api-errors';
import { AttendanceSession, AttendanceStatus, StudentStats, DailySummary } from '../types/attendance';
import { logActivity } from '@/lib/activityLogger';

/** Builds the session document ID */
const sessionId = (date: string, classId: string, section: string) =>
  `${date}_${classId}_${section}`;

export const attendanceService = {
  /**
   * Fetch a single session document and return a studentId→status map.
   * Returns an empty object if no session exists yet.
   */
  async getSession(
    date: string,
    classId: string,
    section: string
  ): Promise<Record<string, AttendanceStatus>> {
    return executeFirebaseOp(async () => {
      const ref = doc(db, 'attendance_sessions', sessionId(date, classId, section));
      const snap = await getDoc(ref);
      if (!snap.exists()) return {};
      return (snap.data() as AttendanceSession).students || {};
    }, 'getSession');
  },

  /**
   * Commit the full session in one batch:
   *   1. Upsert the attendance_sessions document (students map)
   *   2. Delta-update student_stats for every changed student
   *   3. Delta-update daily_summaries for the day
   *
   * @param date          ISO date string (YYYY-MM-DD)
   * @param classId       Class identifier
   * @param section       Section identifier
   * @param teacherId     ID of the teacher submitting
   * @param totalStudents Total number of students in the class
   * @param newStatuses   Full student→status map after the teacher's input
   * @param prevStatuses  Previous committed student→status map (for delta calc)
   */
  async saveSession(
    date: string,
    classId: string,
    section: string,
    teacherId: string,
    totalStudents: number,
    newStatuses: Record<string, AttendanceStatus>,
    prevStatuses: Record<string, AttendanceStatus>,
    className?: string,
    sectionName?: string
  ) {
    return executeFirebaseOp(async () => {
      // ── 1. Determine which students actually changed ──────────────────
      const changed = Object.entries(newStatuses).filter(
        ([id, status]) => prevStatuses[id] !== status
      );

      if (changed.length === 0) return; // nothing to write

      // ── 2. Build session document update ─────────────────────────────
      const sessionRef = doc(db, 'attendance_sessions', sessionId(date, classId, section));

      // ── 3. Split student_stats + daily_summary writes into ≤450 op batches ──
      const CHUNK_SIZE = 490;
      const chunks: [string, AttendanceStatus][][] = [];
      for (let i = 0; i < changed.length; i += CHUNK_SIZE) {
        chunks.push(changed.slice(i, i + CHUNK_SIZE));
      }

      // First batch also writes the session doc + daily summary
      const firstBatch = writeBatch(db);

      let dailyPresentDelta = 0;
      let dailyAbsentDelta = 0;
      let dailyLeaveDelta = 0;

      // Session document — merge entire students map
      const studentsMap: Record<string, AttendanceStatus> = { ...prevStatuses, ...newStatuses };
      firstBatch.set(
        sessionRef,
        {
          date,
          classId,
          section,
          teacherId,
          totalStudents,
          createdAt: serverTimestamp(),
          students: studentsMap,
        },
        { merge: true }
      );

      // Process first chunk of student_stats in firstBatch
      if (chunks.length > 0) {
        for (const [studentId, newStatus] of chunks[0]) {
          const prevStatus = prevStatuses[studentId];
          const statsRef = doc(db, 'student_stats', studentId);

          const delta = this._buildStatsDelta(prevStatus, newStatus);
          firstBatch.set(statsRef, delta, { merge: true });

          // Accumulate daily deltas
          if (newStatus === 'present') dailyPresentDelta += 1;
          if (newStatus === 'absent') dailyAbsentDelta += 1;
          if (newStatus === 'leave') dailyLeaveDelta += 1;
          if (prevStatus === 'present') dailyPresentDelta -= 1;
          if (prevStatus === 'absent') dailyAbsentDelta -= 1;
          if (prevStatus === 'leave') dailyLeaveDelta -= 1;
        }
      }

      // Daily summary update in the first batch
      const dailyRef = doc(db, 'daily_summaries', date);
      firstBatch.set(
        dailyRef,
        {
          date,
          totalPresentToday: increment(dailyPresentDelta),
          totalAbsentToday: increment(dailyAbsentDelta),
          totalLeaveToday: increment(dailyLeaveDelta),
          totalStrength: increment(0), // totalStrength managed elsewhere
        },
        { merge: true }
      );

      await firstBatch.commit();

      // ── 4. Remaining chunks (if any) ─────────────────────────────────
      if (chunks.length > 1) {
        await Promise.all(
          chunks.slice(1).map((chunk) => this._runStatsBatch(chunk, prevStatuses))
        );
      }

      // Resolve names if missing or look like IDs
      let resolvedClassName = className;
      let resolvedSectionName = sectionName;

      if (!resolvedClassName || resolvedClassName === classId) {
        const classSnap = await getDoc(doc(db, 'classes', classId));
        if (classSnap.exists()) resolvedClassName = classSnap.data().className;
      }
      if (!resolvedSectionName || resolvedSectionName === section) {
        const sectionSnap = await getDoc(doc(db, 'sections', section));
        if (sectionSnap.exists()) resolvedSectionName = sectionSnap.data().sectionName;
      }

      // Log activity
      const isNewSubmission = Object.keys(prevStatuses).length === 0;
      await logActivity(
        isNewSubmission ? 'attendance_submitted' : 'attendance_updated',
        'attendance_session',
        sessionId(date, classId, section),
        { 
          className: resolvedClassName || classId, 
          sectionName: resolvedSectionName || section, 
          date 
        }
      );
    }, 'saveSession');
  },

  /** Builds a per-student stats increment object based on status delta */
  _buildStatsDelta(prev: AttendanceStatus | undefined, next: AttendanceStatus) {
    return {
      totalPresent: increment(
        (next === 'present' ? 1 : 0) - (prev === 'present' ? 1 : 0)
      ),
      totalAbsent: increment(
        (next === 'absent' ? 1 : 0) - (prev === 'absent' ? 1 : 0)
      ),
      totalLeave: increment(
        (next === 'leave' ? 1 : 0) - (prev === 'leave' ? 1 : 0)
      ),
      // totalDays only increments when a student has no previous record
      totalDays: increment(prev === undefined ? 1 : 0),
    };
  },

  /** Runs a batch solely for student_stats updates (overflow chunks) */
  async _runStatsBatch(
    chunk: [string, AttendanceStatus][],
    prevStatuses: Record<string, AttendanceStatus>
  ) {
    return executeFirebaseOp(async () => {
      const batch = writeBatch(db);
      for (const [studentId, newStatus] of chunk) {
        const prevStatus = prevStatuses[studentId];
        const statsRef = doc(db, 'student_stats', studentId);
        batch.set(statsRef, this._buildStatsDelta(prevStatus, newStatus), { merge: true });
      }
      await batch.commit();
    }, '_runStatsBatch');
  },

  /**
   * Fetch sessions for a class/section for attendance history.
   * Returns paginated sessions (used for history table + heatmap).
   */
  async getSessions(
    classId: string,
    section: string,
    limitCount = 100,
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null
  ): Promise<{
    sessions: AttendanceSession[];
    lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  }> {
    return executeFirebaseOp(async () => {
      let q = query(
        collection(db, 'attendance_sessions'),
        where('classId', '==', classId),
        where('section', '==', section),
        orderBy('date', 'desc'),
        limit(limitCount)
      );

      if (lastDoc) {
        q = query(
          collection(db, 'attendance_sessions'),
          where('classId', '==', classId),
          where('section', '==', section),
          orderBy('date', 'desc'),
          startAfter(lastDoc),
          limit(limitCount)
        );
      }

      const snap = await getDocs(q);
      const sessions = snap.docs.map((d) => d.data() as AttendanceSession);
      return {
        sessions,
        lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
      };
    }, 'getSessions');
  },

  /**
   * Fetch sessions for heatmap (ordered ascending by date, full year).
   */
  async getSessionsForHeatmap(
    classId: string,
    section: string,
    fromDate: string
  ): Promise<AttendanceSession[]> {
    return executeFirebaseOp(async () => {
      const q = query(
        collection(db, 'attendance_sessions'),
        where('classId', '==', classId),
        where('section', '==', section),
        where('date', '>=', fromDate),
        orderBy('date', 'asc')
      );
      const snap = await getDocs(q);
      return snap.docs.map((d) => d.data() as AttendanceSession);
    }, 'getSessionsForHeatmap');
  },

  /**
   * Fetch a student's cumulative stats.
   */
  async getStudentStats(studentId: string): Promise<StudentStats | null> {
    return executeFirebaseOp(async () => {
      const ref = doc(db, 'student_stats', studentId);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data() as StudentStats;
    }, 'getStudentStats');
  },

  /**
   * Fetch daily summary for a specific date.
   */
  async getDailySummary(date: string): Promise<DailySummary | null> {
    return executeFirebaseOp(async () => {
      const ref = doc(db, 'daily_summaries', date);
      const snap = await getDoc(ref);
      if (!snap.exists()) return null;
      return snap.data() as DailySummary;
    }, 'getDailySummary');
  },
};
