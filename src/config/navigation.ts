import { 
  Home, 
  Users, 
  BookOpen, 
  Calendar, 
  User as UserIcon, 
  MessageCircle, 
  Bell, 
  IndianRupee, 
  CalendarDays, 
  ClipboardList, 
  GraduationCap,
  Settings,
  LogOut
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { UserRole } from '@/types/user';

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles?: UserRole[];
};

export const NAVIGATION_CONFIG = {
  bottomNav: {
    admin: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'People', href: '/people', icon: Users },
      { label: 'Fees', href: '/fees', icon: IndianRupee },
    ],
    'sub-admin': [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'People', href: '/people', icon: Users },
      { label: 'Fees', href: '/fees', icon: IndianRupee },
    ],
    teacher: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'Profile', href: '/profile', icon: UserIcon },
      { label: 'Students', href: '/students', icon: UserIcon },
    ],
    parent: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'Fees', href: '/fees', icon: IndianRupee },
    ],
  } as Record<UserRole, NavItem[]>,

  desktopNav: [
    { label: 'Home', href: '/dashboard' },
    { label: 'Chat', href: '/chat' },
    { label: 'Academics', href: '/academics' },
    { label: 'People', href: '/people', roles: ['admin', 'sub-admin'] },
    { label: 'Students', href: '/students', roles: ['teacher'] },
    { label: 'Fees', href: '/fees', roles: ['admin', 'sub-admin', 'parent'] },
  ],

  groups: {
    academics: [
      { label: 'Timetable', href: '/timetable', icon: CalendarDays, roles: ['admin', 'sub-admin', 'teacher', 'parent'] as UserRole[] },
      { label: 'Exams & Marks', href: '/exams', icon: ClipboardList, roles: ['admin', 'sub-admin', 'teacher', 'parent'] as UserRole[] },
      { label: 'Events', href: '/announcements', icon: Bell, roles: ['admin', 'sub-admin', 'teacher', 'parent'] as UserRole[] },
      { label: 'Attendance', href: '/attendance', icon: Calendar, roles: ['admin', 'sub-admin', 'teacher'] as UserRole[] },
    ],
    people: [
      { label: 'Users', href: '/users', icon: Users, roles: ['admin'] as UserRole[] },
      { label: 'Teachers', href: '/teachers', icon: BookOpen, roles: ['admin', 'sub-admin'] as UserRole[] },
      { label: 'Students', href: '/students', icon: UserIcon, roles: ['admin', 'sub-admin', 'teacher'] as UserRole[] },
    ],
    more: [
      { label: 'Profile', href: '/profile', icon: UserIcon, roles: ['admin', 'sub-admin', 'teacher'] as UserRole[] },
      { label: 'Fees', href: '/fees', icon: IndianRupee, roles: ['admin', 'sub-admin', 'parent'] as UserRole[] },
      { label: 'Settings', href: '/profile', icon: Settings, roles: ['admin', 'sub-admin', 'teacher'] as UserRole[] },
      { label: 'Logout', href: '/login', icon: LogOut, roles: ['admin', 'sub-admin', 'teacher'] as UserRole[] },
    ]
  } satisfies Record<string, NavItem[]>
};
