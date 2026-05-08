import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, UserCircle2, Users, CheckCircle } from 'lucide-react';

export function GuidanceReviewPageSkeleton() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header & Quick Stats */}
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Skeleton className="h-10 w-80 max-w-full" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Skeleton className="h-8 w-36 rounded-full" />
            <Skeleton className="h-8 w-28 rounded-full" />
            <Skeleton className="h-8 w-40 rounded-full" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="shadow-xl border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
              <div className="absolute top-0 right-0 w-32 h-32 bg-slate-500/10 dark:bg-slate-400/5 rounded-full -mr-16 -mt-16" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-500/5 dark:bg-slate-400/5 rounded-full -ml-12 -mb-12" />
              <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
                <div className="space-y-2">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-10 w-20" />
                  <Skeleton className="h-3 w-36" />
                </div>
                <Skeleton className="hidden sm:block h-16 w-16 rounded-2xl" />
              </div>
              <div className="h-1.5 w-full bg-slate-300/50 dark:bg-slate-700/50" />
            </div>
          ))}
        </div>
      </div>

      {/* Search & Filters */}
      <section className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
        <div className="border-b border-slate-200/50 dark:border-slate-700/40 bg-linear-to-r from-slate-50/60 via-slate-50/30 to-transparent dark:from-slate-950/30 dark:via-slate-950/15 dark:to-transparent pb-5 p-5">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-500/30">
              <Users className="w-5 h-5 text-blue-500/60" />
            </div>
            <div>
              <Skeleton className="h-6 w-32 mb-1" />
              <Skeleton className="h-4 w-full max-w-xl" />
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
        {/* Work Queue */}
        <section className="xl:col-span-5 border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
          <div className="border-b border-amber-200/50 dark:border-amber-700/40 bg-linear-to-r from-amber-50/60 via-amber-50/30 to-transparent dark:from-amber-950/30 dark:via-amber-950/15 dark:to-transparent pb-5 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-amber-500/30">
                <AlertTriangle className="w-5 h-5 text-amber-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-44 mb-1" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            </div>
          </div>
          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border border-amber-200/50 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-amber-200/30">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Review Details */}
        <div className="xl:col-span-7 space-y-4">
          <section className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
            <div className="border-b border-slate-200/50 dark:border-slate-700/40 bg-linear-to-r from-slate-50/60 via-slate-50/30 to-transparent dark:from-slate-950/30 dark:via-slate-950/15 dark:to-transparent p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-blue-500/30">
                  <UserCircle2 className="w-5 h-5 text-blue-500/60" />
                </div>
                <div>
                  <Skeleton className="h-6 w-56 mb-1" />
                  <Skeleton className="h-4 w-64" />
                </div>
              </div>
            </div>
            <div className="p-5">
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="rounded-xl border border-slate-200/70 dark:border-slate-700/50 bg-white/70 dark:bg-slate-900/40 p-3 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
            <div className="p-5 space-y-4">
              <div className="flex flex-wrap gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-9 w-24 rounded-lg" />
                ))}
              </div>
              <div className="space-y-3">
                <Skeleton className="h-5 w-56" />
                <Skeleton className="h-4 w-72" />
                <Skeleton className="h-10 w-full max-w-3xl" />
                <Skeleton className="h-40 w-full rounded-xl" />
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
