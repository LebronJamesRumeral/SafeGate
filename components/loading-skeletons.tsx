import { Skeleton } from '@/components/ui/skeleton';

export function HeaderSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-4 w-64" />
    </div>
  );
}

// Skeleton for stat cards, used in dashboards
export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-6 border border-border rounded-lg space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
          <Skeleton className="h-2 w-full" />
        </div>
      ))}
    </div>
  );
}
export function MasterlistSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table Skeleton */}
      <div className="border border-orange-200/60 rounded-xl overflow-hidden">
        <div className="bg-slate-100 p-4 grid grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 8 }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 border-t border-orange-200/60 grid grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function TablePageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Table Skeleton */}
      <div className="border border-orange-200/60 rounded-xl overflow-hidden">
        <div className="bg-slate-100 p-4 grid grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
        {Array.from({ length: 10 }).map((_, rowIndex) => (
          <div key={rowIndex} className="p-4 border-t border-orange-200/60 grid grid-cols-5 gap-4">
            {Array.from({ length: 5 }).map((_, colIndex) => (
              <Skeleton key={colIndex} className="h-4 w-full" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function AnalyticsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Skeleton className="h-10 flex-1 max-w-xs" />
        <Skeleton className="h-10 w-32" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border border-orange-200/60 rounded-xl p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="border border-orange-200/60 rounded-xl p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
        ))}
      </div>
    </div>
  );
}
// Skeleton for tables, used in data-heavy pages
export function TableSkeleton({ rows = 5, columns = 5 }: { rows?: number; columns?: number }) {
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="bg-muted p-4 grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-4 w-full" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="p-4 border-t border-border grid gap-4"
          style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 w-full" />
          ))}
        </div>
      ))}
    </div>
  );
}

// Skeleton for cards, used in analytics and dashboards
export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Page Title */}
      <div className="space-y-2">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-4 w-80" />
      </div>

      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-40" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="border border-orange-200/60 rounded-xl p-6 space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-16" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>

      {/* Content Cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-6">
          <div className="border border-orange-200/60 rounded-xl p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          <div className="border border-orange-200/60 rounded-xl p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-4 w-8" />
                  </div>
                  <Skeleton className="h-2 w-full" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function GuidanceReviewSkeleton() {
  return (
    <div className="space-y-5 animate-fade-in-up">
      <div className="rounded-xl border border-border/70 bg-white/80 p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-6 w-24" />
        </div>
        <Skeleton className="h-8 w-80" />
        <Skeleton className="h-4 w-full max-w-3xl" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/70 p-3 space-y-2">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-7 w-14" />
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border/70 bg-white/80 p-6 space-y-4">
        <Skeleton className="h-7 w-32" />
        <Skeleton className="h-4 w-80" />
        <Skeleton className="h-10 w-full max-w-xl" />
        <div className="rounded-xl border border-border/70 p-3 space-y-2">
          <Skeleton className="h-5 w-56" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-4">
        <div className="xl:col-span-5 rounded-xl border border-border/70 bg-white/80 p-6 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-44" />
            <Skeleton className="h-6 w-12" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/70 p-3 space-y-2">
              <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-5 w-16" />
              </div>
              <Skeleton className="h-4 w-full" />
              <div className="flex items-center justify-between">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-8 w-20" />
              </div>
            </div>
          ))}
        </div>

        <div className="xl:col-span-7 space-y-4">
          <div className="rounded-xl border border-border/70 bg-white/80 p-6 space-y-4">
            <Skeleton className="h-7 w-72" />
            <Skeleton className="h-4 w-48" />
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border/70 p-3 space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-12" />
                </div>
              ))}
            </div>
          </div>
          <div className="rounded-xl border border-border/70 bg-white/80 p-6 space-y-4">
            <Skeleton className="h-10 w-full max-w-xl" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/70 p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <Skeleton className="h-5 w-56" />
                  <Skeleton className="h-8 w-20" />
                </div>
                <Skeleton className="h-4 w-full" />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                  <Skeleton className="h-14 w-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-2">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="rounded-xl border border-border/70 p-5 space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-11 w-full" />
          ))}
        </div>
        <div className="lg:col-span-3 rounded-xl border border-border/70 p-6 space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-8 w-56" />
              <Skeleton className="h-4 w-96" />
            </div>
            <Skeleton className="h-14 w-14 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-11 w-full" />
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function ScanSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up">
      <div className="space-y-2">
        <Skeleton className="h-8 w-60" />
        <Skeleton className="h-4 w-80" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-xl border border-border/70 p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-64" />
          <Skeleton className="h-72 w-full rounded-xl" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="rounded-xl border border-border/70 p-6 space-y-4">
          <Skeleton className="h-6 w-44" />
          <Skeleton className="h-24 w-full rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function LoginSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-xl border border-border/70 p-6 space-y-5 bg-white/90">
        <div className="space-y-2 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-64 mx-auto" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-11 w-full" />
        </div>
        <Skeleton className="h-11 w-full" />
      </div>
    </div>
  );
}
