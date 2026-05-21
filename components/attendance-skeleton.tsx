import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle, Users, TrendingDown, BarChart3 } from 'lucide-react';

export default function AttendanceSkeleton() {
  return (
    <>
      {/* Mobile skeleton - visible on small screens only */}
      <div className="space-y-5 animate-fade-in-up px-4 md:hidden">
        {/* Mobile Header */}
        <div className="pt-3 pb-2">
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-72 mb-3" />

          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-lg ml-auto" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full mb-1" />
        </div>

        {/* Metric Cards - mobile: two columns (colored variants) */}
        <div className="grid grid-cols-2 gap-3">
          <div className="relative p-3 rounded-xl shadow-sm overflow-hidden bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-6 -mb-6" />
            <div className="relative z-10">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-2 w-24 mt-2" />
            </div>
          </div>
          <div className="relative p-3 rounded-xl shadow-sm overflow-hidden bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-6 -mb-6" />
            <div className="relative z-10">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-2 w-24 mt-2" />
            </div>
          </div>
          <div className="relative p-3 rounded-xl shadow-sm overflow-hidden bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-6 -mb-6" />
            <div className="relative z-10">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-2 w-24 mt-2" />
            </div>
          </div>
          <div className="relative p-3 rounded-xl shadow-sm overflow-hidden bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80">
            <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-8 -mt-8" />
            <div className="absolute bottom-0 left-0 w-12 h-12 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-6 -mb-6" />
            <div className="relative z-10">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-2 w-24 mt-2" />
            </div>
          </div>
        </div>

        {/* Filters summary */}
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-40 rounded-full" />
            <div className="ml-auto"><Skeleton className="h-9 w-20 rounded-lg" /></div>
          </div>
        </div>

        {/* Tabs (Summary / Logs) */}
        <div className="mt-2 flex gap-3">
          <Skeleton className="flex-1 h-9 rounded-md" />
          <Skeleton className="flex-1 h-9 rounded-md" />
        </div>

        {/* List - card style */}
        <div className="space-y-3 pb-40">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/5 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop / larger screens - visible on md+ */}
      <div className="hidden md:block space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-2">
            <div className="h-10 w-80 bg-linear-to-r from-slate-200 to-slate-100 dark:from-slate-700 dark:to-slate-600 rounded-lg animate-pulse" />
            <div className="h-4 bg-linear-to-r from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-700 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-28 rounded-lg bg-blue-200/70 dark:bg-blue-900/50" />
            <Skeleton className="h-9 w-36 rounded-full bg-orange-200/70 dark:bg-orange-900/50" />
          </div>
        </div>

        {/* Date Range Display */}
        <div className="flex w-full flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 border border-blue-200/60 dark:border-blue-700/40 sm:w-fit">
          <Skeleton className="h-5 w-5 rounded-full bg-blue-200/80 dark:bg-blue-800/60" />
          <Skeleton className="h-4 w-44 bg-blue-200/70 dark:bg-blue-900/50" />
          <Skeleton className="ml-2 h-6 w-24 rounded-full bg-blue-200/70 dark:bg-blue-900/50" />
        </div>

        {/* Collapsed Filters Summary */}
        <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40">
          <div className="space-y-1 min-w-0 flex-1">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-3 w-72 max-w-full" />
          </div>
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>

        {/* Metric Cards */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="shadow-xl border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16" />
            <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
              <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-blue-500/30 dark:bg-blue-900/50 items-center justify-center">
                <Users className="w-8 h-8 text-blue-500/60" />
              </div>
            </div>
            <div className="h-1.5 w-full bg-blue-500/40" />
          </div>

          <div className="shadow-xl border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16" />
            <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
              <div className="flex-1">
                <Skeleton className="h-3 w-28 mb-2" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/30 dark:bg-emerald-900/50 items-center justify-center">
                <CheckCircle className="w-8 h-8 text-emerald-500/60" />
              </div>
            </div>
            <div className="h-1.5 w-full bg-emerald-500/40" />
          </div>

          <div className="shadow-xl border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16" />
            <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
              <div className="flex-1">
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-28 mt-2" />
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-orange-500/30 dark:bg-orange-900/50 items-center justify-center">
                <TrendingDown className="w-8 h-8 text-orange-500/60" />
              </div>
            </div>
            <div className="h-1.5 w-full bg-orange-500/40" />
          </div>

          <div className="shadow-xl border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 dark:bg-violet-400/5 rounded-full -mr-16 -mt-16" />
            <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
              <div className="flex-1">
                <Skeleton className="h-3 w-28 mb-2" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-24 mt-2" />
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-violet-500/30 dark:bg-violet-900/50 items-center justify-center">
                <BarChart3 className="w-8 h-8 text-violet-500/60" />
              </div>
            </div>
            <div className="h-1.5 w-full bg-violet-500/40" />
          </div>
        </div>

        {/* Attendance Summary Chart */}
      <div className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
        <div className="border-b border-sky-200/50 dark:border-sky-700/40 bg-linear-to-r from-sky-50/60 via-sky-50/30 to-transparent dark:from-sky-950/30 dark:via-sky-950/15 dark:to-transparent pb-5 p-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-sky-500/30">
              <BarChart3 className="w-5 h-5 text-sky-500/60" />
            </div>
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-72" />
            </div>
          </div>
        </div>
        <div className="p-5">
          <Skeleton className="h-64 w-full rounded-lg bg-sky-100/70 dark:bg-sky-900/35" />
        </div>
      </div>

        {/* Attendance Table */}
        <div className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
          <div className="border-b border-emerald-200/50 dark:border-emerald-700/40 bg-linear-to-r from-emerald-50/60 via-emerald-50/30 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-transparent pb-5 p-5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-emerald-500/30">
                <Users className="w-5 h-5 text-emerald-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-56 mb-1" />
                <Skeleton className="h-4 w-80" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-emerald-100/50 dark:bg-emerald-900/20">
                  {[...Array(5)].map((_, i) => (
                    <th key={i} className="px-6 py-3"><Skeleton className="h-4 w-16" /></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...Array(6)].map((_, i) => (
                  <tr key={i} className="border-b border-emerald-100/30 dark:border-emerald-800/20 last:border-0">
                    {[...Array(5)].map((_, j) => (
                      <td key={j} className="px-6 py-4"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
