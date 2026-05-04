/**
 * useChat.ts
 *
 * TanStack Query hooks for the chat system.
 *
 * Architectural split:
 *  - useChatList          → reads chat list from TanStack Query cache
 *  - useChatListRealtime  → one global userChats listener mounted at app root
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
import { useEffect, useRef } from "react";
import {
  getChatList,
  getOrCreateDirectConversation,
  createGroupConversation,
  loadMessages,
  sendMessage,
  markAsRead,
  uploadChatImage,
  subscribeToChatList,
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
import { useChatStore } from "@/store/chatStore";

// ─── Query keys ───────────────────────────────────────────────────────────────

export const chatKeys = {
  list: (userId: string) => ["chatList", userId] as const,
  messages: (conversationId: string) => ["messages", conversationId] as const,
};

// ─── Chat list ────────────────────────────────────────────────────────────────

/**
 * Fetch the user's chat list. A single app-level listener keeps this cache fresh
 * while this query remains a fallback for first load or listener recovery.
 */
export const useChatList = (userId: string | undefined) => {
  return useQuery({
    queryKey: chatKeys.list(userId ?? ""),
    queryFn: () => getChatList(userId!),
    enabled: Boolean(userId),
    staleTime: 30_000, // 30 seconds — prevents redundant refetches
  });
};

export const useChatListRealtime = (userId: string | undefined) => {
  const queryClient = useQueryClient();
  const setChats = useChatStore((state) => state.setChats);
  const resetChats = useChatStore((state) => state.resetChats);

  useEffect(() => {
    if (!userId) {
      resetChats();
      return;
    }

    const unsubscribe = subscribeToChatList(
      userId,
      (chats) => {
        queryClient.setQueryData(chatKeys.list(userId), chats);
        setChats(chats);
      },
      (error) => {
        console.error("Chat list subscription failed:", error);
        queryClient.invalidateQueries({ queryKey: chatKeys.list(userId) });
      }
    );

    return unsubscribe;
  }, [queryClient, resetChats, setChats, userId]);
};

// ─── Paginated message history ────────────────────────────────────────────────

interface MessagePage {
  messages: Message[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
}

const getMessageSortTime = (message: Message) =>
  message.createdAt?.toMillis() ?? (message.status === "sending" ? Date.now() : 0);

const dedupeAndSortMessages = (messages: Message[]) => {
  const messageMap = new Map<string, Message>();

  messages.forEach((message) => {
    const key = message.tempId || message.id;
    const existing = messageMap.get(key);
    messageMap.set(key, {
      ...existing,
      ...message,
    });
  });

  return Array.from(messageMap.values()).sort((a, b) => {
    return getMessageSortTime(a) - getMessageSortTime(b);
  });
};

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
  const queryClient = useQueryClient();
  const unsubRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (unsubRef.current) {
      unsubRef.current();
      unsubRef.current = null;
    }

    if (!conversationId) return;

    unsubRef.current = subscribeToMessages(
      conversationId,
      (newMessages) => {
        const key = chatKeys.messages(conversationId);

        queryClient.setQueryData<InfiniteData<MessagePage>>(key, (old) => {
          const liveMessages: Message[] = newMessages.map((message): Message => ({
            ...message,
            status: message.hasPendingWrites ? "sending" : "sent",
          }));

          if (!old) {
            return {
              pages: [
                { messages: dedupeAndSortMessages(liveMessages), lastDoc: null },
              ],
              pageParams: [null],
            };
          }

          const pages = [...old.pages];
          // Page 0 is the latest page because Firestore pages by createdAt desc.
          const latestPageIndex = 0;
          const latestPage = { ...pages[latestPageIndex] };

          // Use a Map for O(1) deduplication during merge
          const messageMap = new Map<string, Message>();

          // 1. Existing messages in this page
          latestPage.messages.forEach((m) => {
            messageMap.set(m.tempId || m.id, m);
          });

          // 2. Overwrite/Add with real-time messages
          liveMessages.forEach((m) => {
            const idToMatch = m.tempId || m.id;
            messageMap.set(idToMatch, m);
          });

          latestPage.messages = dedupeAndSortMessages(Array.from(messageMap.values()));

          pages[latestPageIndex] = latestPage;
          return { ...old, pages };
        });
      }
    );

    return () => {
      if (unsubRef.current) {
        unsubRef.current();
        unsubRef.current = null;
      }
    };
  }, [conversationId, queryClient]);
};

// ─── Send message ─────────────────────────────────────────────────────────────

export const useSendMessage = (userId: string | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: SendMessageInput) => sendMessage(input),

    // Optimistic update: insert the message locally
    onMutate: async (input) => {
      const key = chatKeys.messages(input.conversationId);
      await queryClient.cancelQueries({ queryKey: key });

      const optimisticMessage: Message = {
        id: `optimistic_${input.tempId}`,
        tempId: input.tempId,
        senderId: input.senderId,
        senderName: input.senderName,
        text: input.text,
        imageUrl: input.imageUrl,
        createdAt: null,
        status: "sending",
      };

      queryClient.setQueryData<InfiniteData<MessagePage>>(key, (old) => {
        if (!old) return old;
        const pages = [...old.pages];
        const latestPage = { ...pages[0] };
        latestPage.messages = dedupeAndSortMessages([
          ...latestPage.messages,
          optimisticMessage,
        ]);
        pages[0] = latestPage;
        return { ...old, pages };
      });

      return { optimisticMessage };
    },

    onSuccess: () => {
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
            messages: page.messages.map((m): Message =>
              m.id === context.optimisticMessage.id
                ? { ...m, status: "error" }
                : m
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
  const setChats = useChatStore((state) => state.setChats);

  return useMutation({
    mutationFn: ({ conversationId }: { conversationId: string }) =>
      markAsRead(userId!, conversationId),

    // Optimistically zero out the badge in the sidebar
    onMutate: async ({ conversationId }) => {
      if (!userId) return;
      const key = chatKeys.list(userId);
      queryClient.setQueryData<UserChat[]>(key, (old) => {
        const nextChats = old?.map((c) =>
          c.id === conversationId ? { ...c, unreadCount: 0 } : c
        );

        if (nextChats) {
          setChats(nextChats);
        }

        return nextChats;
      });
    },
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
