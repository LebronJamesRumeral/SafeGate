import { DashboardLayout } from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, Users } from 'lucide-react';

export default function AttendanceSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Page Header Skeleton */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-64 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>
        </div>

        {/* Filter Bar Skeleton */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>

        {/* Stat Cards Skeleton */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-2xl border bg-white/70 dark:bg-slate-800/70 p-6 space-y-4 shadow-md">
              <Skeleton className="h-6 w-40 mb-2" />
              <Skeleton className="h-4 w-32 mb-2" />
              <Skeleton className="h-3 w-24 mb-2" />
            </div>
          ))}
        </div>

        {/* Attendance Table Skeleton */}
        <div className="border border-orange-200/60 rounded-xl overflow-hidden mt-6">
          <div className="bg-slate-100 p-4 grid grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="h-4 w-full" />
            ))}
          </div>
          {[...Array(8)].map((_, rowIndex) => (
            <div key={rowIndex} className="p-4 border-t border-orange-200/60 grid grid-cols-6 gap-4">
              {[...Array(6)].map((_, colIndex) => (
                <Skeleton key={colIndex} className="h-4 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
