import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, UserCircle2, Users, CheckCircle } from 'lucide-react';

export function GuidanceReviewPageSkeleton() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header & Quick Stats */}
      <div className="space-y-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 animate-pulse w-14 h-14" />
            <div className="space-y-2">
              <div className="h-10 bg-linear-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-700 rounded-lg w-80 max-w-full animate-pulse" />
              <div className="h-4 bg-linear-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg w-full max-w-2xl animate-pulse" />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 lg:justify-end">
            <Skeleton className="h-8 w-36 rounded-full bg-blue-200/70 dark:bg-blue-900/50" />
            <Skeleton className="h-8 w-28 rounded-full bg-amber-200/70 dark:bg-amber-900/50" />
            <Skeleton className="h-8 w-40 rounded-full bg-emerald-200/70 dark:bg-emerald-900/50" />
          </div>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {[
            { shell: 'from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80', dotTop: 'bg-blue-500/10 dark:bg-blue-400/5', dotBottom: 'bg-blue-500/5 dark:bg-blue-400/5', bar: 'bg-blue-300/50 dark:bg-blue-700/50' },
            { shell: 'from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80', dotTop: 'bg-amber-500/10 dark:bg-amber-400/5', dotBottom: 'bg-amber-500/5 dark:bg-amber-400/5', bar: 'bg-amber-300/50 dark:bg-amber-700/50' },
            { shell: 'from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80', dotTop: 'bg-emerald-500/10 dark:bg-emerald-400/5', dotBottom: 'bg-emerald-500/5 dark:bg-emerald-400/5', bar: 'bg-emerald-300/50 dark:bg-emerald-700/50' },
          ].map((variant, i) => (
            <div key={i} className={`shadow-xl border-0 bg-linear-to-br ${variant.shell} overflow-hidden relative rounded-lg`}>
              <div className={`absolute top-0 right-0 w-28 h-28 ${variant.dotTop} rounded-full -mr-12 -mt-12`} />
              <div className={`absolute bottom-0 left-0 w-20 h-20 ${variant.dotBottom} rounded-full -ml-10 -mb-10`} />
              <div className="p-3 sm:p-5 flex items-center justify-between relative z-10">
                <div className="space-y-1">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="hidden sm:block h-12 w-12 rounded-2xl" />
              </div>
              <div className={`h-1.5 w-full ${variant.bar}`} />
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
              <div key={i} className="rounded-lg border border-amber-200/50 dark:border-amber-700/40 bg-amber-50 dark:bg-amber-900/20 p-2.5">
                {/* Compact horizontal skeleton: title left, chips right */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <Skeleton className="h-4 w-40 sm:w-56" />
                    <Skeleton className="hidden sm:block h-3 w-full mt-1" />
                  </div>
                  <div className="flex items-center gap-2 shrink-0 whitespace-nowrap">
                    <Skeleton className="h-7 w-20 rounded-full" />
                    <Skeleton className="h-6 w-12 rounded-full" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                    <Skeleton className="hidden lg:block h-4 w-20" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Review Details */}
        <div className="xl:col-span-7 space-y-4">
          <section className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
            <div className="border-b border-blue-200/50 dark:border-blue-700/40 bg-linear-to-r from-blue-50/60 via-blue-50/30 to-transparent dark:from-blue-950/30 dark:via-blue-950/15 dark:to-transparent p-5">
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
                  <div key={i} className="rounded-xl border border-blue-200/70 dark:border-blue-700/50 bg-blue-50/70 dark:bg-blue-950/25 p-3 space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-12" />
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
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
