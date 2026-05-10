'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import ChatRealtimeProvider from '@/components/chat/ChatRealtimeProvider';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Data stays fresh for 3 minutes (prevents immediate refetches)
        staleTime: 3 * 60 * 1000, 
        // Data stays in cache for 15 minutes before garbage collection
        gcTime: 15 * 60 * 1000,
        // Crucial for reducing Firebase read costs (no refetching when switching tabs)
        refetchOnWindowFocus: false,
        // Only retry once to fail fast and show error UI
        retry: 1,
        // Don't refetch on mount if data is already fresh
        refetchOnMount: false,
      },
      mutations: {
        // Global mutation error logging
        onError: (error) => {
          console.error("Mutation failed:", error);
          // Here we could plug in toast notifications for errors
        }
      }
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <ChatRealtimeProvider>
        {children}
      </ChatRealtimeProvider>
    </QueryClientProvider>
  );
}
