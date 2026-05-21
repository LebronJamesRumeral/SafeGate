"use client";

import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, CheckCircle, XCircle, Activity, Archive } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export default function BehavioralEventsSkeleton() {
  const hookIsMobile = useIsMobile();
  const clientIsMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;
  const isMobile = hookIsMobile || clientIsMobile;

  if (isMobile) {
    return (
      <div className="space-y-5 animate-fade-in-up px-4">
        {/* Mobile Header */}
        <div className="pt-3 pb-2">
          <Skeleton className="h-9 w-56 mb-2" />
          <Skeleton className="h-4 w-72 mb-3" />

          <div className="flex items-center gap-2 mb-3">
            <Skeleton className="h-6 w-16 rounded-full" />
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-9 w-20 rounded-lg ml-auto" />
          </div>
          <Skeleton className="h-8 w-32 rounded-full mb-1" />
        </div>

        {/* Metric Cards - mobile: two columns */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="p-3 rounded-xl shadow-md bg-white/60 dark:bg-slate-800/60">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-2 w-24 mt-2" />
            </div>
          ))}
        </div>

        {/* Filters summary */}
        <div className="mt-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-40 rounded-full" />
            <div className="ml-auto"><Skeleton className="h-9 w-20 rounded-lg" /></div>
          </div>
        </div>

        {/* Tabs (Events List / Analytics) */}
        <div className="mt-2 flex gap-3">
          <Skeleton className="flex-1 h-9 rounded-md" />
          <Skeleton className="flex-1 h-9 rounded-md" />
        </div>

        {/* Events list - card style */}
        <div className="space-y-3 pb-40">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white/60 dark:bg-slate-800/60 rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <Skeleton className="h-12 w-12 rounded-full" />
                <div className="flex-1">
                  <Skeleton className="h-4 w-3/5 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-8 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Desktop / larger screens: existing skeleton layout
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Archive className="h-6 w-6 text-orange-500" />
              <div className="h-8 bg-linear-to-r from-orange-200 to-orange-100 dark:from-orange-800 dark:to-orange-700 rounded-lg w-80 animate-pulse" />
            </div>
            <div className="h-4 bg-linear-to-r from-orange-100 to-orange-50 dark:from-orange-900 dark:to-orange-800 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-28 rounded-lg bg-orange-200/70 dark:bg-orange-900/50" />
          <Skeleton className="h-9 w-32 rounded-lg bg-orange-200/70 dark:bg-orange-900/50" />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Positive Events */}
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

        {/* Major Events */}
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
              <AlertTriangle className="w-8 h-8 text-orange-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-orange-500/40" />
        </div>

        {/* Critical Events */}
        <div className="shadow-xl border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-red-500/30 dark:bg-red-900/50 items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-red-500/40" />
        </div>

        {/* Total Events */}
        <div className="shadow-xl border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-24 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-blue-500/30 dark:bg-blue-900/50 items-center justify-center">
              <Activity className="w-8 h-8 text-blue-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-blue-500/40" />
        </div>
      </div>

      {/* Filter Panel */}
      <div className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg p-5 sm:p-6">
        <div className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <Skeleton className="h-10 w-64 bg-blue-200/70 dark:bg-blue-900/50" />
            <Skeleton className="h-10 w-32 bg-blue-200/70 dark:bg-blue-900/50" />
            <Skeleton className="h-10 w-32 bg-blue-200/70 dark:bg-blue-900/50" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36 bg-blue-200/70 dark:bg-blue-900/50" />
            <Skeleton className="h-9 w-36 bg-blue-200/70 dark:bg-blue-900/50" />
          </div>
        </div>
      </div>

      {/* Events Table */}
      <div className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
        <div className="border-b border-orange-200/50 dark:border-orange-700/40 bg-linear-to-r from-orange-50/60 via-orange-50/30 to-transparent dark:from-orange-950/30 dark:via-orange-950/15 dark:to-transparent pb-5 p-5">
          <div className="flex items-center gap-3.5">
            <div className="p-3 rounded-xl bg-orange-500/30">
              <Archive className="w-5 h-5 text-orange-500/60" />
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
              <tr className="bg-orange-100/50 dark:bg-orange-900/20">
                {[...Array(6)].map((_, i) => (
                  <th key={i} className="px-6 py-3"><Skeleton className="h-4 w-16" /></th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...Array(8)].map((_, i) => (
                <tr key={i} className="border-b border-orange-100/30 dark:border-orange-800/20 last:border-0">
                  {[...Array(6)].map((_, j) => (
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
