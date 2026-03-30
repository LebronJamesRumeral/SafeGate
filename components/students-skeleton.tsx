import { DashboardLayout } from '@/components/dashboard-layout';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, User, Search, GraduationCap, AlertTriangle, BarChart3, Activity, TrendingUp } from 'lucide-react';
export default function StudentsSkeleton() {
  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <Skeleton className="h-10 w-72 mb-2" />
            <Skeleton className="h-5 w-96" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-36 rounded-lg" />
            <Skeleton className="h-9 w-40 rounded-lg" />
          </div>
        </div>

        {/* Stat Cards Skeleton (4 cards) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-2xl bg-blue-50 dark:bg-blue-950/30 shadow-xl p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-blue-500/10 items-center justify-center">
              <Users className="w-7 h-7 text-blue-400" />
            </div>
          </div>
          <div className="rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 shadow-xl p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-emerald-500/10 items-center justify-center">
              <User className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <div className="rounded-2xl bg-sky-50 dark:bg-sky-950/30 shadow-xl p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-sky-500/10 items-center justify-center">
              <TrendingUp className="w-7 h-7 text-sky-400" />
            </div>
          </div>
          <div className="rounded-2xl bg-orange-50 dark:bg-orange-950/30 shadow-xl p-6 flex items-center justify-between relative">
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-10 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </div>
            <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-orange-500/10 items-center justify-center">
              <BarChart3 className="w-7 h-7 text-orange-400" />
            </div>
          </div>
        </div>

        {/* Search & Filter Bar Skeleton */}
        <div className="rounded-2xl bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 shadow p-6 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row md:items-center gap-4">
            <div className="flex-1 flex items-center gap-3">
              <Skeleton className="h-10 w-64 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
              <Skeleton className="h-10 w-32 rounded-lg" />
            </div>
            <div className="flex gap-2 mt-2 md:mt-0">
              <Skeleton className="h-9 w-36 rounded-lg" />
              <Skeleton className="h-9 w-40 rounded-lg" />
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-28 rounded-lg" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>

        {/* Tabs Skeleton */}
        <div className="flex gap-2 mt-2">
          <Skeleton className="h-8 w-32 rounded-lg" />
          <Skeleton className="h-8 w-32 rounded-lg" />
        </div>

        {/* Student Directory Table Skeleton */}
        <div className="rounded-2xl border bg-white/70 dark:bg-slate-800/70 p-0 shadow-md overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-700">
            <thead>
              <tr>
                <th className="px-6 py-4"><Skeleton className="h-4 w-16" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-32" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-24" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-24" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-32" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-24" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
                <th className="px-6 py-4"><Skeleton className="h-4 w-20" /></th>
              </tr>
            </thead>
            <tbody>
              {[...Array(6)].map((_, i) => (
                <tr key={i} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                  <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-32 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-32 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded" /></td>
                  <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
