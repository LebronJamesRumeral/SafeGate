import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Megaphone } from 'lucide-react';

export default function ParentAnnouncementSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-linear-to-br from-sky-500 to-sky-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Megaphone className="h-6 w-6 text-blue-500" />
              <div className="h-8 bg-linear-to-r from-sky-200 to-sky-100 dark:from-sky-800 dark:to-sky-700 rounded-lg w-72 animate-pulse" />
            </div>
            <div className="h-4 bg-linear-to-r from-sky-100 to-sky-50 dark:from-sky-900 dark:to-sky-800 rounded-lg w-full max-w-2xl animate-pulse" />
          </div>
        </div>
        <Skeleton className="h-9 w-28 rounded-full bg-sky-200/70 dark:bg-sky-900/50" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-16 rounded-full bg-sky-200/70 dark:bg-sky-900/50" />
            <Skeleton className="h-9 w-28 rounded-full bg-sky-200/70 dark:bg-sky-900/50" />
            <Skeleton className="h-9 w-20 rounded-full bg-sky-200/70 dark:bg-sky-900/50" />
            <Skeleton className="h-9 w-28 rounded-full bg-sky-200/70 dark:bg-sky-900/50" />
          </div>

          <div className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
            <div className="h-1.5 w-full bg-sky-500/40" />
            <div className="h-52 lg:h-56 bg-linear-to-br from-sky-100 via-cyan-50 to-white flex items-center justify-center px-6">
              <div className="w-full max-w-xl rounded-lg border border-sky-200/50 bg-white/80 dark:bg-slate-800/50 p-5 shadow-sm space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-6 w-56" />
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/30">
                    <Megaphone className="h-6 w-6 text-sky-500/60" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-5/6" />
              </div>
            </div>

            <div className="px-6 py-4 flex items-center justify-between gap-3 border-t border-sky-200/50 dark:border-sky-700/40">
              <Skeleton className="h-6 w-28 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 pb-6">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="rounded-lg border border-sky-200/50 dark:border-sky-700/40 bg-sky-50 dark:bg-sky-900/20 p-3 space-y-2">
                  <Skeleton className="h-3 w-16" />
                  <div className="flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-sky-300" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </div>
              ))}
              <div className="sm:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2">
                <Skeleton className="h-10 rounded-lg" />
                <Skeleton className="h-10 rounded-lg" />
              </div>
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-28" />
            <Skeleton className="h-6 w-10 rounded-full" />
          </div>

          <div className="space-y-3 max-h-[calc(100vh-220px)] overflow-hidden pr-1">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-lg border border-sky-200/50 dark:border-sky-700/40 bg-sky-50/70 dark:bg-sky-950/25 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start gap-3 p-3">
                  <Skeleton className="h-12 w-16 rounded-md bg-sky-100/70 dark:bg-sky-900/40" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-11/12" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-6 w-16 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}