'use client';

import { Search, Plus } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { classService } from '@/services/firebase/masterDataService';

interface FilterBarProps {
  onSearch: (value: string) => void;
  onFilterChange?: (classId: string) => void;
  onAddClick?: () => void;
  addLabel?: string;
  placeholder?: string;
}

export default function FilterBar({
  onSearch,
  onFilterChange,
  onAddClick,
  addLabel = "Add New",
  placeholder = "Search..."
}: FilterBarProps) {
  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 5 * 60 * 1000,
  });

  return (
    <div className="flex flex-col sm:flex-row items-center gap-3 mb-6">
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

      <div className="flex items-center gap-3 w-full sm:w-auto">
        <select
          onChange={(e) => onFilterChange?.(e.target.value)}
          className="block w-full px-4 py-2.5 bg-card border border-border rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all shadow-soft min-w-[150px]"
        >
          <option value="">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              Class {cls.className}
            </option>
          ))}
        </select>

        {onAddClick && (
          <button
            onClick={onAddClick}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-105 transition-transform whitespace-nowrap"
          >
            <Plus size={18} />
            {addLabel}
          </button>
        )}
      </div>
    </div>
  );
}
