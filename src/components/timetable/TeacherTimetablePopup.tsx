import React from 'react';
import { X, Users, Briefcase } from 'lucide-react';
import TimetableGrid from './TimetableGrid';
import { useTimetable } from '../../hooks/useTimetable';

interface TeacherTimetablePopupProps {
  isOpen: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
}

export default function TeacherTimetablePopup({
  isOpen,
  onClose,
  teacherId,
  teacherName
}: TeacherTimetablePopupProps) {
  const { teacherTimetable, isLoading } = useTimetable(undefined, undefined, teacherId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
      <div className="bg-card w-full max-w-6xl max-h-[90vh] rounded-2xl shadow-xl border border-border animate-in zoom-in-95 duration-300 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-border bg-muted/30">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary font-black text-xl shadow-inner border border-primary/20">
              {teacherName.charAt(0)}
            </div>
            <div>
              <h3 className="text-xl font-black tracking-tight leading-none uppercase">
                 {teacherName}
              </h3>
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1 block">Teacher Weekly Schedule</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-2 rounded-full hover:bg-muted"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          <div className="bg-secondary p-6 rounded-xl border border-border/50">
            <TimetableGrid 
              entries={teacherTimetable}
              isLoading={isLoading}
              isAdmin={false}
              onCellClick={() => {}} 
              onDeleteEntry={() => {}} 
            />
          </div>
        </div>

        <div className="p-4 border-t border-border flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-all font-bold"
            >
                Close Schedule
            </button>
        </div>
      </div>
    </div>
  );
}
