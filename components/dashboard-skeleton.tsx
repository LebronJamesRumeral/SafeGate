import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, Activity } from 'lucide-react';

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-80 mb-2" />
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>

        {/* Weather Widget Placeholder */}
        <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow-sm w-fit">
          <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
            <Skeleton className="h-5 w-5 rounded" />
          </div>
          <div className="space-y-1">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      </div>

      {/* Date/Level Filter Placeholder */}
      <div className="flex gap-3 items-center">
        {[...Array(3)].map((_, i) => (
          <Skeleton key={i} className="h-9 w-32 rounded-full" />
        ))}
        <Skeleton className="h-10 w-40 rounded-lg ml-auto" />
      </div>

      {/* Metric Cards (3 columns) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-5">
        {/* Positive Behavior Events */}
        <div className="shadow-xl border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-3 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-28 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/30 dark:bg-emerald-900/50 items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1 w-full bg-emerald-500/40" />
        </div>

        {/* Students At Risk */}
        <div className="shadow-xl border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-3 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-red-500/30 dark:bg-red-900/50 items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500/60" />
            </div>
          </div>
          <div className="h-1 w-full bg-red-500/40" />
        </div>

        {/* Major/Critical Incidents */}
        <div className="shadow-xl border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-3 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-32 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-orange-500/30 dark:bg-orange-900/50 items-center justify-center">
              <XCircle className="w-8 h-8 text-orange-500/60" />
            </div>
          </div>
          <div className="h-1 w-full bg-orange-500/40" />
        </div>
      </div>

      {/* Info Text Placeholder */}
      <Skeleton className="h-4 w-96" />

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Students Table */}
        <div className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
          <div className="border-b border-orange-200/50 dark:border-orange-700/40 bg-linear-to-r from-orange-50/60 via-orange-50/30 to-transparent dark:from-orange-950/30 dark:via-orange-950/15 dark:to-transparent pb-5 p-5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-orange-500/30">
                <TrendingUp className="w-5 h-5 text-orange-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-44 mb-1" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-orange-100/50 dark:bg-orange-900/20 border-b border-orange-200/50 dark:border-orange-800/30">
                  <th className="px-6 py-3">
                    <Skeleton className="h-4 w-8" />
                  </th>
                  <th className="px-6 py-3">
                    <Skeleton className="h-4 w-16" />
                  </th>
                  <th className="px-6 py-3">
                    <Skeleton className="h-4 w-12" />
                  </th>
                  <th className="px-6 py-3">
                    <Skeleton className="h-4 w-12" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-orange-100/30 dark:border-orange-800/20 last:border-0">
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Behavior Categories Table */}
        <div className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
          <div className="border-b border-sky-200/50 dark:border-sky-700/40 bg-linear-to-r from-sky-50/60 via-sky-50/30 to-transparent dark:from-sky-950/30 dark:via-sky-950/15 dark:to-transparent pb-5 p-5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-sky-500/30">
                <Activity className="w-5 h-5 text-sky-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-44 mb-1" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-sky-100/50 dark:bg-sky-900/20 border-b border-sky-200/50 dark:border-sky-800/30">
                  <th className="px-6 py-3">
                    <Skeleton className="h-4 w-8" />
                  </th>
                  <th className="px-6 py-3">
                    <Skeleton className="h-4 w-20" />
                  </th>
                  <th className="px-6 py-3">
                    <Skeleton className="h-4 w-12" />
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...Array(4)].map((_, i) => (
                  <tr key={i} className="border-b border-sky-100/30 dark:border-sky-800/20 last:border-0">
                    <td className="px-6 py-4">
                      <Skeleton className="h-6 w-6 rounded-full" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-12 rounded-full" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}