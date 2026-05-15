'use client';

import { AlertTriangle, RefreshCcw } from 'lucide-react';

export default function PageError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[300px] flex items-center justify-center p-6">
      <div className="max-w-sm w-full bg-card border border-border rounded-2xl p-6 shadow-lg text-center space-y-4">
        <div className="w-14 h-14 bg-red-50 rounded-full flex items-center justify-center mx-auto">
          <AlertTriangle className="text-red-500 w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h3 className="text-lg font-bold tracking-tight">Something went wrong</h3>
          <p className="text-sm text-muted-foreground">
            This page encountered an error. Your data is safe.
          </p>
        </div>
        {process.env.NODE_ENV === 'development' && (
          <div className="p-3 bg-muted rounded-xl text-left overflow-auto max-h-28">
            <code className="text-xs text-red-500 font-mono break-all">
              {error?.message}
            </code>
          </div>
        )}
        <button
          onClick={reset}
          className="flex items-center justify-center gap-2 mx-auto px-5 py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <RefreshCcw size={16} />
          Try Again
        </button>
      </div>
    </div>
  );
}
