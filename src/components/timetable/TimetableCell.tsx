import React from 'react';
import { Trash2, User, BookOpen, Plus } from 'lucide-react';
import { TimetableEntry } from '../../types/timetable';
import { useMasterData } from '../../hooks/useMasterData';

interface TimetableCellProps {
  entry?: TimetableEntry;
  onClick: () => void;
  onDelete?: (e: React.MouseEvent) => void;
  isAdmin?: boolean;
}

export default function TimetableCell({ entry, onClick, onDelete, isAdmin = false }: TimetableCellProps) {
  const { subjects, teachers } = useMasterData();

  const subject = subjects.find(s => s.subjectId === entry?.subjectId);
  const teacher = teachers.find(t => t.teacherId === entry?.teacherId);

  if (!entry) {
    return (
      <div 
        onClick={onClick}
        className="h-24 w-full border border-dashed border-muted-foreground/10 rounded-xl flex items-center justify-center hover:bg-muted/30 hover:border-primary/30 transition-all cursor-pointer group"
      >
        <div className="h-8 w-8 rounded-full bg-muted/50 flex items-center justify-center text-muted-foreground/30 group-hover:text-primary group-hover:bg-primary/10 transition-all">
          <Plus size={16} />
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onClick}
      className={`relative h-24 w-full p-4 rounded-xl border border-border/50 bg-secondary hover:bg-muted/80 hover:border-primary/30 transition-all cursor-pointer group flex flex-col justify-between overflow-hidden shadow-sm`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-1.5 text-primary">
          <BookOpen size={14} className="shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-widest truncate">
            {subject?.subjectName || 'Subject'}
          </span>
        </div>
        {isAdmin && onDelete && (
          <button 
            onClick={onDelete}
            className="p-1 rounded-md text-red-500 hover:bg-red-500 hover:text-white transition-all"
          >
            <Trash2 size={12} />
          </button>
        )}
      </div>
      
      <div className="flex items-center gap-2 mt-auto">
        <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20">
          <User size={10} className="text-primary" />
        </div>
        <span className="text-[10px] font-bold text-foreground truncate">
          {teacher?.fullName || 'Teacher'}
        </span>
      </div>

      {/* Decorative accent */}
      <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
    </div>
  );
}
