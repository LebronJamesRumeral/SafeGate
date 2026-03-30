import { DashboardLayout } from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, Heart, AlertCircle, GraduationCap } from 'lucide-react';

export default function ParentBehaviorSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
          <div>
            <Skeleton className="h-10 w-48" />
          </div>
        </div>

        {/* Summary Cards Skeleton */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {/* Total Events */}
          <div className="border-0 bg-blue-50 dark:bg-blue-950/30 shadow-xl rounded-2xl p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-blue-500/10 items-center justify-center">
              <Activity className="w-8 h-8 text-blue-400" />
            </div>
          </div>
          {/* Positive Events */}
          <div className="border-0 bg-emerald-50 dark:bg-emerald-950/30 shadow-xl rounded-2xl p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-emerald-500/10 items-center justify-center">
              <Heart className="w-8 h-8 text-emerald-400" />
            </div>
          </div>
          {/* Negative Events */}
          <div className="border-0 bg-red-50 dark:bg-red-950/30 shadow-xl rounded-2xl p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-red-500/10 items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
          </div>
        </div>

        {/* Table Skeleton */}
        <div className="mt-8 space-y-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-orange-900 shadow-lg">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <div className="flex-1">
              <Skeleton className="h-8 w-80 mb-2" />
              <Skeleton className="h-5 w-96" />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="rounded-2xl border bg-white/70 dark:bg-slate-800/70 p-6 space-y-4 shadow-md">
                <Skeleton className="h-6 w-40 mb-2" />
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
