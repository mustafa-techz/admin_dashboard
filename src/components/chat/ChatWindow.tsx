"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Users, Radio, MessageCircle } from "lucide-react";
import { useChatStore } from "@/store/chatStore";
import { useAuthStore } from "@/store/authStore";
import { useSendMessage, useMarkAsRead, useUploadChatImage } from "@/hooks/useChat";
import { getConversation } from "@/services/chatService";
import { Conversation } from "@/types/chat";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";

interface ChatWindowProps {
  conversationId: string;
}

function ConvIcon({ type }: { type: string }) {
  if (type === "broadcast") return <Radio size={16} className="text-amber-500" />;
  if (type === "group") return <Users size={16} className="text-violet-500" />;
  return <MessageCircle size={16} className="text-primary" />;
}

export default function ChatWindow({ conversationId }: ChatWindowProps) {
  const { user, role } = useAuthStore();
  const { closeMobileChat } = useChatStore();
  const [conversation, setConversation] = useState<Conversation | null>(null);

  const sendMessageMutation = useSendMessage(user?.id);
  const markAsRead = useMarkAsRead(user?.id);
  const uploadImage = useUploadChatImage();

  // Load conversation metadata once
  useEffect(() => {
    getConversation(conversationId).then(setConversation);
  }, [conversationId]);

  // Mark as read when the window opens
  useEffect(() => {
    if (user?.id && conversationId) {
      markAsRead.mutate({ conversationId });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId, user?.id]);

  // Broadcast: parents are read-only
  const isBroadcast = conversation?.type === "broadcast";
  const isReadOnly = isBroadcast && role === "parent";

  const handleSend = (text: string, imageUrl?: string) => {
    if (!user || !conversation) return;
    sendMessageMutation.mutate({
      conversationId,
      senderId: user.id,
      senderName: user.name,
      text: text || undefined,
      imageUrl,
      participants: conversation.participants,
    });
  };

  const handleUpload = async (file: File): Promise<string> => {
    const result = await uploadImage.mutateAsync({ file, conversationId });
    return result;
  };

  const displayName = conversation?.name ?? "Chat";
  const participantCount = conversation?.participants.length ?? 0;

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-background/95 backdrop-blur shrink-0 shadow-sm">
        {/* Mobile back button */}
        <button
          onClick={closeMobileChat}
          className="md:hidden h-8 w-8 rounded-full flex items-center justify-center hover:bg-secondary transition-colors"
        >
          <ArrowLeft size={20} />
        </button>

        {/* Avatar */}
        <div
          className={`h-9 w-9 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ${
            conversation?.type === "broadcast"
              ? "bg-amber-500"
              : conversation?.type === "group"
              ? "bg-violet-500"
              : "bg-primary"
          }`}
        >
          {displayName.charAt(0).toUpperCase()}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            {conversation && <ConvIcon type={conversation.type} />}
            <h2 className="text-sm font-semibold truncate">{displayName}</h2>
          </div>
          {conversation?.type !== "direct" && (
            <p className="text-xs text-muted-foreground">
              {participantCount} participant{participantCount !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      {user && conversation && (
        <MessageList
          conversationId={conversationId}
          currentUserId={user.id}
          conversationType={conversation.type}
        />
      )}

      {/* Input */}
      <MessageInput
        onSend={handleSend}
        onUploadImage={handleUpload}
        disabled={isReadOnly}
        disabledReason={
          isReadOnly
            ? "This is a broadcast channel — only teachers can send messages."
            : undefined
        }
        isSending={sendMessageMutation.isPending}
      />
    </div>
  );
}
