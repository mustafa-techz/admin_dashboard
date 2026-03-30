'use client';

import { ReactNode } from 'react';
import Header from './Header';
import BottomNavigation from './BottomNavigation';
import { useAuthStore } from '@/store/authStore';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';

export default function AppLayout({ children }: { children: ReactNode }) {
  const { isAuthenticated, role } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login') {
      router.push('/login');
    }
  }, [isAuthenticated, pathname, router]);

  if (!isAuthenticated && pathname !== '/login') {
    return null; // Or a loader
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {pathname !== '/login' && <Header />}
      
      <main className="flex-1 pb-20 md:pb-0 md:pt-16">
        <div className="container mx-auto px-4 py-6 max-w-7xl">
          {children}
        </div>
      </main>

      {pathname !== '/login' && <BottomNavigation />}
    </div>
  );
}
