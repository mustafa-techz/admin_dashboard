"use client";

import { Message } from "@/types/chat";
import { format } from "date-fns";
import { Timestamp } from "firebase/firestore";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";

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
  const { user } = useAuthStore();

  // 1. Handle system messages
  if (message.senderId === "system" && message.text) {

    // ── Fee reminder system message ──────────────────────────────────────────
    if (message.subtype === "fee_reminder") {
      const meta = message.metadata;
      const isOverdue = meta?.reminderType?.startsWith("overdue") ?? false;
      const isDueToday = meta?.reminderType === "due_today";

      return (
        <div className="flex justify-center my-3 px-4">
          <div
            className={cn(
              "w-full max-w-sm rounded-2xl border shadow-sm p-4 space-y-2",
              isOverdue
                ? "bg-red-50 border-red-200"
                : isDueToday
                ? "bg-amber-50 border-amber-200"
                : "bg-blue-50 border-blue-200"
            )}
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">
                {isOverdue ? "⚠️" : isDueToday ? "🔔" : "📅"}
              </span>
              <span
                className={cn(
                  "text-[10px] font-black uppercase tracking-widest",
                  isOverdue
                    ? "text-red-600"
                    : isDueToday
                    ? "text-amber-600"
                    : "text-blue-600"
                )}
              >
                {isOverdue ? "Fee Overdue" : isDueToday ? "Due Today" : "Fee Reminder"}
              </span>
            </div>
            <p className="text-xs font-medium text-foreground leading-relaxed">
              {message.text}
            </p>
            {meta && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {meta.amount > 0 && (
                  <span
                    className={cn(
                      "px-2 py-0.5 rounded-full text-[10px] font-black",
                      isOverdue
                        ? "bg-red-100 text-red-700"
                        : isDueToday
                        ? "bg-amber-100 text-amber-700"
                        : "bg-blue-100 text-blue-700"
                    )}
                  >
                    {`₹${meta.amount.toLocaleString("en-IN")}`}
                  </span>
                )}
                {meta.installmentName && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary text-secondary-foreground">
                    {meta.installmentName}
                  </span>
                )}
              </div>
            )}
            <p className="text-[9px] text-muted-foreground text-right">{timeLabel}</p>
          </div>
        </div>
      );
    }

    // ── Generic system message (add members, etc.) ───────────────────────────
    let displayText = message.text;

    if (message.text.startsWith("system_add:")) {
      const parts = message.text.split(":");
      if (parts.length >= 4) {
        const adderUid = parts[1];
        const adderName = parts[2];
        const addedNames = parts.slice(3).join(":");
        if (adderUid === user?.id) {
          displayText = `You added ${addedNames}`;
        } else {
          displayText = `${adderName} added ${addedNames}`;
        }
      }
    }

    return (
      <div className="flex justify-center my-4">
        <span className="bg-secondary/60 text-secondary-foreground px-3 py-1.5 rounded-xl text-xs font-medium shadow-sm">
          {displayText}
        </span>
      </div>
    );
  }


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
