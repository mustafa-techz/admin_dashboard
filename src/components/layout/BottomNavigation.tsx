'use client';

import { useAuthStore } from '@/store/authStore';
import { Home, Users, BookOpen, Calendar, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

export default function BottomNavigation() {
  const { role } = useAuthStore();
  const pathname = usePathname();

  const navLinks = [
    { label: 'Home', href: '/dashboard', icon: Home },
    { label: 'Teachers', href: '/teachers', icon: Users, roles: ['admin', 'sub-admin'] },
    { label: 'Students', href: '/students', icon: BookOpen },
    { label: 'Attendance', href: '/attendance', icon: Calendar },
    { label: 'Profile', href: '/profile', icon: UserIcon },
  ];

  const filteredLinks = navLinks.filter(link => !link.roles || (role && link.roles.includes(role)));

  return (
    <nav className="fixed bottom-0 left-0 z-50 w-full h-16 bg-background border-t md:hidden shadow-lg-up">
      <div className="grid h-full max-w-lg grid-cols-5 mx-auto font-medium">
        {filteredLinks.map((link) => {
          const isActive = pathname === link.href;
          const Icon = link.icon;
          
          return (
            <Link 
              key={link.href} 
              href={link.href} 
              className={cn(
                "inline-flex flex-col items-center justify-center px-5 hover:bg-muted group transition-all",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon size={24} className={cn("mb-1", isActive && "scale-110")} />
              <span className="text-[10px] uppercase font-bold tracking-wider">{link.label}</span>
              {isActive && <div className="absolute top-0 w-8 h-1 bg-primary rounded-b-full shadow-[0_4px_10px_rgba(71,242,228,0.5)]" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
