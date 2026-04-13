'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, MapPin, Clock, Megaphone, BellRing, CheckCircle2 } from 'lucide-react';
import { fetchActiveSchoolEvents, ensureUpcomingSchoolEventReminders, type SchoolEvent } from '@/lib/school-events';
import { createRoleNotification } from '@/lib/role-notifications';
import { supabase } from '@/lib/supabase';

export default function ParentEventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinNotifiedByEventId, setJoinNotifiedByEventId] = useState<Record<number, boolean>>({});
  const [savingJoinEventId, setSavingJoinEventId] = useState<number | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const minimumInitialSkeletonMs = 1200;

  useEffect(() => {
    const load = async () => {
      const startTime = Date.now();
      setLoading(true);
      try {
        const data = await fetchActiveSchoolEvents();
        setEvents(data);
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
        }
        await ensureUpcomingSchoolEventReminders(data);
      } finally {
        const elapsedMs = Date.now() - startTime;
        const remainingMs = Math.max(minimumInitialSkeletonMs - elapsedMs, 0);
        if (remainingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingMs));
        }
        setLoading(false);
        setIsInitialLoad(false);
      }
    };
    void load();
  }, [user?.username]);

  const formatEventDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return date;
    return parsed.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleNotifyJoin = async (event: SchoolEvent) => {
    if (!user?.username || joinNotifiedByEventId[event.id]) return;
    setSavingJoinEventId(event.id);
    try {
      const parentName = user.full_name || user.username;
      const success = await createRoleNotification({
        title: 'Parent Event Attendance Confirmation',
        message: `${parentName} confirmed they plan to join "${event.title}" on ${event.event_date}.`,
        targetRoles: ['teacher', 'admin'],
        createdBy: user.username,
        meta: {
          notification_kind: 'school_event_join_intent',
          event_id: event.id,
          event_title: event.title,
          event_date: event.event_date,
          parent_name: parentName,
          parent_email: user.username,
          href: '/events',
        },
      });
      if (success) {
        setJoinNotifiedByEventId((prev) => ({ ...prev, [event.id]: true }));
      }
    } finally {
      setSavingJoinEventId(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-1">School Events</h1>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-base">
              Stay updated on school activities, announcements, and important dates.
            </p>
          </div>
          <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white border-0 px-3 py-1.5 text-xs">
            Parent View
          </Badge>
        </div>

        {loading && isInitialLoad ? (
          <div className="space-y-4">
            <Card className="border-0 bg-linear-to-r from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-xl">
              <CardContent className="p-4 sm:p-5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/80 dark:bg-slate-900/60 flex items-center justify-center shadow">
                  <BellRing className="w-5 h-5 text-blue-400/80" />
                </div>
                <div className="space-y-2 w-full">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-7 w-16" />
                </div>
              </CardContent>
            </Card>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-2 border-blue-200/60 dark:border-blue-800/50 bg-linear-to-br from-white to-blue-50 dark:from-slate-900/70 dark:to-blue-950/20 shadow-lg">
                  <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
                  <Skeleton className="h-40 w-full rounded-none" />
                  <CardHeader className="pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-6 w-2/3" />
                      <div className="w-8 h-8 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-blue-400/80" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-2 pt-0">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-full mt-2" />
                    <Skeleton className="h-9 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : events.length === 0 ? (
          <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl">
            <CardContent className="py-12 text-center text-slate-600 dark:text-slate-300 space-y-2">
              <Megaphone className="w-10 h-10 mx-auto opacity-60" />
              <p className="font-medium">No upcoming events yet.</p>
              <p className="text-sm text-muted-foreground">New announcements will appear here once posted by the school.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <Card className="border-0 bg-linear-to-r from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 shadow-xl">
              <CardContent className="p-4 sm:p-5 flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/80 dark:bg-slate-900/60 flex items-center justify-center shadow">
                  <BellRing className="w-5 h-5 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">Upcoming school events</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{events.length}</p>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className="border-2 border-blue-200/70 dark:border-blue-800/60 bg-linear-to-br from-white to-blue-50 dark:from-slate-900/70 dark:to-blue-950/20 shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
                {event.image_url ? (
                  <div className="h-40 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="h-40 w-full flex items-center justify-center bg-linear-to-br from-blue-100 to-cyan-100 dark:from-blue-950/40 dark:to-cyan-950/40 text-blue-700 dark:text-blue-300">
                    <Megaphone className="w-10 h-10 opacity-70" />
                  </div>
                )}
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl text-slate-900 dark:text-white">{event.title}</CardTitle>
                      <CardDescription className="mt-1 text-slate-600 dark:text-slate-300">
                        {event.description || 'No description.'}
                      </CardDescription>
                    </div>
                    <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border-0">School Event</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 pt-0">
                  <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <CalendarDays className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {formatEventDate(event.event_date)}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {event.start_time || '--:--'} - {event.end_time || '--:--'}
                  </p>
                  <p className="text-sm text-slate-700 dark:text-slate-200 flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    {event.location || 'School campus'}
                  </p>
                  <div className="pt-2 grid grid-cols-1 gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full"
                      onClick={() => {
                        setSelectedEvent(event);
                        setDetailsOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      variant={joinNotifiedByEventId[event.id] ? 'outline' : 'default'}
                      className="w-full"
                      onClick={() => void handleNotifyJoin(event)}
                      disabled={joinNotifiedByEventId[event.id] || savingJoinEventId === event.id}
                    >
                      {joinNotifiedByEventId[event.id] ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-1.5" />
                          Join intent sent
                        </>
                      ) : savingJoinEventId === event.id ? (
                        'Sending...'
                      ) : (
                        "Notify I'll Join"
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          </div>
        )}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <DialogTitle className="text-xl font-bold">Event Details</DialogTitle>
              <DialogDescription>
                Full school event announcement for <span className="font-semibold text-slate-900 dark:text-white">{selectedEvent?.title || 'selected event'}</span>
              </DialogDescription>
            </DialogHeader>
            {selectedEvent && (
              <div className="flex-1 overflow-y-auto pr-4 space-y-3">
                {selectedEvent.image_url ? (
                  <div className="rounded-lg overflow-hidden border bg-slate-100 dark:bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-64 object-cover" />
                  </div>
                ) : null}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
                    <p className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {formatEventDate(selectedEvent.event_date)}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</label>
                    <p className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> {selectedEvent.start_time || '--:--'} - {selectedEvent.end_time || '--:--'}</p>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Location</label>
                    <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> {selectedEvent.location || 'School campus'}</p>
                  </div>
                </div>
                <div className="rounded-lg border border-slate-200/70 dark:border-slate-700/60 bg-white dark:bg-slate-900/40 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedEvent.description || 'No description provided.'}
                  </p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
