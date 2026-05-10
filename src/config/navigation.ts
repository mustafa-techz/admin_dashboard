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
  MoreHorizontal, 
  GraduationCap,
  Settings,
  LogOut,
  FileText
} from 'lucide-react';
import { UserRole } from '@/types/user';

export type NavItem = {
  label: string;
  href: string;
  icon: any;
  roles?: UserRole[];
};

export const NAVIGATION_CONFIG = {
  bottomNav: {
    admin: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'People', href: '/people', icon: Users },
      { label: 'More', href: '/more', icon: MoreHorizontal },
    ],
    'sub-admin': [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'People', href: '/people', icon: Users },
      { label: 'More', href: '/more', icon: MoreHorizontal },
    ],
    teacher: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'Profile', href: '/profile', icon: UserIcon },
      { label: 'More', href: '/more', icon: MoreHorizontal },
    ],
    parent: [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'More', href: '/more', icon: MoreHorizontal },
    ],
  } as Record<UserRole, NavItem[]>,

  desktopNav: [
    { label: 'Home', href: '/dashboard' },
    { label: 'Chat', href: '/chat' },
    { label: 'Academics', href: '/academics' },
    { label: 'People', href: '/people', roles: ['admin', 'sub-admin'] },
    { label: 'More', href: '/more' },
  ],

  groups: {
    academics: [
      { label: 'Timetable', href: '/timetable', icon: CalendarDays, roles: ['admin', 'sub-admin', 'teacher', 'parent'] },
      { label: 'Exams & Marks', href: '/exams', icon: ClipboardList, roles: ['admin', 'sub-admin', 'teacher', 'parent'] },
      { label: 'Events', href: '/announcements', icon: Bell, roles: ['admin', 'sub-admin', 'teacher', 'parent'] },
      { label: 'Attendance', href: '/attendance', icon: Calendar, roles: ['admin', 'sub-admin', 'teacher'] },
    ],
    people: [
      { label: 'Users', href: '/users', icon: Users, roles: ['admin'] },
      { label: 'Teachers', href: '/teachers', icon: BookOpen, roles: ['admin', 'sub-admin'] },
      { label: 'Students', href: '/students', icon: UserIcon, roles: ['admin', 'sub-admin', 'teacher'] },
    ],
    more: [
      { label: 'Profile', href: '/profile', icon: UserIcon, roles: ['admin', 'sub-admin', 'teacher'] },
      { label: 'Fees', href: '/fees', icon: IndianRupee, roles: ['admin', 'sub-admin', 'parent'] },
      { label: 'Settings', href: '/profile', icon: Settings, roles: ['admin', 'sub-admin', 'teacher'] },
      { label: 'Logout', href: '/login', icon: LogOut, roles: ['admin', 'sub-admin', 'teacher'] },
    ]
  }
};
