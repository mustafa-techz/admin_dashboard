'use client';

import NavGroupGrid from '@/components/layout/NavGroupGrid';
import { NAVIGATION_CONFIG } from '@/config/navigation';

export default function MorePage() {
  return (
    <NavGroupGrid 
      title="More" 
      description="Settings, financial management, and profile."
      items={NAVIGATION_CONFIG.groups.more} 
    />
  );
}
