"use client";

import { ReactNode } from "react";
import { useAuthContext } from "@/context/AuthProvider";
import { useChatListRealtime } from "@/hooks/useChat";

export default function ChatRealtimeProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();

  useChatListRealtime(user?.uid);

  return children;
}
