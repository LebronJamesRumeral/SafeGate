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

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4">
        <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 shadow-xl p-6 flex items-center justify-between relative">
          <div>
            <Skeleton className="h-4 w-28 mb-2" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-blue-500/10 items-center justify-center">
            <Users className="w-7 h-7 text-blue-400" />
          </div>
        </div>
        <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 shadow-xl p-6 flex items-center justify-between relative">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center">
            <UserCheck className="w-7 h-7 text-emerald-400" />
          </div>
        </div>
        <div className="rounded-2xl bg-violet-50 dark:bg-violet-950/30 shadow-xl p-6 flex items-center justify-between relative col-span-2 md:col-span-1">
          <div>
            <Skeleton className="h-4 w-24 mb-2" />
            <Skeleton className="h-10 w-16 mb-2" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-violet-500/10 items-center justify-center">
            <GraduationCap className="w-7 h-7 text-violet-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow p-4 sm:p-6 flex flex-col gap-4">
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          <Skeleton className="h-10 flex-1 min-w-55 rounded-lg" />
          <Skeleton className="h-10 w-full lg:w-40 rounded-lg" />
          <Skeleton className="h-10 w-full lg:w-40 rounded-lg" />
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border bg-white/70 dark:bg-slate-800/70 p-0 shadow-md overflow-hidden">
        <div className="md:hidden p-4 space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="rounded-xl border border-slate-200/70 dark:border-slate-700/60 p-3 space-y-2">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-48 max-w-full" />
              <div className="grid grid-cols-2 gap-2">
                {[...Array(4)].map((_, j) => (
                  <Skeleton key={j} className="h-4 w-full" />
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-245 w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead>
              <tr>
                {[...Array(8)].map((_, i) => (
                  <th key={i} className="px-4 py-4">
                    <Skeleton className="h-4 w-full max-w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-4">
                      <Skeleton className="h-6 w-full rounded" />
                    </td>
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