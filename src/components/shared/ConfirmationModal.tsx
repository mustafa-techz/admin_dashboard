import React from 'react';
import { X } from 'lucide-react';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary';
}

export default function ConfirmationModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'primary'
}: ConfirmationModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-card w-full max-w-md rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h3 className="text-xl font-bold tracking-tight">{title}</h3>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-6">
          <p className="text-muted-foreground font-medium">{message}</p>
        </div>
        <div className="p-6 pt-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
          >
            {cancelText}
          </button>
          <button
            onClick={async () => {
              await onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-xl text-sm font-bold text-white transition-colors ${
              type === 'danger' 
                ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/20' 
                : 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20'
            }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
