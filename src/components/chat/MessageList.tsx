"use client";

import { useEffect, useRef, useCallback } from "react";
import { format, isToday, isYesterday } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { Message } from "@/types/chat";
import { ConversationType } from "@/types/chat";
import MessageBubble from "./MessageBubble";
import { useMessages, useRealtimeMessages } from "@/hooks/useChat";

interface MessageListProps {
  conversationId: string;
  currentUserId: string;
  conversationType: ConversationType;
}

function dateSeparatorLabel(ts: Timestamp | null): string {
  if (!ts) return "";
  try {
    const d = ts.toDate();
    if (isToday(d)) return "Today";
    if (isYesterday(d)) return "Yesterday";
    return format(d, "MMMM d, yyyy");
  } catch {
    return "";
  }
}

/** Merge paginated history + live messages, deduplicating by id. */
function mergeMessages(history: Message[], live: Message[]): Message[] {
  const seen = new Set<string>();
  const merged: Message[] = [];
  for (const m of [...history, ...live]) {
    if (!seen.has(m.id)) {
      seen.add(m.id);
      merged.push(m);
    }
  }
  return merged;
}

export default function MessageList({
  conversationId,
  currentUserId,
  conversationType,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const topSentinelRef = useRef<HTMLDivElement>(null);
  const isFirstLoad = useRef(true);

  // Paginated history (oldest first after reverse)
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useMessages(conversationId);

  // Real-time listener for new messages
  const liveMessages = useRealtimeMessages(conversationId);
  console.log("🚀 ~ MessageList ~ liveMessages:", liveMessages)

  const historyMessages = data?.pages.flatMap((page) => page.messages) || [];

  const allMessages = mergeMessages(historyMessages, liveMessages) || [];
  console.log("🚀 ~ MessageList ~ allMessages:", { allMessages, historyMessages, liveMessages })

  // Auto-scroll to bottom on first load and new live messages
  useEffect(() => {
    if (isFirstLoad.current && allMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "instant" });
      isFirstLoad.current = false;
    } else if (liveMessages.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [liveMessages.length, allMessages.length]);

  // IntersectionObserver at the top → load more pages
  const handleTopIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [fetchNextPage, hasNextPage, isFetchingNextPage]
  );

  useEffect(() => {
    const sentinel = topSentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(handleTopIntersect, {
      threshold: 0.1,
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleTopIntersect]);

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="h-7 w-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Group messages by date for separator rendering
  const groups: { label: string; messages: Message[] }[] = [];
  let currentLabel = "";
  for (const msg of allMessages) {
    const label = dateSeparatorLabel(msg.createdAt);
    if (label !== currentLabel) {
      groups?.push({ label, messages: [msg] });
      currentLabel = label;
    } else {
      groups[groups.length - 1]?.messages.push(msg);
    }
  }

  const showSender = conversationType !== "direct";

  return (
    <div className="flex-1 overflow-y-auto overscroll-contain py-4 space-y-1">
      {/* Top sentinel — triggers load-more when scrolled into view */}
      <div ref={topSentinelRef} className="h-1" />

      {isFetchingNextPage && (
        <div className="flex justify-center py-2">
          <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {allMessages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center px-8 py-16 gap-3">
          <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center text-2xl">
            💬
          </div>
          <p className="text-sm font-medium text-muted-foreground">
            No messages yet — say hello!
          </p>
        </div>
      )}

      {groups.map((group) => (
        <div key={group.label}>
          {/* Date separator */}
          {group.label && (
            <div className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 h-px bg-border" />
              <span className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground bg-background px-2">
                {group.label}
              </span>
              <div className="flex-1 h-px bg-border" />
            </div>
          )}

          <div className="space-y-1">
            {group.messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isMine={msg.senderId === currentUserId}
                showSender={showSender}
              />
            ))}
          </div>
        </div>
      ))}

      {/* Scroll anchor */}
      <div ref={bottomRef} className="h-1" />
    </div>
  );
}
