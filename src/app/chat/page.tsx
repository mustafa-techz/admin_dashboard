import type { Metadata } from "next";
import ChatLayout from "@/components/chat/ChatLayout";

import schoolConfig from "@/config/school.json";

export const metadata: Metadata = {
  title: `Messages — ${schoolConfig.schoolName}`,
  description: "Real-time messaging between teachers, parents, and admins.",
};

export default function ChatPage() {
  return <ChatLayout />;
}
