import {
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from "@/firebase/firestore";
import { executeFirebaseOp } from '@/lib/api-errors';
import { Reminder, CreateReminderDTO, ReminderStatus } from '@/types/reminder';

const REMINDERS_COLLECTION = 'reminders';

/**
 * Fetches active dashboard notifications for a specific user.
 * Highly optimized query using composite indexes.
 */
export const fetchUserDashboardReminders = async (
  userId: string,
  maxResults: number = 5
): Promise<Reminder[]> => {
  return executeFirebaseOp(async () => {
    const remindersRef = collection(db, REMINDERS_COLLECTION);

    // Query: targetUserIds contains userId, status is PENDING or READ, ordered by scheduledAt
    // We cannot use a second array-contains for deliveryChannels, so we filter that locally or in the UI.
    const q = query(
      remindersRef,
      where('targetUserIds', 'array-contains', userId),
      where('status', 'in', ['PENDING', 'READ']),
      orderBy('scheduledAt', 'desc'),
      limit(maxResults * 3) // fetch extra to account for non-dashboard reminders, filter locally
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Reminder[];
  }, 'fetchUserDashboardReminders');
};

/**
 * Mark a reminder as dismissed or read on the frontend.
 */
export const updateReminderStatus = async (
  reminderId: string,
  status: ReminderStatus
): Promise<void> => {
  return executeFirebaseOp(async () => {
    const reminderRef = doc(db, REMINDERS_COLLECTION, reminderId);
    await updateDoc(reminderRef, {
      status,
      updatedAt: serverTimestamp(),
    });
  }, 'updateReminderStatus');
};

/**
 * Resolves all reminders associated with a specific student fee installment.
 * Used when a fee installment is paid to automatically hide related reminders.
 */
export const resolveRemindersForInstallment = async (studentFeeInstallmentId: string): Promise<void> => {
  return executeFirebaseOp(async () => {
    const remindersRef = collection(db, REMINDERS_COLLECTION);
    const q = query(
      remindersRef,
      where('metadata.studentFeeInstallmentId', '==', studentFeeInstallmentId),
      where('status', 'in', ['PENDING', 'READ'])
    );
    const snapshot = await getDocs(q);
    
    if (snapshot.empty) return;
    
    // We update them individually or in a batch. Since usually it's just 1 reminder, updateDoc is fine.
    const promises = snapshot.docs.map(docSnap => 
      updateDoc(docSnap.ref, {
        status: 'RESOLVED',
        updatedAt: serverTimestamp()
      })
    );
    await Promise.all(promises);
  }, 'resolveRemindersForInstallment');
};

/**
 * EVENT-DRIVEN GENERATOR: Creates a reminder document.
 * In a pure production system, this is often called via Cloud Functions 
 * when a trigger happens (e.g., fee created). We expose it here for manual 
 * generation flows from the admin dashboard.
 */
export const generateReminder = async (data: CreateReminderDTO): Promise<string> => {
  return executeFirebaseOp(async () => {
    const remindersRef = collection(db, REMINDERS_COLLECTION);
    const docRef = await addDoc(remindersRef, {
      ...data,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }, 'generateReminder');
};
