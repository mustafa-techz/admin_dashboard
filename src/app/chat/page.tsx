import type { Metadata } from "next";
import ChatLayout from "@/components/chat/ChatLayout";

export const metadata: Metadata = {
  title: "Messages — SchoolDash",
  description: "Real-time messaging between teachers, parents, and admins.",
};

export default function ChatPage() {
  return <ChatLayout />;
}
