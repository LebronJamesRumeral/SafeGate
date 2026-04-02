import { DashboardLayout } from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckCircle2, Clock3, XCircle } from 'lucide-react';

export default function ParentAttendanceSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-56 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="border-0 bg-emerald-50 dark:bg-emerald-950/30 shadow-xl rounded-2xl p-4 sm:p-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-10 w-14 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-emerald-500/10 items-center justify-center">
              <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            </div>
          </div>

          <div className="border-0 bg-amber-50 dark:bg-amber-950/30 shadow-xl rounded-2xl p-4 sm:p-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-10 w-14 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-amber-500/10 items-center justify-center">
              <Clock3 className="w-7 h-7 text-amber-400" />
            </div>
          </div>

          <div className="border-0 bg-red-50 dark:bg-red-950/30 shadow-xl rounded-2xl p-4 sm:p-6 flex items-center justify-between">
            <div>
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-10 w-14 mb-2" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="hidden sm:flex w-14 h-14 rounded-2xl bg-red-500/10 items-center justify-center">
              <XCircle className="w-7 h-7 text-red-400" />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <Skeleton className="h-6 w-48 mb-1" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/70 shadow-xl overflow-hidden">
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700" />
                <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <Skeleton className="h-6 w-36 mb-1" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20 rounded-full" />
                  </div>

                  <div className="p-3 rounded-lg border border-slate-200/70 dark:border-slate-700/60">
                    <Skeleton className="h-3 w-28 mb-2" />
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-36" />
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                    <Skeleton className="h-16 rounded-lg" />
                  </div>

                  <Skeleton className="h-9 w-full rounded-lg" />
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
