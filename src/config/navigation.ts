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
      { label: 'Students', href: '/students', icon: UserIcon },
    ],
    'sub-admin': [
      { label: 'Home', href: '/dashboard', icon: Home },
      { label: 'Chat', href: '/chat', icon: MessageCircle },
      { label: 'Academics', href: '/academics', icon: GraduationCap },
      { label: 'People', href: '/people', icon: Users },
      { label: 'Students', href: '/students', icon: UserIcon },
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
      { label: 'Students', href: '/students', icon: UserIcon },
    ],
  } as Record<UserRole, NavItem[]>,

  desktopNav: [
    { label: 'Home', href: '/dashboard' },
    { label: 'Chat', href: '/chat' },
    { label: 'Academics', href: '/academics' },
    { label: 'People', href: '/people', roles: ['admin', 'sub-admin'] },
    { label: 'Students', href: '/students', roles: ['admin', 'sub-admin', 'teacher'] },
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
