import React from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Megaphone, Calendar } from 'lucide-react';

export default function EventsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="h-9 bg-linear-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-700 rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-linear-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg w-96 max-w-[70vw] animate-pulse" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-md bg-blue-200/70 dark:bg-blue-900/50" />
      </div>

      {/* Metric Cards (4) */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Total Events - Blue */}
        <div className="shadow-xl border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-3 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-blue-500/30 dark:bg-blue-900/50 items-center justify-center">
              <Megaphone className="w-8 h-8 text-blue-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-blue-500/40" />
        </div>

        {/* Upcoming - Emerald */}
        <div className="shadow-xl border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-3 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/30 dark:bg-emerald-900/50 items-center justify-center">
              <Calendar className="w-8 h-8 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-500/40" />
        </div>

        {/* With Images - Violet */}
        <div className="shadow-xl border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 dark:bg-violet-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/5 dark:bg-violet-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-3 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-violet-500/30 dark:bg-violet-900/50 items-center justify-center">
              <Megaphone className="w-8 h-8 text-violet-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-violet-500/40" />
        </div>

        {/* No Images - Amber */}
        <div className="shadow-xl border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 dark:bg-amber-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-3 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-amber-500/30 dark:bg-amber-900/50 items-center justify-center">
              <Calendar className="w-8 h-8 text-amber-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-500/40" />
        </div>
      </div>

      {/* Event Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="shadow-lg border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 overflow-hidden rounded-lg">
            {/* Blue top border */}
            <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
            
            {/* Image placeholder */}
            <Skeleton className="h-44 w-full rounded-none bg-blue-100/70 dark:bg-blue-900/35" />
            
            {/* Title and description */}
            <div className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-2/3" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-6 w-6 rounded-lg shrink-0" />
              </div>
              
              {/* Date, time, location */}
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-1/3" />
                <Skeleton className="h-4 w-2/5" />
                <Skeleton className="h-4 w-1/3" />
              </div>
              
              {/* Button and action icons */}
              <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2 pt-2 border-t border-slate-100/50 dark:border-slate-700/30">
                <Skeleton className="h-8 w-24 rounded-md" />
                <div className="hidden md:flex gap-2">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-8 w-8 rounded-full" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
