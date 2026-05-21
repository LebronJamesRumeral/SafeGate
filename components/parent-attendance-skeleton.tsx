import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckCircle2, Clock3, XCircle } from 'lucide-react';

export default function ParentAttendanceSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-64 sm:w-72" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4">
        {/* Present */}
        <div className="shadow-xl border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/15 dark:bg-sky-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28 mt-1" />
            </div>
            <div className="hidden md:flex w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-linear-to-br from-sky-500 to-sky-600 text-white items-center justify-center shadow-md shadow-sky-500/20 dark:shadow-sky-500/10 group-hover:scale-105 transition-all duration-300">
            </div>
          </div>
          <div className="h-1 w-full bg-linear-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" />
        </div>

        {/* Late Arrivals */}
        <div className="shadow-xl border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-24 mb-1" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-28 mt-1" />
            </div>
            <div className="hidden md:flex w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10 group-hover:scale-105 transition-all duration-300">
            </div>
          </div>
          <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
        </div>

        {/* Absent */}
        <div className="shadow-xl border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg group">
          <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/15 dark:bg-orange-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
          <div className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
            <div className="flex-1 min-w-0">
              <Skeleton className="h-3 w-16 mb-1" />
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-20 mt-1" />
            </div>
            <div className="hidden md:flex w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-md shadow-orange-500/20 dark:shadow-orange-500/10 group-hover:scale-105 transition-all duration-300">
            </div>
          </div>
          <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
        </div>
      </div>

      {/* Child Attendance Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 shadow-lg shadow-blue-600/25 w-14 h-14 animate-pulse" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-500" />
              <div className="h-6 bg-linear-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-700 rounded-lg w-48 animate-pulse" />
            </div>
            <div className="h-4 bg-linear-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
              <div className="h-1.5 bg-linear-to-r from-blue-400 to-blue-600" />
              <div className="p-5 space-y-3">
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="p-3 rounded-lg bg-blue-100/60 dark:bg-blue-900/30 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
