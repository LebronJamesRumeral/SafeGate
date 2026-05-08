import { Skeleton } from '@/components/ui/skeleton';
import { Users, CheckCircle2, Clock3, XCircle, Calendar } from 'lucide-react';

export default function ParentAttendanceSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="h-6 w-6 text-slate-500" />
            <Skeleton className="h-8 w-64" />
          </div>
          <Skeleton className="h-4 w-full max-w-2xl" />
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Present */}
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
              <CheckCircle2 className="w-8 h-8 text-emerald-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-emerald-500/40" />
        </div>

        {/* Late Arrivals */}
        <div className="shadow-xl border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 dark:bg-amber-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-amber-500/30 dark:bg-amber-900/50 items-center justify-center">
              <Clock3 className="w-8 h-8 text-amber-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-amber-500/40" />
        </div>

        {/* Absent */}
        <div className="shadow-xl border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 overflow-hidden relative rounded-lg">
          <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12" />
          <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
            <div className="flex-1">
              <Skeleton className="h-3 w-24 mb-2" />
              <Skeleton className="h-10 w-16" />
              <Skeleton className="h-3 w-28 mt-2" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-red-500/30 dark:bg-red-900/50 items-center justify-center">
              <XCircle className="w-8 h-8 text-red-500/60" />
            </div>
          </div>
          <div className="h-1.5 w-full bg-red-500/40" />
        </div>
      </div>

      {/* Child Attendance Cards */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-emerald-500/30">
            <Users className="w-6 h-6 text-emerald-500/60" />
          </div>
          <div>
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-full max-w-2xl" />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl rounded-lg overflow-hidden">
              <div className="h-1.5 bg-emerald-500/40" />
              <div className="p-5 space-y-3">
                <div>
                  <Skeleton className="h-5 w-32 mb-1" />
                  <Skeleton className="h-4 w-24" />
                </div>
                <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-8 w-full rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
