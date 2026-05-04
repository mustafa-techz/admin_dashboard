"use client";

import { ReactNode } from "react";
import { useAuthContext } from "@/context/AuthProvider";
import { useChatListRealtime } from "@/hooks/useChat";
import { useChatNotifications } from "@/hooks/useChatNotifications";

export default function ChatRealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();

  useChatListRealtime(user?.uid);
  useChatNotifications(user?.uid);

  return children;
}
