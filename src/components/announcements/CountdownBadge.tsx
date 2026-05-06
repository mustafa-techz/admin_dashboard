'use client';

import { memo, useMemo } from 'react';
import { Timestamp } from 'firebase/firestore';

interface CountdownBadgeProps {
  startAt: Timestamp;
  endAt: Timestamp;
}

interface TimeBreakdown {
  label: string;
  isToday: boolean;
  isSoon: boolean; // within 24h
  isExpired: boolean;
}

function getCountdown(startAt: Timestamp, endAt: Timestamp): TimeBreakdown {
  const now = Date.now();
  const start = startAt.toMillis();
  const end = endAt.toMillis();
  const diffMs = start - now;

  if (now > end) {
    return { label: 'END', isToday: false, isSoon: false, isExpired: true };
  }

  if (diffMs <= 0) {
    // Event has started — show "Live" or "Started"
    return { label: '🔴 Live', isToday: true, isSoon: true, isExpired: false };
  }

  const totalMinutes = Math.floor(diffMs / 60000);
  const totalHours = Math.floor(diffMs / 3600000);
  const days = Math.floor(diffMs / 86400000);
  const hours = Math.floor((diffMs % 86400000) / 3600000);

  const isToday = days === 0;

  if (isToday) {
    if (totalHours > 0) {
      return { label: `⏳ Today ${totalHours}h`, isToday: true, isSoon: true, isExpired: false };
    }
    return { label: `⏳ ${totalMinutes}m`, isToday: true, isSoon: true, isExpired: false };
  }

  if (days === 1) {
    return { label: `⏳ Tomorrow`, isToday: false, isSoon: false, isExpired: false };
  }

  if (hours > 0) {
    return { label: `⏳ ${days}d ${hours}h`, isToday: false, isSoon: false, isExpired: false };
  }

  return { label: `⏳ ${days}d`, isToday: false, isSoon: false, isExpired: false };
}

function CountdownBadge({ startAt, endAt }: CountdownBadgeProps) {
  // Memoize so it only recalculates when times change
  const countdown = useMemo(() => getCountdown(startAt, endAt), [startAt, endAt]);

  return (
    <span
      className={[
        'inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition-all',
        countdown.isExpired
          ? 'bg-red-100 text-red-700 border border-red-200'
          : countdown.isToday
            ? 'bg-amber-100 text-amber-700 border border-amber-200'
            : 'bg-primary/10 text-primary border border-primary/20',
      ].join(' ')}
    >
      {countdown.label}
    </span>
  );
}

export default memo(CountdownBadge);
