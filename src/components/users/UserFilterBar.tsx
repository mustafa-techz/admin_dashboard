'use client';

import { Search, Plus } from 'lucide-react';
import { UserRole } from '@/types/user';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UserFilterBarProps {
  onSearch: (value: string) => void;
  onRoleChange?: (role: UserRole | "" | "all_roles") => void;
  onAddClick?: () => void;
  addLabel?: string;
  placeholder?: string;
}

export default function UserFilterBar({
  onSearch,
  onRoleChange,
  onAddClick,
  addLabel = "Create User",
  placeholder = "Search users..."
}: UserFilterBarProps) {
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
        <Select
          value={undefined} // Since it's uncontrolled or controlled by parent, but native select used default behavior
          onValueChange={(value) => onRoleChange?.(value as UserRole | "" | "all_roles")}
        >
          <SelectTrigger className="w-full sm:w-[150px]">
            <SelectValue placeholder="All Roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_roles">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="sub-admin">Sub Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="parent">Parent</SelectItem>
          </SelectContent>
        </Select>

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
