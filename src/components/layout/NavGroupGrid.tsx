'use client';

import { useAuthStore } from '@/store/authStore';
import Link from 'next/link';
import { NavItem } from '@/config/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';

interface NavGroupGridProps {
  title: string;
  items: NavItem[];
  description?: string;
}

export default function NavGroupGrid({ title, items, description }: NavGroupGridProps) {
  const { role } = useAuthStore();

  const filteredItems = items.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 md:pb-8">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground mt-1 text-sm font-medium">{description}</p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex items-center gap-4 p-5 rounded-2xl bg-card border border-border shadow-soft hover:shadow-md hover:border-primary/40 transition-all active:scale-[0.98]"
            >
              <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                <Icon size={24} strokeWidth={2.5} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                  {item.label}
                </h3>
              </div>
              <ChevronRight size={20} className="text-muted-foreground opacity-50 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
            </Link>
          );
        })}
      </div>

      {filteredItems.length === 0 && (
        <div className="p-8 text-center bg-muted/30 rounded-2xl border border-dashed border-border">
          <p className="text-muted-foreground font-medium">No modules available for your role in this section.</p>
        </div>
      )}
    </div>
  );
}
