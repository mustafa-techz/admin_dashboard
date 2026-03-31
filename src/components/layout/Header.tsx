'use client';

import { useAuthStore } from '@/store/authStore';
import { Bell, LogOut, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { logoutUser } from '@/services/auth.service';

export default function Header() {
  const { user, role } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const navLinks = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Teachers', href: '/teachers', roles: ['admin', 'sub-admin'] },
    { label: 'Students', href: '/students', roles: ['admin', 'sub-admin', 'teacher'] },
    { label: 'Attendance', href: '/attendance', roles: ['admin', 'sub-admin', 'teacher'] },
  ];

  const filteredLinks = navLinks.filter(link => !link.roles || (role && link.roles.includes(role)));

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-soft">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">S</div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">SchoolDash</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="ml-8 hidden md:flex items-center gap-6">
            {filteredLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-muted-foreground hover:text-primary transition-colors">
            <Bell size={20} />
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-primary" />
          </button>

          <div className="flex items-center gap-3 pl-2 border-l">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>

            <div className="group relative" onClick={handleLogout}>
              <div className="h-9 w-9 rounded-full bg-secondary flex items-center justify-center cursor-pointer border border-border">
                <UserIcon size={18} className="text-muted-foreground" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
