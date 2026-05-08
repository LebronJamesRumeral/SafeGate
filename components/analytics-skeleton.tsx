import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, BarChart3, CheckCircle, XCircle, TrendingUp } from 'lucide-react';

export function AnalyticsPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp className="h-6 w-6 text-slate-500" />
            <Skeleton className="h-8 w-72" />
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Tab strip */}
      <div className="flex w-full gap-2 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl sm:w-fit">
        <Skeleton className="h-9 w-28 rounded-lg" />
        <Skeleton className="h-9 w-28 rounded-lg" />
      </div>

      {/* Summary cards with new pattern */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Analyzed Data Points */}
        <div className="shadow-xl border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-500/5 dark:bg-sky-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-sky-500/30 dark:bg-sky-900/50 items-center justify-center">
              <BarChart3 className="w-8 h-8 text-sky-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-sky-500/40" />
        </div>

        {/* Positive Events */}
        <div className="shadow-xl border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/30 dark:bg-emerald-900/50 items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-500/40" />
        </div>

        {/* Notable Events */}
        <div className="shadow-xl border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-orange-500/30 dark:bg-orange-900/50 items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-orange-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-orange-500/40" />
        </div>

        {/* Flagged Events */}
        <div className="shadow-xl border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-red-500/30 dark:bg-red-900/50 items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-red-500/40" />
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