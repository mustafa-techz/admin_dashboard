'use client';

import { Search, SlidersHorizontal, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FilterBarProps {
  onSearch: (value: string) => void;
  onFilterClick?: () => void;
  onAddClick?: () => void;
  addLabel?: string;
  placeholder?: string;
}

export default function FilterBar({ 
  onSearch, 
  onFilterClick, 
  onAddClick,
  addLabel = "Add New",
  placeholder = "Search..."
}: FilterBarProps) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4 mb-6">
      <div className="relative flex-1 w-full">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-muted-foreground" />
        </div>
        <input
          type="text"
          onChange={(e) => onSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 bg-card border border-border rounded-xl text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft"
          placeholder={placeholder}
        />
      </div>
      
      <div className="flex items-center gap-2 w-full sm:w-auto">
        <button 
          onClick={onFilterClick}
          className="flex flex-1 sm:flex-none items-center justify-center gap-2 px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-bold hover:bg-muted/50 transition-colors shadow-soft"
        >
          <SlidersHorizontal size={18} />
          Filters
        </button>
        
        {onAddClick && (
          <button 
            onClick={onAddClick}
            className="flex flex-2 sm:flex-none items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform"
          >
            <Plus size={18} />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
