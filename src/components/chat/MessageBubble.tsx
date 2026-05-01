"use client";

import { Message } from "@/types/chat";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  message: Message;
  isMine: boolean;
  showSender: boolean; // true in group/broadcast conversations
}

function formatTime(ts: Timestamp | null): string {
  if (!ts) return "";
  try {
    return format(ts.toDate(), "HH:mm");
  } catch {
    return "";
  }
}

export default function MessageBubble({
  message,
  isMine,
  showSender,
}: MessageBubbleProps) {
  const timeLabel = formatTime(message.createdAt);
  const isOptimistic = message.id.startsWith("optimistic_");

  return (
    <div
      className={cn(
        "flex items-end gap-2 px-4 group",
        isMine ? "flex-row-reverse" : "flex-row"
      )}
    >
      {/* Avatar — shown for others only */}
      {!isMine && (
        <div className="h-7 w-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center text-xs font-bold text-muted-foreground mb-1">
          {message.senderName?.charAt(0).toUpperCase() ?? "?"}
        </div>
      )}

      <div
        className={cn(
          "max-w-[72%] md:max-w-[58%] flex flex-col gap-0.5",
          isMine ? "items-end" : "items-start"
        )}
      >
        {/* Sender name — groups only */}
        {showSender && !isMine && (
          <span className="text-[10px] font-semibold text-primary px-1">
            {message.senderName}
          </span>
        )}

        {/* Bubble */}
        <div
          className={cn(
            "relative px-3 py-2 rounded-2xl shadow-sm transition-opacity duration-300",
            isMine
              ? "bg-primary text-primary-foreground rounded-br-sm"
              : "bg-card border border-border text-foreground rounded-bl-sm",
            isOptimistic && "opacity-70"
          )}
        >
          {/* Image attachment */}
          {message.imageUrl && (
            <a href={message.imageUrl} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={message.imageUrl}
                alt="Attachment"
                className="rounded-xl max-w-full max-h-52 object-cover mb-1 hover:opacity-90 transition-opacity cursor-zoom-in"
              />
            </a>
          )}

          {/* Text */}
          {message.text && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.text}
            </p>
          )}

          {/* Timestamp */}
          <span
            className={cn(
              "text-[9px] mt-0.5 select-none float-right ml-2 leading-none tabular-nums",
              isMine ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {message.status === "sending" || message.hasPendingWrites
              ? "sending…"
              : message.status === "error"
              ? "failed"
              : timeLabel}
          </span>
        </div>
      </div>
    </div>
  );
}
