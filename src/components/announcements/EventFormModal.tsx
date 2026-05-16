'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Calendar, Clock } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { SchoolEvent, EventType, EventScope, EventPriority, EVENT_TYPE_LABELS } from '@/types/announcement';
import { useBranchStore } from '@/store/branchStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EventFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<SchoolEvent, 'id' | 'createdAt' | 'updatedAt' | 'createdBy' | 'createdByName' | 'status' | 'publishedToParents' | 'isDeleted'>) => Promise<void>;
  initialData?: Partial<SchoolEvent>;
  isSubmitting?: boolean;
}

const EVENT_TYPES: EventType[] = ['academic', 'exam', 'meeting', 'holiday', 'activity'];
const EVENT_SCOPES: EventScope[] = ['school', 'class', 'section'];

function toDatetimeLocal(ts?: Timestamp): string {
  if (!ts) return '';
  const d = ts.toDate();
  // Format for datetime-local input (YYYY-MM-DDTHH:mm)
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventFormModal({
  isOpen,
  onClose,
  onSubmit,
  initialData,
  isSubmitting = false,
}: EventFormModalProps) {
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  const [title, setTitle] = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [type, setType] = useState<EventType>(initialData?.type ?? 'academic');
  const [scope, setScope] = useState<EventScope>(initialData?.scope ?? 'school');
  const [classId, setClassId] = useState(initialData?.classId ?? '');
  const [sectionId, setSectionId] = useState(initialData?.sectionId ?? '');
  const [startAt, setStartAt] = useState(toDatetimeLocal(initialData?.startAt));
  const [endAt, setEndAt] = useState(toDatetimeLocal(initialData?.endAt));
  const [priority, setPriority] = useState<EventPriority>(initialData?.priority ?? 'normal');
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title.trim() || !startAt || !endAt) {
      setError('Title, start date, and end date are required.');
      return;
    }

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    if (endDate <= startDate) {
      setError('End date must be after start date.');
      return;
    }

    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        type,
        scope,
        branchId: selectedBranchId || null,
        classId: classId || null,
        sectionId: sectionId || null,
        startAt: Timestamp.fromDate(startDate),
        endAt: Timestamp.fromDate(endDate),
        priority,
      });
      onClose();
    } catch {
      setError('Failed to save event. Please try again.');
    }
  }, [title, description, type, scope, classId, sectionId, startAt, endAt, priority, onSubmit, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-[95vw] sm:max-w-lg bg-card rounded-2xl shadow-2xl border border-border flex flex-col max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="shrink-0 flex items-center justify-between p-5 border-b border-border bg-card">
                <div>
                  <h2 className="text-lg font-black text-foreground">
                    {initialData?.id ? 'Edit Event' : 'Create Event'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Saved as draft · publish when ready</p>
                </div>
                <button
                  id="close-event-modal"
                  type="button"
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-muted transition-colors"
                >
                  <X size={18} className="text-muted-foreground" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-4">
                {/* Title */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Title *
                  </label>
                  <input
                    id="event-title"
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Annual Science Fair"
                    className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                    maxLength={120}
                    required
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Description
                  </label>
                  <textarea
                    id="event-description"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Short description visible to parents…"
                    rows={3}
                    className="w-full px-4 py-2.5 bg-muted rounded-xl text-sm text-foreground placeholder:text-muted-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition resize-none"
                    maxLength={500}
                  />
                </div>

                {/* Type + Priority row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Type
                    </label>
                    <Select
                      value={type}
                      onValueChange={(value) => setType(value as EventType)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        {EVENT_TYPES.map((t) => (
                          <SelectItem key={t} value={t}>{EVENT_TYPE_LABELS[t]}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      Priority
                    </label>
                    <Select
                      value={priority}
                      onValueChange={(value) => setPriority(value as EventPriority)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="high">🔥 High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Scope */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                    Scope
                  </label>
                  <div className="flex gap-2">
                    {EVENT_SCOPES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setScope(s)}
                        className={[
                          'flex-1 py-2 rounded-xl text-xs font-bold capitalize transition-all border',
                          scope === s
                            ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                            : 'bg-muted text-muted-foreground border-border hover:border-primary/40',
                        ].join(' ')}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Class / Section IDs (optional) */}
                {(scope === 'class' || scope === 'section') && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                        Class ID
                      </label>
                      <input
                        id="event-class-id"
                        type="text"
                        value={classId}
                        onChange={(e) => setClassId(e.target.value)}
                        placeholder="e.g. class-10a"
                        className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                      />
                    </div>
                    {scope === 'section' && (
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                          Section ID
                        </label>
                        <input
                          id="event-section-id"
                          type="text"
                          value={sectionId}
                          onChange={(e) => setSectionId(e.target.value)}
                          placeholder="e.g. section-a"
                          className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Date range */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      <Calendar size={11} /> Starts *
                    </label>
                    <input
                      id="event-start-at"
                      type="datetime-local"
                      value={startAt}
                      onChange={(e) => setStartAt(e.target.value)}
                      className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                      required
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground mb-1.5">
                      <Clock size={11} /> Ends *
                    </label>
                    <input
                      id="event-end-at"
                      type="datetime-local"
                      value={endAt}
                      onChange={(e) => setEndAt(e.target.value)}
                      className="w-full px-3 py-2.5 bg-muted rounded-xl text-sm text-foreground border border-border focus:outline-none focus:ring-2 focus:ring-primary/40 transition"
                      required
                    />
                  </div>
                </div>

                {/* Error */}
                {error && (
                  <p className="text-xs text-destructive font-semibold bg-destructive/10 px-3 py-2 rounded-lg">
                    ⚠ {error}
                  </p>
                )}

                {/* Actions */}
                <div className="shrink-0 flex gap-3 pt-4 border-t border-border mt-6">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 py-3 bg-muted text-foreground rounded-xl font-bold text-sm hover:bg-muted/80 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    id="submit-event"
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 py-3 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:bg-primary/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-primary/20"
                  >
                    {isSubmitting ? 'Saving…' : initialData?.id ? 'Update Event' : 'Save as Draft'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
