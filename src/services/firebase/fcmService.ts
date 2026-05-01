/**
 * fcmService.ts
 *
 * Client-side Firebase Cloud Messaging helpers.
 *
 * FCM token flow:
 *  1. Request notification permission from the browser.
 *  2. Get the FCM registration token (requires NEXT_PUBLIC_FIREBASE_VAPID_KEY).
 *  3. Store the token in users/{uid}.fcmToken so the server can target it.
 *
 * Topic subscription (group_{conversationId}, "parents") must happen via
 * the Admin SDK server-side; we expose a stub here for documentation clarity.
 */

import { getMessaging, getToken, onMessage, Messaging } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { app } from "@/firebase/firebaseConfig";
import { db } from "@/firebase/firestore";

let messagingInstance: Messaging | null = null;

/** Lazily initialise messaging — only available in the browser. */
const getMessagingInstance = (): Messaging | null => {
  if (typeof window === "undefined") return null;
  if (!messagingInstance) {
    try {
      messagingInstance = getMessaging(app);
    } catch (e) {
      console.error("FCM not available:", e);
      return null;
    }
  }
  return messagingInstance;
};

/**
 * Request notification permission, retrieve the FCM token, and persist it to
 * the user document so Cloud Functions / API routes can send targeted pushes.
 *
 * Call this once after the user logs in (e.g., inside AuthProvider or the
 * chat page on first mount).
 *
 * @returns The FCM token string, or null if permission was denied.
 */
export const requestFCMPermission = async (
  userId: string
): Promise<string | null> => {
  const messaging = getMessagingInstance();
  if (!messaging) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("FCM: Notification permission denied.");
    return null;
  }

  const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
  if (!vapidKey) {
    console.warn("FCM: NEXT_PUBLIC_FIREBASE_VAPID_KEY is not set.");
    return null;
  }

  try {
    const token = await getToken(messaging, { vapidKey });
    if (token) {
      // Persist token so the server can send pushes to this device.
      await updateDoc(doc(db, "users", userId), { fcmToken: token });
    }
    return token;
  } catch (e) {
    console.error("FCM: Failed to get token:", e);
    return null;
  }
};

/**
 * Listen for foreground FCM messages (app is open in the tab).
 * Returns an unsubscribe function.
 */
export const onForegroundMessage = (
  onReceive: (payload: { title?: string; body?: string; conversationId?: string }) => void
): (() => void) => {
  const messaging = getMessagingInstance();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    onReceive({
      title: payload.notification?.title,
      body: payload.notification?.body,
      conversationId: payload.data?.conversationId,
    });
  });
};

/**
 * Topic subscription stubs — actual subscriptions must be done server-side
 * via Admin SDK because the client SDK does not support topic management.
 *
 * Document these for the Cloud Function implementation:
 *   - Groups: topic = `group_${conversationId}`
 *   - Broadcast / Parents: topic = `parents`
 */
export const FCM_TOPIC_PREFIXES = {
  GROUP: "group_",
  PARENTS: "parents",
} as const;
