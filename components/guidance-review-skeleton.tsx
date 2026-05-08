import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, UserCircle2, Users, CheckCircle } from 'lucide-react';

export function GuidanceReviewPageSkeleton() {
  return (
    <div className="space-y-5 max-w-7xl mx-auto animate-fade-in-up">
      {/* Header & Quick Stats */}
      <div className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
        <div className="border-b border-slate-200/50 dark:border-slate-700/40 bg-linear-to-r from-slate-50/60 via-slate-50/30 to-transparent dark:from-slate-950/30 dark:via-slate-950/15 dark:to-transparent pb-5 p-5">
          <div className="space-y-4">
            <div>
              <Skeleton className="h-8 w-72 mb-1" />
              <Skeleton className="h-4 w-full max-w-2xl" />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-8 w-32 rounded-full" />
              <Skeleton className="h-8 w-24 rounded-full" />
              <Skeleton className="h-8 w-40 rounded-full" />
            </div>
          </div>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border border-slate-200/50 dark:border-slate-700/40 bg-slate-100 dark:bg-slate-900/30 p-3 space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-12" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden p-5">
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-5 h-5 text-blue-500/60" />
            <Skeleton className="h-6 w-32" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
            <Skeleton className="h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* At-Risk Students */}
        <div className="xl:col-span-5 border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
          <div className="border-b border-red-200/50 dark:border-red-700/40 bg-linear-to-r from-red-50/60 via-red-50/30 to-transparent dark:from-red-950/30 dark:via-red-950/15 dark:to-transparent pb-5 p-5">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-red-500/30">
                <AlertTriangle className="w-5 h-5 text-red-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-40 mb-1" />
                <Skeleton className="h-4 w-full max-w-xs" />
              </div>
            </div>
          </div>

          <div className="p-5 space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-lg border border-red-200/50 dark:border-red-700/40 bg-red-50 dark:bg-red-900/20 p-3 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Skeleton className="h-5 w-36" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-4 w-full" />
                <div className="flex items-center justify-between gap-2 mt-3 pt-2 border-t border-red-200/30">
                  <Skeleton className="h-3 w-28" />
                  <Skeleton className="h-8 w-20" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Review Details */}
        <div className="xl:col-span-7 space-y-4">
          {/* Student Profile */}
          <div className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl rounded-lg p-6 sm:p-10">
            <div className="text-center space-y-3">
              <UserCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <Skeleton className="h-5 w-56 mx-auto" />
              <Skeleton className="h-4 w-64 mx-auto" />
            </div>
          </div>

          {/* Recommendations */}
          <div className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
            <div className="border-b border-emerald-200/50 dark:border-emerald-700/40 bg-linear-to-r from-emerald-50/60 via-emerald-50/30 to-transparent dark:from-emerald-950/30 dark:via-emerald-950/15 dark:to-transparent pb-5 p-5">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-xl bg-emerald-500/30">
                  <CheckCircle className="w-5 h-5 text-emerald-500/60" />
                </div>
                <div>
                  <Skeleton className="h-6 w-40 mb-1" />
                  <Skeleton className="h-4 w-full max-w-xs" />
                </div>
              </div>
            </div>
            <div className="p-5 space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
            </div>
            <div className="p-4 space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="flex items-center justify-between gap-3">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-72 max-w-full" />
                  </div>
                  <Skeleton className="h-6 w-24 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}