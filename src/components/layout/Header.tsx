import { useAuthStore } from '@/store/authStore';
import { Bell, User as UserIcon, MapPin } from 'lucide-react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/services/auth.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { branchService } from '@/services/firebase/masterDataService';
import { useEffect } from 'react';
import { requestChatNotificationPermission } from '@/lib/chatNotifications';
import { useChatStore } from '@/store/chatStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { NAVIGATION_CONFIG } from '@/config/navigation';

export default function Header() {
  const { user, role } = useAuthStore();
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);
  const queryClient = useQueryClient();
  const pathname = usePathname();

  const { data: branches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
  });

  const { data: selectedBranch } = useQuery({
    queryKey: ['selectedBranch'],
    queryFn: () => {
      const saved = localStorage.getItem('selectedBranch');
      return saved ? JSON.parse(saved) : null;
    },
    initialData: null,
  });

  useEffect(() => {
    if (branches.length > 0 && !selectedBranch) {
      const saved = localStorage.getItem('selectedBranch');
      if (saved) {
        const branch = JSON.parse(saved);
        if (branches.some(b => b.id === branch.id)) {
          queryClient.setQueryData(['selectedBranch'], branch);
        } else {
          queryClient.setQueryData(['selectedBranch'], branches[0]);
          localStorage.setItem('selectedBranch', JSON.stringify(branches[0]));
        }
      } else {
        queryClient.setQueryData(['selectedBranch'], branches[0]);
        localStorage.setItem('selectedBranch', JSON.stringify(branches[0]));
      }
    }
  }, [branches, selectedBranch, queryClient]);

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      queryClient.setQueryData(['selectedBranch'], branch);
      localStorage.setItem('selectedBranch', JSON.stringify(branch));
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleBellClick = async () => {
    await requestChatNotificationPermission();
  };

  const filteredLinks = NAVIGATION_CONFIG.desktopNav.filter(
    link => !link.roles || (role && link.roles.includes(role))
  );

  const isActiveRoute = (linkHref: string) => {
    if (pathname === linkHref) return true;
    
    // Check if the current route belongs to a group
    const groupKey = linkHref.replace('/', '') as keyof typeof NAVIGATION_CONFIG.groups;
    if (NAVIGATION_CONFIG.groups[groupKey]) {
      return NAVIGATION_CONFIG.groups[groupKey].some(item => pathname.startsWith(item.href));
    }
    
    // Fallback for direct children
    if (linkHref !== '/' && pathname.startsWith(linkHref)) return true;
    
    return false;
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-soft">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">S</div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">SchoolDash</span>
          </Link>

          <nav className="ml-8 hidden md:flex items-center gap-6">
            {filteredLinks.map((link) => {
              const isActive = isActiveRoute(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary relative py-2",
                    isActive ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 w-full h-0.5 bg-primary rounded-t-full" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-4">
          {/* Branch Dropdown */}
          <div className="hidden sm:flex items-center gap-2">
            <Select
              value={selectedBranch?.id || ''}
              onValueChange={handleBranchChange}
            >
              <SelectTrigger className="bg-secondary h-9 border-border rounded-xl px-3 py-1.5 text-xs font-bold gap-2">
                <MapPin size={14} className="text-primary" />
                <SelectValue placeholder="Select Branch" />
              </SelectTrigger>
              <SelectContent>
                {branches.map(branch => (
                  <SelectItem key={branch.id} value={branch.id}>
                    {branch.branchName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            type="button"
            onClick={handleBellClick}
            className="relative p-2 text-muted-foreground hover:text-primary transition-colors"
            title="Message notifications"
          >
            <Bell size={20} />
            {totalUnreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-5 min-w-5 px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                {totalUnreadCount > 99 ? "99+" : totalUnreadCount}
              </span>
            )}
          </button>

          <div className="flex items-center gap-3 pl-2 border-l">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium leading-none">{user?.name}</p>
              <p className="text-xs text-muted-foreground capitalize">{role}</p>
            </div>

            <Link href="/profile" className="group relative">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center cursor-pointer border border-primary/20 text-primary-foreground font-bold text-sm shadow-soft hover:scale-110 transition-transform">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
