'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock, Megaphone, BellRing } from 'lucide-react';
import { fetchActiveSchoolEvents, ensureUpcomingSchoolEventReminders, type SchoolEvent } from '@/lib/school-events';

export default function ParentEventsPage() {
  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const data = await fetchActiveSchoolEvents();
      setEvents(data);
      await ensureUpcomingSchoolEventReminders(data);
      setLoading(false);
    };
    void load();
  }, []);

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

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i} className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-800/70 shadow-lg">
                <CardContent className="p-5 space-y-3">
                  <div className="h-4 w-2/3 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="h-3 w-full rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                  <div className="h-3 w-5/6 rounded bg-slate-200 dark:bg-slate-700 animate-pulse" />
                </CardContent>
              </Card>
            ))}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {events.map((event) => (
              <Card
                key={event.id}
                className="border-2 border-blue-200/70 dark:border-blue-800/60 bg-linear-to-br from-white to-blue-50 dark:from-slate-900/70 dark:to-blue-950/20 shadow-lg hover:shadow-2xl transition-all duration-300"
              >
                <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
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
                </CardContent>
              </Card>
            ))}
          </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
