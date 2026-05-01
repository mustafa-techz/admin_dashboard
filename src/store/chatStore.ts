import { create } from "zustand";

interface ChatUIState {
  /** The conversation currently displayed in the chat window. */
  activeChatId: string | null;
  /** Mobile: whether the chat window is layered over the sidebar. */
  isMobileChatOpen: boolean;
  /** Controls the new-chat/group creation modal. */
  isNewChatModalOpen: boolean;
  /** Which tab inside the new-chat modal is active. */
  newChatTab: "direct" | "group" | "broadcast";

  // Actions
  setActiveChatId: (id: string | null) => void;
  openMobileChat: (id: string) => void;
  closeMobileChat: () => void;
  openNewChatModal: (tab?: "direct" | "group" | "broadcast") => void;
  closeNewChatModal: () => void;
}

export const useChatStore = create<ChatUIState>((set) => ({
  activeChatId: null,
  isMobileChatOpen: false,
  isNewChatModalOpen: false,
  newChatTab: "direct",

  setActiveChatId: (id) => set({ activeChatId: id }),

  openMobileChat: (id) =>
    set({ activeChatId: id, isMobileChatOpen: true }),

  closeMobileChat: () =>
    set({ isMobileChatOpen: false }),

  openNewChatModal: (tab = "direct") =>
    set({ isNewChatModalOpen: true, newChatTab: tab }),

  closeNewChatModal: () =>
    set({ isNewChatModalOpen: false }),
}));
