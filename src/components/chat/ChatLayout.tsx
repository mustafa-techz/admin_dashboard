"use client";

import { useCallback } from "react";
import { MessageSquareDashed } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useVisualViewport } from "@/hooks/useVisualViewport";
import ChatSidebar from "./ChatSidebar";
import ChatWindow from "./ChatWindow";
import dynamic from 'next/dynamic';
const NewChatModal = dynamic(() => import('./NewChatModal'), { ssr: false });
import { cn } from "@/lib/utils";

export default function ChatLayout() {
  const activeChatId = useChatStore(state => state.activeChatId);
  const isMobileChatOpen = useChatStore(state => state.isMobileChatOpen);
  const setActiveChatId = useChatStore(state => state.setActiveChatId);
  const openMobileChat = useChatStore(state => state.openMobileChat);

  const { height, offsetTop, isKeyboardOpen } = useVisualViewport();

  const handleSelectChat = useCallback(
    (chatId: string) => {
      setActiveChatId(chatId);
      openMobileChat(chatId);
    },
    [setActiveChatId, openMobileChat]
  );

  const handleCreated = useCallback(
    (conversationId: string) => {
      handleSelectChat(conversationId);
    },
    [handleSelectChat]
  );

  return (
    <div
      style={
        typeof window !== "undefined" && window.innerWidth < 768
          ? {
              position: "fixed",
              top: isKeyboardOpen ? `${offsetTop}px` : "4rem",
              left: 0,
              right: 0,
              height: isKeyboardOpen
                ? `${height}px`
                : `calc(${height}px - 8rem - env(safe-area-inset-bottom, 0px))`,
              zIndex: 40,
            }
          : {}
      }
      className="flex h-full overflow-hidden md:rounded-xl md:border md:border-border md:shadow-soft bg-background"
    >
      {/* ── Sidebar ──────────────────────────────────────────────────────── */}
      {/* Desktop: always visible | Mobile: hidden when chat is open */}
      <div
        className={cn(
          "w-full md:w-80 lg:w-96 flex-shrink-0 flex flex-col",
          "md:flex", // always shown on md+
          isMobileChatOpen ? "hidden" : "flex" // mobile toggle
        )}
      >
        <ChatSidebar
          onSelectChat={handleSelectChat}
          activeChatId={activeChatId}
        />
      </div>

      {/* ── Vertical divider (desktop only) ──────────────────────────────── */}
      <div className="hidden md:block w-px bg-border flex-shrink-0" />

      {/* ── Main chat area ───────────────────────────────────────────────── */}
      <div
        className={cn(
          "flex-1 flex flex-col min-w-0",
          // Mobile: show only when a chat is selected
          isMobileChatOpen ? "flex" : "hidden md:flex"
        )}
      >
        {activeChatId ? (
          <ChatWindow conversationId={activeChatId} />
        ) : (
          // Empty state — desktop only
          <div className="flex-1 hidden md:flex flex-col items-center justify-center text-center gap-4 text-muted-foreground p-8">
            <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center">
              <MessageSquareDashed size={40} className="text-primary/60" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-foreground mb-1">
                Select a conversation
              </h2>
              <p className="text-sm">
                Choose a chat from the sidebar or start a new one.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── New chat modal ────────────────────────────────────────────────── */}
      <NewChatModal onCreated={handleCreated} />
    </div>
  );
}
