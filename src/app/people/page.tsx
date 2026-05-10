'use client';

import NavGroupGrid from '@/components/layout/NavGroupGrid';
import { NAVIGATION_CONFIG } from '@/config/navigation';

export default function PeoplePage() {
  return (
    <NavGroupGrid 
      title="People" 
      description="Manage staff, students, and parent accounts."
      items={NAVIGATION_CONFIG.groups.people} 
    />
  );
}
