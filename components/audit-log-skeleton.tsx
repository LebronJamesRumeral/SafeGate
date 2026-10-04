import { Activity, ClipboardList, ScanLine, ShieldCheck, Users } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const metricSkeletons = [
  { color: 'blue', Icon: Activity },
  { color: 'emerald', Icon: Users },
  { color: 'orange', Icon: ScanLine },
  { color: 'rose', Icon: ShieldCheck },
] as const;

// Full class strings so Tailwind can see them (no interpolated color names)
const metricColors = {
  blue: {
    card: 'bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80',
    orbTop: 'bg-blue-500/10 dark:bg-blue-400/5',
    orbBottom: 'bg-blue-500/5 dark:bg-blue-400/5',
    iconBox: 'bg-blue-500/30 dark:bg-blue-900/50',
    iconText: 'text-blue-500/60',
    stripe: 'bg-blue-500/40',
  },
  emerald: {
    card: 'bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80',
    orbTop: 'bg-emerald-500/10 dark:bg-emerald-400/5',
    orbBottom: 'bg-emerald-500/5 dark:bg-emerald-400/5',
    iconBox: 'bg-emerald-500/30 dark:bg-emerald-900/50',
    iconText: 'text-emerald-500/60',
    stripe: 'bg-emerald-500/40',
  },
  orange: {
    card: 'bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80',
    orbTop: 'bg-orange-500/10 dark:bg-orange-400/5',
    orbBottom: 'bg-orange-500/5 dark:bg-orange-400/5',
    iconBox: 'bg-orange-500/30 dark:bg-orange-900/50',
    iconText: 'text-orange-500/60',
    stripe: 'bg-orange-500/40',
  },
  rose: {
    card: 'bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80',
    orbTop: 'bg-rose-500/10 dark:bg-rose-400/5',
    orbBottom: 'bg-rose-500/5 dark:bg-rose-400/5',
    iconBox: 'bg-rose-500/30 dark:bg-rose-900/50',
    iconText: 'text-rose-500/60',
    stripe: 'bg-rose-500/40',
  },
} as const;

// Varied widths so rows read as real content instead of one repeated block
const tableRowShapes = [
  { time: 'w-24', sub: 'w-36', name: 'w-24', summary: 'w-44' },
  { time: 'w-28', sub: 'w-32', name: 'w-28', summary: 'w-56' },
  { time: 'w-20', sub: 'w-36', name: 'w-20', summary: 'w-40' },
  { time: 'w-28', sub: 'w-40', name: 'w-24', summary: 'w-52' },
  { time: 'w-24', sub: 'w-32', name: 'w-28', summary: 'w-44' },
  { time: 'w-20', sub: 'w-36', name: 'w-20', summary: 'w-48' },
  { time: 'w-28', sub: 'w-32', name: 'w-24', summary: 'w-40' },
  { time: 'w-24', sub: 'w-40', name: 'w-28', summary: 'w-52' },
];

const mobileRowShapes = [
  { summary: 'w-40', actor: 'w-24', time: 'w-36' },
  { summary: 'w-48', actor: 'w-28', time: 'w-32' },
  { summary: 'w-36', actor: 'w-20', time: 'w-36' },
  { summary: 'w-44', actor: 'w-24', time: 'w-28' },
];

export function AuditLogPageSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in-up" aria-label="Loading audit log" aria-busy="true">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="hidden sm:block p-3 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 animate-pulse w-14 h-14" />
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-blue-500" />
              <div className="h-8 bg-linear-to-r from-blue-200 to-blue-100 dark:from-blue-800 dark:to-blue-700 rounded-lg w-48 sm:w-60 animate-pulse" />
            </div>
            <div className="h-4 bg-linear-to-r from-blue-100 to-blue-50 dark:from-blue-900 dark:to-blue-800 rounded-lg w-full max-w-md animate-pulse" />
          </div>
        </div>
        <Skeleton className="h-8 w-28 rounded-full bg-blue-200/70 dark:bg-blue-900/50" />
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {metricSkeletons.map(({ color, Icon }) => {
          const colors = metricColors[color];
          return (
            <div
              key={color}
              className={`shadow-xl border-0 overflow-hidden relative rounded-lg ${colors.card}`}
            >
              <div className={`absolute top-0 right-0 w-32 h-32 rounded-full -mr-16 -mt-16 ${colors.orbTop}`} />
              <div className={`absolute bottom-0 left-0 w-24 h-24 rounded-full -ml-12 -mb-12 ${colors.orbBottom}`} />
              <div className="p-5 sm:p-6 flex items-center justify-between relative z-10">
                <div className="flex-1">
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-10 w-16" />
                  <Skeleton className="h-3 w-28 mt-2" />
                </div>
                <div className={`hidden sm:flex w-16 h-16 rounded-2xl items-center justify-center ${colors.iconBox}`}>
                  <Icon className={`w-8 h-8 ${colors.iconText}`} />
                </div>
              </div>
              <div className={`h-1.5 w-full ${colors.stripe}`} />
            </div>
          );
        })}
      </div>

      {/* Filter summary (collapsed by default on the page) */}
      <div className="rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2 dark:border-slate-700/40 dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <Skeleton className="h-4 w-12" />
            <Skeleton className="hidden h-3 w-56 sm:block" />
          </div>
          <Skeleton className="h-8 w-14 rounded-md" />
        </div>
      </div>

      {/* Mobile activity cards */}
      <div className="md:hidden space-y-3 px-2">
        <div className="flex items-start gap-3 px-1">
          <ClipboardList className="mt-0.5 h-5 w-5 text-blue-500/60" />
          <div className="min-w-0 flex-1 space-y-1.5">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-28" />
          </div>
        </div>

        <div className="space-y-3">
          {mobileRowShapes.map((shape, index) => (
            <div
              key={index}
              className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="h-8 w-8 shrink-0 rounded-lg bg-slate-200 dark:bg-slate-800 animate-pulse" />
                  <div className="min-w-0 space-y-2">
                    <Skeleton className={`h-4 ${shape.summary}`} />
                    <Skeleton className={`h-3 ${shape.actor}`} />
                    <Skeleton className={`h-3 ${shape.time}`} />
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  <Skeleton className="h-5 w-14 rounded-full" />
                  <Skeleton className="h-6 w-10 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-2 px-2">
          <Skeleton className="h-4 w-24" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-20 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>

      {/* Desktop activity table */}
      <div className="hidden md:block border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden rounded-lg">
        <div className="border-b border-blue-200/50 dark:border-blue-700/40 bg-linear-to-r from-blue-50/60 via-blue-50/30 to-transparent dark:from-blue-950/30 dark:via-blue-950/15 dark:to-transparent pb-5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-xl bg-blue-500/30">
                <ClipboardList className="w-5 h-5 text-blue-500/60" />
              </div>
              <div>
                <Skeleton className="h-6 w-44 mb-1" />
                <Skeleton className="h-4 w-80 max-w-full" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-6 w-44 rounded-full" />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-blue-100/50 dark:bg-blue-900/20">
                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-12" /></th>
                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-12" /></th>
                <th className="px-6 py-3 text-left"><Skeleton className="h-4 w-16" /></th>
                <th className="px-6 py-3"><Skeleton className="ml-auto h-4 w-12" /></th>
              </tr>
            </thead>
            <tbody>
              {tableRowShapes.map((shape, index) => (
                <tr
                  key={index}
                  className="border-b border-blue-100/30 dark:border-blue-800/20 last:border-0"
                >
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-1.5">
                      <Skeleton className={`h-4 ${shape.time}`} />
                      <Skeleton className={`h-2.5 ${shape.sub}`} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
                      <Skeleton className={`h-4 ${shape.name}`} />
                      <Skeleton className="h-5 w-14 rounded-full" />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2.5">
                      <span className="w-7 shrink-0" />
                      <Skeleton className="h-8 w-8 shrink-0 rounded-lg" />
                      <Skeleton className={`h-4 ${shape.summary}`} />
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <Skeleton className="ml-auto h-5 w-8 rounded-full" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between gap-2 border-t border-blue-100/40 p-3 dark:border-blue-800/30">
          <Skeleton className="h-4 w-40" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-9 rounded-md" />
            <div className="flex items-center gap-1">
              {[0, 1, 2].map((item) => (
                <Skeleton key={item} className="h-8 w-8 rounded-md" />
              ))}
            </div>
            <Skeleton className="h-8 w-9 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}