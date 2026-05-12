'use client';

import { useEffect, useMemo, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { CalendarDays, MapPin, Clock, Megaphone, BellRing, CheckCircle2, CalendarX2, TriangleAlert } from 'lucide-react';
import ParentAnnouncementSkeleton from '@/components/parent-announcement-skeleton';
import { fetchActiveSchoolEvents, ensureUpcomingSchoolEventReminders, type SchoolEvent } from '@/lib/school-events';
import { toast } from '@/hooks/use-toast';
import { createRoleNotification, fetchRoleNotifications, type RoleNotification } from '@/lib/role-notifications';
import { supabase } from '@/lib/supabase';
import { getParentStudents } from '@/lib/parent-data';
import { formatTime12h } from '@/lib/time-format';

type AnnouncementKind = 'announcement' | 'holiday' | 'cancellation';

type AnnouncementItem = {
  id: string;
  source: 'event' | 'notification';
  kind: AnnouncementKind;
  title: string;
  description: string | null;
  image_url: string | null;
  event_date: string;
  end_date?: string | null;
  start_time: string | null;
  end_time: string | null;
  location: string | null;
  created_at: string;
  href?: string;
  event_id?: number;
  notification_id?: number;
  notification_kind?: string | null;
};

type Student = {
  id: string;
  name: string;
  lrn: string;
  parent_email: string;
  parent_name: string;
};

type PendingEventIntent = {
  event: SchoolEvent;
  action: 'join' | 'not_join';
};

export default function ParentAnnouncementPage() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Student[]>([]);
  const [joinNotifiedByEventId, setJoinNotifiedByEventId] = useState<Record<number, boolean>>({});
  const [savingJoinEventId, setSavingJoinEventId] = useState<number | null>(null);
  const [willNotJoinByEventId, setWillNotJoinByEventId] = useState<Record<number, boolean>>({});
  const [savingWillNotJoinEventId, setSavingWillNotJoinEventId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<AnnouncementItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'announcement' | 'holiday' | 'cancellation'>('all');
  const [childSelectionOpen, setChildSelectionOpen] = useState(false);
  const [selectedChildren, setSelectedChildren] = useState<Set<string>>(new Set());
  const [pendingEventIntent, setPendingEventIntent] = useState<PendingEventIntent | null>(null);
  const minimumInitialSkeletonMs = 600;

  const formatEventDate = (date: string, endDate?: string | null) => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;

    const startLabel = parsed.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    if (!endDate || endDate === date) return startLabel;

    const parsedEnd = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(parsedEnd.getTime())) return startLabel;

    const endLabel = parsedEnd.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });

    return `${startLabel} - ${endLabel}`;
  };

  const isEventPassed = (eventDate: string, endDate?: string | null): boolean => {
    const resolvedEndDate = endDate || eventDate;
    const eventDateObj = new Date(`${resolvedEndDate}T23:59:59`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return eventDateObj < today;
  };

  const normalizeAnnouncementKind = (value?: string | null): AnnouncementKind => {
    const normalized = String(value || '').toLowerCase();
    if (normalized === 'school_holiday' || normalized === 'holiday') return 'holiday';
    if (normalized === 'class_cancellation' || normalized === 'cancelled_class') return 'cancellation';
    return 'announcement';
  };

  const mapEventToAnnouncement = (event: SchoolEvent): AnnouncementItem => ({
    id: `event-${event.id}`,
    source: 'event',
    kind: 'announcement',
    title: event.title,
    description: event.description,
    image_url: event.image_url,
    event_date: event.event_date,
    end_date: event.end_date,
    start_time: event.start_time,
    end_time: event.end_time,
    location: event.location,
    created_at: event.updated_at || event.created_at,
    event_id: event.id,
  });

  const mapNotificationToAnnouncement = (notification: RoleNotification): AnnouncementItem => {
    const meta = notification.meta || {};
    const kind = normalizeAnnouncementKind(meta.notification_kind as string | null | undefined);
    const eventDate =
      typeof meta.cancelled_start_date === 'string'
        ? meta.cancelled_start_date
        : typeof meta.event_date === 'string'
          ? meta.event_date
          : notification.created_at.slice(0, 10);
    const prettyDate = formatEventDate(eventDate);

    return {
      id: `notification-${notification.id}`,
      source: 'notification',
      kind,
      title: notification.title,
      description:
        kind === 'holiday'
          ? `${prettyDate} is marked as a school holiday.`
          : kind === 'cancellation'
            ? `Classes on ${prettyDate} are cancelled.`
            : notification.message,
      image_url: null,
      event_date: eventDate,
      start_time: null,
      end_time: null,
      location: typeof meta.reason === 'string' ? meta.reason : null,
      created_at: notification.created_at,
      href: typeof meta.href === 'string' ? meta.href : undefined,
      notification_id: notification.id,
      notification_kind: typeof meta.notification_kind === 'string' ? meta.notification_kind : null,
    };
  };

  const getAnnouncementStyle = (kind: AnnouncementKind) => {
    if (kind === 'holiday') {
      return {
        badgeClass: 'bg-sky-100 text-sky-700 border-0',
        bannerClass: 'from-sky-100 via-cyan-50 to-white text-sky-700',
        iconClass: 'text-sky-600',
        title: 'School Holiday',
        accent: 'Holiday Notice',
        heroIcon: CalendarX2,
        thumbIcon: CalendarX2,
      };
    }

    if (kind === 'cancellation') {
      return {
        badgeClass: 'bg-rose-100 text-rose-700 border-0',
        bannerClass: 'from-rose-100 via-orange-50 to-white text-rose-700',
        iconClass: 'text-rose-600',
        title: 'Classes Cancelled',
        accent: 'Cancellation Notice',
        heroIcon: TriangleAlert,
        thumbIcon: TriangleAlert,
      };
    }

    return {
      badgeClass: 'bg-blue-100 text-blue-700 border-0',
      bannerClass: 'from-blue-100 via-cyan-50 to-white text-blue-700',
      iconClass: 'text-blue-600',
      title: 'Announcement',
      accent: 'School Update',
      heroIcon: Megaphone,
      thumbIcon: Megaphone,
    };
  };

  const renderAnnouncementVisual = (item: AnnouncementItem, size: 'hero' | 'thumb' = 'hero') => {
    if (item.image_url) {
      return size === 'hero' ? (
        <div className="h-52 w-full bg-slate-100 overflow-hidden lg:h-56">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.title} className="h-full w-full object-cover" />
        </div>
      ) : (
        <div className="w-full h-full bg-slate-100 overflow-hidden rounded-md">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
        </div>
      );
    }

    const style = getAnnouncementStyle(item.kind);
    if (size === 'hero') {
      const HeroIcon = style.heroIcon;
      return (
        <div className={`h-52 w-full lg:h-56 bg-linear-to-br ${style.bannerClass} flex items-center justify-center px-6`}>
          <div className="w-full max-w-xl rounded-2xl border border-white/70 bg-white/55 backdrop-blur-sm p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-slate-500">{style.accent}</p>
                <h3 className="mt-1 text-2xl font-bold text-slate-900 leading-tight">{style.title}</h3>
              </div>
              <HeroIcon className={`h-14 w-14 ${style.iconClass}`} />
            </div>
            <p className="mt-3 text-sm text-slate-600 line-clamp-2">
              {item.kind === 'holiday'
                ? 'No classes will be held on this date.'
                : item.kind === 'cancellation'
                  ? 'Classes are cancelled for this date.'
                  : item.description || 'School-wide update for parents and guardians.'}
            </p>
          </div>
        </div>
      );
    }

    const ThumbIcon = style.thumbIcon;
    return (
      <div className={`w-full h-full rounded-md bg-linear-to-br ${style.bannerClass} flex items-center justify-center`}>
        <ThumbIcon className={`w-6 h-6 ${style.iconClass}`} />
      </div>
    );
  };

  useEffect(() => {
    const load = async () => {
      const start = Date.now();
      setLoading(true);
      try {
        const [events, notifications] = await Promise.all([
          fetchActiveSchoolEvents(),
          user?.username ? fetchRoleNotifications('parent', 100, { email: user.username }) : Promise.resolve([] as RoleNotification[]),
        ]);

        const noClassAnnouncements = supabase
          ? await (async () => {
              const { data: rows } = await supabase
                .from('attendance_logs')
                .select('date, attendance_status, created_at')
                .in('attendance_status', ['holiday', 'cancelled_class'])
                .order('date', { ascending: false })
                .limit(200);

              const seen = new Set<string>();
              return (rows || [])
                .map((row: any) => {
                  const kind = normalizeAnnouncementKind(row.attendance_status);
                  const date = String(row.date || '').slice(0, 10);
                  if (!date) return null;
                  const key = `${kind}:${date}`;
                  if (seen.has(key)) return null;
                  seen.add(key);
                  return {
                    id: `attendance-${kind}-${date}`,
                    source: 'notification' as const,
                    kind,
                    title: kind === 'holiday' ? 'School Holiday' : 'Classes Cancelled',
                    description:
                      kind === 'holiday'
                        ? `School holiday recorded on ${date}.`
                        : `Classes cancelled on ${date}.`,
                    image_url: null,
                    event_date: date,
                    start_time: null,
                    end_time: null,
                    location: null,
                    created_at: row.created_at || `${date}T00:00:00.000Z`,
                    notification_kind: row.attendance_status,
                  } as AnnouncementItem;
                })
                .filter(Boolean) as AnnouncementItem[];
            })()
          : [];

        const holidayAndCancellationAnnouncements = (notifications || [])
          .filter((notification) => {
            const kind = String(notification.meta?.notification_kind || '').toLowerCase();
            return kind === 'school_holiday' || kind === 'class_cancellation';
          })
          .map(mapNotificationToAnnouncement);

        const mergedNoClassAnnouncements = [...holidayAndCancellationAnnouncements, ...noClassAnnouncements].reduce<AnnouncementItem[]>((acc, item) => {
          const existingIndex = acc.findIndex((candidate) => candidate.event_date === item.event_date);
          if (existingIndex === -1) {
            acc.push(item);
            return acc;
          }

          const existing = acc[existingIndex];
          const incomingIsHoliday = item.kind === 'holiday';
          const existingIsHoliday = existing.kind === 'holiday';

          if (incomingIsHoliday && !existingIsHoliday) {
            acc[existingIndex] = item;
            return acc;
          }

          if (incomingIsHoliday === existingIsHoliday) {
            const incomingTime = new Date(item.created_at || item.event_date).getTime();
            const existingTime = new Date(existing.created_at || existing.event_date).getTime();
            if (incomingTime > existingTime) {
              acc[existingIndex] = item;
            }
          }

          return acc;
        }, []).sort((a, b) => {
          const left = new Date(a.created_at || a.event_date).getTime();
          const right = new Date(b.created_at || b.event_date).getTime();
          return right - left;
        });

        const mappedEvents = events.map(mapEventToAnnouncement);
        const combinedAnnouncements = [...mergedNoClassAnnouncements, ...mappedEvents]
          .sort((a, b) => {
            const left = new Date(a.created_at || a.event_date).getTime();
            const right = new Date(b.created_at || b.event_date).getTime();
            return right - left;
          });

        setAnnouncements(combinedAnnouncements);

        if (supabase && user?.username) {
          const { data: existingIntents } = await supabase
            .from('role_notifications')
            .select('id, meta')
            .contains('meta', {
              notification_kind: 'school_event_join_intent',
              parent_email: user.username,
            })
            .limit(1000);

          const notifiedMap: Record<number, boolean> = {};
          (existingIntents || []).forEach((item: any) => {
            const eventId = Number(item?.meta?.event_id);
            if (!Number.isNaN(eventId) && eventId > 0) {
              notifiedMap[eventId] = true;
            }
          });
          setJoinNotifiedByEventId(notifiedMap);

          const { data: willNotJoinIntents } = await supabase
            .from('role_notifications')
            .select('id, meta')
            .contains('meta', {
              notification_kind: 'school_event_will_not_join_intent',
              parent_email: user.username,
            })
            .limit(1000);

          const willNotJoinMap: Record<number, boolean> = {};
          (willNotJoinIntents || []).forEach((item: any) => {
            const eventId = Number(item?.meta?.event_id);
            if (!Number.isNaN(eventId) && eventId > 0) {
              willNotJoinMap[eventId] = true;
            }
          });
          setWillNotJoinByEventId(willNotJoinMap);
        }
        await ensureUpcomingSchoolEventReminders(events);

        // Fetch parent's children for multi-child selection
        if (user?.username) {
          try {
            const studentData = await getParentStudents(user.username);
            setChildren(studentData || []);
          } catch (e) {
            console.error('Failed to fetch children:', e);
            setChildren([]);
          }
        }
      } finally {
        const elapsed = Date.now() - start;
        if (elapsed < minimumInitialSkeletonMs) await new Promise((r) => setTimeout(r, minimumInitialSkeletonMs - elapsed));
        setLoading(false);
      }
    };
    void load();
  }, [user?.username]);

  const filteredAnnouncements = useMemo(() => {
    if (filter === 'all') return announcements;
    if (filter === 'announcement') return announcements.filter((item) => item.kind === 'announcement');
    if (filter === 'holiday') return announcements.filter((item) => item.kind === 'holiday');
    return announcements.filter((item) => item.kind === 'cancellation');
  }, [announcements, filter]);

  const featured = announcements.length > 0 ? announcements[0] : null;
  const others = useMemo(() => {
    const supportItems = announcements.slice(1);
    if (filter === 'all') return supportItems;
    return supportItems.filter((item) => item.kind === filter);
  }, [announcements, filter]);

  if (loading) {
    return (
      <DashboardLayout>
        <ParentAnnouncementSkeleton />
      </DashboardLayout>
    );
  }

  const handleNotifyJoin = (event: SchoolEvent) => {
    if (!user?.username) {
      toast({ title: 'Not signed in', description: 'Please sign in to send a response.', variant: 'destructive' });
      return;
    }
    if ((user?.role || '').toLowerCase() !== 'parent') {
      toast({ title: 'Not allowed', description: 'Only parent accounts can send attendance responses.', variant: 'destructive' });
      return;
    }
    if (joinNotifiedByEventId[event.id] || willNotJoinByEventId[event.id]) return;

    // If multiple children, show selection modal
    if (children.length > 1) {
      setPendingEventIntent({ event, action: 'join' });
      setSelectedChildren(new Set(children.map((c) => c.id)));
      setChildSelectionOpen(true);
      return;
    }

    // If single child or no children, proceed directly
    void submitEventIntent(event, 'join');
  };

  const handleNotifyWillNotJoin = (event: SchoolEvent) => {
    if (!user?.username) {
      toast({ title: 'Not signed in', description: 'Please sign in to send a response.', variant: 'destructive' });
      return;
    }
    if ((user?.role || '').toLowerCase() !== 'parent') {
      toast({ title: 'Not allowed', description: 'Only parent accounts can send attendance responses.', variant: 'destructive' });
      return;
    }
    if (willNotJoinByEventId[event.id] || joinNotifiedByEventId[event.id]) return;

    // If multiple children, show selection modal
    if (children.length > 1) {
      setPendingEventIntent({ event, action: 'not_join' });
      setSelectedChildren(new Set(children.map((c) => c.id)));
      setChildSelectionOpen(true);
      return;
    }

    // If single child or no children, proceed directly
    void submitEventIntent(event, 'not_join');
  };

  const submitEventIntent = async (event: SchoolEvent, action: 'join' | 'not_join') => {
    if (!user?.username) return;

    const isJoin = action === 'join';
    const resolvedSelectedChildren =
      selectedChildren.size > 0
        ? selectedChildren
        : children.length === 1
          ? new Set([children[0].id])
          : new Set<string>();
    const resolvedSelectedChildNames = children
      .filter((child) => resolvedSelectedChildren.has(child.id))
      .map((child) => child.name)
      .filter(Boolean);
    const childSummary =
      resolvedSelectedChildNames.length === 0
        ? 'their child'
        : resolvedSelectedChildNames.length === 1
          ? resolvedSelectedChildNames[0]
          : `${resolvedSelectedChildNames.length} children`;

    if (isJoin) {
      setSavingJoinEventId(event.id);
    } else {
      setSavingWillNotJoinEventId(event.id);
    }

    try {
      const parentName = user.full_name || user.username;
      const selectedChildrenList = Array.from(resolvedSelectedChildren);
      const selectedChildNames = resolvedSelectedChildNames.join(', ');

      const success = await createRoleNotification({
        title:
          isJoin
            ? 'Parent Event Attendance Confirmation'
            : 'Parent Event Non-Attendance Notice',
        message: isJoin
          ? `${parentName} confirmed ${childSummary} will join "${event.title}" on ${event.event_date}.`
          : `${parentName} notified ${childSummary} will not join "${event.title}" on ${event.event_date}.`,
        targetRoles: ['teacher', 'admin'],
        createdBy: user.username,
        meta: {
          notification_kind: isJoin ? 'school_event_join_intent' : 'school_event_will_not_join_intent',
          event_id: event.id,
          event_title: event.title,
          event_date: event.event_date,
          parent_name: parentName,
          parent_email: user.username,
          selected_children: selectedChildrenList,
          selected_children_names: selectedChildNames,
          href: '/events',
        },
      });
      if (success) {
        if (isJoin) {
          setJoinNotifiedByEventId((p) => ({ ...p, [event.id]: true }));
        } else {
          setWillNotJoinByEventId((p) => ({ ...p, [event.id]: true }));
        }
        setChildSelectionOpen(false);
        setPendingEventIntent(null);
      }
    } finally {
      if (isJoin) {
        setSavingJoinEventId(null);
      } else {
        setSavingWillNotJoinEventId(null);
      }
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-0 animate-fade-in-up">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-1">Announcement/Advisory</h1>
            <p className="text-slate-600 dark:text-slate-400 text-base">Latest announcements, holidays, and class cancellations from the school.</p>
          </div>
          <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white border-0 px-3 py-1.5 text-xs">Parent View</Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
          {/* Main / Latest column */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <Button variant={filter === 'all' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('all')}>All</Button>
                <Button variant={filter === 'announcement' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('announcement')}>Announcements</Button>
                <Button variant={filter === 'holiday' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('holiday')}>Holidays</Button>
                <Button variant={filter === 'cancellation' ? 'default' : 'ghost'} size="sm" onClick={() => setFilter('cancellation')}>Cancellations</Button>
              </div>
            </div>

            {!featured ? (
              <Card className="border-0 shadow-xl">
                <CardContent className="p-6 text-center text-slate-600 dark:text-slate-300">
                  <Megaphone className="w-10 h-10 mx-auto opacity-60" />
                  <p className="font-medium">No announcements yet.</p>
                </CardContent>
              </Card>
            ) : (
              <Card className="overflow-hidden border-2 border-blue-200/60 bg-linear-to-br from-white to-blue-50 shadow-lg">
                <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
                {renderAnnouncementVisual(featured, 'hero')}

                {featured.image_url ? (
                  <CardHeader className="pb-2">
                    <CardTitle className="text-2xl leading-tight">{featured.title}</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-300">{featured.description || 'No description provided.'}</CardDescription>
                  </CardHeader>
                ) : (
                  <div className="px-6 pt-4 pb-2 flex items-center justify-between gap-3">
                    <Badge className={getAnnouncementStyle(featured.kind).badgeClass}>
                      {getAnnouncementStyle(featured.kind).accent}
                    </Badge>
                    <span className="text-[10px] uppercase tracking-[0.28em] text-slate-500">Latest update</span>
                  </div>
                )}

                <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs uppercase text-slate-500">Date</p>
                    <p className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {formatEventDate(featured.event_date, featured.end_date)}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Time</p>
                    <p className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> {featured.start_time ? formatTime12h(featured.start_time) : 'TBD'}{featured.end_time ? ` - ${formatTime12h(featured.end_time)}` : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs uppercase text-slate-500">Location</p>
                    <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> {featured.location || 'School campus'}</p>
                  </div>
                </CardContent>
                <div className="px-6 pb-4 pt-2 border-t border-slate-200/50 space-y-2">
                  <Button onClick={() => { setSelectedAnnouncement(featured); setDetailsOpen(true); }} variant="outline" className="w-full">Read more</Button>
                  {featured.source === 'event' ? (
                    <div className="flex gap-1.5">
                      <Button
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
                        onClick={() => void handleNotifyJoin({
                          id: featured.event_id || 0,
                          title: featured.title,
                          description: featured.description,
                          image_url: featured.image_url,
                          event_date: featured.event_date || '',
                          end_date: featured.end_date || null,
                          start_time: featured.start_time,
                          end_time: featured.end_time,
                          location: featured.location,
                          created_by: null,
                          is_active: true,
                          created_at: featured.created_at,
                          updated_at: featured.created_at,
                        })}
                        disabled={joinNotifiedByEventId[featured.event_id || 0] || willNotJoinByEventId[featured.event_id || 0] || savingJoinEventId === featured.event_id || isEventPassed(featured.event_date, featured.end_date)}
                      >
                        {joinNotifiedByEventId[featured.event_id || 0] ? 'Join sent' : isEventPassed(featured.event_date, featured.end_date) ? 'Event passed' : "I'll Join"}
                      </Button>
                      <Button
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs sm:text-sm"
                        onClick={() => void handleNotifyWillNotJoin({
                          id: featured.event_id || 0,
                          title: featured.title,
                          description: featured.description,
                          image_url: featured.image_url,
                          event_date: featured.event_date || '',
                          end_date: featured.end_date || null,
                          start_time: featured.start_time,
                          end_time: featured.end_time,
                          location: featured.location,
                          created_by: null,
                          is_active: true,
                          created_at: featured.created_at,
                          updated_at: featured.created_at,
                        })}
                        disabled={joinNotifiedByEventId[featured.event_id || 0] || willNotJoinByEventId[featured.event_id || 0] || savingWillNotJoinEventId === featured.event_id || isEventPassed(featured.event_date, featured.end_date)}
                      >
                        {willNotJoinByEventId[featured.event_id || 0] ? 'Not join sent' : isEventPassed(featured.event_date, featured.end_date) ? 'Event passed' : 'Will not join'}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </Card>
            )}

          </div>

          {/* Right column: other news / thumbnails */}
          <aside className="space-y-4 lg:sticky lg:top-4 lg:h-[calc(100vh-8.5rem)] lg:overflow-hidden lg:flex lg:flex-col">
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-semibold">Other News</h4>
              <Badge>{filteredAnnouncements.length}</Badge>
            </div>

            <div className="space-y-3 pr-1 lg:min-h-0 lg:flex-1 lg:overflow-y-auto">
              {others.slice(0, 10).map((item) => (
                <Card key={item.id} className="overflow-hidden border border-slate-200/80 bg-white shadow-sm">
                  <div className="p-3">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-12 overflow-hidden rounded-md">{renderAnnouncementVisual(item, 'thumb')}</div>
                      <div className="flex-1">
                        <h5 className="text-sm font-medium line-clamp-2 leading-snug">{item.title}</h5>
                        <p className="text-xs text-slate-500">{formatEventDate(item.event_date, item.end_date)}</p>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-slate-200/50 space-y-2">
                      <Button size="sm" variant="ghost" onClick={() => { setSelectedAnnouncement(item); setDetailsOpen(true); }} className="w-full">Read</Button>
                      {item.source === 'event' ? (
                        <div className="flex gap-1.5">
                          <Button
                            size="sm"
                            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs"
                            onClick={() => void handleNotifyJoin({
                              id: item.event_id || 0,
                              title: item.title,
                              description: item.description,
                              image_url: item.image_url,
                              event_date: item.event_date || '',
                              end_date: item.end_date || null,
                              start_time: item.start_time,
                              end_time: item.end_time,
                              location: item.location,
                              created_by: null,
                              is_active: true,
                              created_at: item.created_at,
                              updated_at: item.created_at,
                            })}
                            disabled={joinNotifiedByEventId[item.event_id || 0] || willNotJoinByEventId[item.event_id || 0] || savingJoinEventId === item.event_id || isEventPassed(item.event_date, item.end_date)}
                          >
                            {joinNotifiedByEventId[item.event_id || 0]
                              ? 'Join sent'
                              : isEventPassed(item.event_date, item.end_date)
                                ? 'Event passed'
                                : "I'll Join"}
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-xs"
                            onClick={() => void handleNotifyWillNotJoin({
                              id: item.event_id || 0,
                              title: item.title,
                              description: item.description,
                              image_url: item.image_url,
                              event_date: item.event_date || '',
                              end_date: item.end_date || null,
                              start_time: item.start_time,
                              end_time: item.end_time,
                              location: item.location,
                              created_by: null,
                              is_active: true,
                              created_at: item.created_at,
                              updated_at: item.created_at,
                            })}
                            disabled={joinNotifiedByEventId[item.event_id || 0] || willNotJoinByEventId[item.event_id || 0] || savingWillNotJoinEventId === item.event_id || isEventPassed(item.event_date, item.end_date)}
                          >
                            {willNotJoinByEventId[item.event_id || 0]
                              ? 'Not join sent'
                              : isEventPassed(item.event_date, item.end_date)
                                ? 'Event passed'
                                : 'Will not join'}
                          </Button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </aside>
        </div>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-2xl lg:max-w-2xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold">
                {selectedAnnouncement?.title}
              </DialogTitle>
              <DialogDescription>
                {selectedAnnouncement ? `${formatEventDate(selectedAnnouncement.event_date, selectedAnnouncement.end_date)} • Announcement details` : 'Announcement details'}
              </DialogDescription>
            </DialogHeader>
            {selectedAnnouncement && (
              <div className="space-y-4">
                {selectedAnnouncement.image_url ? (
                  <div className="rounded-lg overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedAnnouncement.image_url} alt={selectedAnnouncement.title} className="w-full h-48 object-cover" />
                  </div>
                ) : null}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <CalendarDays className="w-3 h-3" />
                      Date
                    </p>
                    <p className="font-semibold text-foreground">{formatEventDate(selectedAnnouncement.event_date, selectedAnnouncement.end_date)}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      Time
                    </p>
                    <p className="font-semibold text-foreground">{selectedAnnouncement.start_time ? formatTime12h(selectedAnnouncement.start_time) : 'TBD'}{selectedAnnouncement.end_time ? ` - ${formatTime12h(selectedAnnouncement.end_time)}` : ''}</p>
                  </div>
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      Location
                    </p>
                    <p className="font-semibold text-foreground">{selectedAnnouncement.location || 'School campus'}</p>
                  </div>
                  <div className="col-span-1 sm:col-span-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                      <Megaphone className="w-3 h-3" />
                      Description
                    </p>
                    <p className="text-sm text-foreground whitespace-pre-wrap">{selectedAnnouncement.description || 'No description provided.'}</p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Child Selection Modal */}
        <Dialog open={childSelectionOpen} onOpenChange={setChildSelectionOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Select Children</DialogTitle>
              <DialogDescription>
                Choose which children will {pendingEventIntent?.action === 'join' ? 'join' : 'not join'} the event
              </DialogDescription>
            </DialogHeader>
            {pendingEventIntent && (
              <div className="space-y-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
                  <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                    {pendingEventIntent.event.title}
                  </p>
                  <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                    {formatEventDate(pendingEventIntent.event.event_date, pendingEventIntent.event.end_date)}
                  </p>
                </div>

                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {children.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center space-x-3 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                    >
                      <Checkbox
                        id={`child-${child.id}`}
                        checked={selectedChildren.has(child.id)}
                        onCheckedChange={(checked) => {
                          const newSelected = new Set(selectedChildren);
                          if (checked) {
                            newSelected.add(child.id);
                          } else {
                            newSelected.delete(child.id);
                          }
                          setSelectedChildren(newSelected);
                        }}
                      />
                      <Label
                        htmlFor={`child-${child.id}`}
                        className="flex-1 cursor-pointer text-sm font-medium text-slate-900 dark:text-white"
                      >
                        <div>
                          <p>{child.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">LRN: {child.lrn}</p>
                        </div>
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-200 dark:border-slate-700">
                  <Button
                    variant="outline"
                    onClick={() => setChildSelectionOpen(false)}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() =>
                      void submitEventIntent(
                        pendingEventIntent.event,
                        pendingEventIntent.action
                      )
                    }
                    disabled={selectedChildren.size === 0 || savingJoinEventId === pendingEventIntent.event.id || savingWillNotJoinEventId === pendingEventIntent.event.id}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {pendingEventIntent.action === 'join'
                      ? savingJoinEventId === pendingEventIntent.event.id
                        ? 'Confirming...'
                        : 'Confirm Join'
                      : savingWillNotJoinEventId === pendingEventIntent.event.id
                        ? 'Confirming...'
                        : 'Confirm Not Joining'}
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

      </div>
    </DashboardLayout>
  );
}
