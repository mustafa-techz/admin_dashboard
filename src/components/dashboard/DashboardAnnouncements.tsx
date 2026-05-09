'use client';

import { memo, useMemo, useState, useEffect } from 'react';
import { Megaphone, ArrowRight, User, Clock, Calendar } from 'lucide-react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useUpcomingAnnouncements } from '@/hooks/useAnnouncements';
import { EVENT_TYPE_COLORS, EVENT_TYPE_ICONS, EVENT_TYPE_LABELS, SchoolEvent } from '@/types/announcement';
import { format, isToday as isDateToday, differenceInDays, differenceInHours, differenceInMinutes } from 'date-fns';
import { Timestamp } from 'firebase/firestore';

// ---------- Countdown Utility ----------

interface TimeLeft {
  label: string;
  isSoon: boolean;
  isExpired: boolean;
}

function calculateTimeLeft(startAt: Timestamp, endAt: Timestamp): TimeLeft {
  const now = new Date();
  const start = startAt.toDate();
  const end = endAt.toDate();

  if (now > end) {
    return { label: 'END', isSoon: false, isExpired: true };
  }

  if (now > start) {
    return { label: '🔴 Live', isSoon: true, isExpired: false };
  }

  const days = differenceInDays(start, now);
  const hours = differenceInHours(start, now) % 24;
  const minutes = differenceInMinutes(start, now) % 60;

  if (days > 0) {
    return { label: `⏳ ${days}d ${hours}h`, isSoon: false, isExpired: false };
  }

  if (isDateToday(start)) {
    return { label: `⏳ Today ${hours}h`, isSoon: true, isExpired: false };
  }

  return { label: `⏳ ${hours}h ${minutes}m`, isSoon: true, isExpired: false };
}

// ---------- Components ----------

const CountdownBadge = memo(({ startAt, endAt }: { startAt: Timestamp; endAt: Timestamp }) => {
  const [timeLeft, setTimeLeft] = useState(() => calculateTimeLeft(startAt, endAt));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(startAt, endAt));
    }, 60000); // Update every minute
    return () => clearInterval(timer);
  }, [startAt, endAt]);

  return (
    <motion.span
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap shadow-sm border ${timeLeft.isExpired
        ? 'bg-red-100 text-red-700 border-red-200'
        : timeLeft.isSoon
          ? 'bg-amber-100 text-amber-700 border-amber-200'
          : 'bg-primary/10 text-primary border-primary/20'
        }`}
    >
      {timeLeft.label}
    </motion.span>
  );
});

CountdownBadge.displayName = 'CountdownBadge';

const AnnouncementCard = memo(({ event, index }: { event: SchoolEvent; index: number }) => {
  const start = event.startAt.toDate();
  const typeColor = EVENT_TYPE_COLORS[event.type];
  const isHighPriority = event.priority === 'high';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className={`group relative bg-card rounded-2xl border p-4 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${isHighPriority ? 'border-amber-200 bg-amber-50/30' : 'border-border'
        }`}
    >
      <div className="flex items-start gap-4">
        {/* Left: Icon */}
        <div className={`shrink-0 w-12 h-12 rounded-xl border flex items-center justify-center text-2xl shadow-sm transition-transform group-hover:scale-110 ${typeColor}`}>
          {EVENT_TYPE_ICONS[event.type]}
        </div>

        {/* Center: Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border ${typeColor}`}>
                {EVENT_TYPE_LABELS[event.type]}
              </span>
              {isHighPriority && (
                <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-amber-500 text-white shadow-sm shadow-amber-200">
                  🔥 Priority
                </span>
              )}
            </div>
            <CountdownBadge startAt={event.startAt} endAt={event.endAt} />
          </div>

          <h4 className="text-sm font-black text-foreground mb-1 group-hover:text-primary transition-colors leading-tight">
            {event.title}
          </h4>

          <p className="text-xs text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
            {event.description}
          </p>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-bold text-muted-foreground/80 uppercase tracking-wider">
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <Calendar size={12} className="text-primary" />
              <span>{format(start, 'MMM d, yyyy')}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
              <Clock size={12} className="text-primary" />
              <span>{format(start, 'hh:mm a')}</span>
            </div>
            <div className="flex items-center gap-1.5" title={event.createdByName}>
              <User size={12} className="text-primary" />
              <span className="truncate max-w-[100px]">By: {event.createdByName}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
});

AnnouncementCard.displayName = 'AnnouncementCard';

const SkeletonLoader = () => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="bg-muted/30 rounded-2xl p-4 border border-border animate-pulse">
        <div className="flex gap-4">
          <div className="w-12 h-12 bg-muted rounded-xl" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between">
              <div className="h-4 w-20 bg-muted rounded" />
              <div className="h-4 w-24 bg-muted rounded-full" />
            </div>
            <div className="h-5 w-3/4 bg-muted rounded" />
            <div className="h-3 w-full bg-muted rounded" />
            <div className="flex gap-4 pt-2">
              <div className="h-3 w-16 bg-muted rounded" />
              <div className="h-3 w-16 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    ))}
  </div>
);

export default function DashboardAnnouncements() {
  const { data: events, isLoading } = useUpcomingAnnouncements(3);

  // Filter out any accidentally returned expired events on client (safety fallback)
  const upcomingEvents = useMemo(() => {
    if (!events) return [];
    const now = Date.now();
    return events
      .filter(e => e.endAt.toMillis() >= now)
      .sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  }, [events]);

  if (isLoading) {
    return (
      <div className="bg-card rounded-3xl border border-border shadow-soft p-6 md:p-8">
        <div className="h-8 w-48 bg-muted rounded-xl mb-8 animate-pulse" />
        <SkeletonLoader />
      </div>
    );
  }

  return (
    <section className="bg-card rounded-3xl border border-border shadow-soft overflow-hidden">
      {/* Header */}
      <div className="px-6 py-6 md:px-8 flex items-center justify-between border-b border-border/50 bg-muted/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-inner">
            <Megaphone size={20} className="animate-bounce" />
          </div>
          <div>
            <h3 className="text-lg font-black tracking-tight text-foreground">School Announcements</h3>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em]">Latest Updates</p>
          </div>
        </div>
        <Link
          href="/announcements"
          className="group flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-2xl text-xs font-black hover:bg-primary/90 transition-all hover:scale-105 active:scale-95 shadow-lg shadow-primary/20"
        >
          View All
          <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" />
        </Link>
      </div>

      {/* List */}
      <div className="p-6 md:p-8">
        {upcomingEvents.length > 0 ? (
          <div className="grid grid-cols-1 gap-4">
            <AnimatePresence mode="popLayout">
              {upcomingEvents.map((event, index) => (
                <AnnouncementCard key={event.id} event={event} index={index} />
              ))}
            </AnimatePresence>
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 text-center"
          >
            <div className="w-20 h-20 bg-muted/50 rounded-full flex items-center justify-center mb-4 border border-dashed border-muted-foreground/20">
              <Calendar size={32} className="text-muted-foreground/30" />
            </div>
            <h4 className="text-base font-black text-foreground">All caught up!</h4>
            <p className="text-sm text-muted-foreground max-w-[240px] mt-1">
              No upcoming announcements at the moment. Check back later for updates.
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer Info */}
      {upcomingEvents.length > 0 && (
        <div className="px-6 py-4 bg-muted/5 border-t border-border/50 flex items-center justify-center gap-2">
          <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
            Live Feed · Refreshes Automatically
          </p>
        </div>
      )}
    </section>
  );
}
