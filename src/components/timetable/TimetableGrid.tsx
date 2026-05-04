import React from 'react';
import { useMasterData } from '../../hooks/useMasterData';
import { TimetableEntry, TimetableFormData } from '../../types/timetable';
import TimetableCell from './TimetableCell';
import { Loader2 } from 'lucide-react';

interface TimetableGridProps {
  entries: TimetableEntry[];
  onCellClick: (day: string, timeSlotId: string, entry?: TimetableEntry) => void;
  onDeleteEntry: (id: string) => void;
  isAdmin?: boolean;
  isLoading?: boolean;
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function TimetableGrid({ 
  entries, 
  onCellClick, 
  onDeleteEntry, 
  isAdmin = false,
  isLoading = false 
}: TimetableGridProps) {
  const { timeSlots } = useMasterData();

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-muted-foreground font-black italic">Loading Timetable...</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-card shadow-soft">
      <table className="w-full border-collapse text-left">
        <thead className="bg-muted/30 border-b border-border">
          <tr>
            <th className="px-6 py-4 text-xs font-black uppercase tracking-widest text-muted-foreground border-r border-border min-w-[150px]">
              Time Slot
            </th>
            {DAYS.map(day => (
              <th key={day} className="px-6 py-4 text-center text-xs font-black uppercase tracking-widest text-muted-foreground min-w-[180px]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {timeSlots.map((slot, rowIndex) => (
            <tr key={slot.timeSlotId} className="border-b border-border/50 last:border-0">
              <td className="px-6 py-4 border-r border-border bg-muted/10">
                <div className="space-y-0.5">
                  <div className="text-sm font-black text-foreground">
                    {slot.label}
                  </div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-tight">
                    {slot.startTime} - {slot.endTime}
                  </div>
                </div>
              </td>
              {DAYS.map(day => {
                const entry = entries.find(e => e.day === day && e.timeSlotId === slot.timeSlotId);
                return (
                  <td key={`${day}-${slot.timeSlotId}`} className="p-3">
                    <TimetableCell
                      entry={entry}
                      isAdmin={isAdmin}
                      onClick={() => onCellClick(day, slot.timeSlotId, entry)}
                      onDelete={(e) => {
                        e.stopPropagation();
                        if (entry) onDeleteEntry(entry.id);
                      }}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
