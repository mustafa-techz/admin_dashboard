"use client";

import { useState, useRef } from "react";
import { Search, Users, Radio, MessageCircle, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import { useChatList } from "@/hooks/useChat";
import ChatListItem from "./ChatListItem";

interface ChatSidebarProps {
  onSelectChat: (chatId: string) => void;
  activeChatId: string | null;
}

export default function ChatSidebar({ onSelectChat, activeChatId }: ChatSidebarProps) {
  const { user, role } = useAuthStore();
  const { openNewChatModal } = useChatStore();
  const [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);

  const { data: chats = [], isLoading, isError } = useChatList(user?.id);

  const canCreate = role === "admin" || role === "teacher" || role === "sub-admin";

  const filtered = chats.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.lastMessage.toLowerCase().includes(search.toLowerCase())
  );

  const totalUnread = chats.reduce((sum, c) => sum + (c.unreadCount ?? 0), 0);

  return (
    <div className="flex flex-col h-full border-r border-border bg-card">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border shrink-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight">Messages</h1>
            {totalUnread > 0 && (
              <span className="h-5 min-w-5 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {totalUnread > 99 ? "99+" : totalUnread}
              </span>
            )}
          </div>

          {/* New chat button — teachers / admins only */}
          {canCreate && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => openNewChatModal("direct")}
                title="New direct message"
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <MessageCircle size={17} />
              </button>
              <button
                onClick={() => openNewChatModal("group")}
                title="New group"
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              >
                <Users size={17} />
              </button>
              <button
                onClick={() => openNewChatModal("broadcast")}
                title="New broadcast"
                className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
              >
                <Radio size={17} />
              </button>
            </div>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
          />
          <input
            ref={searchRef}
            type="text"
            placeholder="Search messages…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-8 pr-8 rounded-xl border border-border bg-background text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {/* Chat list */}
      <div className="flex-1 overflow-y-auto overscroll-contain">
        {isLoading && (
          <div className="flex flex-col gap-2 p-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center gap-3 animate-pulse">
                <div className="h-11 w-11 rounded-full bg-secondary flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-secondary rounded-full w-1/2" />
                  <div className="h-2.5 bg-secondary rounded-full w-3/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center gap-2 p-8 text-center text-muted-foreground">
            <p className="text-sm font-medium">Failed to load conversations.</p>
            <p className="text-xs">Check your connection and try again.</p>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="flex flex-col items-center gap-3 p-8 text-center">
            <div className="h-12 w-12 rounded-full bg-secondary flex items-center justify-center text-xl">
              {search ? "🔍" : "💬"}
            </div>
            <p className="text-sm font-medium text-muted-foreground">
              {search ? "No conversations match your search." : "No conversations yet."}
            </p>
            {!search && canCreate && (
              <button
                onClick={() => openNewChatModal("direct")}
                className="text-xs text-primary font-semibold hover:underline"
              >
                Start a new message →
              </button>
            )}
          </div>
        )}

        {filtered.map((chat) => (
          <ChatListItem
            key={chat.id}
            chat={chat}
            isActive={chat.id === activeChatId}
            onClick={() => onSelectChat(chat.id)}
          />
        ))}
      </div>
    </div>
  );
}
