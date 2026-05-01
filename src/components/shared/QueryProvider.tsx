'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';
import ChatRealtimeProvider from '@/components/chat/ChatRealtimeProvider';

export default function QueryProvider({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
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
