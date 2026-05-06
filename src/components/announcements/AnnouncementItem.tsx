'use client';

import { memo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Trash2, Edit3, Globe } from 'lucide-react';
import { format } from 'date-fns';
import { SchoolEvent, EVENT_TYPE_COLORS, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS } from '@/types/announcement';
import CountdownBadge from './CountdownBadge';

interface AnnouncementItemProps {
  event: SchoolEvent;
  isAdminOrTeacher?: boolean;
  onEdit?: (event: SchoolEvent) => void;
  onDelete?: (eventId: string) => void;
  onPublish?: (eventId: string) => void;
}

function AnnouncementItem({
  event,
  isAdminOrTeacher = false,
  onEdit,
  onDelete,
  onPublish,
}: AnnouncementItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggle = useCallback(() => setIsOpen((prev) => !prev), []);

  const startDate = event.startAt.toDate();
  const endDate = event.endAt.toDate();
  const typeColor = EVENT_TYPE_COLORS[event.type];
  const typeIcon = EVENT_TYPE_ICONS[event.type];
  const isHighPriority = event.priority === 'high';
  const isDraft = event.status === 'draft';

  const formattedDate = format(startDate, 'MMM d, yyyy');
  const formattedTime = format(startDate, 'h:mm a');
  const formattedEndDate = format(endDate, 'MMM d, yyyy');

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className={[
        'group bg-card rounded-2xl border shadow-soft overflow-hidden',
        'transition-shadow duration-200 hover:shadow-md',
        isHighPriority
          ? 'border-l-4 border-l-amber-400 border-t-amber-100 border-r-amber-100 border-b-amber-100'
          : 'border-border',
        isDraft ? 'opacity-70' : '',
      ].join(' ')}
    >
      {/* Header / Trigger */}
      <button
        id={`announcement-${event.id}`}
        aria-expanded={isOpen}
        aria-controls={`announcement-body-${event.id}`}
        onClick={toggle}
        className={[
          'w-full flex items-start md:items-center justify-between gap-3 p-4 md:p-5',
          'text-left cursor-pointer select-none',
          'active:scale-[0.99] transition-transform duration-100',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
        ].join(' ')}
      >
        {/* Left: type icon + content */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Type badge */}
          <span
            className={`shrink-0 mt-0.5 flex items-center justify-center w-9 h-9 rounded-xl text-lg border ${typeColor}`}
            title={EVENT_TYPE_LABELS[event.type]}
          >
            {typeIcon}
          </span>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span
                className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border ${typeColor}`}
              >
                {EVENT_TYPE_LABELS[event.type]}
              </span>
              {isHighPriority && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                  🔥 High Priority
                </span>
              )}
              {isDraft && (
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
                  Draft
                </span>
              )}
            </div>

            <h3 className="font-black text-foreground text-sm md:text-base leading-snug truncate">
              {event.title}
            </h3>

            <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
              <span>{formattedDate} · {formattedTime}</span>
              <span className="hidden md:inline">·</span>
              <span className="hidden md:inline">By {event.createdByName}</span>
            </div>
          </div>
        </div>

        {/* Right: countdown + chevron */}
        <div className="flex items-center gap-2 shrink-0">
          <CountdownBadge startAt={event.startAt} endAt={event.endAt} />
          <ChevronDown
            size={18}
            className={[
              'text-muted-foreground transition-transform duration-300',
              isOpen ? 'rotate-180' : '',
            ].join(' ')}
          />
        </div>
      </button>

      {/* Expanded body */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            id={`announcement-body-${event.id}`}
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 md:px-5 pb-5 pt-1 border-t border-border/60">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                {event.description}
              </p>

              {/* Meta grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-[10px]">Starts</p>
                  <p className="font-bold text-foreground">{formattedDate}</p>
                  <p className="text-muted-foreground">{formattedTime}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-[10px]">Ends</p>
                  <p className="font-bold text-foreground">{formattedEndDate}</p>
                  <p className="text-muted-foreground">{format(endDate, 'h:mm a')}</p>
                </div>
                <div className="bg-muted/50 rounded-xl p-3">
                  <p className="text-muted-foreground font-semibold mb-1 uppercase tracking-wider text-[10px]">Posted by</p>
                  <p className="font-bold text-foreground truncate">{event.createdByName}</p>
                  <p className="text-muted-foreground capitalize">{event.scope}</p>
                </div>
              </div>

              {/* Admin/Teacher actions */}
              {isAdminOrTeacher && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
                  {event.status === 'draft' && onPublish && (
                    <button
                      id={`publish-event-${event.id}`}
                      onClick={(e) => { e.stopPropagation(); onPublish(event.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-primary text-primary-foreground rounded-xl text-xs font-bold hover:bg-primary/90 transition-colors"
                    >
                      <Globe size={13} />
                      Publish
                    </button>
                  )}
                  {onEdit && (
                    <button
                      id={`edit-event-${event.id}`}
                      onClick={(e) => { e.stopPropagation(); onEdit(event); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-muted text-foreground rounded-xl text-xs font-bold hover:bg-muted/80 transition-colors"
                    >
                      <Edit3 size={13} />
                      Edit
                    </button>
                  )}
                  {onDelete && (
                    <button
                      id={`delete-event-${event.id}`}
                      onClick={(e) => { e.stopPropagation(); onDelete(event.id); }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-destructive/10 text-destructive rounded-xl text-xs font-bold hover:bg-destructive/20 transition-colors ml-auto"
                    >
                      <Trash2 size={13} />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default memo(AnnouncementItem);
