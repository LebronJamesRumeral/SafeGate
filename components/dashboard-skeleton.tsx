"use client";

import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle, AlertTriangle, XCircle, TrendingUp, Activity, Cloud } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function DashboardSkeleton() {
  const isMobile = useIsMobile();

  return (
    <div className="space-y-4 sm:space-y-6 animate-fade-in-up">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div className="flex-1 min-w-0 space-y-1.5 sm:space-y-2">
          <Skeleton className="h-6 sm:h-8 w-40 sm:w-64" />
          <Skeleton className="h-3 sm:h-4 w-48 sm:w-96" />
        </div>
        {/* Weather Widget Skeleton */}
        <div className="flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg sm:rounded-xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shrink-0">
          <div className="p-1.5 sm:p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
            <Cloud className="w-4 h-4 sm:w-5 sm:h-5 text-sky-600/40" />
          </div>
          <div className="min-w-0">
            <Skeleton className="h-3 sm:h-4 w-8 mb-0.5" />
            <Skeleton className="h-2 sm:h-3 w-12" />
          </div>
        </div>
      </div>

      {/* Date/Level Filter Placeholder */}
      <div className="w-full bg-white/80 dark:bg-slate-900/55 backdrop-blur rounded-xl border border-border/70 shadow-sm p-3 sm:p-4 md:p-6">
        <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:gap-4">
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Skeleton className="h-3 sm:h-4 w-20" />
            <Skeleton className="h-9 sm:h-10 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-2 w-full max-w-xs">
            <Skeleton className="h-3 sm:h-4 w-16" />
            <Skeleton className="h-9 sm:h-10 w-full rounded-lg" />
          </div>
          <div className="flex flex-col gap-2 w-full">
            <Skeleton className="h-3 sm:h-4 w-14" />
            <Skeleton className="h-9 sm:h-10 w-full rounded-lg" />
          </div>
        </div>
      </div>

      {/* Metric Cards (3 columns) */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-5">
        {/* Positive Behavior Events */}
        <div className="shadow-lg border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8" />
          <div className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
            <div className="flex-1">
              <Skeleton className="h-2 sm:h-3 w-12 sm:w-16 mb-1" />
              <Skeleton className="h-6 sm:h-8 md:h-10 w-8 sm:w-12 mb-1" />
              <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
            </div>
            <div className="hidden md:flex w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-emerald-500/20 dark:bg-emerald-900/40 items-center justify-center shrink-0">
              <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-emerald-500/40" />
            </div>
          </div>
          <div className="h-0.5 sm:h-1 w-full bg-emerald-500/30" />
        </div>

        {/* Students At Risk */}
        <div className="shadow-lg border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8" />
          <div className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
            <div className="flex-1">
              <Skeleton className="h-2 sm:h-3 w-10 sm:w-14 mb-1" />
              <Skeleton className="h-6 sm:h-8 md:h-10 w-8 sm:w-12 mb-1" />
              <Skeleton className="h-2 sm:h-3 w-14 sm:w-20" />
            </div>
            <div className="hidden md:flex w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-red-500/20 dark:bg-red-900/40 items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-red-500/40" />
            </div>
          </div>
          <div className="h-0.5 sm:h-1 w-full bg-red-500/30" />
        </div>

        {/* Major/Critical Incidents */}
        <div className="shadow-lg border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8" />
          <div className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
            <div className="flex-1">
              <Skeleton className="h-2 sm:h-3 w-14 sm:w-16 mb-1" />
              <Skeleton className="h-6 sm:h-8 md:h-10 w-8 sm:w-12 mb-1" />
              <Skeleton className="h-2 sm:h-3 w-16 sm:w-20" />
            </div>
            <div className="hidden md:flex w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-orange-500/20 dark:bg-orange-900/40 items-center justify-center shrink-0">
              <XCircle className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 text-orange-500/40" />
            </div>
          </div>
          <div className="h-0.5 sm:h-1 w-full bg-orange-500/30" />
        </div>
      </div>

      {/* Info Text Placeholder */}
      <Skeleton className="h-3 sm:h-4 w-64" />

      {/* Tables Section - Mobile Optimized */}
      {isMobile ? (
        <div className="space-y-3">
          {/* Tab Buttons Skeleton */}
          <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
            <Skeleton className="flex-1 h-7 sm:h-8 rounded-md" />
            <Skeleton className="flex-1 h-7 sm:h-8 rounded-md" />
          </div>

          {/* Table Skeleton */}
          <div className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden rounded-lg">
            <div className="border-b border-orange-200/50 dark:border-orange-700/40 bg-linear-to-r from-orange-50/60 via-orange-50/30 to-transparent dark:from-orange-950/30 dark:via-orange-950/15 dark:to-transparent pb-3 sm:pb-4 p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 sm:p-3 rounded-lg sm:rounded-xl bg-orange-500/20">
                  <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500/40" />
                </div>
                <div>
                  <Skeleton className="h-5 sm:h-6 w-24 sm:w-32 mb-1" />
                  <Skeleton className="h-3 sm:h-4 w-24 sm:w-32" />
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs sm:text-sm">
                <thead>
                  <tr className="bg-orange-100/50 dark:bg-orange-900/20">
                    <th className="px-3 sm:px-4 py-2 sm:py-3">
                      <Skeleton className="h-3 w-4" />
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3">
                      <Skeleton className="h-3 w-12" />
                    </th>
                    <th className="px-3 sm:px-4 py-2 sm:py-3">
                      <Skeleton className="h-3 w-8" />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-orange-100/30 dark:border-orange-800/20 last:border-0">
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <Skeleton className="h-4 sm:h-5 w-4 sm:w-5 rounded-full" />
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <Skeleton className="h-3 w-20 sm:w-24" />
                      </td>
                      <td className="px-3 sm:px-4 py-2 sm:py-3">
                        <Skeleton className="h-3 w-8 rounded-full" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
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
          <div className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
            <div className="border-b border-blue-200/50 dark:border-blue-700/40 bg-linear-to-r from-blue-50/60 via-blue-50/30 to-transparent dark:from-blue-950/30 dark:via-blue-950/15 dark:to-transparent pb-5 p-5">
              <div className="flex items-center gap-3.5">
                <div className="p-3 rounded-xl bg-blue-500/30">
                  <Activity className="w-5 h-5 text-blue-500/60" />
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
                  <tr className="bg-blue-100/50 dark:bg-blue-900/20 border-b border-blue-200/50 dark:border-blue-800/30">
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
                    <tr key={i} className="border-b border-blue-100/30 dark:border-blue-800/20 last:border-0">
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
      )}
    </div>
  );
}