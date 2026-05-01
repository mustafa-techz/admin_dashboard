import { create } from "zustand";
import { UserChat } from "@/types/chat";

interface ChatUIState {
  /** The conversation currently displayed in the chat window. */
  activeChatId: string | null;
  /** Real-time conversation summaries for the signed-in user. */
  chats: UserChat[];
  /** True after the first real-time chat-list snapshot for this auth session. */
  hasHydratedChatList: boolean;
  /** Aggregated unread messages across all conversations. */
  totalUnreadCount: number;
  /** Mobile: whether the chat window is layered over the sidebar. */
  isMobileChatOpen: boolean;
  /** Controls the new-chat/group creation modal. */
  isNewChatModalOpen: boolean;
  /** Which tab inside the new-chat modal is active. */
  newChatTab: "direct" | "group" | "broadcast";

  // Actions
  setActiveChatId: (id: string | null) => void;
  setChats: (chats: UserChat[]) => void;
  resetChats: () => void;
  openMobileChat: (id: string) => void;
  closeMobileChat: () => void;
  openNewChatModal: (tab?: "direct" | "group" | "broadcast") => void;
  closeNewChatModal: () => void;
}

export const useChatStore = create<ChatUIState>((set) => ({
  activeChatId: null,
  chats: [],
  hasHydratedChatList: false,
  totalUnreadCount: 0,
  isMobileChatOpen: false,
  isNewChatModalOpen: false,
  newChatTab: "direct",

  setActiveChatId: (id) => set({ activeChatId: id }),

  setChats: (chats) =>
    set({
      chats,
      hasHydratedChatList: true,
      totalUnreadCount: chats.reduce(
        (total, chat) => total + (chat.unreadCount ?? 0),
        0
      ),
    }),

  resetChats: () =>
    set({
      chats: [],
      hasHydratedChatList: false,
      totalUnreadCount: 0,
    }),

  openMobileChat: (id) =>
    set({ activeChatId: id, isMobileChatOpen: true }),

  closeMobileChat: () =>
    set({ isMobileChatOpen: false }),

  openNewChatModal: (tab = "direct") =>
    set({ isNewChatModalOpen: true, newChatTab: tab }),

  closeNewChatModal: () =>
    set({ isNewChatModalOpen: false }),
}));
