import { Skeleton } from '@/components/ui/skeleton';

export default function ParentDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
          <div className="h-8 sm:h-10 bg-linear-to-r from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg w-60 sm:w-80 max-w-full animate-pulse mb-1" />
          <div className="h-4 sm:h-5 bg-linear-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-800 rounded-lg w-full max-w-md animate-pulse" />
        </div>
        <div className="hidden sm:flex items-center gap-3">
          <div className="h-8 w-20 rounded-lg bg-slate-200 animate-pulse" />
        </div>
      </div>

      {/* Summary Cards with exact live styling */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 md:gap-5">
        {/* Children Linked */}
        <div className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group rounded-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/15 dark:bg-sky-400/10 rounded-full -mr-8 -mt-8" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <div className="h-2.5 bg-sky-300 dark:bg-sky-600 rounded w-20 mb-1 animate-pulse" />
              <div className="h-6 sm:h-8 bg-sky-300 dark:bg-sky-600 rounded w-12 mb-1 animate-pulse" />
              <div className="h-2 sm:h-2.5 bg-sky-300 dark:bg-sky-600 rounded w-24 animate-pulse" />
            </div>
            <div className="hidden md:flex shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-sky-500/40 dark:bg-sky-700/40" />
          </div>
          <div className="h-1 w-full bg-linear-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" />
        </div>

        {/* Attendance Records */}
        <div className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group rounded-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full -mr-8 -mt-8" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <div className="h-2.5 bg-emerald-300 dark:bg-emerald-600 rounded w-24 mb-1 animate-pulse" />
              <div className="h-7 sm:h-10 bg-emerald-300 dark:bg-emerald-600 rounded w-12 mb-1 animate-pulse" />
              <div className="h-2 sm:h-2.5 bg-emerald-300 dark:bg-emerald-600 rounded w-28 animate-pulse" />
            </div>
            <div className="hidden md:flex shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-emerald-500/40 dark:bg-emerald-700/40" />
          </div>
          <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
        </div>

        {/* Behavioral Events */}
        <div className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group rounded-lg">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/15 dark:bg-orange-400/10 rounded-full -mr-8 -mt-8" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <div className="h-2.5 bg-orange-300 dark:bg-orange-600 rounded w-20 mb-1 animate-pulse" />
              <div className="h-6 sm:h-8 bg-orange-300 dark:bg-orange-600 rounded w-12 mb-1 animate-pulse" />
              <div className="h-2 sm:h-2.5 bg-orange-300 dark:bg-orange-600 rounded w-24 animate-pulse" />
            </div>
            <div className="hidden md:flex shrink-0 w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-orange-500/40 dark:bg-orange-700/40" />
          </div>
          <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
        </div>
      </div>

      {/* ML Risk Insights */}
      <div className="space-y-6 mt-8">
        {/* Section Header */}
        <div className="flex flex-row items-center gap-2 sm:gap-4">
          <div className="p-2 sm:p-3 rounded-2xl bg-linear-to-br from-blue-900 to-blue-700 shadow-lg shadow-blue-600/25 shrink-0 w-10 h-10 sm:w-12 sm:h-12 animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-7 sm:h-8 bg-linear-to-r from-blue-300 to-blue-200 dark:from-blue-600 dark:to-blue-700 rounded-lg w-full sm:w-80 animate-pulse" />
            <div className="h-4 sm:h-5 bg-linear-to-r from-slate-300 to-slate-200 dark:from-slate-600 dark:to-slate-700 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
        </div>

        {/* StudentRiskCard Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-3 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 rounded-2xl animate-pulse border border-blue-200 dark:border-blue-900/30 shadow-lg overflow-hidden relative">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-10 -mt-10" />
              <div className="h-1.5 bg-blue-300 dark:bg-blue-600" />
              <div className="p-3 space-y-3 relative z-10">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="h-5 bg-blue-300 dark:bg-blue-600 rounded w-3/4" />
                    <div className="h-3 bg-blue-300 dark:bg-blue-600 rounded w-1/2" />
                  </div>
                  <div className="hidden md:block h-6 bg-blue-300 dark:bg-blue-600 rounded-full w-16 shrink-0" />
                </div>

                <div className="p-2 rounded-lg bg-blue-100/70 dark:bg-blue-900/35 space-y-2 border border-blue-200/60 dark:border-blue-800/30">
                  <div className="h-3 bg-blue-300 dark:bg-blue-600 rounded w-24" />
                  <div className="h-3 bg-blue-300 dark:bg-blue-600 rounded w-full" />
                  <div className="h-3 bg-blue-300 dark:bg-blue-600 rounded w-5/6" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-lg bg-red-100/80 dark:bg-red-950/35 p-2.5 border border-red-200/70 dark:border-red-900/35 space-y-2">
                    <div className="h-3 bg-red-300 dark:bg-red-600 rounded w-16" />
                    <div className="h-6 bg-red-300 dark:bg-red-600 rounded w-12" />
                  </div>
                  <div className="rounded-lg bg-emerald-100/80 dark:bg-emerald-950/35 p-2.5 border border-emerald-200/70 dark:border-emerald-900/35 space-y-2">
                    <div className="h-3 bg-emerald-300 dark:bg-emerald-600 rounded w-16" />
                    <div className="h-6 bg-emerald-300 dark:bg-emerald-600 rounded w-12" />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2">
                  <div className="h-8 bg-blue-200 dark:bg-blue-700 rounded-lg" />
                  <div className="h-8 bg-amber-200 dark:bg-amber-700 rounded-lg" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
