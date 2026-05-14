"use client";

import { useEffect, useRef } from "react";
import type { MutableRefObject } from "react";
import { usePathname } from "next/navigation";
import {
  CHAT_NOTIFICATION_ICON_PATH,
  CHAT_NOTIFICATION_SOUND_PATH,
  canUseBrowserNotifications,
} from "@/lib/chatNotifications";
import { useChatStore } from "@/store/chatStore";
import { UserChat } from "@/types/chat";

import schoolConfig from '@/config/school.json';

const SOUND_THROTTLE_MS = 900;
const NOTIFICATION_DEDUPE_TTL_MS = 10 * 60 * 1000;
const ACTIVE_CHAT_TTL_MS = 3_000;
const NOTIFICATION_CHANNEL = `${schoolConfig.shortName}-chat-notifications`;

type BrowserNotificationPermission = NotificationPermission | "unsupported";

const getChatTimestamp = (chat: UserChat) => chat.lastMessageAt?.toMillis() ?? 0;

const isChatWindowVisible = (
  pathname: string,
  activeChatId: string | null,
  isMobileChatOpen: boolean,
  conversationId: string
) => {
  if (pathname !== "/chat" || activeChatId !== conversationId) return false;

  const isDesktop =
    typeof window !== "undefined" &&
    window.matchMedia("(min-width: 768px)").matches;

  return isDesktop || isMobileChatOpen;
};

const buildNotificationKey = (userId: string, chat: UserChat) => {
  return [
    "chat-notification",
    userId,
    chat.id,
    getChatTimestamp(chat),
    chat.unreadCount ?? 0,
  ].join(":");
};

const getActiveChatPresencePrefix = (userId: string, conversationId: string) =>
  `${schoolConfig.shortName}:active-chat:${userId}:${conversationId}:`;

const isAnyTabViewingChat = (userId: string, conversationId: string) => {
  const prefix = getActiveChatPresencePrefix(userId, conversationId);
  const now = Date.now();

  for (let index = 0; index < window.localStorage.length; index += 1) {
    const key = window.localStorage.key(index);
    if (!key?.startsWith(prefix)) continue;

    const lastSeenAt = Number(window.localStorage.getItem(key) ?? 0);
    if (lastSeenAt && now - lastSeenAt < ACTIVE_CHAT_TTL_MS) {
      return true;
    }
  }

  return false;
};

const claimNotification = (
  key: string,
  handledKeys: Set<string>,
  channelRef: MutableRefObject<BroadcastChannel | null>
) => {
  if (handledKeys.has(key)) return false;

  const storageKey = `${schoolConfig.shortName}:${key}`;
  const now = Date.now();
  const previous = Number(window.localStorage.getItem(storageKey) ?? 0);

  if (previous && now - previous < NOTIFICATION_DEDUPE_TTL_MS) {
    handledKeys.add(key);
    return false;
  }

  window.localStorage.setItem(storageKey, String(now));
  handledKeys.add(key);
  channelRef.current?.postMessage({ type: "handled", key });
  return true;
};

const getMessagePreview = (chat: UserChat) => chat.lastMessage || "New message";

export const useChatNotifications = (userId: string | undefined) => {
  const pathname = usePathname();
  const chats = useChatStore((state) => state.chats);
  const hasHydratedChatList = useChatStore((state) => state.hasHydratedChatList);
  const activeChatId = useChatStore((state) => state.activeChatId);
  const isMobileChatOpen = useChatStore((state) => state.isMobileChatOpen);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUnlockedRef = useRef(false);
  const lastSoundAtRef = useRef(0);
  const previousChatsRef = useRef<Map<string, UserChat>>(new Map());
  const initializedRef = useRef(false);
  const handledKeysRef = useRef<Set<string>>(new Set());
  const channelRef = useRef<BroadcastChannel | null>(null);
  const tabIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    tabIdRef.current =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : String(Date.now());

    audioRef.current = new Audio(CHAT_NOTIFICATION_SOUND_PATH);
    audioRef.current.preload = "auto";

    const unlockAudio = () => {
      const audio = audioRef.current;
      if (!audio || audioUnlockedRef.current) return;

      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
          audioUnlockedRef.current = true;
        })
        .catch(() => {
          audio.muted = false;
        });
    };

    window.addEventListener("pointerdown", unlockAudio, { passive: true });
    window.addEventListener("keydown", unlockAudio);

    if ("BroadcastChannel" in window) {
      channelRef.current = new BroadcastChannel(NOTIFICATION_CHANNEL);
      channelRef.current.onmessage = (event: MessageEvent) => {
        if (event.data?.type === "handled" && typeof event.data.key === "string") {
          handledKeysRef.current.add(event.data.key);
        }
      };
    }

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
      channelRef.current?.close();
      channelRef.current = null;
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!userId || typeof window === "undefined") return;
    if (!activeChatId) return;

    const isViewing = isChatWindowVisible(
      pathname,
      activeChatId,
      isMobileChatOpen,
      activeChatId
    );

    if (!isViewing) return;
    if (!tabIdRef.current) return;

    const presenceKey = `${getActiveChatPresencePrefix(userId, activeChatId)}${
      tabIdRef.current
    }`;
    const writePresence = () => {
      window.localStorage.setItem(presenceKey, String(Date.now()));
    };

    writePresence();
    const intervalId = window.setInterval(writePresence, ACTIVE_CHAT_TTL_MS / 2);

    return () => {
      window.clearInterval(intervalId);
      window.localStorage.removeItem(presenceKey);
    };
  }, [activeChatId, isMobileChatOpen, pathname, userId]);

  useEffect(() => {
    if (!userId || !hasHydratedChatList) {
      initializedRef.current = false;
      previousChatsRef.current = new Map();
      return;
    }

    const previousChats = previousChatsRef.current;
    const nextChats = new Map(chats.map((chat) => [chat.id, chat]));

    if (!initializedRef.current) {
      previousChatsRef.current = nextChats;
      initializedRef.current = true;
      return;
    }

    chats.forEach((chat) => {
      const previous = previousChats.get(chat.id);
      const previousUnread = previous?.unreadCount ?? 0;
      const nextUnread = chat.unreadCount ?? 0;
      const previousTimestamp = previous ? getChatTimestamp(previous) : 0;
      const nextTimestamp = getChatTimestamp(chat);
      const unreadIncreased = nextUnread > previousUnread;
      const hasNewerMessage = nextTimestamp > previousTimestamp;
      const isViewingThisChat = isChatWindowVisible(
        pathname,
        activeChatId,
        isMobileChatOpen,
        chat.id
      ) || isAnyTabViewingChat(userId, chat.id);

      if (!unreadIncreased || !hasNewerMessage || isViewingThisChat) return;

      const notificationKey = buildNotificationKey(userId, chat);
      if (!claimNotification(notificationKey, handledKeysRef.current, channelRef)) {
        return;
      }

      const now = Date.now();
      const audio = audioRef.current;
      if (audio && now - lastSoundAtRef.current > SOUND_THROTTLE_MS) {
        lastSoundAtRef.current = now;
        audio.currentTime = 0;
        audio.play().catch(() => {
          audioUnlockedRef.current = false;
        });
      }

      const permission: BrowserNotificationPermission = canUseBrowserNotifications()
        ? Notification.permission
        : "unsupported";

      if (permission === "granted") {
        new Notification(chat.name, {
          body: getMessagePreview(chat),
          icon: CHAT_NOTIFICATION_ICON_PATH,
          tag: notificationKey,
        });
      }
    });

    previousChatsRef.current = nextChats;
  }, [
    activeChatId,
    chats,
    hasHydratedChatList,
    isMobileChatOpen,
    pathname,
    userId,
  ]);
};
