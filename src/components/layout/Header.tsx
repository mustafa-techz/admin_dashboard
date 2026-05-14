import { useAuthStore } from '@/store/authStore';
import { useBranchStore } from '@/store/branchStore';
import { Bell, User as UserIcon, MapPin } from 'lucide-react';
import schoolConfig from '@/config/school.json';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { logoutUser } from '@/services/auth.service';
import { useQuery } from '@tanstack/react-query';
import { branchService } from '@/services/firebase/masterDataService';
import { useEffect, useMemo } from 'react';
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
import { canSelectBranch, isAdminRole } from '@/lib/permissions';
import { getAuthorizedBranchIds } from '@/lib/teacherScope';

export default function Header() {
  const user = useAuthStore(state => state.user);
  const role = useAuthStore(state => state.role);
  const selectedBranch = useBranchStore(state => state.selectedBranch);
  const selectedBranchId = useBranchStore(state => state.selectedBranchId);
  const setSelectedBranch = useBranchStore(state => state.setSelectedBranch);
  const totalUnreadCount = useChatStore((state) => state.totalUnreadCount);
  const pathname = usePathname();

  const { data: allBranches = [] } = useQuery({
    queryKey: ['branches'],
    queryFn: () => branchService.getBranches(),
    staleTime: 30 * 60 * 1000, // 30 min — branches rarely change
  });

  // Filter branches based on role
  const branches = useMemo(() => {
    if (!user || !role) return [];
    // Admin/Sub-admin see all branches
    if (isAdminRole(role)) return allBranches;
    // Teacher sees only assigned branches
    const authorized = getAuthorizedBranchIds(user as Parameters<typeof getAuthorizedBranchIds>[0]);
    if (authorized && authorized.length > 0) {
      return allBranches.filter((b) => authorized.includes(b.id));
    }
    return allBranches;
  }, [allBranches, user, role]);

  // Auto-select first branch on load or when current selection is invalid
  useEffect(() => {
    if (branches.length === 0) return;
    const isCurrentValid = branches.some((b) => b.id === selectedBranchId);
    if (!selectedBranchId || !isCurrentValid) {
      setSelectedBranch(branches[0]);
    }
  }, [branches, selectedBranchId, setSelectedBranch]);

  const handleBranchChange = (branchId: string) => {
    const branch = branches.find(b => b.id === branchId);
    if (branch) {
      setSelectedBranch(branch);
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

  const filteredLinks = useMemo(() => 
    NAVIGATION_CONFIG.desktopNav.filter(
      link => !link.roles || (role && link.roles.includes(role))
    ),
    [role]
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

  const showBranchSelector = canSelectBranch(role) && branches.length > 0;

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/60 shadow-soft">
      <div className="container flex h-16 items-center justify-between px-4 md:px-8 mx-auto max-w-7xl">
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-xl">{schoolConfig.schoolName.charAt(0)}</div>
            <span className="font-bold text-xl tracking-tight hidden sm:block">{schoolConfig.schoolName}</span>
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
          {/* Branch Dropdown — visible only for Admin, Sub-admin, Teacher */}
          {showBranchSelector && (
            <div className="flex items-center gap-2">
              <Select
                value={selectedBranchId || ''}
                onValueChange={handleBranchChange}
              >
                <SelectTrigger className="bg-secondary h-8 sm:h-9 border-border rounded-xl px-2 sm:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs font-bold gap-1.5 sm:gap-2 max-w-[140px] sm:max-w-none">
                  <MapPin size={12} className="text-primary shrink-0 sm:w-3.5 sm:h-3.5" />
                  <SelectValue placeholder="Branch" />
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
          )}

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
