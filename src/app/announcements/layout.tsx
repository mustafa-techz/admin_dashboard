import type { Metadata } from 'next';

import schoolConfig from "@/config/school.json";

export const metadata: Metadata = {
  title: `Announcements & Events | ${schoolConfig.schoolName}`,
  description: 'View upcoming school events, academic schedules, exam notices, and other important announcements.',
};

export default function AnnouncementsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
