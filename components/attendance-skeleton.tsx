import { Skeleton } from '@/components/ui/skeleton';
import { Calendar, CheckCircle, Users, TrendingDown, BarChart3 } from 'lucide-react';

export default function AttendanceSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Calendar className="h-6 w-6 text-emerald-500" />
              <div className="h-8 bg-linear-to-r from-emerald-200 to-emerald-100 dark:from-emerald-800 dark:to-emerald-700 rounded-lg w-64 animate-pulse" />
            </div>
            <div className="h-4 bg-linear-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900 dark:to-emerald-800 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg bg-emerald-200/70 dark:bg-emerald-900/50" />
          <Skeleton className="h-9 w-28 rounded-lg bg-emerald-200/70 dark:bg-emerald-900/50" />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Present */}
        <div className="shadow-xl border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/30 dark:bg-emerald-900/50 items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-500/40" />
        </div>

        {/* Late Arrivals */}
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
              <TrendingDown className="w-8 h-8 text-orange-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-orange-500/40" />
        </div>

        {/* Absent */}
        <div className="shadow-xl border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-20 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-red-500/30 dark:bg-red-900/50 items-center justify-center">
              <Users className="w-8 h-8 text-red-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-red-500/40" />
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
  );
}
