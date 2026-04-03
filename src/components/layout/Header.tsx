import { useAuthStore } from '@/store/authStore';
import { Bell, User as UserIcon, MapPin } from 'lucide-react';
import Link from 'next/link';
import { logoutUser } from '@/services/auth.service';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { branchService } from '@/services/firebase/masterDataService';
import { useEffect } from 'react';

export default function Header() {
  const { user, role } = useAuthStore();
  const queryClient = useQueryClient();

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

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const branchId = e.target.value;
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

  const navLinks = [
    { label: 'Home', href: '/dashboard' },
    { label: 'Users', href: '/users', roles: ['admin'] },
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
          {/* Branch Dropdown */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-secondary rounded-xl border border-border">
            <MapPin size={14} className="text-primary" />
            <select
              value={selectedBranch?.id || ''}
              onChange={handleBranchChange}
              className="bg-transparent text-xs font-bold focus:outline-none cursor-pointer"
            >
              {branches.map(branch => (
                <option key={branch.id} value={branch.id}>
                  {branch.branchName}
                </option>
              ))}
            </select>
          </div>

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
