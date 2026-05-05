import { DashboardLayout } from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Megaphone } from 'lucide-react';

export default function ParentAnnouncementSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 sm:h-10 w-56 sm:w-72 mb-2" />
            <Skeleton className="h-4 sm:h-5 w-72 sm:w-[32rem]" />
          </div>
          <Skeleton className="h-8 w-28 rounded-full" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-9 w-16 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
              <Skeleton className="h-9 w-20 rounded-full" />
              <Skeleton className="h-9 w-28 rounded-full" />
            </div>

            <div className="overflow-hidden rounded-2xl border-2 border-blue-200/60 bg-white shadow-lg">
              <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
              <div className="h-52 lg:h-56 bg-linear-to-br from-sky-100 via-cyan-50 to-white flex items-center justify-center px-6">
                <div className="w-full max-w-xl rounded-2xl border border-white/70 bg-white/55 backdrop-blur-sm p-5 shadow-sm space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="space-y-2">
                      <Skeleton className="h-3 w-28" />
                      <Skeleton className="h-7 w-56" />
                    </div>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-500/10">
                      <Megaphone className="h-7 w-7 text-sky-500" />
                    </div>
                  </div>
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </div>
              </div>

              <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-3">
                <Skeleton className="h-6 w-28 rounded-full" />
                <Skeleton className="h-3 w-24" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 px-6 pb-6">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="rounded-xl border border-slate-200/70 bg-slate-50/70 p-3 space-y-2">
                    <Skeleton className="h-3 w-16" />
                    <div className="flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-slate-300" />
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
                <div key={index} className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
                  <div className="flex items-start gap-3 p-3">
                    <Skeleton className="h-12 w-16 rounded-md" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-11/12" />
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-7 w-16 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    </DashboardLayout>
  );
}