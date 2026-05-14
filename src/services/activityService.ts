import { collection, doc, setDoc, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore';
import { db } from '../firebase/firestore';
import { ActivityLog } from '@/types/activity';
import { executeFirebaseOp } from '@/lib/api-errors';

export const activityService = {
  logActivity: async (
    params: Omit<ActivityLog, 'id' | 'createdAt' | 'expiresAt'>
  ) => {
    return executeFirebaseOp(async () => {
      const logsRef = collection(db, 'activityLogs');
      const newLogRef = doc(logsRef);
      
      const now = Date.now();
      const expiresAt = new Date(now + 90 * 24 * 60 * 60 * 1000); // 90 days from now as Date for TTL

      const logData: ActivityLog = {
        ...params,
        id: newLogRef.id,
        createdAt: now,
        expiresAt: expiresAt as any,
      };

      await setDoc(newLogRef, logData);
      return logData;
    }, 'logActivity');
  },

  getRecentActivities: async (
    branchId?: string,
    limitCount = 20,
    lastDoc?: QueryDocumentSnapshot<DocumentData> | null
  ) => {
    return executeFirebaseOp(async () => {
      let q;
      
      if (branchId) {
        if (lastDoc) {
          q = query(
            collection(db, 'activityLogs'),
            where('branchId', '==', branchId),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(limitCount)
          );
        } else {
          q = query(
            collection(db, 'activityLogs'),
            where('branchId', '==', branchId),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
        }
      } else {
        if (lastDoc) {
          q = query(
            collection(db, 'activityLogs'),
            orderBy('createdAt', 'desc'),
            startAfter(lastDoc),
            limit(limitCount)
          );
        } else {
          q = query(
            collection(db, 'activityLogs'),
            orderBy('createdAt', 'desc'),
            limit(limitCount)
          );
        }
      }

      const snap = await getDocs(q);

      return {
        activities: snap.docs.map(doc => doc.data() as ActivityLog),
        lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
      };
    }, 'getRecentActivities');
  }
};
