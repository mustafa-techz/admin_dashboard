import { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  trend?: {
    value: number;
    isUp: boolean;
  };
  className?: string;
}

export default function DashboardCard({ title, value, icon, description, trend, className }: DashboardCardProps) {
  return (
    <div className={cn("p-6 bg-card rounded-2xl border border-border shadow-soft hover:shadow-lg transition-all duration-300 group", className)}>
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 bg-primary/10 rounded-xl group-hover:bg-primary/20 transition-colors">
          <div className="text-primary">{icon}</div>
        </div>
        {trend && (
          <div className={cn(
            "text-xs font-bold px-2 py-1 rounded-full",
            trend.isUp ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
          )}>
            {trend.isUp ? '+' : '-'}{trend.value}%
          </div>
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
        <h3 className="text-2xl font-bold tracking-tight text-foreground">{value}</h3>
        {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
      </div>
    </div>
  );
}
