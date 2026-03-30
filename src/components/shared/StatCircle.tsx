'use client';

import { cn } from '@/lib/utils';

interface StatCircleProps {
  value: number;
  total: number;
  label: string;
  subLabel?: string;
  size?: number;
  strokeWidth?: number;
  color?: string;
}

export default function StatCircle({
  value,
  total,
  label,
  subLabel,
  size = 160,
  strokeWidth = 12,
  color = "var(--primary)"
}: StatCircleProps) {
  const percentage = (value / total) * 100;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg className="transform -rotate-90 w-full h-full">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="currentColor"
            strokeWidth={strokeWidth}
            fill="transparent"
            className="text-secondary"
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={color}
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={circumference}
            style={{ strokeDashoffset: offset }}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-3xl font-black tracking-tight">{value}</span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">/ {total}</span>
        </div>
      </div>
      <div className="mt-4 text-center">
        <p className="text-sm font-bold text-foreground">{label}</p>
        {subLabel && <p className="text-xs text-muted-foreground">{subLabel}</p>}
      </div>
    </div>
  );
}
