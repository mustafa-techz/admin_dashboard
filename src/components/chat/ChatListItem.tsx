"use client";

import { UserChat } from "@/types/chat";
import { formatDistanceToNowStrict } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

interface ChatListItemProps {
  chat: UserChat;
  isActive: boolean;
  onClick: () => void;
}

function formatTimestamp(ts: Timestamp | null): string {
  if (!ts) return "";
  try {
    return formatDistanceToNowStrict(ts.toDate(), { addSuffix: false });
  } catch {
    return "";
  }
}

export default function ChatListItem({
  chat,
  isActive,
  onClick,
}: ChatListItemProps) {
  const user = useAuthStore(state => state.user);
  const hasUnread = chat.unreadCount > 0;
  const timeLabel = formatTimestamp(chat.lastMessageAt);

  let displayMessage = chat.lastMessage || "No messages yet";
  if (displayMessage.startsWith("system_add:")) {
    const parts = displayMessage.split(":");
    if (parts.length >= 4) {
      const adderUid = parts[1];
      const adderName = parts[2];
      const addedNames = parts.slice(3).join(":");
      if (adderUid === user?.id) {
        displayMessage = `You added ${addedNames}`;
      } else {
        displayMessage = `${adderName} added ${addedNames}`;
      }
    }
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-150 hover:bg-accent/60 active:scale-[0.99] relative",
        isActive && "bg-primary/10 border-l-2 border-primary"
      )}
    >
      {/* Avatar */}
      <div
        className={cn(
          "h-11 w-11 rounded-full flex-shrink-0 flex items-center justify-center text-base font-bold text-white shadow-sm",
          chat.type === "broadcast"
            ? "bg-amber-500"
            : chat.type === "group"
            ? "bg-violet-500"
            : "bg-primary"
        )}
      >
        {chat.avatarLetter}
      </div>

      {/* Text content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              "text-sm font-semibold truncate",
              isActive ? "text-primary" : "text-foreground"
            )}
          >
            {chat.name}
            {chat.type === "direct" && chat.roleLabel && (
              <span className="text-[11px] font-normal text-muted-foreground ml-1">
                ({chat.roleLabel})
              </span>
            )}
          </span>
          {timeLabel && (
            <span
              className={cn(
                "text-[10px] flex-shrink-0 tabular-nums",
                hasUnread ? "text-primary font-semibold" : "text-muted-foreground"
              )}
            >
              {timeLabel}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              "text-xs truncate",
              hasUnread ? "text-foreground font-medium" : "text-muted-foreground"
            )}
          >
            {displayMessage}
          </p>

          {hasUnread && (
            <span className="flex-shrink-0 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
              {chat.unreadCount > 99 ? "99+" : chat.unreadCount}
            </span>
          )}
        </div>

        {/* Type badge for non-direct */}
        {chat.type !== "direct" && (
          <span
            className={cn(
              "inline-block mt-0.5 text-[9px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded-full",
              chat.type === "broadcast"
                ? "bg-amber-100 text-amber-700"
                : "bg-violet-100 text-violet-700"
            )}
          >
            {chat.type}
          </span>
        )}
      </div>
    </button>
  );
}
