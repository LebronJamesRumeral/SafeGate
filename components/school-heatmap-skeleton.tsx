import { Skeleton } from '@/components/ui/skeleton';
import { Archive, Flame, MapPinned, ShieldAlert } from 'lucide-react';

export function SchoolHeatmapSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPinned className="h-6 w-6 text-orange-500" />
              <div className="h-8 bg-linear-to-r from-orange-200 to-orange-100 dark:from-orange-800 dark:to-orange-700 rounded-lg w-80 sm:w-96 animate-pulse" />
            </div>
            <div className="h-4 bg-linear-to-r from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-800 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
        </div>

        <div className="flex items-center gap-2 bg-orange-50/60 border border-orange-200 rounded-full px-2 py-1 shadow-sm">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-16 rounded-full bg-orange-200/70 dark:bg-orange-900/50" />
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Behavioral Logs */}
        <div className="shadow-xl border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-blue-500/30 dark:bg-blue-900/50 items-center justify-center">
              <Archive className="w-8 h-8 text-blue-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-blue-500/40" />
        </div>

        {/* Critical Incidents */}
        <div className="shadow-xl border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-red-500/30 dark:bg-red-900/50 items-center justify-center">
              <Flame className="w-8 h-8 text-red-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-red-500/40" />
        </div>

        {/* Mapped Areas */}
        <div className="shadow-xl border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-orange-500/30 dark:bg-orange-900/50 items-center justify-center">
              <MapPinned className="w-8 h-8 text-orange-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-orange-500/40" />
        </div>

        {/* ML High-Risk Students */}
        <div className="shadow-xl border-0 bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 dark:bg-rose-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-rose-500/5 dark:bg-rose-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-28 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-rose-500/30 dark:bg-rose-900/50 items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-rose-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-rose-500/40" />
        </div>
      </div>

      {/* Main Grid - Satellite + Activity */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        {/* Satellite School View */}
        <div className="xl:col-span-8 border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
          <div className="border-b border-orange-200/50 dark:border-orange-700/40 bg-linear-to-r from-orange-50/60 via-orange-50/30 to-transparent dark:from-orange-950/30 dark:via-orange-950/15 dark:to-transparent pb-5 p-5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-orange-500/30">
                <MapPinned className="w-5 h-5 text-orange-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-56 mb-1" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
            </div>
          </div>
          <div className="p-5">
            <div className="relative rounded-xl border border-orange-200/60 dark:border-orange-700/30 overflow-hidden bg-slate-100 dark:bg-slate-800/50">
              <Skeleton className="h-80 sm:h-96 lg:h-130 w-full" />
              <div className="absolute inset-0 p-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="absolute"
                    style={{
                      top: `${18 + (i % 3) * 22}%`,
                      left: `${12 + (i % 2) * 45}%`,
                    }}
                  >
                    <Skeleton className="h-10 w-10 rounded-full" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Activity Room */}
        <div className="xl:col-span-4 border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
          <div className="border-b border-sky-200/50 dark:border-sky-700/40 bg-linear-to-r from-sky-50/60 via-sky-50/30 to-transparent dark:from-sky-950/30 dark:via-sky-950/15 dark:to-transparent pb-5 p-5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-sky-500/30">
                <Flame className="w-5 h-5 text-sky-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-44 mb-1" />
                <Skeleton className="h-4 w-64 max-w-full" />
              </div>
            </div>
          </div>
          <div className="p-5 space-y-4">
            {/* Heat Level Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-slate-200/80 bg-linear-to-br from-slate-50 to-slate-50/50 p-3.5 dark:border-slate-700/60 dark:bg-linear-to-br dark:from-slate-900/40 dark:to-slate-800/20">
                <Skeleton className="h-3 w-16 mb-2" />
                <Skeleton className="h-7 w-20" />
              </div>
              <div className="rounded-lg border border-slate-200/80 bg-linear-to-br from-slate-50 to-slate-50/50 p-3.5 dark:border-slate-700/60 dark:bg-linear-to-br dark:from-slate-900/40 dark:to-slate-800/20">
                <Skeleton className="h-3 w-20 mb-2" />
                <Skeleton className="h-7 w-20" />
              </div>
            </div>

            {/* Severity Breakdown */}
            <div className="rounded-lg border border-slate-200/80 p-3 space-y-2">
              <Skeleton className="h-3 w-28" />
              <div className="flex flex-wrap gap-2">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-6 w-20 rounded-md" />
                ))}
              </div>
            </div>

            {/* ML Risk Signal */}
            <div className="rounded-lg border border-rose-200 dark:border-rose-900/50 bg-rose-50/70 dark:bg-rose-950/30 p-3">
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-full" />
            </div>

            {/* Contextual Behavior */}
            <div className="rounded-lg border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/70 dark:bg-indigo-950/30 p-3 space-y-3">
              <Skeleton className="h-4 w-40" />
              {[...Array(2)].map((_, i) => (
                <div key={i} className="space-y-1">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-full" />
                </div>
              ))}
            </div>

            {/* Recent Logs */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-28" />
              <div className="rounded-lg border border-slate-200/80 dark:border-slate-700/70 p-3">
                <Skeleton className="h-3 w-full max-w-xs" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Area / Room Mapper */}
      <div className="border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
        <div className="border-b border-amber-200/50 dark:border-amber-700/40 bg-linear-to-r from-amber-50/60 via-amber-50/30 to-transparent dark:from-amber-950/30 dark:via-amber-950/15 dark:to-transparent pb-5 p-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-amber-500/30">
              <MapPinned className="w-5 h-5 text-amber-500/60" />
            </div>
            <div>
              <Skeleton className="h-6 w-56 mb-1" />
              <Skeleton className="h-4 w-80 max-w-full" />
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4">
          {/* Add Zone Inputs */}
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2 xl:grid-cols-4">
            <Skeleton className="h-10 w-full xl:col-span-2 rounded-lg" />
            <Skeleton className="h-10 w-full xl:col-span-2 rounded-lg" />
          </div>

          {/* Add Button */}
          <Skeleton className="h-10 w-48 rounded-lg" />

          {/* Zone List */}
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-lg border border-amber-200/60 dark:border-amber-700/40 bg-white/70 dark:bg-slate-900/40 px-3.5 py-2.5 flex items-center justify-between">
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-8 w-8 rounded-md ml-2" />
              </div>
            ))}
          </div>

          {/* Bulk Delete Info */}
          <div className="rounded-lg border border-dashed border-amber-300/80 dark:border-amber-900/60 bg-amber-50/60 dark:bg-amber-950/25 p-3">
            <Skeleton className="h-3 w-full max-w-3xl" />
          </div>
        </div>
      </div>
    </div>
  );
}
