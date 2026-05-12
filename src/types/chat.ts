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
export interface FeeReminderMetadata {
  feeStructureId: string;
  feeInstallmentId: string;
  studentFeeInstallmentId: string;
  installmentName: string;
  amount: number;
  dueDate: string;
  branchId: string;
  studentId: string;
  studentName: string;
  /** Reminder type key — used for dedup and UI theming */
  reminderType:
    | "due_today"
    | "due_in_1d"
    | "due_in_2d"
    | "due_in_3d"
    | "due_in_4d"
    | "due_in_5d"
    | "overdue_day1"
    | "overdue_day2"
    | "overdue_day3"
    | string;
}

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
  /** System message type — only present on automated system messages */
  messageType?: "system";
  /** Subtype for system messages */
  subtype?: "fee_reminder" | string;
  /** Structured metadata for fee reminder messages */
  metadata?: FeeReminderMetadata;
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
  /** Denormalized role label for chat list display, e.g. "10-A Class Teacher" or "10A-023" */
  roleLabel?: string;
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
  /** Role label for user A (shown to user B), e.g. "10-A Class Teacher" */
  userARoleLabel?: string;
  /** Role label for user B (shown to user A), e.g. "10A-023" */
  userBRoleLabel?: string;
}

export interface AddMembersInput {
  conversationId: string;
  newParticipants: { uid: string; name: string }[];
  addedBy: string;
  addedByName: string;
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
  imageUrl?: string;
  participants: string[];
  conversationType?: ConversationType;
  conversationName?: string;
}
