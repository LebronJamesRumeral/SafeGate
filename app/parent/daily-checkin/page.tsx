
"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Activity, Heart, AlertCircle } from 'lucide-react';
import { useAuth } from "@/lib/auth-context";
import { getParentStudents } from '@/lib/parent-data';

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

export default function ParentDailyCheckIn() {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loadingChildren, setLoadingChildren] = useState(true);
  const [selected, setSelected] = useState<{ [key: string]: string[] }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [behavioralEvents, setBehavioralEvents] = useState<any[]>([]);
  const [modalOpen, setModalOpen] = useState<{ [key: string]: boolean }>({});

  useEffect(() => {
    if (authLoading || !user) return;
    const parentEmail = user.username;
    if (parentEmail) {
      setLoadingChildren(true);
      getParentStudents(parentEmail).then((data) => {
        setChildren(data || []);
        setLoadingChildren(false);
      });
    }
  }, [authLoading, user]);

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

  const handleOpenModal = (childId: string) => {
    setModalOpen((prev) => ({ ...prev, [childId]: true }));
  };
  const handleCloseModal = (childId: string) => {
    setModalOpen((prev) => ({ ...prev, [childId]: false }));
  };

  const handleSubmit = async (childId: string, e: React.FormEvent) => {
    e.preventDefault();
    // Insert parent report as behavioral_event (always minor)
    const student = children.find((c: any) => c.id === childId);
    const parentEmail = user?.username || "parent";
    const activities = selected[childId] || [];
    const description = notes[childId] || "Parent daily check-in.";
    const now = new Date();
    const event_date = now.toISOString().slice(0, 10);
    const event_time = now.toTimeString().slice(0, 8);
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
    setSelected((prev) => ({ ...prev, [childId]: [] }));
    setNotes((prev) => ({ ...prev, [childId]: "" }));
    setModalOpen((prev) => ({ ...prev, [childId]: false }));
    // Refresh events
    const lrns = children.map((c: any) => c.lrn);
    const { data } = await supabase
      .from('behavioral_events')
      .select('*')
      .in('student_lrn', lrns);
    setBehavioralEvents(data || []);
  };

  // Compute dynamic event counts
  const allEvents = behavioralEvents;
  const totalCount = allEvents.length;
  // Only count positive/negative if not parent_report
  const positiveCount = allEvents.filter((e: any) => e.event_type !== 'parent_report' && e.severity === 'positive').length;
  const negativeCount = allEvents.filter((e: any) => e.event_type !== 'parent_report' && e.severity !== 'positive').length;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Page Header - match behavioral events */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col gap-2">
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Daily Check-In
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300">
              Share and track your child's daily activities and well-being.
            </p>
          </div>
          {/* Log Daily Check-In button on the far right, only if children exist */}
          {children.length > 0 && (
            <Dialog open={!!modalOpen[children[0].id]} onOpenChange={(open) => open ? handleOpenModal(children[0].id) : handleCloseModal(children[0].id)}>
              <DialogTrigger asChild>
                <Button className="rounded-full px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center gap-2 shadow-md">
                  <span className="text-lg">+</span> Log Daily Check-In
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] max-w-2xl h-[86vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/40">
                  <DialogTitle className="text-2xl leading-tight">Log Daily Check-In for {children[0].name} ({children[0].level})</DialogTitle>
                  <DialogDescription>
                    Please provide your child's activities and any notes for today. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1">
                  <form onSubmit={(e) => handleSubmit(children[0].id, e)} className="space-y-6">
                    <div>
                      <label className="block text-base font-bold text-sky-700 dark:text-sky-400 mb-2">Today's Activities</label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {ACTIVITIES.map((activity) => (
                          <label key={activity} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selected[children[0].id]?.includes(activity) || false}
                              onChange={() => handleToggle(children[0].id, activity)}
                              className="accent-blue-600 w-4 h-4 rounded border border-slate-300 dark:border-slate-600"
                            />
                            <span className="text-slate-800 dark:text-slate-200 text-base">{activity}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label htmlFor={`notes-${children[0].id}`} className="block text-base font-bold text-sky-700 dark:text-sky-400 mb-2">Optional Notes or Reflections</label>
                      <Textarea
                        id={`notes-${children[0].id}`}
                        value={notes[children[0].id] || ""}
                        onChange={(e) => handleNotesChange(children[0].id, e.target.value)}
                        placeholder="Share anything about your child's day..."
                        rows={3}
                        className="w-full border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                    <Button type="submit" className="w-full h-12 text-base font-bold uppercase tracking-wide bg-linear-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">Submit Check-In</Button>
                  </form>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
        {/* Summary cards row, dashboard style */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Total Events */}
          <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Events</p>
                <div className="text-xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">{totalCount}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">all behavioral events</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Activity className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
          </Card>
          {/* Positive Events */}
          <Card className="border-0 bg-linear-to-br from-green-50 to-white dark:from-green-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-green-500/5 dark:bg-green-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Positive Events</p>
                <div className="text-xl sm:text-4xl font-bold text-green-600 dark:text-green-400">{positiveCount}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">reinforcing progress</p>
              </div>
              <div className="flex w-16 h-16 rounded-2xl bg-linear-to-br from-green-500 to-green-600 text-white items-center justify-center shadow-lg shadow-green-500/25 dark:shadow-green-500/20 ring-2 ring-green-300/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Heart className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-green-400 to-green-600 dark:from-green-500 dark:to-green-700" />
          </Card>
          {/* Negative Events */}
          <Card className="border-0 bg-linear-to-br from-pink-50 to-white dark:from-pink-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-pink-500/10 dark:bg-pink-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-pink-500/5 dark:bg-pink-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-pink-600 dark:text-pink-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Negative Events</p>
                <div className="text-xl sm:text-4xl font-bold text-pink-600 dark:text-pink-400">{negativeCount}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">major/critical incidents</p>
              </div>
              <div className="flex w-16 h-16 rounded-2xl bg-linear-to-br from-pink-500 to-pink-600 text-white items-center justify-center shadow-lg shadow-pink-500/25 dark:shadow-pink-500/20 ring-2 ring-pink-300/40 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <AlertCircle className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-pink-400 to-pink-600 dark:from-pink-500 dark:to-pink-700" />
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

