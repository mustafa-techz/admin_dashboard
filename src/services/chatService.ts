/**
 * chatService.ts
 *
 * Pure Firestore service layer for the chat system.
 * No React dependencies — can be called from hooks, API routes, or Cloud Functions.
 *
 * Cost-optimisation rules enforced here:
 *  - Chat list is always a one-time getDocs (no listener).
 *  - Listeners are created only for the active conversation (subscribeToMessages).
 *  - Messages are paginated (limit 20 per page).
 *  - Data is denormalised: lastMessage is written to both conversations + userChats.
 */

import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  startAfter,
  where,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  writeBatch,
  DocumentData,
  QueryDocumentSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db } from "@/firebase/firestore";
import { storage } from "@/firebase/storage";
import {
  Conversation,
  Message,
  UserChat,
  SendMessageInput,
  CreateGroupInput,
  CreateDirectChatInput,
  MessageFanoutPayload,
} from "@/types/chat";

// ─── Collection helpers ───────────────────────────────────────────────────────

const conversationsRef = () => collection(db, "conversations");
const messagesRef = (conversationId: string) =>
  collection(db, "conversations", conversationId, "messages");
const userChatsRef = (userId: string) =>
  collection(db, "userChats", userId, "conversations");
const userChatDocRef = (userId: string, conversationId: string) =>
  doc(db, "userChats", userId, "conversations", conversationId);

// ─── Chat list ────────────────────────────────────────────────────────────────

/**
 * Fetch the user's conversation list (one-time, no listener).
 * Reads from userChats/{uid}/conversations sorted by lastMessageAt desc.
 */
export const getChatList = async (userId: string): Promise<UserChat[]> => {
  const q = query(
    userChatsRef(userId),
    orderBy("lastMessageAt", "desc"),
    limit(50)
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as UserChat));
};

// ─── Direct conversation ──────────────────────────────────────────────────────

/**
 * Returns an existing direct conversation between two users, or creates one.
 * The document ID is deterministic: sorted uid pair joined with "_".
 */
export const getOrCreateDirectConversation = async (
  input: CreateDirectChatInput
): Promise<string> => {
  const { userAId, userAName, userBId, userBName } = input;

  // Deterministic ID so two users always share the same conversation doc.
  const conversationId = [userAId, userBId].sort().join("_");
  const convDocRef = doc(db, "conversations", conversationId);
  const convSnap = await getDoc(convDocRef);

  if (convSnap.exists()) {
    return conversationId;
  }

  // Create the conversation + seed userChats for both users in a batch.
  const batch = writeBatch(db);

  batch.set(convDocRef, {
    type: "direct",
    participants: [userAId, userBId],
    admins: [],
    lastMessage: "",
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    createdBy: userAId,
  });

  // Seed userChats for user A (showing user B's name)
  batch.set(userChatDocRef(userAId, conversationId), {
    name: userBName,
    type: "direct",
    lastMessage: "",
    lastMessageAt: null,
    unreadCount: 0,
    lastSeenAt: null,
    avatarLetter: userBName.charAt(0).toUpperCase(),
  });

  // Seed userChats for user B (showing user A's name)
  batch.set(userChatDocRef(userBId, conversationId), {
    name: userAName,
    type: "direct",
    lastMessage: "",
    lastMessageAt: null,
    unreadCount: 0,
    lastSeenAt: null,
    avatarLetter: userAName.charAt(0).toUpperCase(),
  });

  await batch.commit();
  return conversationId;
};

// ─── Group / Broadcast conversation ──────────────────────────────────────────

export const createGroupConversation = async (
  input: CreateGroupInput
): Promise<string> => {
  const { name, type, participantIds, adminIds, createdBy, createdByName } = input;

  const convDocRef = await addDoc(conversationsRef(), {
    type,
    name,
    participants: participantIds,
    admins: adminIds,
    lastMessage: "",
    lastMessageAt: null,
    createdAt: serverTimestamp(),
    createdBy,
  });

  const conversationId = convDocRef.id;
  const batch = writeBatch(db);
  const avatarLetter = name.charAt(0).toUpperCase();

  participantIds.forEach((uid) => {
    batch.set(userChatDocRef(uid, conversationId), {
      name,
      type,
      lastMessage: `${createdByName} created the group`,
      lastMessageAt: serverTimestamp(),
      unreadCount: uid === createdBy ? 0 : 1,
      lastSeenAt: null,
      avatarLetter,
    });
  });

  await batch.commit();
  return conversationId;
};

// ─── Messages ─────────────────────────────────────────────────────────────────

const MESSAGES_PAGE_SIZE = 20;

/** Paginated message fetch (oldest → newest within each page). */
export const loadMessages = async (
  conversationId: string,
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null
): Promise<{
  messages: Message[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}> => {
  let q = query(
    messagesRef(conversationId),
    orderBy("createdAt", "desc"),
    // limit(MESSAGES_PAGE_SIZE)
  );

  if (lastDoc) {
    q = query(
      messagesRef(conversationId),
      orderBy("createdAt", "desc"),
      startAfter(lastDoc),
      // limit(MESSAGES_PAGE_SIZE)
    );
  }

  const snap = await getDocs(q);
  const messages = snap.docs
    .map((d) => ({ id: d.id, ...d.data() } as Message))
    .reverse(); // chronological order for rendering

  return {
    messages,
    lastDoc: snap.docs.length > 0 ? snap.docs[snap.docs.length - 1] : null,
  };
};

/**
 * Real-time listener for new messages — subscribe ONLY when the chat window is open.
 * Returns an unsubscribe function.
 */
export const subscribeToMessages = (
  conversationId: string,
  onMessages: (messages: Message[]) => void
): (() => void) => {
  // Listen only to the last 20 messages to keep read costs low.
  const q = query(
    messagesRef(conversationId),
    orderBy("createdAt", "asc"),
    limit(MESSAGES_PAGE_SIZE)
  );

  return onSnapshot(q, (snap) => {
    const messages = snap.docs.map((d) => ({
      id: d.id,
      ...d.data(),
    })) as Message[];
    onMessages(messages);
  });
};

/**
 * Write a message to Firestore, then POST to the Next.js fan-out API route.
 * The API route updates lastMessage, increments unreadCount for all recipients,
 * and sends FCM push notifications.
 */
export const sendMessage = async (input: SendMessageInput): Promise<string> => {
  const { conversationId, senderId, senderName, text, imageUrl, participants } =
    input;

  const msgRef = await addDoc(messagesRef(conversationId), {
    senderId,
    senderName,
    ...(text ? { text } : {}),
    ...(imageUrl ? { imageUrl } : {}),
    createdAt: serverTimestamp(),
  });

  // Trigger fan-out via Next.js API route (updates userChats + sends FCM).
  const payload: MessageFanoutPayload = {
    conversationId,
    messageId: msgRef.id,
    senderId,
    senderName,
    text: text ?? (imageUrl ? "📷 Image" : ""),
    participants,
  };

  // Fire-and-forget: don't block the UI on the fan-out
  fetch("/api/chat/message", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  }).catch((err) => console.error("Fan-out request failed:", err));

  return msgRef.id;
};

// ─── Mark as read ─────────────────────────────────────────────────────────────

export const markAsRead = async (
  userId: string,
  conversationId: string
): Promise<void> => {
  await updateDoc(userChatDocRef(userId, conversationId), {
    unreadCount: 0,
    lastSeenAt: serverTimestamp(),
  });
};

// ─── Image upload ─────────────────────────────────────────────────────────────

export const uploadChatImage = async (
  file: File,
  conversationId: string
): Promise<string> => {
  const uniqueName = `${Date.now()}_${file.name}`;
  const storageRef = ref(storage, `chat-images/${conversationId}/${uniqueName}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};

// ─── User search (for new-chat modal) ────────────────────────────────────────

export interface ChatUser {
  uid: string;
  name: string;
  email: string;
  role: string;
}

export const searchUsers = async (
  searchQuery: string,
  excludeUid: string
): Promise<ChatUser[]> => {
  if (!searchQuery.trim()) return [];

  // Firestore doesn't support full-text search; we fetch by name prefix.
  const q = query(
    collection(db, "users"),
    where("name", ">=", searchQuery),
    where("name", "<=", searchQuery + "\uf8ff"),
    limit(20)
  );

  const snap = await getDocs(q);
  console.log('snapsnap', { snap, q });

  return snap.docs
    .map((d) => ({ uid: d.id, ...d.data() } as ChatUser))
    .filter((u) => u.uid !== excludeUid);
};

// ─── Get conversation metadata ────────────────────────────────────────────────

export const getConversation = async (
  conversationId: string
): Promise<Conversation | null> => {
  const snap = await getDoc(doc(conversationsRef(), conversationId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Conversation;
};
