import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, UserCircle2, Users } from 'lucide-react';

export function GuidanceReviewPageSkeleton() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in-up">
      <div className="rounded-2xl border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-9 w-72" />
            <Skeleton className="h-4 w-md max-w-full" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-7 w-32 rounded-full" />
            <Skeleton className="h-7 w-24 rounded-full" />
            <Skeleton className="h-7 w-40 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/45 p-3 space-y-2"
            >
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-6 w-12" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm p-5 sm:p-6 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-blue-600" />
            <Skeleton className="h-6 w-24" />
          </div>
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>

        <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-white/70 dark:bg-slate-900/30">
          <Skeleton className="h-5 w-64" />
          <Skeleton className="h-4 w-44" />
          <Skeleton className="h-4 w-56" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        <div className="xl:col-span-5 space-y-4">
          <div className="rounded-2xl border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm p-5 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <Skeleton className="h-6 w-28" />
              </div>
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>

            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border/70 p-3 bg-white/80 dark:bg-slate-900/40 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-5 w-36" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-full" />
                  <div className="flex items-center justify-between gap-2 mt-3">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-7 space-y-4">
          <div className="rounded-2xl border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm p-10">
            <div className="text-center space-y-3">
              <UserCircle2 className="w-10 h-10 text-slate-400 mx-auto" />
              <Skeleton className="h-5 w-56 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200/70 dark:border-slate-700/60">
              <Skeleton className="h-6 w-40" />
            </div>
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}