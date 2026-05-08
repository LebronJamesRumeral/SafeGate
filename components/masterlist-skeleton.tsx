import { Skeleton } from '@/components/ui/skeleton';
import { Archive, Download, Search, Upload, Users, UserCheck, GraduationCap } from 'lucide-react';

export function MasterlistPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Archive size={28} className="text-primary/40" />
            <Skeleton className="h-9 w-64" />
          </div>
          <Skeleton className="h-5 w-md max-w-full" />
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <div className="h-9 w-32 rounded-lg border border-border/60 bg-background/70 px-3 flex items-center gap-2">
            <Search size={14} className="text-muted-foreground/70" />
            <Skeleton className="h-4 w-16" />
          </div>
          <div className="h-9 w-24 rounded-lg border border-border/60 bg-background/70 px-3 flex items-center gap-2">
            <Upload size={14} className="text-muted-foreground/70" />
            <Skeleton className="h-4 w-12" />
          </div>
          <div className="h-9 w-24 rounded-lg border border-border/60 bg-background/70 px-3 flex items-center gap-2">
            <Download size={14} className="text-muted-foreground/70" />
            <Skeleton className="h-4 w-12" />
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {/* Total Students */}
        <div className="shadow-xl border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-12 -mb-12" />
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

        {/* Enrolled */}
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
              <UserCheck className="w-8 h-8 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-500/40" />
        </div>

        {/* Grade Levels */}
        <div className="shadow-xl border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 dark:bg-violet-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/5 dark:bg-violet-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-violet-500/30 dark:bg-violet-900/50 items-center justify-center">
              <GraduationCap className="w-8 h-8 text-violet-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-violet-500/40" />
        </div>
      </div>

      {/* Filters */}
      <div className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            <Skeleton className="h-10 flex-1 min-w-55 rounded-lg" />
            <Skeleton className="h-10 w-full lg:w-40 rounded-lg" />
            <Skeleton className="h-10 w-full lg:w-40 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Masterlist Table */}
      <div className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
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