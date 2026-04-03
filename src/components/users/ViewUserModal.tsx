'use client';

import React from 'react';
import { SerializedTimestamp, User } from '@/types/user';
import { X, Copy, Check } from 'lucide-react';
import { useState } from 'react';

interface ViewUserModalProps {
  user: User | null;
  isOpen: boolean;
  onClose: () => void;
}

const isSerializedTimestamp = (value: unknown): value is SerializedTimestamp => {
  return typeof value === 'object' && value !== null && 'seconds' in value;
};

const formatCreatedAt = (value: User['createdAt']) => {
  if (!value) {
    return 'N/A';
  }

  if (typeof value === 'string') {
    return new Date(value).toLocaleString();
  }

  if (isSerializedTimestamp(value)) {
    return new Date(value.seconds * 1000).toLocaleString();
  }

  return 'N/A';
};

export default function ViewUserModal({ user, isOpen, onClose }: ViewUserModalProps) {
  const [copied, setCopied] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  const formattedDate = formatCreatedAt(user.createdAt);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-bold tracking-tight">User Details</h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex flex-col items-center">
            <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-3xl font-black mb-3 italic">
              {user.name.charAt(0)}
            </div>
            <h4 className="text-xl font-black italic">{user.name}</h4>
            <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-black uppercase rounded-full mt-1 tracking-widest italic">
              {user.role}
            </span>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-secondary/50 rounded-xl border border-border">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Email Address</label>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold">{user.email}</span>
                <button 
                  onClick={() => handleCopy(user.email, 'email')}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                >
                  {copied === 'email' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>

            <div className="p-4 bg-secondary/50 rounded-xl border border-border">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">Account Created</label>
              <span className="text-sm font-bold">{formattedDate}</span>
            </div>

            <div className="p-4 bg-secondary/50 rounded-xl border border-border">
              <label className="block text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1">User ID</label>
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-muted-foreground truncate mr-2">{user.uid}</span>
                <button 
                  onClick={() => handleCopy(user.uid, 'uid')}
                  className="p-1.5 hover:bg-muted rounded-lg transition-colors text-muted-foreground"
                >
                  {copied === 'uid' ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-black bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform uppercase tracking-widest italic"
          >
            Close Profile
          </button>
        </div>
      </div>
    </div>
  );
}
