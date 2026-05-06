import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Announcements & Events | SchoolDash',
  description: 'View upcoming school events, academic schedules, exam notices, and other important announcements.',
};

export default function AnnouncementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
