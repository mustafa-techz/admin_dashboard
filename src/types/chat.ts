import { Timestamp } from "firebase/firestore";

// ─────────────────────────────────────────────────────────────────────────────
// Primitive aliases
// ─────────────────────────────────────────────────────────────────────────────
export type ConversationType = "direct" | "group" | "broadcast";

// ─────────────────────────────────────────────────────────────────────────────
// conversations/{conversationId}
// ─────────────────────────────────────────────────────────────────────────────
export interface Conversation {
  id: string;
  type: ConversationType;
  /** Display name — required for group/broadcast, optional for direct */
  name?: string;
  /** UIDs of every participant (used for security-rule checks) */
  participants: string[];
  /** UIDs that can modify group settings or kick members */
  admins: string[];
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  createdAt: Timestamp | null;
  createdBy: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// conversations/{conversationId}/messages/{messageId}
// ─────────────────────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  senderId: string;
  /** Display name of the sender, denormalized to avoid extra reads */
  senderName: string;
  text?: string;
  imageUrl?: string;
  createdAt: Timestamp | null;
  /** Client-side generated ID for deduplication during optimistic updates */
  tempId?: string;
  /** Status for UI feedback */
  status?: "sending" | "sent" | "error";
  /** Whether the message is local-only (Firestore metadata) */
  hasPendingWrites?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// userChats/{userId}/conversations/{conversationId}
// ─────────────────────────────────────────────────────────────────────────────
export interface UserChat {
  id: string;
  /** Mirrors Conversation.name; for direct chats it is the other user's name */
  name: string;
  type: ConversationType;
  lastMessage: string;
  lastMessageAt: Timestamp | null;
  unreadCount: number;
  lastSeenAt: Timestamp | null;
  /** Avatar letter or image — first letter of name, pre-computed */
  avatarLetter: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Input shapes used by the service layer
// ─────────────────────────────────────────────────────────────────────────────
export interface SendMessageInput {
  conversationId: string;
  senderId: string;
  senderName: string;
  text?: string;
  imageUrl?: string;
  participants: string[];
  conversationType?: ConversationType;
  conversationName?: string;
  tempId: string;
}

export interface CreateGroupInput {
  name: string;
  type: Extract<ConversationType, "group" | "broadcast">;
  participantIds: string[];
  adminIds: string[];
  createdBy: string;
  createdByName: string;
}

export interface CreateDirectChatInput {
  userAId: string;
  userAName: string;
  userBId: string;
  userBName: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fan-out payload sent to the Next.js API route after a message is written
// ─────────────────────────────────────────────────────────────────────────────
export interface MessageFanoutPayload {
  conversationId: string;
  messageId: string;
  senderId: string;
  senderName: string;
  text: string;
  participants: string[];
  conversationType?: ConversationType;
  conversationName?: string;
}
