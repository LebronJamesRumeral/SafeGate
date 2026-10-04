'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { format, formatDistanceToNow, isSameDay } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Activity,
  AlertTriangle,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  FilePenLine,
  LogIn,
  LogOut,
  Search,
  ScanLine,
  Settings,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { AuditLogPageSkeleton } from '@/components/audit-log-skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth-context';
import { supabase } from '@/lib/supabase';

type AuditDetail = {
  student_id?: string;
  student_name?: string;
  user_id?: string;
  user_name?: string;
  name?: string;
  timestamp?: string;
  [key: string]: unknown;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  actor_name: string;
  actor_role: string;
  action_type: string;
  summary: string;
  event_count: number;
  details: AuditDetail[];
  started_at: string;
  last_event_at: string;
};

const actionOptions = [
  ['student_scan', 'Student scan'],
  ['manual_attendance', 'Manual attendance'],
  ['login', 'Login'],
  ['logout', 'Logout'],
  ['guidance_review', 'Guidance review'],
  ['student_created', 'Student created'],
  ['student_updated', 'Student updated'],
  ['student_deleted', 'Student archived'],
  ['user_created', 'User created'],
  ['user_updated', 'User updated'],
  ['user_deleted', 'User deleted'],
  ['role_changed', 'Role changed'],
  ['settings_changed', 'Settings changed'],
  ['parent_excuse_letter', 'Parent excuse letter'],
  ['parent_attendance_note', 'Parent attendance note'],
  ['parent_behavior_checkin', 'Parent behavior check-in'],
  ['event_rsvp', 'School event response'],
] as const;

const metricDefinitions = [
  { key: 'total_actions', label: 'Total Actions Today', Icon: Activity, color: 'blue' },
  { key: 'active_users', label: 'Active Users', Icon: Users, color: 'emerald' },
  { key: 'students_scanned', label: 'Students Scanned', Icon: ScanLine, color: 'orange' },
  { key: 'critical_changes', label: 'Critical Changes', Icon: ShieldCheck, color: 'rose' },
] as const;

// Same card palette used on the Students page stat cards
const cardColors: Record<string, { background: string; text: string; orb: string; icon: string; stripe: string }> = {
  blue: {
    background: 'bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80',
    text: 'text-blue-600 dark:text-blue-400',
    orb: 'bg-blue-500/15 dark:bg-blue-400/10',
    icon: 'bg-linear-to-br from-blue-500 to-blue-600 shadow-blue-500/20 dark:shadow-blue-500/10',
    stripe: 'bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700',
  },
  emerald: {
    background: 'bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80',
    text: 'text-emerald-600 dark:text-emerald-400',
    orb: 'bg-emerald-500/15 dark:bg-emerald-400/10',
    icon: 'bg-linear-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/20 dark:shadow-emerald-500/10',
    stripe: 'bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700',
  },
  orange: {
    background: 'bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80',
    text: 'text-orange-600 dark:text-orange-400',
    orb: 'bg-orange-500/15 dark:bg-orange-400/10',
    icon: 'bg-linear-to-br from-orange-500 to-orange-600 shadow-orange-500/20 dark:shadow-orange-500/10',
    stripe: 'bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700',
  },
  rose: {
    background: 'bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80',
    text: 'text-rose-600 dark:text-rose-400',
    orb: 'bg-rose-500/15 dark:bg-rose-400/10',
    icon: 'bg-linear-to-br from-rose-500 to-rose-600 shadow-rose-500/20 dark:shadow-rose-500/10',
    stripe: 'bg-linear-to-r from-rose-400 to-rose-600 dark:from-rose-500 dark:to-rose-700',
  },
};

function getLocalDayStart(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function getInitials(name: string) {
  return (
    (name || '?')
      .split(' ')
      .filter(Boolean)
      .map((part) => part[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() || '?'
  );
}

function getActionIcon(actionType: string) {
  if (actionType.includes('scan') || actionType === 'manual_attendance') return ScanLine;
  if (actionType === 'login') return LogIn;
  if (actionType === 'logout') return LogOut;
  if (actionType.includes('deleted')) return Trash2;
  if (actionType.includes('created')) return UserPlus;
  if (actionType.includes('updated') || actionType === 'role_changed') return FilePenLine;
  if (actionType.includes('settings')) return Settings;
  if (actionType.includes('guidance')) return CheckCircle2;
  if (actionType.includes('parent')) return Users;
  if (actionType.includes('event')) return CalendarDays;
  return AlertTriangle;
}

// Icon-box tint per kind of action, same soft tints the Students page uses for badges
function getActionTone(actionType: string) {
  if (actionType.includes('deleted') || actionType === 'role_changed') {
    return 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300';
  }
  if (actionType.includes('created')) {
    return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300';
  }
  if (actionType.includes('updated') || actionType.includes('settings')) {
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300';
  }
  if (actionType.includes('guidance')) {
    return 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300';
  }
  if (actionType === 'login' || actionType === 'logout') {
    return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  }
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300';
}

function roleBadgeClass(role: string) {
  switch ((role || '').toLowerCase()) {
    case 'admin':
      return 'border-0 bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300';
    case 'guidance':
      return 'border-0 bg-violet-100 text-violet-800 dark:bg-violet-900/40 dark:text-violet-300';
    case 'parent':
      return 'border-0 bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300';
    default:
      return 'border-0 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300';
  }
}

function formatRecordTime(row: AuditLogRow) {
  const start = new Date(row.started_at);
  const end = new Date(row.last_event_at);
  if (row.event_count <= 1) return format(end, 'MMM d, h:mm a');
  if (isSameDay(start, end)) return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'h:mm a')}`;
  return `${format(start, 'MMM d, h:mm a')} - ${format(end, 'MMM d, h:mm a')}`;
}

function buildPageNumbers(current: number, total: number): Array<number | string> {
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1);

  const pages: Array<number | string> = [1];
  if (current > 3) pages.push('start-ellipsis');
  for (let page = Math.max(2, current - 1); page <= Math.min(total - 1, current + 1); page += 1) {
    pages.push(page);
  }
  if (current < total - 2) pages.push('end-ellipsis');
  pages.push(total);
  return pages;
}

export default function AuditLogPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  const queryString = searchParams.toString();
  const page = Math.max(1, Number(searchParams.get('page') || '1') || 1);
  const pageSize = 10;
  const searchValue = searchParams.get('q') || '';
  const actionType = searchParams.get('type') || '';
  const actorId = searchParams.get('actor') || '';
  const fromDate = searchParams.get('from') || '';
  const toDate = searchParams.get('to') || '';
  const [searchDraft, setSearchDraft] = useState(searchValue);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [users, setUsers] = useState<Array<{ id: string; full_name: string | null; role: string | null }>>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [loadingRows, setLoadingRows] = useState(true);
  const [loadingMetrics, setLoadingMetrics] = useState(true);
  const [initialDataLoaded, setInitialDataLoaded] = useState(false);
  const [minimumSkeletonElapsed, setMinimumSkeletonElapsed] = useState(false);
  const [error, setError] = useState('');
  const [metrics, setMetrics] = useState<Record<string, { today: number; yesterday: number }>>({});
  const [retryToken, setRetryToken] = useState(0);
  const [showFilters, setShowFilters] = useState(false);
  const isAdmin = !authLoading && user?.role?.toLowerCase() === 'admin';

  const updateQuery = (key: string, value: string, resetPage = true) => {
    const next = new URLSearchParams(queryString);
    if (value) next.set(key, value);
    else next.delete(key);
    if (resetPage) next.delete('page');
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  useEffect(() => {
    setSearchDraft(searchValue);
  }, [searchValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setMinimumSkeletonElapsed(true), 2000);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (searchDraft !== searchValue) updateQuery('q', searchDraft.trim());
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchDraft]);

  useEffect(() => {
    if (authLoading) return;
    if (!user || user.role?.toLowerCase() !== 'admin') {
      router.replace('/');
    }
  }, [authLoading, router, user]);

  useEffect(() => {
    if (!isAdmin) return;
    const db = supabase;
    if (!db) {
      setUsers([]);
      return;
    }
    let cancelled = false;

    const loadUsers = async () => {
      const { data } = await db
        .from('profiles')
        .select('id, full_name, role')
        .order('full_name', { ascending: true });
      if (!cancelled) setUsers(data || []);
    };

    void loadUsers();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const db = supabase;
    if (!db) {
      setError('Supabase is not configured for this environment.');
      setLoadingRows(false);
      setLoadingMetrics(false);
      return;
    }
    let cancelled = false;
    setLoadingMetrics(true);

    const todayStart = getLocalDayStart(new Date());
    const yesterdayStart = new Date(todayStart);
    yesterdayStart.setDate(yesterdayStart.getDate() - 1);

    const loadMetrics = async () => {
      const { data, error: metricsError } = await db.rpc('audit_log_metrics', {
        p_today_start: todayStart.toISOString(),
        p_yesterday_start: yesterdayStart.toISOString(),
      });
      if (cancelled) return;
      if (metricsError) {
        console.error('Failed to load audit metrics:', metricsError);
        setMetrics({});
      } else {
        const nextMetrics: Record<string, { today: number; yesterday: number }> = {};
        (data || []).forEach((item: { metric_key: string; today_count: number; yesterday_count: number }) => {
          nextMetrics[item.metric_key] = {
            today: Number(item.today_count || 0),
            yesterday: Number(item.yesterday_count || 0),
          };
        });
        setMetrics(nextMetrics);
      }
      setLoadingMetrics(false);
    };

    void loadMetrics();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const db = supabase;
    if (!db) {
      setError('Supabase is not configured for this environment.');
      setLoadingRows(false);
      return;
    }
    let cancelled = false;
    setLoadingRows(true);
    setError('');

    const localDateStart = (date: string) => (date ? new Date(`${date}T00:00:00`).toISOString() : null);
    const localDateEnd = (date: string) => {
      if (!date) return null;
      const end = new Date(`${date}T00:00:00`);
      end.setDate(end.getDate() + 1);
      return end.toISOString();
    };

    const loadLogs = async () => {
      const { data, count, error: queryError } = await db
        .rpc(
          'search_audit_logs',
          {
            p_search: searchValue || null,
            p_action_type: actionType || null,
            p_actor_id: actorId || null,
            p_from: localDateStart(fromDate),
            p_to: localDateEnd(toDate),
          },
          { count: 'exact' }
        )
        .range((page - 1) * pageSize, page * pageSize - 1);

      if (cancelled) return;
      if (queryError) {
        console.error('Failed to load audit logs:', queryError);
        setError(queryError.message || 'Audit records could not be loaded.');
        setLogs([]);
        setTotalCount(0);
      } else {
        setLogs((data || []) as AuditLogRow[]);
        setTotalCount(count || 0);
      }
      setLoadingRows(false);
    };

    void loadLogs();
    return () => {
      cancelled = true;
    };
  }, [isAdmin, queryString, page, pageSize, retryToken]);

  useEffect(() => {
    if (!loadingRows && !loadingMetrics) {
      setInitialDataLoaded(true);
    }
  }, [loadingRows, loadingMetrics]);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const firstRecord = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, totalCount);

  // Only clamp the page once data has loaded, so a refresh on ?page=3 keeps page 3
  useEffect(() => {
    if (loadingRows) return;
    if (page > totalPages) updateQuery('page', String(totalPages), false);
  }, [loadingRows, page, totalPages]);

  const goToPage = (next: number) => updateQuery('page', String(next), false);

  const clearFilters = () => {
    setSearchDraft('');
    router.replace(pathname, { scroll: false });
  };

  const toggleExpanded = (id: string) => {
    setExpandedRows((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filtersActive = Boolean(searchValue || actionType || actorId || fromDate || toDate);
  const actionLabel = actionOptions.find(([value]) => value === actionType)?.[1];
  const actorLabel = users.find((item) => item.id === actorId)?.full_name;
  const filterSummary = [
    searchValue ? `Search: ${searchValue}` : 'No search',
    actionLabel || 'All actions',
    actorLabel || 'All users',
    fromDate || toDate ? `${fromDate || 'Start'} → ${toDate || 'Today'}` : 'All dates',
  ].join(' • ');

  if (authLoading || !isAdmin || !initialDataLoaded || !minimumSkeletonElapsed) {
    return (
      <DashboardLayout>
        <AuditLogPageSkeleton />
      </DashboardLayout>
    );
  }

  const pager = (
    <AuditPager
      page={page}
      totalPages={totalPages}
      firstRecord={firstRecord}
      lastRecord={lastRecord}
      totalCount={totalCount}
      onPage={goToPage}
    />
  );

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Audit Log
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              System activity and account changes
              {!loadingRows && !error ? ` • ${totalCount.toLocaleString()} records` : ''}
            </p>
          </div>
          <Badge className="w-fit border-0 bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
            <ClipboardList className="mr-1.5 h-3.5 w-3.5" /> Admin view
          </Badge>
        </div>

        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {metricDefinitions.map(({ key, label, Icon, color }, index) => {
            const metric = metrics[key] || { today: 0, yesterday: 0 };
            const change =
              metric.yesterday === 0
                ? metric.today === 0
                  ? 0
                  : 100
                : Math.round(((metric.today - metric.yesterday) / metric.yesterday) * 100);
            const colors = cardColors[color];
            return (
              <motion.div
                key={key}
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1 * (index + 1) }}
              >
                <Card className={`border-0 ${colors.background} shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300`}>
                  <div className={`absolute top-0 right-0 w-20 h-20 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500 ${colors.orb}`} />
                  <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                    <div className="flex-1 min-w-0">
                      <p className={`text-[9px] sm:text-[10px] font-semibold mb-0.5 uppercase tracking-wide leading-tight ${colors.text}`}>{label}</p>
                      {loadingMetrics ? (
                        <Skeleton className="h-7 w-14 sm:h-8 sm:w-16" />
                      ) : (
                        <div className={`text-lg sm:text-2xl font-bold leading-tight ${colors.text}`}>{metric.today.toLocaleString()}</div>
                      )}
                      <div className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">
                        {loadingMetrics ? (
                          <Skeleton className="h-3 w-20" />
                        ) : (
                          <span className={change > 0 ? 'text-emerald-700 dark:text-emerald-400' : change < 0 ? 'text-red-700 dark:text-red-400' : ''}>
                            {change > 0 ? '+' : ''}
                            {change}% vs yesterday
                          </span>
                        )}
                      </div>
                    </div>
                    <div className={`flex-shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl text-white flex items-center justify-center shadow-md group-hover:scale-105 transition-all duration-300 ${colors.icon}`}>
                      <Icon className="w-6 h-6 sm:w-7 sm:h-7" />
                    </div>
                  </CardContent>
                  <div className={`h-1 w-full ${colors.stripe}`} />
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Filters */}
        <AnimatePresence initial={false}>
          {!showFilters && (
            <motion.div
              key="audit-filters-summary"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-3"
            >
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2 dark:border-slate-700/40 dark:bg-slate-900/50">
                <div className="min-w-0 text-sm truncate">
                  <strong className="mr-2">Filters</strong>
                  <span className="text-muted-foreground">{filterSummary}</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  aria-expanded={showFilters}
                  aria-controls="audit-filters-panel"
                  onClick={() => setShowFilters((visible) => !visible)}
                  className="gap-2"
                >
                  Show
                </Button>
              </div>
            </motion.div>
          )}
          {showFilters && (
            <motion.div
              key="audit-filters-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card id="audit-filters-panel" className="overflow-hidden rounded-xl border border-slate-200/70 bg-white/75 shadow-sm backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-950/60">
                <CardContent className="space-y-2.5 p-3 sm:p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-semibold text-foreground">Filters</span>
                      <span className="hidden sm:inline">{loadingRows ? 'Updating results...' : `${totalCount.toLocaleString()} matching records`}</span>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      aria-expanded={showFilters}
                      aria-controls="audit-filters-panel"
                      onClick={() => setShowFilters((visible) => !visible)}
                      className="h-7 shrink-0 px-2 text-xs text-muted-foreground"
                    >
                      Hide
                    </Button>
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-[minmax(190px,1.5fr)_minmax(145px,1fr)_minmax(145px,1fr)_minmax(135px,0.85fr)_minmax(135px,0.85fr)_auto]">
                    <div className="relative min-w-0">
                      <label htmlFor="audit-search" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Search</label>
                      <Search className="absolute left-3 top-[2.15rem] h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        id="audit-search"
                        value={searchDraft}
                        onChange={(event) => setSearchDraft(event.target.value)}
                        placeholder="User or student name"
                        className="h-9 w-full pl-9 text-xs"
                        aria-label="Search users or students"
                      />
                    </div>
                    <div className="min-w-0">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Action</label>
                      <Select value={actionType || 'all'} onValueChange={(value) => updateQuery('type', value === 'all' ? '' : value)}>
                        <SelectTrigger className="h-9 w-full text-xs" aria-label="Filter by action type">
                          <SelectValue placeholder="All actions" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Actions</SelectItem>
                          {actionOptions.map(([value, label]) => (
                            <SelectItem key={value} value={value}>{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0">
                      <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">User</label>
                      <Select value={actorId || 'all'} onValueChange={(value) => updateQuery('actor', value === 'all' ? '' : value)}>
                        <SelectTrigger className="h-9 w-full text-xs" aria-label="Filter by user">
                          <SelectValue placeholder="All users" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Users</SelectItem>
                          {users.map((item) => (
                            <SelectItem key={item.id} value={item.id}>{item.full_name || item.id.slice(0, 8)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="audit-from" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">From</label>
                      <Input
                        id="audit-from"
                        type="date"
                        value={fromDate}
                        onChange={(event) => updateQuery('from', event.target.value)}
                        className="h-9 w-full px-2 text-xs"
                        aria-label="Start date"
                      />
                    </div>
                    <div className="min-w-0">
                      <label htmlFor="audit-to" className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">To</label>
                      <Input
                        id="audit-to"
                        type="date"
                        value={toDate}
                        onChange={(event) => updateQuery('to', event.target.value)}
                        className="h-9 w-full px-2 text-xs"
                        aria-label="End date"
                      />
                    </div>
                    <div className="flex items-end justify-end">
                      {filtersActive && (
                        <Button variant="outline" size="sm" onClick={clearFilters} className="h-9 w-full gap-1.5 px-2 text-xs xl:w-auto">
                          <X className="h-3.5 w-3.5" /> Clear
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Mobile list */}
        {isMobile ? (
          <div className="space-y-3">
            <div className="flex items-start gap-3 px-1">
              <ClipboardList className="mt-0.5 h-5 w-5 text-blue-500" />
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-semibold leading-tight">Activity Records</h3>
                <p className="text-sm text-muted-foreground">Newest activity first</p>
              </div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`mobile-audit-${page}`}
                initial={{ opacity: 0, x: 12, scale: 0.995 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.995 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-3 px-2"
              >
                {loadingRows ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={`loading-${index}`} className="h-24 w-full rounded-xl" />
                  ))
                ) : error || logs.length === 0 ? (
                  <AuditStateMessage
                    error={error}
                    filtersActive={filtersActive}
                    onRetry={() => setRetryToken((value) => value + 1)}
                    onClear={clearFilters}
                  />
                ) : (
                  logs.map((row) => (
                    <AuditLogMobileCard
                      key={row.id}
                      row={row}
                      expanded={expandedRows.has(row.id)}
                      onToggle={() => toggleExpanded(row.id)}
                    />
                  ))
                )}
              </motion.div>
            </AnimatePresence>

            {!loadingRows && !error && logs.length > 0 && <div className="px-0">{pager}</div>}
          </div>
        ) : (
          /* Desktop table */
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <ClipboardList className="w-5 h-5 text-blue-500" />
                    Activity Records
                  </CardTitle>
                  <CardDescription>
                    Repeated actions by the same person within an hour are grouped into one record
                  </CardDescription>
                </div>
                <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                  <Badge variant="outline" className="bg-white dark:bg-slate-800 text-xs whitespace-nowrap">
                    Last Activity {' \u2014 '} Newest First
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table className="min-w-180">
                  <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                    <TableRow>
                      <TableHead className="min-w-48 whitespace-nowrap">Time</TableHead>
                      <TableHead className="min-w-48 whitespace-nowrap">User</TableHead>
                      <TableHead className="whitespace-nowrap">Action</TableHead>
                      <TableHead className="w-24 text-right whitespace-nowrap">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingRows ? (
                      Array.from({ length: pageSize > 10 ? 8 : pageSize }).map((_, index) => (
                        <TableRow key={`loading-${index}`}>
                          <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                          <TableCell><Skeleton className="h-4 w-48" /></TableCell>
                          <TableCell><Skeleton className="ml-auto h-5 w-8" /></TableCell>
                        </TableRow>
                      ))
                    ) : error || logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center">
                          <AuditStateMessage
                            error={error}
                            filtersActive={filtersActive}
                            onRetry={() => setRetryToken((value) => value + 1)}
                            onClear={clearFilters}
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((row, index) => (
                        <AuditLogTableRows
                          key={row.id}
                          row={row}
                          index={index}
                          expanded={expandedRows.has(row.id)}
                          onToggle={() => toggleExpanded(row.id)}
                        />
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {!loadingRows && !error && logs.length > 0 && (
                <div className="border-t border-slate-200/60 dark:border-slate-700/40">{pager}</div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </DashboardLayout>
  );
}

function AuditPager({
  page,
  totalPages,
  firstRecord,
  lastRecord,
  totalCount,
  onPage,
}: {
  page: number;
  totalPages: number;
  firstRecord: number;
  lastRecord: number;
  totalCount: number;
  onPage: (page: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2 p-3">
      <p className="text-xs sm:text-sm text-muted-foreground truncate">
        Showing {firstRecord}-{lastRecord} of {totalCount}
      </p>
      <div className="flex items-center gap-2 shrink-0">
        <Button variant="outline" size="sm" onClick={() => onPage(page - 1)} disabled={page <= 1} aria-label="Previous page">
          <ChevronLeft className="w-4 h-4" />
        </Button>
        <div className="hidden items-center gap-1 sm:flex">
          {buildPageNumbers(page, totalPages).map((item, index) =>
            typeof item === 'number' ? (
              <Button
                key={`${item}-${index}`}
                variant={item === page ? 'default' : 'outline'}
                size="sm"
                className="h-8 min-w-8 px-2"
                onClick={() => onPage(item)}
                aria-current={item === page ? 'page' : undefined}
              >
                {item}
              </Button>
            ) : (
              <span key={`${item}-${index}`} className="px-1 text-sm text-muted-foreground">...</span>
            )
          )}
        </div>
        <span className="whitespace-nowrap text-xs sm:hidden">Page {page} / {totalPages}</span>
        <Button variant="outline" size="sm" onClick={() => onPage(page + 1)} disabled={page >= totalPages} aria-label="Next page">
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}

function AuditStateMessage({
  error,
  filtersActive,
  onRetry,
  onClear,
}: {
  error: string;
  filtersActive: boolean;
  onRetry: () => void;
  onClear: () => void;
}) {
  if (error) {
    return (
      <div className="flex flex-col items-center gap-2 py-12 text-center">
        <AlertTriangle className="h-12 w-12 text-rose-300" />
        <p className="font-medium text-rose-700 dark:text-rose-300">Audit records could not be loaded</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{error}</p>
        <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-2 py-12">
      <Activity className="w-12 h-12 text-gray-300" />
      <p className="text-gray-500 dark:text-gray-400">No activity records found</p>
      {filtersActive ? (
        <Button variant="outline" size="sm" onClick={onClear}>Clear filters</Button>
      ) : (
        <p className="text-sm text-gray-400">New system activity will appear here.</p>
      )}
    </div>
  );
}

function AuditDetailsList({ row }: { row: AuditLogRow }) {
  return (
    <div className="ml-2 sm:ml-8 max-h-64 space-y-2 overflow-y-auto border-l-2 border-blue-200 pl-4 pr-2 dark:border-blue-700/50">
      {(row.details || []).map((detail, index) => {
        const detailName = detail.student_name || detail.user_name || detail.name || detail.student_id || 'Activity';
        const detailTime = typeof detail.timestamp === 'string' ? new Date(detail.timestamp) : null;
        return (
          <div key={`${row.id}-${index}`} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm">
            <span className="text-slate-700 dark:text-slate-300">{detailName}</span>
            {detailTime && !Number.isNaN(detailTime.getTime()) && (
              <time title={detailTime.toLocaleString()} className="text-xs text-slate-500 dark:text-slate-400">
                {format(detailTime, 'h:mm:ss a')}
              </time>
            )}
          </div>
        );
      })}
    </div>
  );
}

function AuditLogTableRows({
  row,
  index,
  expanded,
  onToggle,
}: {
  row: AuditLogRow;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = getActionIcon(row.action_type);
  const grouped = row.event_count > 1;
  const lastAt = new Date(row.last_event_at);

  return (
    <>
      <motion.tr
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index, 15) * 0.03 }}
        className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
      >
        <TableCell className="whitespace-nowrap">
          <div className="flex flex-col gap-0.5">
            <span className="text-sm font-medium text-slate-800 dark:text-slate-200" title={lastAt.toLocaleString()}>
              {formatDistanceToNow(lastAt, { addSuffix: true })}
            </span>
            <span className="text-[10px] text-muted-foreground">{formatRecordTime(row)}</span>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-2 min-w-45">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                {getInitials(row.actor_name)}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium leading-tight">{row.actor_name}</span>
              <Badge className={`capitalize ${roleBadgeClass(row.actor_role)}`}>{row.actor_role}</Badge>
            </div>
          </div>
        </TableCell>
        <TableCell>
          <div className="flex min-w-56 items-center gap-2.5">
            {grouped ? (
              <button
                type="button"
                onClick={onToggle}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${row.summary}`}
                aria-expanded={expanded}
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700"
              >
                <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </button>
            ) : (
              <span className="w-7 shrink-0" />
            )}
            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getActionTone(row.action_type)}`}>
              <Icon className="h-4 w-4" />
            </span>
            <span className="text-sm text-slate-800 dark:text-slate-200">{row.summary}</span>
          </div>
        </TableCell>
        <TableCell className="text-right">
          {grouped ? (
            <Badge className="border-0 bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">{row.event_count}</Badge>
          ) : (
            <span className="text-sm text-slate-400">1</span>
          )}
        </TableCell>
      </motion.tr>
      {grouped && expanded && (
        <TableRow className="bg-slate-50/70 hover:bg-slate-50/70 dark:bg-slate-800/30 dark:hover:bg-slate-800/30">
          <TableCell colSpan={4} className="py-3">
            <AuditDetailsList row={row} />
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

function AuditLogMobileCard({
  row,
  expanded,
  onToggle,
}: {
  row: AuditLogRow;
  expanded: boolean;
  onToggle: () => void;
}) {
  const Icon = getActionIcon(row.action_type);
  const grouped = row.event_count > 1;

  return (
    <div className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-2.5">
          <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${getActionTone(row.action_type)}`}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium">{row.summary}</p>
            <p className="text-xs text-gray-500 truncate">{row.actor_name}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3 shrink-0" />
              {formatRecordTime(row)}
            </p>
          </div>
        </div>
        <div className="shrink-0 text-right">
          <Badge className={`capitalize ${roleBadgeClass(row.actor_role)}`}>{row.actor_role}</Badge>
          {grouped && (
            <div className="mt-1 flex justify-end">
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggle}
                aria-expanded={expanded}
                aria-label={`${expanded ? 'Collapse' : 'Expand'} ${row.summary}`}
                className="h-7 gap-1 px-2 text-xs"
              >
                {row.event_count}
                <ChevronDown className={`h-3.5 w-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
              </Button>
            </div>
          )}
        </div>
      </div>
      {grouped && expanded && (
        <div className="mt-3 border-t border-slate-100 pt-3 dark:border-slate-800">
          <AuditDetailsList row={row} />
        </div>
      )}
    </div>
  );
}