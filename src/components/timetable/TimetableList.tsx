'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/store/authStore';
import {
  useTimetables,
  usePublishTimetable,
  useUnpublishTimetable,
  useDeleteTimetable,
} from '@/hooks/useTimetables';
import { classService, sectionService } from '@/services/firebase/masterDataService';
import TimetableGrid from './TimetableGrid';
import { cn } from '@/lib/utils';
import { TIMETABLE_STATUS_COLORS, TIMETABLE_STATUS_LABELS } from '@/types/timetable';
import type { Timetable } from '@/types/timetable';
import {
  ChevronRight,
  Globe,
  EyeOff,
  Trash2,
  Loader2,
  CalendarDays,
  Archive,
} from 'lucide-react';
import ConfirmationModal from '@/components/shared/ConfirmationModal';

export default function TimetableList({ branchId }: { branchId: string }) {
  const { data: timetables = [], isLoading } = useTimetables(branchId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  const publishMutation = usePublishTimetable();
  const unpublishMutation = useUnpublishTimetable();
  const deleteMutation = useDeleteTimetable();

  const { data: classes = [] } = useQuery({
    queryKey: ['classes'],
    queryFn: () => classService.getClasses(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: sections = [] } = useQuery({
    queryKey: ['sections'],
    queryFn: () => sectionService.getSections(),
    staleTime: 10 * 60 * 1000,
  });

  const getClassName = (classId: string) =>
    classes.find((c) => c.id === classId)?.className || classId;
  const getSectionName = (sectionId: string) =>
    sections.find((s) => s.id === sectionId)?.sectionName || sectionId;

  const handleDelete = () => {
    if (deleteTarget) {
      deleteMutation.mutate(deleteTarget, {
        onSuccess: () => {
          setDeleteTarget(null);
          if (selectedId === deleteTarget) setSelectedId(null);
        },
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (timetables.length === 0) {
    return (
      <div className="bg-card rounded-2xl border border-border shadow-soft p-12 text-center">
        <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
          <CalendarDays size={32} className="text-primary" />
        </div>
        <h3 className="text-lg font-bold text-foreground">No Timetables Yet</h3>
        <p className="text-sm text-muted-foreground mt-1">
          Create your first timetable from the &quot;Create&quot; tab.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timetable Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {timetables.map((tt) => {
          const isSelected = selectedId === tt.id;

          return (
            <div
              key={tt.id}
              onClick={() => setSelectedId(isSelected ? null : tt.id)}
              className={cn(
                'text-left bg-card rounded-2xl border-2 shadow-soft p-5 transition-all duration-200 hover:shadow-md cursor-pointer',
                isSelected
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/30'
              )}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-black text-foreground">{tt.name}</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {getClassName(tt.classId)} — {getSectionName(tt.sectionId)} · {tt.academicYear}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider',
                      TIMETABLE_STATUS_COLORS[tt.status]
                    )}
                  >
                    {TIMETABLE_STATUS_LABELS[tt.status]}
                  </span>
                  <ChevronRight
                    size={20}
                    className={cn(
                      'text-muted-foreground transition-transform',
                      isSelected && 'rotate-90 text-primary'
                    )}
                  />
                </div>
              </div>

              <div className="mt-3 text-xs text-muted-foreground">
                Created: {new Date(tt.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Timetable Detail */}
      {selectedId && (
        <div className="bg-card rounded-2xl border border-border shadow-soft p-6 animate-in slide-in-from-top-2 duration-300 space-y-4">
          {(() => {
            const tt = timetables.find((t) => t.id === selectedId);
            if (!tt) return null;

            return (
              <>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <h3 className="text-lg font-black text-foreground">
                    {tt.name} — Schedule
                  </h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    {tt.status === 'draft' && (
                      <button
                        type="button"
                        disabled={publishMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          publishMutation.mutate(tt.id);
                        }}
                        className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all flex items-center gap-1.5 shadow-sm"
                      >
                        {publishMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <Globe size={12} />
                        )}
                        Publish
                      </button>
                    )}

                    {tt.status === 'published' && (
                      <button
                        type="button"
                        disabled={unpublishMutation.isPending}
                        onClick={(e) => {
                          e.stopPropagation();
                          unpublishMutation.mutate(tt.id);
                        }}
                        className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200 transition-all flex items-center gap-1.5"
                      >
                        {unpublishMutation.isPending ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <EyeOff size={12} />
                        )}
                        Unpublish
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(tt.id);
                      }}
                      className="px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-xs font-bold hover:bg-red-100 transition-all flex items-center gap-1.5"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>

                <TimetableGrid timetableId={tt.id} />
              </>
            );
          })()}
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmationModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Timetable"
        message="Are you sure you want to delete this timetable and all its slots? This action cannot be undone."
        confirmText="Delete"
        type="danger"
      />
    </div>
  );
}
