'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { RefreshCw, Check } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface RefreshButtonProps {
  /** 
   * Array of query keys or partial keys to invalidate. 
   * Example: [['timetable'], ['classes']] 
   */
  queryKeys: any[][];
  className?: string;
  label?: string;
  variant?: 'ghost' | 'outline' | 'secondary' | 'default';
  size?: 'sm' | 'md' | 'lg' | 'icon';
}

/**
 * A highly optimized, throttled Refresh button for Enterprise-grade cache management.
 * Features smooth animations, loading states, and scoped invalidation.
 */
const RefreshButton = React.memo(({ 
  queryKeys: targetKeys, 
  className, 
  label, 
  variant = 'outline',
  size = 'sm'
}: RefreshButtonProps) => {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'idle' | 'refreshing' | 'refreshed'>('idle');

  const handleRefresh = useCallback(async () => {
    if (status === 'refreshing') return;

    setStatus('refreshing');
    
    try {
      // 1. Invalidate queries to mark them as stale
      await Promise.all(
        targetKeys.map(key => 
          queryClient.invalidateQueries({ 
            queryKey: key,
          })
        )
      );

      // 2. Explicitly trigger refetch for all active queries matching the keys
      // This ensures the UI actually updates immediately
      await Promise.all(
        targetKeys.map(key => 
          queryClient.refetchQueries({ 
            queryKey: key,
            type: 'active'
          })
        )
      );
      
      setStatus('refreshed');
      
      // Return to idle after a visual confirmation period
      setTimeout(() => setStatus('idle'), 2000);
    } catch (error) {
      console.error('[Refresh Error]', error);
      setStatus('idle');
    }
  }, [queryClient, targetKeys, status]);

  return (
    <Button
      variant={variant}
      size={size === 'icon' ? 'icon' : 'sm'}
      onClick={handleRefresh}
      disabled={status === 'refreshing'}
      className={cn(
        "relative rounded-xl border-border/50 transition-all duration-300",
        status === 'refreshing' && "opacity-80 scale-95",
        status === 'refreshed' && "text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:border-green-900/50",
        className
      )}
    >
      <div className="flex items-center justify-center min-w-[1.25rem]">
        {status === 'refreshing' ? (
          <RefreshCw className="w-4 h-4 animate-spin" />
        ) : status === 'refreshed' ? (
          <Check className="w-4 h-4 animate-in zoom-in duration-300" />
        ) : (
          <RefreshCw className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" />
        )}
      </div>
      
      {label && (
        <span className={cn(
          "ml-2 font-black uppercase tracking-tighter text-[10px] hidden sm:inline",
          status === 'refreshed' ? "text-green-600" : "text-muted-foreground"
        )}>
          {status === 'refreshed' ? 'UPDATED' : label}
        </span>
      )}
    </Button>
  );
});

RefreshButton.displayName = 'RefreshButton';

export default RefreshButton;
