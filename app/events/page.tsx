'use client';

import { useEffect, useState } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useAuth } from '@/lib/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, MapPin, Clock, Pencil, Trash2 } from 'lucide-react';
import { fetchActiveSchoolEvents, createSchoolEvent, ensureUpcomingSchoolEventReminders, type SchoolEvent } from '@/lib/school-events';
import { supabase } from '@/lib/supabase';

export default function EventsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [events, setEvents] = useState<SchoolEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<SchoolEvent | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: '',
    description: '',
    event_date: '',
    start_time: '',
    end_time: '',
    location: '',
  });

  const loadEvents = async () => {
    setLoading(true);
    const data = await fetchActiveSchoolEvents();
    setEvents(data);
    await ensureUpcomingSchoolEventReminders(data);
    setLoading(false);
  };

  useEffect(() => {
    void loadEvents();
  }, []);

  const resetForm = () => {
    setEditingEvent(null);
    setForm({
      title: '',
      description: '',
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
    setEditingEvent(event);
    setForm({
      title: event.title || '',
      description: event.description || '',
      event_date: event.event_date || '',
      start_time: event.start_time?.slice(0, 5) || '',
      end_time: event.end_time?.slice(0, 5) || '',
      location: event.location || '',
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim() || !form.event_date) return;
    setSaving(true);

    try {
      if (editingEvent) {
        if (!supabase) return;
        await supabase
          .from('school_events')
          .update({
            title: form.title.trim(),
            description: form.description.trim() || null,
            event_date: form.event_date,
            start_time: form.start_time || null,
            end_time: form.end_time || null,
            location: form.location.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingEvent.id);
      } else {
        await createSchoolEvent({
          title: form.title,
          description: form.description,
          event_date: form.event_date,
          start_time: form.start_time || null,
          end_time: form.end_time || null,
          location: form.location,
          created_by: user?.username || 'admin',
        });
      }

      setDialogOpen(false);
      resetForm();
      await loadEvents();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: number) => {
    if (!supabase) return;
    await supabase
      .from('school_events')
      .update({
        is_active: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', eventId);
    await loadEvents();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">School Events Calendar</h1>
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

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingEvent ? 'Edit Event' : 'Create Event'}</DialogTitle>
              <DialogDescription>Fill event details. Parents will be notified when published.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Input
                placeholder="Event title"
                value={form.title}
                onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              />
              <Textarea
                placeholder="Event description"
                value={form.description}
                onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Input
                  type="date"
                  value={form.event_date}
                  onChange={(e) => setForm((prev) => ({ ...prev, event_date: e.target.value }))}
                />
                <Input
                  placeholder="Location"
                  value={form.location}
                  onChange={(e) => setForm((prev) => ({ ...prev, location: e.target.value }))}
                />
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleSave} disabled={saving || !form.title.trim() || !form.event_date}>
                  {saving ? 'Saving...' : editingEvent ? 'Update Event' : 'Publish Event'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {loading ? (
          <p className="text-muted-foreground">Loading events...</p>
        ) : events.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">No events posted yet.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {events.map((event) => (
              <Card key={event.id}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-xl">{event.title}</CardTitle>
                      <CardDescription className="mt-1">{event.description || 'No description.'}</CardDescription>
                    </div>
                    <Badge>Event</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm flex items-center gap-2"><CalendarDays className="w-4 h-4" /> {event.event_date}</p>
                  <p className="text-sm flex items-center gap-2"><Clock className="w-4 h-4" /> {event.start_time || '--:--'} - {event.end_time || '--:--'}</p>
                  <p className="text-sm flex items-center gap-2"><MapPin className="w-4 h-4" /> {event.location || 'School campus'}</p>
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
        )}
      </div>
    </DashboardLayout>
  );
}
