import { Skeleton } from '@/components/ui/skeleton';
import { Archive, Download, Search, Upload, Users, UserCheck, GraduationCap } from 'lucide-react';

export function MasterlistPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Archive size={28} className="text-blue-500/70" />
              <div className="h-9 bg-linear-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-700 rounded-lg w-64 animate-pulse" />
            </div>
            <div className="h-5 bg-linear-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg w-md max-w-full animate-pulse" />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="h-9 w-32 rounded-lg border border-blue-200/60 dark:border-blue-800/40 bg-blue-50/70 dark:bg-blue-950/35 px-3 flex items-center gap-2">
            <Search size={14} className="text-blue-500/70" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="h-9 w-24 rounded-lg border border-emerald-200/60 dark:border-emerald-800/40 bg-emerald-50/70 dark:bg-emerald-950/35 px-3 flex items-center gap-2">
            <Upload size={14} className="text-emerald-500/70" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="h-9 w-24 rounded-lg border border-violet-200/60 dark:border-violet-800/40 bg-violet-50/70 dark:bg-violet-950/35 px-3 flex items-center gap-2">
            <Download size={14} className="text-violet-500/70" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        {/* Total Students */}
        <div className="shadow-xl border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/15 dark:bg-blue-400/10 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8" />
          <div className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
            <div className="flex-1">
              <Skeleton className="h-2 sm:h-2.5 w-12 sm:w-16 mb-1" />
              <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" />
              <Skeleton className="h-2 sm:h-2.5 w-14 sm:w-20 mt-1" />
            </div>
            <div className="hidden md:flex w-14 h-14 rounded-xl bg-blue-500/30 dark:bg-blue-900/50 items-center justify-center">
              <Users className="w-7 h-7 text-blue-500/60" />
            </div>
          </div>
          <div className="h-0.5 sm:h-1 w-full bg-blue-500/40" />
        </div>

        {/* Enrolled */}
        <div className="shadow-xl border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8" />
          <div className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
            <div className="flex-1">
              <Skeleton className="h-2 sm:h-2.5 w-12 sm:w-16 mb-1" />
              <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" />
              <Skeleton className="h-2 sm:h-2.5 w-14 sm:w-20 mt-1" />
            </div>
            <div className="hidden md:flex w-14 h-14 rounded-xl bg-emerald-500/30 dark:bg-emerald-900/50 items-center justify-center">
              <UserCheck className="w-7 h-7 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-0.5 sm:h-1 w-full bg-emerald-500/40" />
        </div>

        {/* Grade Levels */}
        <div className="shadow-xl border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-orange-500/15 dark:bg-orange-400/10 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8" />
          <div className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
            <div className="flex-1">
              <Skeleton className="h-2 sm:h-2.5 w-12 sm:w-16 mb-1" />
              <Skeleton className="h-6 sm:h-8 w-10 sm:w-12" />
              <Skeleton className="h-2 sm:h-2.5 w-14 sm:w-20 mt-1" />
            </div>
            <div className="hidden md:flex w-14 h-14 rounded-xl bg-orange-500/30 dark:bg-orange-900/50 items-center justify-center">
              <GraduationCap className="w-7 h-7 text-orange-500/60" />
            </div>
          </div>
          <div className="h-0.5 sm:h-1 w-full bg-orange-500/40" />
        </div>
      </div>

      {/* Filters */}
      <div className="border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <Skeleton className="h-10 flex-1 min-w-55 rounded-lg bg-violet-200/70 dark:bg-violet-900/50" />
            <Skeleton className="h-10 w-full lg:w-40 rounded-lg bg-violet-200/70 dark:bg-violet-900/50" />
            <Skeleton className="h-10 w-full lg:w-40 rounded-lg bg-violet-200/70 dark:bg-violet-900/50" />
          </div>
        </div>
      </div>

      {/* Mobile Students Cards */}
      <div className="md:hidden space-y-3 px-2">
        {[...Array(4)].map((_, i) => (
          <div
            key={`mobile-student-skeleton-${i}`}
            className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-34" />
                <Skeleton className="h-3 w-28" />
              </div>
              <div className="text-right space-y-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            </div>
          </div>
        ))}

        <div className="flex items-center justify-between px-2 py-3">
          <Skeleton className="h-4 w-36" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      {/* Masterlist Table */}
      <div className="hidden md:block border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
        <div className="border-b border-blue-200/50 dark:border-blue-700/40 bg-linear-to-r from-blue-50/60 via-blue-50/30 to-transparent dark:from-blue-950/30 dark:via-blue-950/15 dark:to-transparent pb-5 p-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-blue-500/30">
              <Archive className="w-5 h-5 text-blue-500/60" />
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
              <tr className="bg-blue-100/50 dark:bg-blue-900/20">
                {[...Array(8)].map((_, i) => (
                  <th key={i} className="px-6 py-3"><Skeleton className="h-4 w-16" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-blue-100/30 dark:border-blue-800/20 last:border-0">
                  {[...Array(8)].map((_, j) => (
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