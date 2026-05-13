import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Heart, AlertCircle, Star } from 'lucide-react';

export default function ParentBehaviorSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Activity className="h-6 w-6 text-orange-500" />
              <div className="h-8 bg-linear-to-r from-orange-200 to-orange-100 dark:from-orange-800 dark:to-orange-700 rounded-lg w-64 animate-pulse" />
            </div>
            <div className="h-4 bg-linear-to-r from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-800 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
        </div>
        <div>
          <Skeleton className="h-9 w-full sm:w-48 bg-orange-200/70 dark:bg-orange-900/50" />
        </div>
      </div>

      {/* Summary Cards with new pattern */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
        {/* Total Events */}
        <div className="shadow-lg border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/15 dark:bg-blue-400/10 rounded-full -mr-8 -mt-8" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-blue-500/30 dark:bg-blue-900/50 items-center justify-center hidden sm:flex">
              <Activity className="w-6 h-6 text-blue-500/60" />
            </div>
          </div>
          <div className="h-1 w-full bg-blue-500/40" />
        </div>

        {/* Positive Events */}
        <div className="shadow-lg border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full -mr-8 -mt-8" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-emerald-500/30 dark:bg-emerald-900/50 items-center justify-center hidden sm:flex">
              <Heart className="w-6 h-6 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1 w-full bg-emerald-500/40" />
        </div>

        {/* Negative Events */}
        <div className="shadow-lg border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/15 dark:bg-red-400/10 rounded-full -mr-8 -mt-8" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-20 mb-1" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-red-500/30 dark:bg-red-900/50 items-center justify-center hidden sm:flex">
              <AlertCircle className="w-6 h-6 text-red-500/60" />
            </div>
          </div>
          <div className="h-1 w-full bg-red-500/40" />
        </div>

        {/* Total Achievements */}
        <div className="shadow-lg border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/15 dark:bg-orange-400/10 rounded-full -mr-8 -mt-8" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-24 mt-1" />
            </div>
            <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-orange-500/30 dark:bg-orange-900/50 items-center justify-center hidden sm:flex">
              <Star className="w-6 h-6 text-orange-500/60" />
            </div>
          </div>
          <div className="h-1 w-full bg-orange-500/40" />
        </div>
      </div>

      {/* Behavior Events */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-orange-500/30">
            <Activity className="w-6 h-6 text-orange-500/60" />
          </div>
          <div>
            <Skeleton className="h-6 w-56 mb-1" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl rounded-lg p-5 space-y-3">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
