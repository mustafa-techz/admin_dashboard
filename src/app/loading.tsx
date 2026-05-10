'use client';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 space-y-8 animate-in fade-in duration-700">
      <div className="relative">
        {/* Outer pulse ring */}
        <div className="absolute -inset-4 bg-primary/20 rounded-full blur-2xl animate-pulse" />
        
        {/* Main loader */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 border-4 border-primary/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-primary rounded-full border-t-transparent animate-spin shadow-lg shadow-primary/20" />
        </div>
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h2 className="text-xl font-black italic tracking-tighter text-foreground/80">
          LOADING DASHBOARD
        </h2>
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]" />
          <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" />
        </div>
      </div>

      {/* Skeleton-like placeholders to reduce layout shift */}
      <div className="w-full max-w-md space-y-4 px-4 opacity-50">
        <div className="h-4 bg-muted rounded-full w-3/4 mx-auto animate-pulse" />
        <div className="h-4 bg-muted rounded-full w-1/2 mx-auto animate-pulse [animation-delay:200ms]" />
      </div>
    </div>
  );
}
