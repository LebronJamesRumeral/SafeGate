import { DashboardLayout } from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, Users, CheckCircle, AlertCircle } from 'lucide-react';

export default function ParentDashboardSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-8 sm:h-10 w-44 sm:w-64 mb-2" />
            <Skeleton className="h-3.5 sm:h-5 w-52 sm:w-80" />
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Children Linked */}
          <div className="border-0 bg-sky-50 dark:bg-sky-950/30 shadow-xl rounded-2xl p-3 sm:p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-2.5 sm:h-4 w-12 sm:w-24 mb-1 sm:mb-2" />
              <Skeleton className="h-6 sm:h-10 w-8 sm:w-16 mb-1 sm:mb-2" />
              <Skeleton className="h-2.5 sm:h-3 w-14 sm:w-32" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-sky-500/10 items-center justify-center">
              <Users className="w-8 h-8 text-sky-400" />
            </div>
          </div>
          {/* Attendance Card */}
          <div className="border-0 bg-emerald-50 dark:bg-emerald-950/30 shadow-xl rounded-2xl p-3 sm:p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-2.5 sm:h-4 w-12 sm:w-24 mb-1 sm:mb-2" />
              <Skeleton className="h-6 sm:h-10 w-8 sm:w-16 mb-1 sm:mb-2" />
              <Skeleton className="h-2.5 sm:h-3 w-14 sm:w-32" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/10 items-center justify-center">
              <CheckCircle className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          {/* Behavior Card */}
          <div className="border-0 bg-orange-50 dark:bg-orange-950/30 shadow-xl rounded-2xl p-3 sm:p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-2.5 sm:h-4 w-12 sm:w-24 mb-1 sm:mb-2" />
              <Skeleton className="h-6 sm:h-10 w-8 sm:w-16 mb-1 sm:mb-2" />
              <Skeleton className="h-2.5 sm:h-3 w-14 sm:w-32" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-orange-500/10 items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-400" />
            </div>
          </div>
        </div>

        {/* ML Risk Insights Skeleton */}
        <div className="mt-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4">
            <div className="p-2 sm:p-3 rounded-2xl bg-blue-900 shadow-lg">
              <Brain className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-6 sm:h-8 w-52 sm:w-80 mb-2" />
              <Skeleton className="h-3.5 sm:h-5 w-full sm:w-96" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white/70 dark:bg-slate-800/70 p-4 sm:p-6 space-y-3 sm:space-y-4 shadow-md">
                <Skeleton className="h-5 sm:h-6 w-32 sm:w-40 mb-1 sm:mb-2" />
                <Skeleton className="h-3.5 sm:h-4 w-24 sm:w-32 mb-1 sm:mb-2" />
                <Skeleton className="h-3 w-20 sm:w-24 mb-1 sm:mb-2" />
                <Skeleton className="h-3.5 sm:h-4 w-full mb-1 sm:mb-2" />
                <Skeleton className="h-3.5 sm:h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
