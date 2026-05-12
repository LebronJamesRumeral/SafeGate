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
import { TimePickerInput } from '@/components/time-picker-input';
import { DatePickerInput } from '@/components/date-picker-input';
import { Skeleton } from '@/components/ui/skeleton';
import EventsSkeleton from '@/components/events-skeleton';
import { CalendarDays, MapPin, Clock, Pencil, Trash2, ImagePlus, Megaphone, Info } from 'lucide-react';
import { fetchActiveSchoolEvents, createSchoolEvent, ensureUpcomingSchoolEventReminders, type SchoolEvent } from '@/lib/school-events';
import { supabase } from '@/lib/supabase';
import { formatTime12h } from '@/lib/time-format';
import { motion } from 'framer-motion';
import { toast } from '@/hooks/use-toast';

type EventJoinIntent = {
  id: number;
  parent_name: string;
  parent_email: string;
  child_names: string[];
  child_count: number;
  created_at: string;
  status?: 'join' | 'not_join';
};

const parseChildNames = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
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
    end_date?: string;
    start_time?: string;
    end_time?: string;
  }>({});
  const [form, setForm] = useState({
    title: '',
    description: '',
    image_url: '',
    event_date: '',
    end_date: '',
    start_time: '',
    end_time: '',
    location: '',
  });
  const minimumInitialSkeletonMs = 1200;
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const showInitialSkeleton = loading && isInitialLoad;
  const todayIso = new Date().toISOString().slice(0, 10);
  const eventsWithImagesCount = events.filter((item) => Boolean(item.image_url)).length;
  const upcomingCount = events.filter((item) => (item.end_date || item.event_date || '') >= todayIso).length;
  const classStartTime = '08:00';
  const classEndTime = '17:00';

  const getEventEndDate = (event: Pick<SchoolEvent, 'event_date' | 'end_date'>): string => {
    return event.end_date || event.event_date;
  };

  const isEventDatePassed = (event: Pick<SchoolEvent, 'event_date' | 'end_date'> | string): boolean => {
    const endDate = typeof event === 'string' ? event : getEventEndDate(event);
    return endDate < todayIso;
  };

  const formatEventDateRange = (event: Pick<SchoolEvent, 'event_date' | 'end_date'>): string => {
    const startDate = new Date(`${event.event_date}T00:00:00`);
    const endDateValue = getEventEndDate(event);
    const endDate = new Date(`${endDateValue}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) return event.event_date;
    if (Number.isNaN(endDate.getTime())) return new Date(`${event.event_date}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const startLabel = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const endLabel = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return event.end_date && event.end_date !== event.event_date ? `${startLabel} - ${endLabel}` : startLabel;
  };

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
      // Fetch both join and will_not_join intents for the selected event
      const [{ data: joinData }, { data: notJoinData }] = await Promise.all([
        supabase
          .from('role_notifications')
          .select('id, created_at, meta')
          .contains('meta', {
            notification_kind: 'school_event_join_intent',
            event_id: selectedEvent.id,
          })
          .order('created_at', { ascending: false })
          .limit(1000),
        supabase
          .from('role_notifications')
          .select('id, created_at, meta')
          .contains('meta', {
            notification_kind: 'school_event_will_not_join_intent',
            event_id: selectedEvent.id,
          })
          .order('created_at', { ascending: false })
          .limit(1000),
      ]);

      const mappedJoin = (joinData || [])
        .map((item: any) => ({
          id: item.id,
          parent_name: item?.meta?.parent_name || 'Parent',
          parent_email: item?.meta?.parent_email || '',
          child_names: parseChildNames(item?.meta?.selected_children_names),
          child_count: parseChildNames(item?.meta?.selected_children_names).length,
          created_at: item.created_at,
          status: 'join' as const,
        }))
        .filter((item) => item.parent_email);

      const mappedNotJoin = (notJoinData || [])
        .map((item: any) => ({
          id: item.id,
          parent_name: item?.meta?.parent_name || 'Parent',
          parent_email: item?.meta?.parent_email || '',
          child_names: parseChildNames(item?.meta?.selected_children_names),
          child_count: parseChildNames(item?.meta?.selected_children_names).length,
          created_at: item.created_at,
          status: 'not_join' as const,
        }))
        .filter((item) => item.parent_email);

      // Merge intents per parent email. Prefer the latest intent by created_at.
      const combined = [...mappedJoin, ...mappedNotJoin];
      const byEmail = new Map<string, EventJoinIntent>();
      combined.forEach((item) => {
        const key = item.parent_email.toLowerCase();
        const existing = byEmail.get(key);
        if (!existing) {
          byEmail.set(key, item);
          return;
        }
        // keep the most recent
        if (new Date(item.created_at).getTime() > new Date(existing.created_at).getTime()) {
          byEmail.set(key, item);
        }
      });

      const deduped = Array.from(byEmail.values());
      // Sort by most recent
      deduped.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      // If some intents don't have a proper parent_name, try to resolve from students table by parent_email
      const emailsToLookup = deduped
        .filter((it) => !it.parent_name || it.parent_name.trim() === '' || it.parent_name === it.parent_email)
        .map((it) => it.parent_email.toLowerCase())
        .filter(Boolean);

      if (emailsToLookup.length > 0 && supabase) {
        try {
          const { data: parents } = await supabase
            .from('students')
            .select('parent_email, parent_name, name')
            .in('parent_email', emailsToLookup)
            .limit(500);

          const nameByEmail = new Map<string, string>();
          const childNamesByEmail = new Map<string, string[]>();
          (parents || []).forEach((p: any) => {
            const emailKey = p.parent_email ? String(p.parent_email).toLowerCase() : '';
            if (!emailKey) return;
            if (p.parent_name) nameByEmail.set(emailKey, String(p.parent_name));
            if (p.name) {
              const existing = childNamesByEmail.get(emailKey) || [];
              const nextName = String(p.name).trim();
              if (nextName && !existing.includes(nextName)) {
                childNamesByEmail.set(emailKey, [...existing, nextName]);
              }
            }
          });

          deduped.forEach((it) => {
            const emailKey = it.parent_email.toLowerCase();
            const lookup = nameByEmail.get(emailKey);
            if (lookup) it.parent_name = lookup;
            if (it.child_names.length === 0) {
              it.child_names = childNamesByEmail.get(emailKey) || [];
              it.child_count = it.child_names.length;
            }
          });
        } catch (e) {
          // ignore lookup errors
          // eslint-disable-next-line no-console
          console.error('Failed to resolve parent names', e);
        }
      }

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
      end_date: '',
      start_time: '',
      end_time: '',
      location: '',
    });
  };

  const openCreateDialog = () => {
    resetForm();
    setForm((prev) => ({
      ...prev,
      event_date: todayIso,
    }));
    setDialogOpen(true);
  };

  const openEditDialog = (event: SchoolEvent) => {
    if (!isAdmin) return;
    if (isEventDatePassed(event)) {
      toast({
        title: 'Cannot edit past event',
        description: 'Events cannot be edited once the date has passed. This is to prevent modification of historical records.',
        variant: 'destructive',
      });
      return;
    }
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      image_url: event.image_url || '',
      event_date: event.event_date || '',
      end_date: event.end_date || '',
      start_time: event.start_time?.slice(0, 5) || '',
      end_time: event.end_time?.slice(0, 5) || '',
      location: event.location || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!isAdmin) return;
    const errors: { title?: string; description?: string; event_date?: string; end_date?: string; start_time?: string; end_time?: string } = {};
    if (!form.title.trim()) errors.title = 'Please provide event title.';
    if (!form.description.trim()) errors.description = 'Please provide event description.';
    if (!form.event_date) errors.event_date = 'Please select event date.';
    if (form.event_date && form.event_date < todayIso) errors.event_date = 'Event start date cannot be in the past.';
    if (form.end_date && form.end_date < todayIso) errors.end_date = 'Event end date cannot be in the past.';
    if (form.end_date && form.end_date < form.event_date) errors.end_date = 'End date must be on or after the start date.';
    if (form.start_time && (form.start_time < classStartTime || form.start_time > classEndTime)) {
      errors.start_time = 'Start time must be between 8:00 AM and 5:00 PM.';
    }
    if (form.end_time && (form.end_time < classStartTime || form.end_time > classEndTime)) {
      errors.end_time = 'End time must be between 8:00 AM and 5:00 PM.';
    }
    if (form.start_time && form.end_time && form.end_time < form.start_time) {
      errors.end_time = 'End time must be on or after start time.';
    }
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      toast({
        title: 'Invalid event details',
        description: 'Please complete required fields and use valid date/time within class hours (8:00 AM to 5:00 PM).',
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
            end_date: form.end_date || null,
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
          end_date: form.end_date || null,
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
        {!showInitialSkeleton && (
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
                  Start Date <span className="text-red-500">*</span>
                </Label>
                <DatePickerInput
                  id="event-date"
                  minDate={todayIso}
                  value={form.event_date}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, event_date: e }));
                    if (e && e >= todayIso) {
                      setFormErrors((prev) => ({ ...prev, event_date: undefined }));
                    }
                  }}
                />
                {formErrors.event_date && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.event_date}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-end-date" className="flex items-center gap-1">
                  End Date <span className="text-slate-400 text-xs font-normal">(optional)</span>
                </Label>
                <DatePickerInput
                  id="event-end-date"
                  value={form.end_date}
                  minDate={form.event_date || todayIso}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, end_date: e }));
                    if (!e || (e >= form.event_date && e >= todayIso)) {
                      setFormErrors((prev) => ({ ...prev, end_date: undefined }));
                    }
                  }}
                />
                {formErrors.end_date && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.end_date}</p>}
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
                    <TimePickerInput
                      value={form.start_time}
                      minTime={classStartTime}
                      maxTime={classEndTime}
                      onChange={(value) => {
                        setForm((prev) => ({ ...prev, start_time: value }));
                        if (!value || (value >= classStartTime && value <= classEndTime)) {
                          setFormErrors((prev) => ({ ...prev, start_time: undefined }));
                        }
                      }}
                    />
                    <TimePickerInput
                      value={form.end_time}
                      minTime={classStartTime}
                      maxTime={classEndTime}
                      onChange={(value) => {
                        setForm((prev) => ({ ...prev, end_time: value }));
                        if (!value || (value >= classStartTime && value <= classEndTime)) {
                          setFormErrors((prev) => ({ ...prev, end_time: undefined }));
                        }
                      }}
                    />
                  </div>
                  {formErrors.start_time && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.start_time}</p>}
                  {formErrors.end_time && <p className="text-sm text-red-600 dark:text-red-400">{formErrors.end_time}</p>}
                  <Card className="border-blue-200/60 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/30">
                    <CardContent className="p-3 text-sm text-blue-800 dark:text-blue-200">
                      Parents receive immediate notice when you publish, plus an automatic reminder one week before. Events are limited to class hours (8:00 AM to 5:00 PM).
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
                    <p className="text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100"><CalendarDays className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {formatEventDateRange(selectedEvent)}</p>
                  </div>
                  <div className="space-y-1 rounded-lg p-2 bg-white dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700">
                    <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Time</label>
                    <p className="text-sm flex items-center gap-2 text-slate-800 dark:text-slate-100"><Clock className="w-4 h-4 text-slate-500 dark:text-slate-400" /> {formatTime12h(selectedEvent.start_time)} - {formatTime12h(selectedEvent.end_time)}</p>
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
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2">Parent responses</p>
                  {loadingJoinIntents ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">Loading responses...</p>
                  ) : joinIntents.length === 0 ? (
                    <p className="text-sm text-slate-500 dark:text-slate-400">No responses yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {joinIntents.map((intent) => (
                        <div
                          key={intent.id}
                          className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/60 px-3 py-2 flex items-start justify-between gap-2"
                        >
                          <div>
                            <p className="text-sm font-medium text-slate-900 dark:text-white">{intent.parent_name}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">{intent.parent_email}</p>
                            {intent.child_names.length > 0 && (
                              <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">
                                Children: {intent.child_names.join(', ')}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${intent.status === 'join' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300'}`}>
                              {intent.status === 'join' ? 'Will join' : 'Will not join'}
                            </span>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {new Date(intent.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">Parents who did not respond are treated as <span className="font-semibold">Will not join</span> by default.</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {showInitialSkeleton ? (
          <EventsSkeleton />
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
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                  {/* Total Events Card */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                  >
                    <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                      <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Events</p>
                          <div className="text-xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">{events.length}</div>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">All posted school events</p>
                        </div>
                        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <Megaphone className="w-8 h-8" />
                        </div>
                      </CardContent>
                      <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
                    </Card>
                  </motion.div>

                  {/* Upcoming Events Card */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                  >
                    <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                      <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Upcoming</p>
                          <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{upcomingCount}</div>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Events from today onward</p>
                        </div>
                        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <CalendarDays className="w-8 h-8" />
                        </div>
                      </CardContent>
                      <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                    </Card>
                  </motion.div>

                  {/* With Images Card */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <Card className="border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-violet-500/10 dark:bg-violet-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-violet-500/5 dark:bg-violet-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                      <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">With Images</p>
                          <div className="text-xl sm:text-4xl font-bold text-violet-600 dark:text-violet-400">{eventsWithImagesCount}</div>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Cards with visual posters</p>
                        </div>
                        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-violet-500 to-violet-600 text-white items-center justify-center shadow-lg shadow-violet-500/25 dark:shadow-violet-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <ImagePlus className="w-8 h-8" />
                        </div>
                      </CardContent>
                      <div className="h-1 w-full bg-linear-to-r from-violet-400 to-violet-600 dark:from-violet-500 dark:to-violet-700" />
                    </Card>
                  </motion.div>

                  {/* No Images Card */}
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.4 }}
                  >
                    <Card className="border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-500/5 dark:bg-amber-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                      <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                        <div>
                          <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">No Images</p>
                          <div className="text-xl sm:text-4xl font-bold text-amber-600 dark:text-amber-400">{events.length - eventsWithImagesCount}</div>
                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Text-only event cards</p>
                        </div>
                        <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-amber-500 to-amber-600 text-white items-center justify-center shadow-lg shadow-amber-500/25 dark:shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                          <Info className="w-8 h-8" />
                        </div>
                      </CardContent>
                      <div className="h-1 w-full bg-linear-to-r from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700" />
                    </Card>
                  </motion.div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {events.sort((a, b) => {
                const aDate = new Date(b.created_at || b.updated_at || '').getTime();
                const bDate = new Date(a.created_at || a.updated_at || '').getTime();
                return aDate - bDate;
              }).map((event, index) => (
                <motion.div
                  key={event.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05, duration: 0.3 }}
                >
                  <Card className="overflow-hidden border-0 bg-linear-to-br from-white to-blue-50 dark:from-slate-900/70 dark:to-blue-950/20 shadow-lg hover:shadow-2xl transition-all duration-300 group hover:scale-105 h-full">
                    <div className="h-1.5 w-full bg-linear-to-r from-blue-500 to-cyan-500" />
                    {event.image_url ? (
                      <div className="h-44 w-full bg-slate-100 dark:bg-slate-900 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={event.image_url} alt={event.title} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      </div>
                    ) : (
                      <div className="h-44 w-full flex items-center justify-center bg-linear-to-br from-blue-100 to-cyan-100 dark:from-blue-950/40 dark:to-cyan-950/40 text-blue-700 dark:text-blue-300">
                        <Megaphone className="w-10 h-10 opacity-70 group-hover:scale-125 transition-transform duration-300" />
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <CardTitle className="text-lg font-bold text-slate-900 dark:text-white">{event.title}</CardTitle>
                          <CardDescription className="mt-1 line-clamp-2 text-slate-600 dark:text-slate-400">{event.description || 'No description.'}</CardDescription>
                        </div>
                        <div className="w-8 h-8 rounded-lg bg-blue-100/80 dark:bg-blue-900/40 flex items-center justify-center shrink-0 group-hover:bg-blue-200 dark:group-hover:bg-blue-800/60 transition-colors">
                          <Megaphone className="w-4 h-4 text-blue-600 dark:text-blue-300" />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2.5 pb-4">
                      <div className="space-y-1.5">
                        <p className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <CalendarDays className="w-4 h-4 text-blue-500" /> 
                          <span className="font-medium">{formatEventDateRange(event)}</span>
                        </p>
                        <p className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <Clock className="w-4 h-4 text-blue-500" /> 
                          <span className="font-medium">{formatTime12h(event.start_time)} - {formatTime12h(event.end_time)}</span>
                        </p>
                        <p className="text-sm flex items-center gap-2 text-slate-700 dark:text-slate-300">
                          <MapPin className="w-4 h-4 text-blue-500" /> 
                          <span className="font-medium">{event.location || 'School campus'}</span>
                        </p>
                      </div>
                      <div className="mt-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                        <Button size="sm" className="w-full md:flex-1 bg-blue-500 hover:bg-blue-600 text-white transition-all duration-200" onClick={() => { setSelectedEvent(event); setDetailsOpen(true); }}>
                          View Details
                        </Button>

                        {isAdmin && (
                          <div className="flex items-center gap-2 md:ml-3">
                            <div title={isEventDatePassed(event) ? 'Cannot edit past events' : 'Edit event'}>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                className="h-9 w-9 p-0 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={() => openEditDialog(event)}
                                disabled={isEventDatePassed(event)}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                            </div>
                            <Button size="sm" className="h-9 w-9 p-0 flex items-center justify-center rounded-full bg-red-500 hover:bg-red-600 text-white transition-colors" onClick={() => void handleDelete(event.id)}>
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
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
