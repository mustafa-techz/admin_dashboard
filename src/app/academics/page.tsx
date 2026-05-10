'use client';

import NavGroupGrid from '@/components/layout/NavGroupGrid';
import { NAVIGATION_CONFIG } from '@/config/navigation';

export default function AcademicsPage() {
  return (
    <NavGroupGrid 
      title="Academics" 
      description="Manage schedules, exams, attendance, and school events."
      items={NAVIGATION_CONFIG.groups.academics} 
    />
  );
}
