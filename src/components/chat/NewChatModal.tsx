"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Check, Users, Radio, MessageCircle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { useChatStore } from "@/store/chatStore";
import {
  useCreateDirectChat,
  useCreateGroup,
} from "@/hooks/useChat";
import { searchUsers, ChatUser, buildUserLabel } from "@/services/chatService";
import { ConversationType } from "@/types/chat";
import { cn } from "@/lib/utils";

interface NewChatModalProps {
  onCreated: (conversationId: string) => void;
}

type Tab = "direct" | "group" | "broadcast";


export default function NewChatModal({ onCreated }: NewChatModalProps) {
  const { user } = useAuthStore();
  const { isNewChatModalOpen, newChatTab, closeNewChatModal, setActiveChatId } =
    useChatStore();

  const [activeTab, setActiveTab] = useState<Tab>(newChatTab);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const createDirect = useCreateDirectChat(user?.id);
  const createGroup = useCreateGroup(user?.id);

  const TAB_CONFIG: {
    key: Tab;
    label: string;
    icon: React.ReactNode;
    description: string;
  }[] = [
      {
        key: "direct",
        label: "Direct",
        icon: <MessageCircle size={15} />,
        description: "One-on-one conversation",
      },

      ...(user?.role !== "parent"
        ? [
          {
            key: "group" as Tab,
            label: "Group",
            icon: <Users size={15} />,
            description: "Everyone can send messages",
          },
          {
            key: "broadcast" as Tab,
            label: "Broadcast",
            icon: <Radio size={15} />,
            description: "Only you can send (homework channel)",
          },
        ]
        : []),
    ];

  // Sync tab from store when modal opens
  useEffect(() => {
    if (isNewChatModalOpen) {
      setActiveTab(newChatTab);
      reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isNewChatModalOpen, newChatTab]);

  const reset = () => {
    setSearchQuery("");
    setSearchResults([]);
    setSelectedUsers([]);
    setGroupName("");
  };

  // Debounced user search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const results = await searchUsers(searchQuery, user?.id ?? "", user?.role);
        setSearchResults(results);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [searchQuery, user?.id]);

  const toggleUser = (u: ChatUser) => {
    if (activeTab === "direct") {
      setSelectedUsers([u]);
      return;
    }
    setSelectedUsers((prev) =>
      prev.some((p) => p.uid === u.uid)
        ? prev.filter((p) => p.uid !== u.uid)
        : [...prev, u]
    );
  };

  const isSelected = (u: ChatUser) => selectedUsers.some((p) => p.uid === u.uid);

  const handleCreate = async () => {
    if (!user) return;

    if (activeTab === "direct") {
      if (selectedUsers.length !== 1) return;
      const target = selectedUsers[0];
      const id = await createDirect.mutateAsync({
        userAId: user.id,
        userAName: user.name,
        userBId: target.uid,
        userBName: target.name,
        userARoleLabel: buildUserLabel({ uid: user.id, name: user.name, email: user.email, role: user.role }),
        userBRoleLabel: buildUserLabel(target),
      });
      onCreated(id);
      closeNewChatModal();
      return;
    }

    // Group or broadcast
    if (!groupName.trim() || selectedUsers.length === 0) return;
    const participantIds = [user.id, ...selectedUsers.map((u) => u.uid)];
    const id = await createGroup.mutateAsync({
      name: groupName.trim(),
      type: activeTab as "group" | "broadcast",
      participantIds,
      adminIds: [user.id],
      createdBy: user.id,
      createdByName: user.name,
    });
    onCreated(id);
    closeNewChatModal();
  };

  const isPending = createDirect.isPending || createGroup.isPending;
  const canSubmit =
    !isPending &&
    selectedUsers.length > 0 &&
    (activeTab === "direct" || groupName.trim());

  if (!isNewChatModalOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={closeNewChatModal}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <h2 className="text-base font-bold">New Conversation</h2>
          <button
            onClick={closeNewChatModal}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border shrink-0">
          {TAB_CONFIG.map((tab) => (
            <button
              key={tab.key}
              onClick={() => { setActiveTab(tab.key); reset(); }}
              className={cn(
                "flex-1 flex flex-col items-center py-3 gap-0.5 text-xs font-medium transition-colors border-b-2",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Group name field */}
          {activeTab !== "direct" && (
            <div>
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
                {activeTab === "broadcast" ? "Broadcast" : "Group"} Name
              </label>
              <input
                type="text"
                placeholder={`e.g. ${activeTab === "broadcast" ? "Class 5A Homework" : "Study Group"}`}
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-border bg-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          )}

          {/* Selected chips */}
          {selectedUsers.length > 0 && activeTab !== "direct" && (
            <div className="flex flex-wrap gap-1.5">
              {selectedUsers.map((u) => (
                <span
                  key={u.uid}
                  className="flex items-center gap-1 bg-primary/10 text-primary text-xs font-semibold px-2.5 py-1 rounded-full"
                >
                  {u.name}
                  <button onClick={() => toggleUser(u)}>
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          {/* User search */}
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              {activeTab === "direct" ? "Search user" : "Add participants"}
            </label>
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none"
              />
              <input
                type="text"
                placeholder="Search by name…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-10 pl-8 pr-3 rounded-xl border border-border bg-secondary text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 transition-all"
              />
            </div>
          </div>

          {/* Results */}
          <div className="space-y-0.5">
            {isSearching && (
              <div className="flex justify-center py-4">
                <div className="h-5 w-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}

            {!isSearching && searchQuery && searchResults.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                No users found for &ldquo;{searchQuery}&rdquo;
              </p>
            )}

            {searchResults.map((u) => (
              <button
                key={u.uid}
                onClick={() => toggleUser(u)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  isSelected(u)
                    ? "bg-primary/10"
                    : "hover:bg-secondary"
                )}
              >
                <div className="h-9 w-9 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-primary-foreground text-sm font-bold">
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {u.name}
                    <span className="text-xs text-muted-foreground font-normal ml-1">
                      ({buildUserLabel(u)})
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {u.email}
                  </p>
                </div>
                {isSelected(u) && (
                  <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <Check size={11} className="text-primary-foreground" />
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border shrink-0">
          <button
            onClick={handleCreate}
            disabled={!canSubmit}
            className={cn(
              "w-full h-10 rounded-xl font-semibold text-sm transition-all",
              canSubmit
                ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-md shadow-primary/20 active:scale-98"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                Creating…
              </span>
            ) : activeTab === "direct" ? (
              "Start Conversation"
            ) : activeTab === "broadcast" ? (
              "Create Broadcast Channel"
            ) : (
              "Create Group"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
