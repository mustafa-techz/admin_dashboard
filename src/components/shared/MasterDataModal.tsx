import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface MasterDataModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (name: string) => void;
  initialValue?: string;
  title: string;
  placeholder: string;
  isLoading?: boolean;
}

export default function MasterDataModal({
  isOpen,
  onClose,
  onSubmit,
  initialValue = '',
  title,
  placeholder,
  isLoading = false,
}: MasterDataModalProps) {
  const [name, setName] = useState(initialValue);

  useEffect(() => {
    setName(initialValue);
  }, [initialValue, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

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
        
        <form onSubmit={handleSubmit}>
          <div className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-bold mb-1.5 text-foreground">Name</label>
              <input
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={placeholder}
                className="w-full px-4 py-2.5 bg-secondary border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                required
              />
            </div>
          </div>
          
          <div className="p-6 pt-0 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-secondary text-secondary-foreground hover:bg-secondary/80 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !name.trim()}
              className="px-6 py-2.5 rounded-xl text-sm font-bold bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-105 transition-transform disabled:opacity-50 disabled:scale-100 flex items-center gap-2"
            >
              {isLoading && <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              {initialValue ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
