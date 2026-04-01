import { DashboardLayout } from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, CheckCircle, ClipboardList, TrendingDown } from 'lucide-react';

export default function AttendanceSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-9 w-32 rounded-lg" />
            <Skeleton className="h-9 w-36 rounded-lg" />
          </div>
        </div>

        {/* Date range pill */}
        <div className="inline-flex items-center gap-2 rounded-xl border border-blue-200/60 bg-blue-50/80 p-3">
          <CalendarDays className="h-5 w-5 text-blue-500" />
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Filters panel */}
        <div className="rounded-2xl border bg-white/80 dark:bg-slate-800/70 p-5 md:p-6 shadow">
          <div className="mb-4 space-y-2">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-9 w-24 rounded-lg" />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
          </div>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 shadow-xl p-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center">
              <CheckCircle className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 shadow-xl p-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-blue-500/10 items-center justify-center">
              <ClipboardList className="w-7 h-7 text-blue-400" />
            </div>
          </div>
          <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/30 shadow-xl p-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-4 w-28 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-28" />
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-orange-500/10 items-center justify-center">
              <TrendingDown className="w-7 h-7 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Charts section */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-white/70 dark:bg-slate-800/70 p-5 shadow-md space-y-4">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          ))}
        </div>

        {/* Attendance summary table */}
        <div className="rounded-2xl border bg-white/70 dark:bg-slate-800/70 shadow-md overflow-hidden">
          <div className="bg-slate-100/80 dark:bg-slate-900/50 p-4 grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full rounded" />
            ))}
          </div>
          {[...Array(10)].map((_, rowIndex) => (
            <div key={rowIndex} className="p-4 border-t border-slate-200/70 dark:border-slate-700/60 grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-full rounded" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
