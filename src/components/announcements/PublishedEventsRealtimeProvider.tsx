'use client';

import { ReactNode, useEffect, useMemo, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { eventService } from '@/services/eventService';
import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { syncPublishedEventsRealtimeCache } from '@/lib/dashboardCacheSync';
import type { SchoolEvent } from '@/types/announcement';

const buildSignature = (events: SchoolEvent[]) =>
  events
    .map((event) => {
      const updatedAt = event.updatedAt?.toMillis() ?? event.createdAt.toMillis();
      return `${event.id}:${updatedAt}:${event.publishedToParents}:${event.isDeleted}`;
    })
    .join('|');

export default function PublishedEventsRealtimeProvider({
  children,
}: {
  children: ReactNode;
}) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const selectedBranchId = useBranchStore((state) => state.selectedBranchId);
  const lastSignatureRef = useRef('');

  const branchId = useMemo(
    () => selectedBranchId || user?.branchId || user?.branchIds?.[0] || undefined,
    [selectedBranchId, user?.branchId, user?.branchIds]
  );

  useEffect(() => {
    if (!user) {
      lastSignatureRef.current = '';
      return;
    }

    const unsubscribe = eventService.subscribeToPublishedEvents({
      branchId,
      limitCount: 10,
      onNext: (events) => {
        const signature = buildSignature(events);
        if (signature === lastSignatureRef.current) return;

        lastSignatureRef.current = signature;
        syncPublishedEventsRealtimeCache(queryClient, events, branchId);
      },
      onError: (error) => {
        console.warn('Published events realtime sync failed:', error);
      },
    });

    return () => {
      unsubscribe();
    };
  }, [branchId, queryClient, user]);

  return <>{children}</>;
}
