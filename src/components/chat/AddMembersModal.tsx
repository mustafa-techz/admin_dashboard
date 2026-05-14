"use client";

import { useState, useEffect, useRef } from "react";
import { X, Search, Check, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { searchUsers, ChatUser, buildUserLabel } from "@/services/chatService";
import { useAddMembersToChat } from "@/hooks/useChat";
import { cn } from "@/lib/utils";

interface AddMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversationId: string;
  existingParticipantIds: string[];
  onMembersAdded: (newUids: string[]) => void;
}

export default function AddMembersModal({
  isOpen,
  onClose,
  conversationId,
  existingParticipantIds,
  onMembersAdded,
}: AddMembersModalProps) {
  const user = useAuthStore(state => state.user);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<ChatUser[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<ChatUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addMembers = useAddMembersToChat();

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSearchResults([]);
      setSelectedUsers([]);
    }
  }, [isOpen]);

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
        // Filter out users who are already in the conversation
        const filteredResults = results.filter(
          (u) => !existingParticipantIds.includes(u.uid)
        );
        setSearchResults(filteredResults);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [searchQuery, user?.id, existingParticipantIds, user?.role]);

  const toggleUser = (u: ChatUser) => {
    setSelectedUsers((prev) =>
      prev.some((p) => p.uid === u.uid)
        ? prev.filter((p) => p.uid !== u.uid)
        : [...prev, u]
    );
  };

  const isSelected = (u: ChatUser) => selectedUsers.some((p) => p.uid === u.uid);

  const handleAdd = async () => {
    if (!user || selectedUsers.length === 0) return;

    const newParticipants = selectedUsers.map((u) => ({ uid: u.uid, name: u.name }));

    await addMembers.mutateAsync({
      conversationId,
      newParticipants,
      addedBy: user.id,
      addedByName: user.name,
    });

    onMembersAdded(newParticipants.map(p => p.uid));
    onClose();
  };

  const isPending = addMembers.isPending;
  const canSubmit = !isPending && selectedUsers.length > 0;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-md bg-background rounded-2xl shadow-2xl border border-border overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-bottom-4 duration-200">
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div className="flex items-center gap-2">
            <UserPlus size={18} className="text-primary" />
            <h2 className="text-base font-bold">Add Members</h2>
          </div>
          <button
            onClick={onClose}
            className="h-8 w-8 rounded-full flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Selected chips */}
          {selectedUsers.length > 0 && (
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
              Search users to add
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
                No new users found for &ldquo;{searchQuery}&rdquo;
              </p>
            )}

            {searchResults.map((u) => (
              <button
                key={u.uid}
                onClick={() => toggleUser(u)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  isSelected(u) ? "bg-primary/10" : "hover:bg-secondary"
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
        <div className="px-5 py-4 border-t border-border shrink-0 bg-background">
          <button
            onClick={handleAdd}
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
                Adding Members…
              </span>
            ) : (
              `Add ${selectedUsers.length > 0 ? selectedUsers.length : ""} Member${
                selectedUsers.length > 1 ? "s" : ""
              }`
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
