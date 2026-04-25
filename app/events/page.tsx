'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { CalendarDays, MapPin, Clock, Pencil, Trash2, ImagePlus, Megaphone, Info } from 'lucide-react';
import { fetchActiveSchoolEvents, createSchoolEvent, ensureUpcomingSchoolEventReminders, type SchoolEvent } from '@/lib/school-events';
import { supabase } from '@/lib/supabase';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

type EventJoinIntent = {
  id: number;
  parent_name: string;
  parent_email: string;
  created_at: string;
};

export default function EventsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const searchParams = useSearchParams();

  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SchoolEvent | null>(null);
  const [joinIntents, setJoinIntents] = useState<EventJoinIntent[]>([]);
  const [loadingJoinIntents, setLoadingJoinIntents] = useState(false);
  const [notificationDeepLinkHandled, setNotificationDeepLinkHandled] = useState(false);
  const [formErrors, setFormErrors] = useState<{
    title?: string;
    description?: string;
    event_date?: string;
  }>({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
  });
  const minimumInitialSkeletonMs = 1200;
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const showInitialSkeleton = loading && isInitialLoad;
  const todayIso = new Date().toISOString().slice(0, 10);
  const eventsWithImagesCount = events.filter((item) => Boolean(item.image_url)).length;
  const upcomingCount = events.filter((item) => (item.event_date || '') >= todayIso).length;

  const loadEvents = async (options?: { withMinimumDelay?: boolean }) => {
    const withMinimumDelay = options?.withMinimumDelay === true;
    const startTime = Date.now();
    setLoading(true);
    try {
      const data = await fetchActiveSchoolEvents();
      setEvents(data);
      await ensureUpcomingSchoolEventReminders(data);
    } finally {
      if (withMinimumDelay) {
        const elapsedMs = Date.now() - startTime;
        const remainingMs = Math.max(minimumInitialSkeletonMs - elapsedMs, 0);
        if (remainingMs > 0) {
          await new Promise((resolve) => setTimeout(resolve, remainingMs));
        }
      }
      setLoading(false);
      if (withMinimumDelay) {
        setIsInitialLoad(false);
      }
    }
  };

  useEffect(() => {
    void loadEvents({ withMinimumDelay: true });
  }, []);

  useEffect(() => {
    const loadJoinIntents = async () => {
      if (!detailsOpen || !selectedEvent || !supabase) {
        setJoinIntents([]);
        return;
      }
      setLoadingJoinIntents(true);
      const { data } = await supabase
        .from('role_notifications')
        .select('id, created_at, meta')
        .contains('meta', {
          notification_kind: 'school_event_join_intent',
          event_id: selectedEvent.id,
        })
        .order('created_at', { ascending: false })
        .limit(500);

      const mapped = (data || [])
        .map((item: any) => ({
          id: item.id,
          parent_name: item?.meta?.parent_name || 'Parent',
          parent_email: item?.meta?.parent_email || '',
          created_at: item.created_at,
        }))
        .filter((item) => item.parent_email);

      // Keep latest confirmation per parent.
      const deduped = Array.from(new Map(mapped.map((item) => [item.parent_email.toLowerCase(), item])).values());
      setJoinIntents(deduped);
      setLoadingJoinIntents(false);
    };
    void loadJoinIntents();
  }, [detailsOpen, selectedEvent]);

  useEffect(() => {
    if (notificationDeepLinkHandled || loading || events.length === 0) {
      return;
    }

    const targetEventId = Number(searchParams.get('eventId') || '');
    if (!Number.isFinite(targetEventId) || targetEventId <= 0) {
      return;
    }

    const targetEvent = events.find((event) => event.id === targetEventId);
    if (!targetEvent) {
      setNotificationDeepLinkHandled(true);
      return;
    }

    setSelectedEvent(targetEvent);
    setDetailsOpen(true);
    setNotificationDeepLinkHandled(true);
  }, [events, loading, notificationDeepLinkHandled, searchParams]);

  const resetForm = () => {
    setEditingEvent(null);
    setFormErrors({});
    setForm({
      title: '',
      description: '',
      image_url: '',
      event_date: '',
      start_time: '',
      end_time: '',
      location: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEditDialog = (event: SchoolEvent) => {
    if (!isAdmin) return;
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      image_url: event.image_url || '',
      event_date: event.event_date || '',
      start_time: event.start_time?.slice(0, 5) || '',
      end_time: event.end_time?.slice(0, 5) || '',
      location: event.location || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    const errors: { title?: string; description?: string; event_date?: string } = {};
    if (!form.title.trim()) errors.title = 'Please provide event title.';
    if (!form.description.trim()) errors.description = 'Please provide event description.';
    if (!form.event_date) errors.event_date = 'Please select event date.';
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: 'Missing required fields',
        description: 'Please complete the event title, description, and date.',
        variant: 'destructive',
      });
      return;
    }

    setFormErrors({});
    setSaving(true);

    try {
      if (editingEvent) {
        if (!supabase) return;
        const { error } = await supabase
          .from('school_events')
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            image_url: form.image_url || null,
            event_date: form.event_date,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            location: form.location.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEvent.id);
        if (error) throw error;
      } else {
        const created = await createSchoolEvent({
          title: form.title,
          description: form.description,
          image_url: form.image_url || null,
          event_date: form.event_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location,
          created_by: user?.username || 'admin',
        });
        if (!created) {
          throw new Error('Unable to create school event');
        }
      }

      setDialogOpen(false);
      resetForm();
      await loadEvents();
      toast({
        title: editingEvent ? 'Event updated' : 'Event created',
        description: editingEvent
          ? 'School event details were updated successfully.'
          : 'School event was created and notifications were sent.',
      });
    } catch (error) {
      toast({
        title: editingEvent ? 'Failed to update event' : 'Failed to create event',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleImageFileChange = async (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : '';
      setForm((prev) => ({ ...prev, image_url: value }));
    };
    reader.readAsDataURL(file);
  };

  const handleDelete = async (eventId: number) => {
    if (!isAdmin) return;
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('school_events')
        .update({
          is_active: false,
          updated_at: new Date().toISOString(),
        })
        .eq('id', eventId);
      if (error) throw error;

      await loadEvents();
      toast({
        title: 'Event removed',
        description: 'The event was archived successfully.',
      });
    } catch (error) {
      toast({
        title: 'Failed to remove event',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-0">
        {showInitialSkeleton ? (
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-9 w-64" />
              <Skeleton className="h-4 w-96 max-w-[70vw]" />
            </div>
            {isAdmin && <Skeleton className="h-9 w-28 rounded-md" />}
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono">School Events Calendar</h1>
              <p className="text-muted-foreground">
                {isAdmin
                  ? 'Create and manage school events. Parents are notified on publish and one week before.'
                  : 'View school events calendar. Only admins can edit events.'}
              </p>
            </div>
            {isAdmin && (
              <Button onClick={openCreateDialog}>Add Event</Button>
            )}
          </div>
        )}

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-5xl lg:max-w-4xl h-auto sm:h-[86vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
            <div className="px-6 pt-6 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/40">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
              <DialogDescription>Fill event details. Parents will be notified when published.</DialogDescription>
            </DialogHeader>
            </div>
            <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="event-title" className="flex items-center gap-1">
                  Event Title <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event-title"
                  placeholder="Enter event title"
                  value={form.title}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, title: e.target.value }));
                    if (e.target.value.trim()) {
                      setFormErrors((prev) => ({ ...prev, title: undefined }));
                    }
                  }}
                />
                {formErrors.title && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.title}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-date" className="flex items-center gap-1">
                  Event Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="event-date"
                  type="date"
                  value={form.event_date}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, event_date: e.target.value }));
                    if (e.target.value) {
                      setFormErrors((prev) => ({ ...prev, event_date: undefined }));
                    }
                  }}
                />
                {formErrors.event_date && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.event_date}</p>}
              </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-description" className="flex items-center gap-1">
                  Event Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="event-description"
                  placeholder="Write full event announcement details."
                  value={form.description}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, description: e.target.value }));
                    if (e.target.value.trim()) {
                      setFormErrors((prev) => ({ ...prev, description: undefined }));
                    }
                  }}
                  className="min-h-24 resize-none"
                />
                {formErrors.description && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.description}</p>}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Event image</Label>
                  <div className="rounded-lg border border-dashed border-slate-300 dark:border-slate-700 p-3 bg-slate-50/70 dark:bg-slate-900/30">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Button type="button" variant="outline" className="gap-2" onClick={() => document.getElementById('event-image-input')?.click()}>
                        <ImagePlus className="w-4 h-4" />
                        Upload Image
                      </Button>
                      <Input
                        id="event-image-url"
                        placeholder="or paste image URL"
                        value={form.image_url.startsWith('data:') ? '' : form.image_url}
                        onChange={(e) => setForm((prev) => ({ ...prev, image_url: e.target.value }))}
                      />
                    </div>
                    <input
                      id="event-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => void handleImageFileChange(e.target.files?.[0])}
                    />
                    {form.image_url ? (
                      <div className="rounded-md overflow-hidden border bg-white dark:bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={form.image_url} alt="Event preview" className="w-full h-44 object-cover" />
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground">No image selected.</p>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Location"
                      value={form.location}
                      onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                    />
                    <div />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      type="time"
                      value={form.start_time}
                      onChange={(e) => setForm((prev) => ({ ...prev, start_time: e.target.value }))}
                    />
                    <Input
                      type="time"
                      value={form.end_time}
                      onChange={(e) => setForm((prev) => ({ ...prev, end_time: e.target.value }))}
                    />
                  </div>
                  <Card className="border-blue-200/60 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30">
                    <CardContent className="p-3 text-sm text-blue-800 dark:text-blue-200">
                      Parents receive immediate notice when you publish, plus an automatic reminder one week before.
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
            <div className="border-t bg-white dark:bg-slate-950 px-6 py-4 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Publish Event'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl h-auto sm:max-h-[90vh] overflow-hidden flex flex-col border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">
            <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <DialogTitle className="text-xl font-bold">Event Details</DialogTitle>
                  </div>
                  <DialogDescription className="mt-2 text-[22px]">
                    Full school event announcement for <span className="font-semibold text-slate-900 dark:text-white">{selectedEvent?.title || 'selected event'}</span>
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            {selectedEvent && (
              <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                {selectedEvent.image_url ? (
                  <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-900">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={selectedEvent.image_url} alt={selectedEvent.title} className="w-full h-64 object-cover" />
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100/70 dark:bg-slate-800/40 p-3">
                  <div className="space-y-1 rounded-lg p-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
                    <p className="text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100"><CalendarDays className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {selectedEvent.event_date}</p>
                  </div>
                  <div className="space-y-1 rounded-lg p-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</label>
                    <p className="text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100"><Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {selectedEvent.start_time || '--:--'} - {selectedEvent.end_time || '--:--'}</p>
                  </div>
                  <div className="space-y-1 rounded-lg p-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Location</label>
                    <p className="text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100"><MapPin className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {selectedEvent.location || 'School campus'}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-sky-200 dark:border-sky-800/50 bg-white dark:bg-slate-900/40 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Description</p>
                  <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">
                    {selectedEvent.description || 'No description provided.'}
                  </p>
                </div>
                <div className="rounded-xl border border-emerald-200 dark:border-emerald-800/50 bg-white dark:bg-slate-900/40 p-4">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Parents confirmed they will join</p>
                  {loadingJoinIntents ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading confirmations...</p>
                  ) : joinIntents.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No parent confirmations yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {joinIntents.map((intent) => (
                        <div
                          key={intent.id}
                          className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{intent.parent_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{intent.parent_email}</p>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {new Date(intent.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {showInitialSkeleton ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: 'easeOut' }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {[...Array(4)].map((_, i) => (
                <Card
                  key={`stats-${i}`}
                  className="relative overflow-hidden border-0 shadow-xl bg-linear-to-br from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-800/70"
                >
                  <CardContent className="p-4 sm:p-5 flex items-center justify-between relative z-10">
                    <div className="space-y-2 w-full">
                      <Skeleton className="h-3 w-24" />
                      <Skeleton className="h-8 w-12" />
                    </div>
                    <div className="w-9 h-9 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center">
                      <Megaphone className="w-4 h-4 text-blue-400/80" />
                    </div>
                  </CardContent>
                  <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
                </Card>
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden border-2 border-blue-200/60 dark:border-blue-800/50 bg-linear-to-br from-white to-blue-50 dark:from-slate-900/70 dark:to-blue-950/20 shadow-lg">
                  <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
                  <Skeleton className="h-44 w-full rounded-none" />
                  <CardHeader className="pb-2 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <Skeleton className="h-6 w-2/3" />
                      <div className="w-8 h-8 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-blue-400/80" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-9 w-full mt-2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={`events-content-${isInitialLoad ? 'loading' : 'ready'}`}
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="space-y-5"
          >
            {events.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-muted-foreground">No events posted yet.</CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <Card className="relative overflow-hidden border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-blue-600 dark:text-blue-400 font-semibold">Total Events</p>
                        <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{events.length}</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">All posted school events</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg">
                        <Megaphone className="w-5 h-5" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
                  </Card>
                  <Card className="relative overflow-hidden border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-emerald-600 dark:text-emerald-400 font-semibold">Upcoming</p>
                        <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{upcomingCount}</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Events from today onward</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white flex items-center justify-center shadow-lg">
                        <CalendarDays className="w-5 h-5" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                  </Card>
                  <Card className="relative overflow-hidden border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 shadow-xl">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-violet-600 dark:text-violet-400 font-semibold">With Images</p>
                        <div className="text-3xl font-bold text-violet-600 dark:text-violet-400">{eventsWithImagesCount}</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Cards with visual posters</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-violet-500 to-violet-600 text-white flex items-center justify-center shadow-lg">
                        <ImagePlus className="w-5 h-5" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-violet-400 to-violet-600 dark:from-violet-500 dark:to-violet-700" />
                  </Card>
                  <Card className="relative overflow-hidden border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 shadow-xl">
                    <CardContent className="p-4 sm:p-5 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[11px] uppercase tracking-wider text-amber-600 dark:text-amber-400 font-semibold">No Images</p>
                        <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{events.length - eventsWithImagesCount}</div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">Text-only event cards</p>
                      </div>
                      <div className="w-10 h-10 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 text-white flex items-center justify-center shadow-lg">
                        <Info className="w-5 h-5" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700" />
                  </Card>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {events.map((event) => (
                <Card key={event.id} className="overflow-hidden border-2 border-blue-200/60 dark:border-blue-800/50 bg-linear-to-br from-white to-blue-50 dark:from-slate-900/70 dark:to-blue-950/20 shadow-lg hover:shadow-2xl transition-all duration-300">
                  <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
                  {event.image_url ? (
                    <div className="h-44 w-full bg-slate-100 dark:bg-slate-900">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={event.image_url} alt={event.title} className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-44 w-full flex items-center justify-center bg-linear-to-br from-blue-100 to-cyan-100 dark:from-blue-950/40 dark:to-cyan-950/40 text-blue-700 dark:text-blue-300">
                      <Megaphone className="w-10 h-10 opacity-70" />
                    </div>
                  )}
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-xl">{event.title}</CardTitle>
                        <CardDescription className="mt-1 line-clamp-2">{event.description || 'No description.'}</CardDescription>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center">
                        <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {event.event_date}</p>
                    <p className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> {event.start_time || '--:--'} - {event.end_time || '--:--'}</p>
                    <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location || 'School campus'}</p>
                    <Button size="sm" variant="outline" className="w-full mt-2" onClick={() => { setSelectedEvent(event); setDetailsOpen(true); }}>
                      View Details
                    </Button>
                    {isAdmin && (
                      <div className="pt-2 flex justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => openEditDialog(event)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => void handleDelete(event.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
              </>
            )}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
