import { Skeleton } from '@/components/ui/skeleton';
import { Archive, Flame, MapPinned, ShieldAlert } from 'lucide-react';

export function SchoolHeatmapSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="rounded-xl border border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 shadow-sm p-6 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <MapPinned className="h-6 w-6 text-orange-500/60" />
              <Skeleton className="h-8 w-60 sm:w-72" />
            </div>
            <Skeleton className="h-4 w-full max-w-xl" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <div className="rounded-full border border-orange-200 bg-orange-50/60 p-1.5 flex items-center gap-1.5 overflow-x-auto max-w-full">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-8 w-14 rounded-full" />
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-blue-50 dark:bg-blue-950/30 shadow-xl p-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/60">
              <Archive className="h-5 w-5 text-blue-500/70" />
            </div>
          </div>

          <div className="rounded-xl bg-red-50 dark:bg-red-950/30 shadow-xl p-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/60">
              <Flame className="h-5 w-5 text-red-500/70" />
            </div>
          </div>

          <div className="rounded-xl bg-orange-50 dark:bg-orange-950/30 shadow-xl p-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-orange-100 dark:bg-orange-900/60">
              <MapPinned className="h-5 w-5 text-orange-500/70" />
            </div>
          </div>

          <div className="rounded-xl bg-rose-50 dark:bg-rose-950/30 shadow-xl p-4 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-28 mb-2" />
              <Skeleton className="h-8 w-12" />
            </div>
            <div className="hidden sm:flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/60">
              <ShieldAlert className="h-5 w-5 text-rose-500/70" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <div className="xl:col-span-8 rounded-xl border border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 p-5 space-y-4">
          <div>
            <Skeleton className="h-6 w-56 mb-2" />
            <Skeleton className="h-4 w-96 max-w-full" />
          </div>
          <div className="relative rounded-xl border border-slate-300/70 dark:border-slate-700/70 overflow-hidden">
            <Skeleton className="h-72 sm:h-96 lg:h-128 w-full" />
            <div className="absolute inset-0 p-6">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    top: `${18 + (i % 3) * 22}%`,
                    left: `${12 + (i % 2) * 45}%`,
                  }}
                >
                  <Skeleton className="h-10 w-10 rounded-full" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:col-span-4 rounded-xl border border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 p-5 space-y-4">
          <div>
            <Skeleton className="h-6 w-44 mb-2" />
            <Skeleton className="h-4 w-full" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-7 w-20" />
            </div>
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-7 w-20" />
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-2">
            <Skeleton className="h-3 w-28" />
            <div className="flex flex-wrap gap-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-6 w-18 rounded-full" />
              ))}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 dark:border-slate-700 p-3 space-y-3">
            <Skeleton className="h-4 w-32" />
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-md border border-slate-200/80 dark:border-slate-700/70 p-2 space-y-2">
                <Skeleton className="h-4 w-5/6" />
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-2/3" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 p-6 space-y-4">
        <div>
          <Skeleton className="h-7 w-52 mb-2" />
          <Skeleton className="h-4 w-full max-w-xl" />
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <Skeleton className="h-10 w-full rounded-lg xl:col-span-2" />
          <Skeleton className="h-10 w-full rounded-lg xl:col-span-2" />
        </div>

        <Skeleton className="h-10 w-48 rounded-lg" />

        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="rounded-lg border border-slate-200/80 dark:border-slate-700/70 px-3 py-2 flex items-center justify-between">
              <div className="space-y-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-8 w-8 rounded-md" />
            </div>
          ))}
        </div>

        <div className="rounded-lg border border-dashed border-orange-300/80 dark:border-orange-900/60 p-3">
          <Skeleton className="h-3 w-full max-w-3xl" />
        </div>
      </div>
    </div>
  );
}
