'use client';

import { ReactNode } from 'react';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, pathname, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user && pathname !== '/login') {
    return null;
  }

  return (
    <div className={`bg-background flex flex-col relative ${pathname?.startsWith('/chat') ? 'h-[100dvh] md:h-auto md:min-h-screen overflow-hidden' : 'min-h-screen'}`}>
      <div className="half-moon-bg" />
      {pathname !== '/login' && <Header />}

      <main
        className={`flex-1 relative z-10 min-h-0 flex flex-col ${!pathname?.startsWith('/chat') ? 'pb-20 md:pb-0 md:pt-16' : ''}`}
      >
        {pathname?.startsWith('/chat') ? (
          <div className="h-full w-full flex-1 flex flex-col min-h-0">
            {children}
          </div>
        ) : (
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            {children}
          </div>
        )}
      </main>

      {pathname !== '/login' && <BottomNavigation />}
    </div>
  );
}
