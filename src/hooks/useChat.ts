/**
 * useChat.ts
 *
 * TanStack Query hooks for the chat system.
 *
 * Architectural split:
 *  - useChatList          → useQuery (one-time getDocs, no listener)
 *  - useMessages          → useInfiniteQuery (paginated history)
 *  - useRealtimeMessages  → custom hook with useEffect + onSnapshot (active chat only)
 *  - useSendMessage       → useMutation (with optimistic update)
 *  - useMarkAsRead        → useMutation
 *  - useCreateDirectChat  → useMutation
 *  - useCreateGroup       → useMutation
 */

"use client";

import {
  useQuery,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
  InfiniteData,
} from "@tanstack/react-query";
import { useEffect, useState, useRef } from "react";
import {
  getChatList,
  getOrCreateDirectConversation,
  createGroupConversation,
  loadMessages,
  sendMessage,
  markAsRead,
  uploadChatImage,
  subscribeToMessages,
} from "@/services/chatService";
import {
  UserChat,
  Message,
  SendMessageInput,
  CreateDirectChatInput,
  CreateGroupInput,
} from "@/types/chat";
import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const chatKeys = {
  list: (userId: string) => ["chatList", userId] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
};

// ─── Chat list ────────────────────────────────────────────────────────────────

/**
 * Fetch the user's chat list once (no real-time listener).
 * Invalidated automatically after a message is sent.
 */
export const useChatList = (userId: string | undefined) => {
  return useQuery({
    queryKey: chatKeys.list(userId ?? ""),
    queryFn: () => getChatList(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000, // 30 seconds — prevents redundant refetches
  });
};

// ─── Paginated message history ────────────────────────────────────────────────

interface MessagePage {
  messages: Message[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

export const useMessages = (conversationId: string | null) => {
  return useInfiniteQuery<MessagePage, Error, InfiniteData<MessagePage>, ReturnType<typeof chatKeys.messages>, QueryDocumentSnapshot<DocumentData> | null>({
    queryKey: chatKeys.messages(conversationId ?? ""),
    queryFn: ({ pageParam }) =>
      loadMessages(conversationId!, pageParam ?? null),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.lastDoc ?? undefined,
    enabled: Boolean(conversationId),
    staleTime: Infinity, // Don't refetch — real-time listener handles updates
  });
};

// ─── Real-time listener (active chat only) ────────────────────────────────────

/**
 * Subscribes to new messages via onSnapshot ONLY when conversationId is set.
 * Returns the live message list (latest 20). The parent component merges this
 * with the paginated history from useMessages.
 */
export const useRealtimeMessages = (conversationId: string | null) => {
  const [liveMessages, setLiveMessages] = useState<Message[]>([]);
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    // Tear down any existing subscription
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!conversationId) {
      setLiveMessages([]);
      return;
    }

    unsubRef.current = subscribeToMessages(conversationId, setLiveMessages);

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [conversationId]);

  return liveMessages;
};

// ─── Send message ─────────────────────────────────────────────────────────────

export const useSendMessage = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => sendMessage(input),

    // Optimistic update: insert the message locally before server confirms
    onMutate: async (input) => {
      const key = chatKeys.messages(input.conversationId);
      await queryClient.cancelQueries({ queryKey: key });

      const optimisticMessage: Message = {
        id: `optimistic_${Date.now()}`,
        senderId: input.senderId,
        senderName: input.senderName,
        text: input.text,
        imageUrl: input.imageUrl,
        createdAt: null, // will be filled by server
      };

      queryClient.setQueryData<InfiniteData<MessagePage>>(key, (old) => {
        if (!old) return old;
        const pages = [...old.pages];
        const lastPage = { ...pages[pages.length - 1] };
        lastPage.messages = [...lastPage.messages, optimisticMessage];
        pages[pages.length - 1] = lastPage;
        return { ...old, pages };
      });

      return { optimisticMessage };
    },

    onSuccess: (_data, input) => {
      // Invalidate the chat list so lastMessage preview refreshes
      if (userId) {
        queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
      }
    },

    onError: (_err, input, context) => {
      // Roll back optimistic update
      if (context?.optimisticMessage) {
        const key = chatKeys.messages(input.conversationId);
        queryClient.setQueryData<InfiniteData<MessagePage>>(key, (old) => {
          if (!old) return old;
          const pages = old.pages.map((page) => ({
            ...page,
            messages: page.messages.filter(
              (m) => m.id !== context.optimisticMessage.id
            ),
          }));
          return { ...old, pages };
        });
      }
    },
  });
};

// ─── Mark as read ─────────────────────────────────────────────────────────────

export const useMarkAsRead = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ conversationId }: { conversationId: string }) =>
      markAsRead(userId!, conversationId),

    // Optimistically zero out the badge in the sidebar
    onMutate: async ({ conversationId }) => {
      if (!userId) return;
      const key = chatKeys.list(userId);
      queryClient.setQueryData<UserChat[]>(key, (old) =>
        old?.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        )
      );
    },

    enabled: Boolean(userId),
  });
};

// ─── Create direct chat ───────────────────────────────────────────────────────

export const useCreateDirectChat = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateDirectChatInput) =>
      getOrCreateDirectConversation(input),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
      }
    },
  });
};

// ─── Create group / broadcast ─────────────────────────────────────────────────

export const useCreateGroup = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: CreateGroupInput) => createGroupConversation(input),
    onSuccess: () => {
      if (userId) {
        queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
      }
    },
  });
};

// ─── Upload image ─────────────────────────────────────────────────────────────

export const useUploadChatImage = () => {
  return useMutation({
    mutationFn: ({
      file,
      conversationId,
    }: {
      file: File;
      conversationId: string;
    }) => uploadChatImage(file, conversationId),
  });
};
