import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Users, CheckCircle, AlertCircle } from 'lucide-react';

export default function ParentDashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
      {/* Page Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-6 w-6 text-slate-500" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      </div>

      {/* Summary Cards with new pattern */}
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Children Linked */}
        <div className="shadow-xl border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-500/5 dark:bg-sky-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-sky-500/30 dark:bg-sky-900/50 items-center justify-center">
              <Users className="w-8 h-8 text-sky-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-sky-500/40" />
        </div>

        {/* Attendance */}
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
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-500/40" />
        </div>

        {/* Behavior */}
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
              <AlertCircle className="w-8 h-8 text-orange-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-orange-500/40" />
        </div>
      </div>

      {/* ML Risk Insights */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 rounded-xl bg-blue-500/30">
            <Brain className="w-6 h-6 text-blue-500/60" />
          </div>
          <div>
            <Skeleton className="h-6 w-80 mb-1" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl rounded-lg p-5 space-y-3">
              <Skeleton className="h-5 w-40 mb-2" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
