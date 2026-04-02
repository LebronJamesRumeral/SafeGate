import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, BarChart3, CheckCircle, XCircle } from 'lucide-react';

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-72 mb-2" />
          <Skeleton className="h-5 w-96 max-w-full" />
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Skeleton className="h-9 w-full md:w-28 rounded-lg" />
          <Skeleton className="h-9 w-full md:w-24 rounded-lg" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex w-full gap-2 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl sm:w-fit">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Date and level filters */}
      <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 sm:p-6 rounded-xl border border-slate-200/60 dark:border-slate-700/40 shadow-lg">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/30 shadow-xl p-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-sky-500/10 items-center justify-center">
            <BarChart3 className="w-7 h-7 text-sky-400" />
          </div>
        </div>

        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 shadow-xl p-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center">
            <CheckCircle className="w-7 h-7 text-emerald-400" />
          </div>
        </div>

        <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/30 shadow-xl p-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-orange-500/10 items-center justify-center">
            <XCircle className="w-7 h-7 text-orange-400" />
          </div>
        </div>

        <div className="rounded-2xl bg-red-50 dark:bg-red-950/30 shadow-xl p-6 flex items-center justify-between">
          <div>
            <Skeleton className="h-4 w-36 mb-2" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-red-500/10 items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="rounded-2xl border bg-white/80 dark:bg-slate-800/70 p-5 shadow-md space-y-4">
            <Skeleton className="h-6 w-52" />
            <Skeleton className="h-4 w-64" />
            <Skeleton className="h-72 w-full rounded-xl" />
          </div>
        ))}
      </div>

      {/* Grade level cards */}
      <div className="rounded-2xl border bg-white/80 dark:bg-slate-800/70 p-4 sm:p-5 shadow-md space-y-4">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-violet-500/70" />
          <Skeleton className="h-6 w-60" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/60 dark:border-slate-700/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-5 w-14 rounded-full" />
              </div>
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-2 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}