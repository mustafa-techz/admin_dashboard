'use client';

import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { NAVIGATION_CONFIG } from '@/config/navigation';

export default function BottomNavigation() {
  const role = useAuthStore(state => state.role);
  const pathname = usePathname();

  const navLinks = role && NAVIGATION_CONFIG.bottomNav[role] 
    ? NAVIGATION_CONFIG.bottomNav[role] 
    : [];

  if (!role) return null;

  const isActiveRoute = (linkHref: string) => {
    if (pathname === linkHref) return true;
    
    // Check if the current route belongs to a group
    const groupKey = linkHref.replace('/', '') as keyof typeof NAVIGATION_CONFIG.groups;
    if (NAVIGATION_CONFIG.groups[groupKey]) {
      return NAVIGATION_CONFIG.groups[groupKey].some(item => pathname.startsWith(item.href));
    }
    
    // Fallback for direct children (e.g., /chat/123 matching /chat)
    if (linkHref !== '/' && pathname.startsWith(linkHref)) return true;
    
    return false;
  };

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden shadow-lg-up pb-safe">
      <div 
        className="grid h-full w-full mx-auto font-medium"
        style={{ gridTemplateColumns: `repeat(${navLinks.length}, 1fr)` }}
      >
        {navLinks.map((link) => {
          const isActive = isActiveRoute(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "relative flex flex-col items-center justify-center hover:bg-muted/50 group transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} className={cn("mb-1 transition-transform", isActive && "scale-110")} />
              <span className="text-[10px] uppercase font-bold tracking-wider">{link.label}</span>
              {isActive && (
                <div className="absolute top-0 w-10 h-1 bg-primary rounded-b-full shadow-[0_2px_8px_rgba(var(--primary),0.4)]" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
