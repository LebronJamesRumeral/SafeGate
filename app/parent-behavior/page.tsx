"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Activity, Heart, AlertCircle } from 'lucide-react';
import ParentBehaviorSkeleton from '@/components/parent-behavior-skeleton';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { getParentStudents } from '@/lib/parent-data';
import { supabase } from '@/lib/supabase';
import { GraduationCap, Search } from 'lucide-react';

export default function ParentBehaviorPage() {
  const mounted = useIsMounted();
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [behavioralEvents, setBehavioralEvents] = useState<any>({});
  // Daily check-in state
  const ACTIVITIES = [
    "Studied",
    "Played",
    "Stayed in library",
    "Ate at canteen",
    "Attended club",
    "Helped a friend",
    "Participated in class",
    "Other"
  ];
  const [selected, setSelected] = useState<{ [key: string]: string[] }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    const parentEmail = user.username;
    if (parentEmail) {
      setLoading(true);
      getParentStudents(parentEmail).then(async (data) => {
        setChildren(data);
        if (!supabase) {
          setBehavioralEvents({});
          setLoading(false);
          return;
        }
        const events: any = {};
        for (const child of data) {
          const { data: behEvents } = await supabase
            .from('behavioral_events')
            .select('*')
            .eq('student_lrn', child.lrn)
            .in('guidance_status', ['approved', 'approved_for_ml'])
            .order('event_date', { ascending: false });
          events[child.lrn] = behEvents || [];
        }
        setBehavioralEvents(events);
        setLoading(false);
      });
    }
  }, [authLoading, user, user?.username]);

  // Daily check-in handlers
  const handleToggle = (childId: string, activity: string) => {
    setSelected((prev) => {
      const prevSelected = prev[childId] || [];
      return {
        ...prev,
        [childId]: prevSelected.includes(activity)
          ? prevSelected.filter((a) => a !== activity)
          : [...prevSelected, activity],
      };
    });
  };

  const handleNotesChange = (childId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [childId]: value }));
  };

  const handleOpenModal = () => {
    // Default to first child if only one, else null
    if (children.length === 1) {
      setSelectedStudentId(children[0].id);
    } else {
      setSelectedStudentId(null);
    }
    setModalOpen(true);
  };
  const handleCloseModal = () => {
    setModalOpen(false);
    setSelectedStudentId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) return;
    // Insert parent report as behavioral_event (always minor)
    const student = children.find((c: any) => c.id === selectedStudentId);
    const parentEmail = user?.username || "parent";
    const activities = selected[selectedStudentId] || [];
    const description = notes[selectedStudentId] || "Parent weekly check-in.";
    const now = new Date();
    const event_date = now.toISOString().slice(0, 10);
    const event_time = now.toTimeString().slice(0, 8);
    if (!supabase) return;
    await supabase.from('behavioral_events').insert([
      {
        student_lrn: student?.lrn,
        event_type: 'parent_report',
        severity: 'minor',
        description,
        reported_by: parentEmail,
        event_date,
        event_time,
        guidance_status: 'pending_guidance',
        notes: JSON.stringify({ activities }),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      }
    ]);
    setSelected((prev) => ({ ...prev, [selectedStudentId]: [] }));
    setNotes((prev) => ({ ...prev, [selectedStudentId]: "" }));
    setModalOpen(false);
    // Refresh events for this child
    const { data: behEvents } = await supabase
      .from('behavioral_events')
      .select('*')
      .eq('student_lrn', student?.lrn)
      .in('guidance_status', ['approved', 'approved_for_ml'])
      .order('event_date', { ascending: false });
    setBehavioralEvents((prev: any) => ({ ...prev, [student?.lrn]: behEvents || [] }));
    setSelectedStudentId(null);
  };


  if (!mounted || authLoading || !user || loading) {
    return mounted ? <ParentBehaviorSkeleton /> : null;
  }

  const filteredChildren = children.filter((child) => {
    const term = search.toLowerCase();
    return (
      child.name?.toLowerCase().includes(term) ||
      child.level?.toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
        {/* Page Header with Weekly Check-In Button beside title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-1">Parent Behavioral Events</h1>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-base">View your linked children and their behavioral event records.</p>
          </div>
          {/* Weekly Check-In Button (one button for all children) */}
          <div>
            <Dialog open={modalOpen} onOpenChange={(open) => open ? handleOpenModal() : handleCloseModal()}>
              <DialogTrigger asChild>
                <Button className="rounded-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center gap-2 shadow-md">
                  <span className="text-lg">+</span> Log Weekly Check-In
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[98vw] max-w-full sm:max-w-2xl h-[86vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/40">
                  <DialogTitle className="text-2xl leading-tight">Log Weekly Check-In</DialogTitle>
                  <DialogDescription>
                    Please provide your child's activities and any notes for this week. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
                  <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Student Selector if more than one child */}
                    {children.length > 1 && (
                      <div>
                        <label className="block text-base font-bold text-sky-700 dark:text-sky-400 mb-2">Select Student *</label>
                        <select
                          className="w-full border border-slate-300 dark:border-slate-600 rounded px-3 py-2 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                          value={selectedStudentId || ''}
                          onChange={e => setSelectedStudentId(e.target.value)}
                          required
                        >
                          <option value="" disabled>Select a student...</option>
                          {children.map(child => (
                            <option key={child.id} value={child.id}>{child.name} ({child.level})</option>
                          ))}
                        </select>
                      </div>
                    )}
                    {/* Activities */}
                    <div>
                      <label className="block text-base font-bold text-sky-700 dark:text-sky-400 mb-2">This Week's Activities</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ACTIVITIES.map((activity) => (
                          <label key={activity} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected[selectedStudentId || children[0]?.id]?.includes(activity) || false}
                              onChange={() => {
                                const id = selectedStudentId || children[0]?.id;
                                if (id) handleToggle(id, activity);
                              }}
                              className="accent-blue-600 w-4 h-4 rounded border border-slate-300 dark:border-slate-600"
                            />
                            <span className="text-slate-800 dark:text-slate-200 text-base">{activity}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    {/* Notes */}
                    <div>
                      <label htmlFor={`notes-${selectedStudentId || children[0]?.id}`} className="block text-base font-bold text-sky-700 dark:text-sky-400 mb-2">Optional Notes or Reflections</label>
                      <Textarea
                        id={`notes-${selectedStudentId || children[0]?.id}`}
                        value={notes[selectedStudentId || children[0]?.id] || ""}
                        onChange={(e) => {
                          const id = selectedStudentId || children[0]?.id;
                          if (id) handleNotesChange(id, e.target.value);
                        }}
                        placeholder="Share anything about your child's week..."
                        rows={3}
                        className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-bold uppercase tracking-wide bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">Submit Check-In</Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards Row - Updated Design */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {/* Total Events */}
          <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Events</p>
                <div className="text-xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">{children.reduce((acc, child) => acc + (behavioralEvents[child.lrn]?.length || 0), 0)}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">all behavioral events</p>
              </div>
              <div className="flex sm:flex w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Activity className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
          </Card>
          {/* Positive Events */}
          <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Positive Events</p>
                <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{children.reduce((acc, child) => acc + (behavioralEvents[child.lrn]?.filter((e: any) => e.event_type !== 'parent_report' && e.severity === 'positive').length || 0), 0)}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">reinforcing progress</p>
              </div>
              <div className="flex sm:flex w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Heart className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
          </Card>
          {/* Negative Events */}
          <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Negative Events</p>
                <div className="text-xl sm:text-4xl font-bold text-red-600 dark:text-red-400">{children.reduce((acc, child) => acc + (behavioralEvents[child.lrn]?.filter((e: any) => e.event_type !== 'parent_report' && e.severity !== 'positive').length || 0), 0)}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">major/critical incidents</p>
              </div>
              <div className="flex sm:flex w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-linear-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-lg shadow-red-500/25 dark:shadow-red-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <AlertCircle className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
          </Card>
        </div>
        <Card className="border-0 bg-white dark:bg-slate-900 shadow-xl rounded-2xl card-elevated animate-fade-in-up overflow-x-auto">
          <CardHeader className="border-b border-orange-100/40 dark:border-orange-800/30 bg-linear-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40">
                <GraduationCap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white font-mono">Behavioral Events (Approved)</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-mono">Events reviewed and approved by guidance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search removed for redesign */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading behavioral events...</div>
            ) : filteredChildren.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No children linked to your account.</div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredChildren.map((child) => (
                  <AccordionItem key={child.id} value={String(child.id)}>
                    <AccordionTrigger className="text-lg font-bold">
                      {child.name} ({child.level})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="border border-border/50 rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow className="border-border/50 hover:bg-muted/50">
                              <TableHead className="text-foreground font-semibold">Date</TableHead>
                              <TableHead className="text-foreground font-semibold">Type</TableHead>
                              <TableHead className="text-foreground font-semibold">Severity</TableHead>
                              <TableHead className="text-foreground font-semibold">Description</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(behavioralEvents[child.lrn] || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No approved behavioral events found.</TableCell>
                              </TableRow>
                            ) : (
                              behavioralEvents[child.lrn].slice(0, 10).map((event: any) => (
                                <TableRow key={event.id} className="border-border/50 hover:bg-muted/50 transition-colors animate-fade-in-up">
                                  <TableCell className="py-4 px-6 text-base">{event.event_date}</TableCell>
                                  <TableCell className="py-4 px-6 text-base">{event.event_type}</TableCell>
                                  <TableCell className="py-4 px-6 text-base">
                                    <Badge className={event.severity === 'critical' ? 'bg-red-100 text-red-700 border-0 text-xs' : event.severity === 'major' ? 'bg-orange-100 text-orange-700 border-0 text-xs' : event.severity === 'minor' ? 'bg-yellow-100 text-yellow-700 border-0 text-xs' : 'bg-emerald-100 text-emerald-700 border-0 text-xs'}>
                                      {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-4 px-6 text-base">{event.description}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
