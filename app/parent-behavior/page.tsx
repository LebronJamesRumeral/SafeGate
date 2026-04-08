"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogHeader, DialogDescription } from '@/components/ui/dialog';
import { Activity, Heart, Frown, Award, TrendingUp, AlertTriangle, AlertCircle, Users, Phone, Sparkles, Calendar, FileText } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import ParentBehaviorSkeleton from '@/components/parent-behavior-skeleton';
import { useIsMounted } from '@/hooks/use-is-mounted';
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getParentStudents } from '@/lib/parent-data';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { GraduationCap, Search } from 'lucide-react';

export default function ParentBehaviorPage() {
  const mounted = useIsMounted();
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [behavioralEvents, setBehavioralEvents] = useState<any>({});
  const [achievementsByStudent, setAchievementsByStudent] = useState<any>({});
  // Daily check-in state
  const ACTIVITIES = [
    "Studied",
    "Played",
    "Stayed in library",
    "Ate at canteen",
    "Attended club",
    "Helped a friend",
    "Participated in class",
    "Did homework",
    "Read a book",
    "Volunteered",
    "Won an award",
    "Had a conflict",
    "Was absent",
    "Was late",
    "Showed leadership",
    "Showed kindness",
    "Other"
  ];
  const [selected, setSelected] = useState<{ [key: string]: string[] }>({});
  const [otherActivity, setOtherActivity] = useState<{ [key: string]: string }>({});
  const [moodByStudent, setMoodByStudent] = useState<{ [key: string]: string }>({});
  const [healthByStudent, setHealthByStudent] = useState<{ [key: string]: string }>({});
  const [challengesByStudent, setChallengesByStudent] = useState<{ [key: string]: string }>({});
  const [goalsByStudent, setGoalsByStudent] = useState<{ [key: string]: string }>({});
  const [notes, setNotes] = useState<{ [key: string]: string }>({});
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [formError, setFormError] = useState<{ [key: string]: string }>({});
  const [historyDateFilters, setHistoryDateFilters] = useState<{ [key: string]: string }>({});
  const [historyTypeFilters, setHistoryTypeFilters] = useState<{ [key: string]: string }>({});
  const [historySeverityFilters, setHistorySeverityFilters] = useState<{ [key: string]: string }>({});

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
        const achievements: any = {};
        for (const child of data) {
          const { data: behEvents } = await supabase
            .from('behavioral_events')
            .select('*')
            .eq('student_lrn', child.lrn)
            .in('guidance_status', ['approved', 'approved_for_ml'])
            .order('event_date', { ascending: false });

          const { data: achievementEvents } = await supabase
            .from('achievements')
            .select('*')
            .eq('student_lrn', child.lrn)
            .order('achievement_date', { ascending: false });

          events[child.lrn] = behEvents || [];
          achievements[child.lrn] = achievementEvents || [];
        }
        setBehavioralEvents(events);
        setAchievementsByStudent(achievements);
        setLoading(false);
      });
    }
  }, [authLoading, user, user?.username]);

  // Daily check-in handlers
  const handleToggle = (childId: string, activity: string) => {
    setSelected((prev) => {
      const prevSelected = prev[childId] || [];
      const isRemoving = prevSelected.includes(activity);

      if (activity === "Other" && isRemoving) {
        setOtherActivity((prevOther) => ({ ...prevOther, [childId]: "" }));
      }

      return {
        ...prev,
        [childId]: isRemoving
          ? prevSelected.filter((a) => a !== activity)
          : [...prevSelected, activity],
      };
    });

    setFormError((prev) => ({
      ...prev,
      activities: "",
      other_activity: activity === "Other" ? prev.other_activity : prev.other_activity,
    }));
  };

  const handleNotesChange = (childId: string, value: string) => {
    setNotes((prev) => ({ ...prev, [childId]: value }));
    if (value.trim()) {
      setFormError((prev) => ({ ...prev, notes: "" }));
    }
  };

  const handleOtherActivityChange = (childId: string, value: string) => {
    setOtherActivity((prev) => ({ ...prev, [childId]: value }));
    if (value.trim()) {
      setFormError((prev) => ({ ...prev, other_activity: "" }));
    }
  };

  const handleMoodChange = (childId: string, value: string) => {
    setMoodByStudent((prev) => ({ ...prev, [childId]: value }));
    if (value.trim()) {
      setFormError((prev) => ({ ...prev, mood: "" }));
    }
  };

  const handleHealthChange = (childId: string, value: string) => {
    setHealthByStudent((prev) => ({ ...prev, [childId]: value }));
    if (value.trim()) {
      setFormError((prev) => ({ ...prev, health: "" }));
    }
  };

  const handleChallengesChange = (childId: string, value: string) => {
    setChallengesByStudent((prev) => ({ ...prev, [childId]: value }));
    if (value.trim()) {
      setFormError((prev) => ({ ...prev, challenges: "" }));
    }
  };

  const handleGoalsChange = (childId: string, value: string) => {
    setGoalsByStudent((prev) => ({ ...prev, [childId]: value }));
    if (value.trim()) {
      setFormError((prev) => ({ ...prev, goals: "" }));
    }
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
    setFormError({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      toast({
        title: 'Required Inputs Missing',
        description: 'Please complete: Select Student',
        variant: 'destructive',
      });
      return;
    }
    // Insert parent report as behavioral_event (always minor)
    const student = children.find((c: any) => c.id === selectedStudentId);
    const parentEmail = user?.username || "parent";
    const activities = selected[selectedStudentId] || [];
    const otherActivityText = (otherActivity[selectedStudentId] || "").trim();
    const mood = (moodByStudent[selectedStudentId] || '').trim();
    const health = (healthByStudent[selectedStudentId] || '').trim();
    const challenges = (challengesByStudent[selectedStudentId] || '').trim();
    const goals = (goalsByStudent[selectedStudentId] || '').trim();
    const description = notes[selectedStudentId] || "Parent weekly check-in.";

    const nextErrors: { [key: string]: string } = {};
    if (activities.length === 0) {
      nextErrors.activities = "Please select at least one activity.";
    }
    if (!mood) {
      nextErrors.mood = "Please select overall mood and attitude.";
    }
    if (activities.includes("Other") && !otherActivityText) {
      nextErrors.other_activity = "Please specify the activity for Other.";
    }
    if (!health) {
      nextErrors.health = "Please provide health and well-being details.";
    }
    if (!challenges) {
      nextErrors.challenges = "Please provide challenges this week.";
    }
    if (!goals) {
      nextErrors.goals = "Please provide goals for next week.";
    }
    if (!description.trim()) {
      nextErrors.notes = "Please provide notes or description.";
    }
    if (Object.keys(nextErrors).length > 0) {
      setFormError(nextErrors);
      const missingInputs: string[] = [];
      if (nextErrors.activities) missingInputs.push('This Week\'s Activities');
      if (nextErrors.other_activity) missingInputs.push('Other Activity');
      if (nextErrors.mood) missingInputs.push('Overall Mood & Attitude');
      if (nextErrors.health) missingInputs.push('Health & Well-being');
      if (nextErrors.challenges) missingInputs.push('Any Challenges This Week?');
      if (nextErrors.goals) missingInputs.push('Goals for Next Week');
      if (nextErrors.notes) missingInputs.push('Notes or Description');

      toast({
        title: 'Required Inputs Missing',
        description: `Please complete: ${missingInputs.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setFormError({});

    const activitiesForStorage = activities.includes("Other") && otherActivityText
      ? activities.map((activity) => activity === "Other" ? `Other: ${otherActivityText}` : activity)
      : activities;
    const now = new Date();
    const event_date = now.toISOString().slice(0, 10);
    const event_time = now.toTimeString().slice(0, 8);
    if (!supabase) {
      toast({
        title: 'Submission Failed',
        description: 'Database connection is not available. Please try again.',
        variant: 'destructive',
      });
      return;
    }
    const { error: insertError } = await supabase.from('behavioral_events').insert([
      {
        student_lrn: student?.lrn,
        event_type: 'parent_report',
        severity: 'minor',
        description,
        reported_by: parentEmail,
        event_date,
        event_time,
        guidance_status: 'pending_guidance',
        notes: JSON.stringify({
          activities: activitiesForStorage,
          other_activity: otherActivityText || null,
          mood: mood || null,
          health: health || null,
          challenges: challenges || null,
          goals: goals || null,
        }),
        created_at: now.toISOString(),
        updated_at: now.toISOString(),
      }
    ]);
    if (insertError) {
      console.error('Failed to save weekly check-in:', insertError);
      toast({
        title: 'Submission Failed',
        description: insertError.message || 'Unable to save weekly check-in.',
        variant: 'destructive',
      });
      return;
    }
    setSelected((prev) => ({ ...prev, [selectedStudentId]: [] }));
    setOtherActivity((prev) => ({ ...prev, [selectedStudentId]: "" }));
    setMoodByStudent((prev) => ({ ...prev, [selectedStudentId]: '' }));
    setHealthByStudent((prev) => ({ ...prev, [selectedStudentId]: '' }));
    setChallengesByStudent((prev) => ({ ...prev, [selectedStudentId]: '' }));
    setGoalsByStudent((prev) => ({ ...prev, [selectedStudentId]: '' }));
    setNotes((prev) => ({ ...prev, [selectedStudentId]: "" }));
    setFormError({});
    setModalOpen(false);
    // Refresh events for this child
    const { data: behEvents } = await supabase
      .from('behavioral_events')
      .select('*')
      .eq('student_lrn', student?.lrn)
      .in('guidance_status', ['approved', 'approved_for_ml'])
      .order('event_date', { ascending: false });
    setBehavioralEvents((prev: any) => ({ ...prev, [student?.lrn]: behEvents || [] }));
    toast({
      title: 'Success',
      description: 'Weekly check-in logged successfully and sent to Guidance for review.',
    });
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

  const activeStudentId = selectedStudentId || (children.length === 1 ? children[0]?.id : null);
  const activeActivities = activeStudentId ? (selected[activeStudentId] || []) : [];
  const activeOther = activeStudentId ? (otherActivity[activeStudentId] || '').trim() : '';
  const activeMood = activeStudentId ? (moodByStudent[activeStudentId] || '').trim() : '';
  const activeHealth = activeStudentId ? (healthByStudent[activeStudentId] || '').trim() : '';
  const activeChallenges = activeStudentId ? (challengesByStudent[activeStudentId] || '').trim() : '';
  const activeGoals = activeStudentId ? (goalsByStudent[activeStudentId] || '').trim() : '';
  const activeNotes = activeStudentId ? (notes[activeStudentId] || '').trim() : '';
  const hasOtherSelected = activeActivities.includes('Other');

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
        {/* Page Header with Weekly Check-In Button beside title */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-1">Your Child's Activity & Behavior</h1>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-base">See your child's activities, behavior, and progress in school</p>
          </div>
          {/* Weekly Check-In Button (one button for all children) */}
          <div>
            <Dialog open={modalOpen} onOpenChange={(open) => open ? handleOpenModal() : handleCloseModal()}>
              <DialogTrigger asChild>
                <Button className="bg-linear-to-r from-[#ff8a00] to-[#fb923c] dark:from-orange-600 dark:to-orange-500 text-white hover:from-[#e67e00] hover:to-[#f97316] dark:hover:from-orange-700 dark:hover:to-orange-600 hover:shadow-2xl shadow-lg rounded-full px-6 py-2 font-bold text-base flex items-center gap-2 transform hover:scale-105 active:scale-100 transition-all duration-200">
                  <span className="text-lg">+</span> Log Weekly Check-In
                </Button>
              </DialogTrigger>
                <DialogContent className="w-[96vw] sm:w-[92vw] max-w-5xl lg:max-w-4xl h-auto sm:h-[86vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/40">
                  <DialogTitle className="text-2xl sm:text-3xl leading-tight">Log Weekly Check-In</DialogTitle>
                  <DialogDescription>
                    Please provide your child's activities and any notes for this week. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
                  <div className="space-y-5 px-6 py-5 overflow-y-auto flex-1 min-h-0 pb-6">
                    {/* Student Selector if more than one child */}
                    {children.length > 1 && (
                      <div className="space-y-2">
                        <Label htmlFor="student_select" className="flex items-center gap-1">
                          Select Student <span className="text-red-500">*</span>
                        </Label>
                        <Select value={selectedStudentId || ''} onValueChange={setSelectedStudentId}>
                          <SelectTrigger id="student_select" className="w-full border-orange-200 dark:border-orange-700/60">
                            <SelectValue placeholder="Select a student..." />
                          </SelectTrigger>
                          <SelectContent>
                            {children.map(child => (
                              <SelectItem key={child.id} value={child.id}>
                                {child.name} ({child.level})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                    {/* Activities */}
                    <div className="space-y-2">
                      <Label className="flex items-center gap-1">
                        This Week's Activities <span className="text-red-500">*</span>
                      </Label>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-slate-200 dark:border-slate-700 rounded-xl p-4 bg-slate-50/50 dark:bg-slate-900/30 max-h-72 overflow-y-auto">
                        {ACTIVITIES.map((activity) => (
                          <label key={activity} className="flex items-center gap-3 cursor-pointer hover:bg-white/50 dark:hover:bg-slate-800/50 p-2 rounded transition-colors">
                            <input
                              type="checkbox"
                              checked={selected[selectedStudentId || children[0]?.id]?.includes(activity) || false}
                              onChange={() => {
                                const id = selectedStudentId || children[0]?.id;
                                if (id) handleToggle(id, activity);
                              }}
                              className="w-4 h-4 rounded border border-slate-300 dark:border-slate-600 accent-blue-600 cursor-pointer"
                            />
                            <span className="text-slate-700 dark:text-slate-200 text-sm">{activity}</span>
                          </label>
                        ))}
                      </div>
                      {formError.activities && (
                        <p className="text-sm text-red-600 dark:text-red-400">{formError.activities}</p>
                      )}
                      {(selected[selectedStudentId || children[0]?.id] || []).includes("Other") && (
                        <div className="space-y-2">
                          <Label htmlFor={`other-activity-${selectedStudentId || children[0]?.id}`}>Please specify Other activity</Label>
                          <input
                            id={`other-activity-${selectedStudentId || children[0]?.id}`}
                            type="text"
                            value={otherActivity[selectedStudentId || children[0]?.id] || ""}
                            onChange={(e) => {
                              const id = selectedStudentId || children[0]?.id;
                              if (id) handleOtherActivityChange(id, e.target.value);
                            }}
                            placeholder="Type activity"
                            className="w-full h-11 px-3 border border-orange-200 dark:border-orange-700/60 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                          />
                          {formError.other_activity && (
                            <p className="text-sm text-red-600 dark:text-red-400">{formError.other_activity}</p>
                          )}
                        </div>
                      )}
                    </div>
                    {/* Overall Mood Rating */}
                    <div className="space-y-2">
                      <Label htmlFor="mood_select" className="flex items-center gap-1">
                        Overall Mood & Attitude <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={moodByStudent[selectedStudentId || children[0]?.id] || ''}
                        onValueChange={(value) => {
                          const id = selectedStudentId || children[0]?.id;
                          if (id) handleMoodChange(id, value);
                        }}
                      >
                        <SelectTrigger id="mood_select" className="w-full border-orange-200 dark:border-orange-700/60">
                          <SelectValue placeholder="Select mood..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="excellent">Excellent - Very positive</SelectItem>
                          <SelectItem value="good">Good - Generally happy</SelectItem>
                          <SelectItem value="neutral">Neutral - Typical week</SelectItem>
                          <SelectItem value="frustrated">Frustrated - Some challenges</SelectItem>
                          <SelectItem value="difficult">Difficult - Struggling this week</SelectItem>
                        </SelectContent>
                      </Select>
                      {formError.mood && (
                        <p className="text-sm text-red-600 dark:text-red-400">{formError.mood}</p>
                      )}
                    </div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Health & Well-being */}
                      <div className="space-y-2">
                        <Label htmlFor="health_input" className="flex items-center gap-1">
                          Health & Well-being <span className="text-red-500">*</span>
                        </Label>
                        <input
                          id="health_input"
                          type="text"
                          value={healthByStudent[selectedStudentId || children[0]?.id] || ''}
                          onChange={(e) => {
                            const id = selectedStudentId || children[0]?.id;
                            if (id) handleHealthChange(id, e.target.value);
                          }}
                          placeholder="Sleep, exercise, nutrition, concerns"
                          className="w-full h-11 px-3 border border-orange-200 dark:border-orange-700/60 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                        />
                        {formError.health && (
                          <p className="text-sm text-red-600 dark:text-red-400">{formError.health}</p>
                        )}
                      </div>
                      {/* Challenges Faced */}
                      <div className="space-y-2">
                        <Label htmlFor="challenges_input" className="flex items-center gap-1">
                          Any Challenges This Week? <span className="text-red-500">*</span>
                        </Label>
                        <input
                          id="challenges_input"
                          type="text"
                          value={challengesByStudent[selectedStudentId || children[0]?.id] || ''}
                          onChange={(e) => {
                            const id = selectedStudentId || children[0]?.id;
                            if (id) handleChallengesChange(id, e.target.value);
                          }}
                          placeholder="Academic, peer, or personal challenges"
                          className="w-full h-11 px-3 border border-orange-200 dark:border-orange-700/60 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                        />
                        {formError.challenges && (
                          <p className="text-sm text-red-600 dark:text-red-400">{formError.challenges}</p>
                        )}
                      </div>
                    </div>
                    {/* Goals for Next Week */}
                    <div className="space-y-2">
                      <Label htmlFor="goals_input" className="flex items-center gap-1">
                        Goals for Next Week <span className="text-red-500">*</span>
                      </Label>
                      <input
                        id="goals_input"
                        type="text"
                        value={goalsByStudent[selectedStudentId || children[0]?.id] || ''}
                        onChange={(e) => {
                          const id = selectedStudentId || children[0]?.id;
                          if (id) handleGoalsChange(id, e.target.value);
                        }}
                        placeholder="Academic and behavior goals"
                        className="w-full h-11 px-3 border border-orange-200 dark:border-orange-700/60 rounded-md bg-white dark:bg-slate-900 text-slate-900 dark:text-white placeholder:text-slate-500 dark:placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 transition-all"
                      />
                      {formError.goals && (
                        <p className="text-sm text-red-600 dark:text-red-400">{formError.goals}</p>
                      )}
                    </div>
                    {/* Notes */}
                    <div className="space-y-2">
                      <Label htmlFor={`notes-${selectedStudentId || children[0]?.id}`} className="flex items-center gap-1">
                        Notes or Description <span className="text-red-500">*</span>
                      </Label>
                      <Textarea
                        id={`notes-${selectedStudentId || children[0]?.id}`}
                        value={notes[selectedStudentId || children[0]?.id] || ""}
                        onChange={(e) => {
                          const id = selectedStudentId || children[0]?.id;
                          if (id) handleNotesChange(id, e.target.value);
                        }}
                        placeholder="Help us by specifying any additional details about your child's week, progress, or observations..."
                        rows={4}
                        className="resize-none border-orange-200 dark:border-orange-700/60 focus-visible:ring-2 focus-visible:ring-blue-500"
                      />
                      {formError.notes && (
                        <p className="text-sm text-red-600 dark:text-red-400">{formError.notes}</p>
                      )}
                    </div>
                  </div>
                  <div className="border-t bg-white dark:bg-slate-950 px-6 py-4 flex justify-end gap-2">
                    <Button type="button" variant="outline" className="border-orange-200 text-slate-700 hover:bg-orange-50 dark:border-orange-700/60 dark:text-slate-200 dark:hover:bg-orange-900/20" onClick={() => {
                      handleCloseModal();
                      setSelectedStudentId(null);
                    }}>
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      className="gap-2 bg-linear-to-r from-[#ff8a00] to-[#fb923c] hover:from-[#e67e00] hover:to-[#f97316] text-white"
                    >
                      <span>+</span> Log Check-In
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Summary Cards Row - Updated Design */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Total Events */}
          <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between gap-4 relative z-10">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Events</p>
                <div className="text-xl sm:text-4xl font-bold text-blue-600 dark:text-blue-400">{children.reduce((acc, child) => acc + (behavioralEvents[child.lrn]?.length || 0), 0)}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">All behavioral events</p>
              </div>
              <div className="hidden sm:flex w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Activity className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
          </Card>
          {/* Positive Events */}
          <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between gap-4 relative z-10">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Positive Behaviors</p>
                <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{children.reduce((acc, child) => acc + (behavioralEvents[child.lrn]?.filter((e: any) => e.event_type !== 'parent_report' && e.severity === 'positive').length || 0), 0)}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Positive actions by teachers</p>
              </div>
              <div className="hidden sm:flex w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Heart className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
          </Card>
          {/* Negative Events */}
          <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between gap-4 relative z-10">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Needs Attention</p>
                <div className="text-xl sm:text-4xl font-bold text-red-600 dark:text-red-400">{children.reduce((acc, child) => acc + (behavioralEvents[child.lrn]?.filter((e: any) => e.event_type !== 'parent_report' && e.severity !== 'positive').length || 0), 0)}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Behaviors needing guidance support</p>
              </div>
              <div className="hidden sm:flex w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-linear-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-lg shadow-red-500/25 dark:shadow-red-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Frown className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
          </Card>
          {/* Achievements */}
          <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between gap-4 relative z-10">
              <div className="min-w-0 pr-2">
                <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Achievements</p>
                <div className="text-xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400">
                  {children.reduce((acc, child) => acc + (achievementsByStudent[child.lrn]?.length || 0), 0)}
                </div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">All linked students combined</p>
              </div>
              <div className="hidden sm:flex w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Award className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
          </Card>
        </div>
        <div className="mt-8">
          <div className="flex flex-col sm:flex-row items-start gap-2 sm:gap-4 mb-6">
            <div className="p-2 sm:p-3 rounded-2xl bg-linear-to-br from-orange-600 to-orange-500 shadow-lg shadow-orange-600/25 mb-2 sm:mb-0">
              <GraduationCap className="w-7 h-7 sm:w-8 sm:h-8 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="text-2xl sm:text-3xl font-bold bg-linear-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent mb-2">
                Behavioral Events & Achievements
              </h2>
              <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400">
                Approved behavior records and positive achievements per linked child
              </p>
            </div>
          </div>

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Loading behavior and achievements...</div>
          ) : filteredChildren.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No children linked to your account.</div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredChildren.map((child) => {
                  const childEvents = behavioralEvents[child.lrn] || [];
                  const childAchievements = achievementsByStudent[child.lrn] || [];
                  const historyDateFilter = historyDateFilters[child.lrn] || '';
                  const historyTypeFilter = historyTypeFilters[child.lrn] || 'all';
                  const historySeverityFilter = historySeverityFilters[child.lrn] || 'all';
                  const combinedTypeOptions = Array.from(
                    new Set([
                      ...childEvents.map((event: any) => `behavior::${event.event_type}`),
                      ...childAchievements.map((achievement: any) => `achievement::${achievement.achievement_type}`),
                    ])
                  );

                  const filteredChildEvents = childEvents.filter((event: any) => {
                    const eventDate = event.event_date ? String(event.event_date).slice(0, 10) : '';
                    const matchesDate = !historyDateFilter || eventDate === historyDateFilter;

                    const matchesType =
                      historyTypeFilter === 'all' ||
                      historyTypeFilter === 'behavior' ||
                      (historyTypeFilter.startsWith('behavior::') && historyTypeFilter === `behavior::${event.event_type}`);

                    const matchesSeverity =
                      historySeverityFilter === 'all' ||
                      String(event.severity || '').toLowerCase() === historySeverityFilter;

                    return matchesDate && matchesType && matchesSeverity;
                  });

                  const filteredChildAchievements = childAchievements.filter((achievement: any) => {
                    const achievementDate = achievement.achievement_date ? String(achievement.achievement_date).slice(0, 10) : '';
                    const matchesDate = !historyDateFilter || achievementDate === historyDateFilter;

                    const matchesType =
                      historyTypeFilter === 'all' ||
                      historyTypeFilter === 'achievement' ||
                      (historyTypeFilter.startsWith('achievement::') && historyTypeFilter === `achievement::${achievement.achievement_type}`);

                    const matchesSeverity = historySeverityFilter === 'all' || historySeverityFilter === 'positive';

                    return matchesDate && matchesType && matchesSeverity;
                  });

                  const visibleRecordCount = filteredChildEvents.length + filteredChildAchievements.length;
                  const nonParentEvents = childEvents.filter((e: any) => e.event_type !== 'parent_report');
                  const concerningEvents = nonParentEvents.filter((e: any) => e.severity !== 'positive');
                  const positiveBehaviorEvents = nonParentEvents.filter((e: any) => e.severity === 'positive');
                  const concerningCount = concerningEvents.length;
                  const positiveBehaviorCount = positiveBehaviorEvents.length;
                  const positiveTotal = positiveBehaviorCount + childAchievements.length;
                  const riskLabel = concerningCount >= 4 ? 'HIGH' : concerningCount > 0 ? 'MEDIUM' : 'LOW';
                  const colors =
                    riskLabel === 'HIGH'
                      ? {
                          cardBg: 'bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80',
                          border: 'border-red-300/70 dark:border-red-600/60',
                          gradient: 'from-red-500 to-red-400',
                        }
                      : riskLabel === 'MEDIUM'
                      ? {
                          cardBg: 'bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80',
                          border: 'border-orange-300/70 dark:border-orange-600/60',
                          gradient: 'from-orange-500 to-amber-400',
                        }
                      : {
                          cardBg: 'bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80',
                          border: 'border-orange-300/70 dark:border-orange-600/60',
                          gradient: 'from-orange-500 to-amber-400',
                        };
                  const latestBehavior = nonParentEvents[0];
                  const latestAchievement = childAchievements[0];
                  const keyIssueEvent = concerningEvents[0];
                  const keyIssue =
                    concerningCount > 0
                      ? keyIssueEvent?.event_type || 'Behavior concern detected'
                      : latestAchievement?.achievement_type || 'No recent concerns';
                  const supportSignal =
                    concerningCount > 0
                      ? 'Some concerning records need parent-school follow up.'
                      : 'Positive behavior and achievements are currently strong.';
                  const trendLabel = positiveTotal >= concerningCount ? 'Improving' : 'Needs Support';
                  const trendStyle = positiveTotal >= concerningCount
                    ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300';
                  return (
                    <Card key={child.id} className={`w-full border-2 ${colors.border} ${colors.cardBg} shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden`}>
                      <div className={`h-1.5 bg-linear-to-r ${colors.gradient} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                      </div>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between items-center gap-2">
                          <div className="flex flex-col gap-0.5">
                            <span className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-tight">{child.name}</span>
                            <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{child.lrn}</span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Key Issues</p>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{keyIssue}</p>
                          <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{supportSignal}</p>
                        </div>

                        <div className="grid grid-cols-2 gap-2.5">
                          <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2.5 border border-red-100 dark:border-red-900/40">
                            <p className="text-[10px] text-red-700 dark:text-red-300 font-semibold uppercase">Concerning</p>
                            <p className="text-lg font-bold text-red-700 dark:text-red-300">{concerningCount}</p>
                          </div>
                          <div className="rounded-lg bg-orange-50 dark:bg-orange-950/30 p-2.5 border border-orange-100 dark:border-orange-900/40">
                            <p className="text-[10px] text-orange-700 dark:text-orange-300 font-semibold uppercase">Positive</p>
                            <p className="text-lg font-bold text-orange-700 dark:text-orange-300">{positiveTotal}</p>
                          </div>
                        </div>

                        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${trendStyle}`}>
                          {positiveTotal >= concerningCount ? <TrendingUp className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                          <span className="text-xs font-semibold">{trendLabel}</span>
                        </div>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="outline" className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                              View behavior and achievements
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl h-auto sm:max-h-[90vh] overflow-hidden flex flex-col">
                            <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                                    <DialogTitle className="text-xl font-bold">Behavior & Achievement History</DialogTitle>
                                  </div>
                                  <DialogDescription className="mt-2 text-sm">
                                    Complete behavioral and achievement record for <span className="font-semibold text-slate-900 dark:text-white">{child.name}</span> ({child.lrn})
                                  </DialogDescription>
                                </div>
                                {(childEvents.length > 0 || childAchievements.length > 0) && (
                                  <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold px-3 py-1 whitespace-nowrap mr-8">
                                    {visibleRecordCount} Record{visibleRecordCount !== 1 ? 's' : ''}
                                  </Badge>
                                )}
                              </div>
                            </DialogHeader>

                            <div className="flex-1 overflow-y-auto pr-4 space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3">
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</Label>
                                  <input
                                    type="date"
                                    value={historyDateFilter}
                                    onChange={(e) => setHistoryDateFilters((prev) => ({ ...prev, [child.lrn]: e.target.value }))}
                                    className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</Label>
                                  <Select
                                    value={historyTypeFilter}
                                    onValueChange={(value) => setHistoryTypeFilters((prev) => ({ ...prev, [child.lrn]: value }))}
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue placeholder="All types" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Types</SelectItem>
                                      <SelectItem value="behavior">Behavior Events</SelectItem>
                                      <SelectItem value="achievement">Achievements</SelectItem>
                                      {combinedTypeOptions.map((option) => {
                                        const [group, label] = option.split('::');
                                        return (
                                          <SelectItem key={option} value={option}>
                                            {group === 'behavior' ? `Behavior: ${label}` : `Achievement: ${label}`}
                                          </SelectItem>
                                        );
                                      })}
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Severity</Label>
                                  <Select
                                    value={historySeverityFilter}
                                    onValueChange={(value) => setHistorySeverityFilters((prev) => ({ ...prev, [child.lrn]: value }))}
                                  >
                                    <SelectTrigger className="h-9 text-xs">
                                      <SelectValue placeholder="All severity" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="all">All Severity</SelectItem>
                                      <SelectItem value="critical">Critical</SelectItem>
                                      <SelectItem value="major">Major</SelectItem>
                                      <SelectItem value="moderate">Moderate</SelectItem>
                                      <SelectItem value="minor">Minor</SelectItem>
                                      <SelectItem value="positive">Positive</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>

                              {visibleRecordCount === 0 && (
                                <div className="flex items-center justify-center py-12">
                                  <div className="text-center">
                                    <Activity className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                                    <p className="text-sm text-slate-600 dark:text-slate-400">No records match the selected filters.</p>
                                  </div>
                                </div>
                              )}

                              {filteredChildEvents.map((event: any) => {
                                const getSeverityColor = (severity: string) => {
                                  const normalizedSeverity = severity?.toLowerCase() || 'major';
                                  switch (normalizedSeverity) {
                                    case 'critical':
                                      return {
                                        border: 'border-red-200 dark:border-red-700/60 bg-red-50/50 dark:bg-red-950/40',
                                        bg: 'border-l-4 border-l-red-600 bg-linear-to-br from-red-50/80 via-white to-red-50/40 dark:from-red-950/30 dark:via-slate-800/50 dark:to-red-900/20',
                                        badge: 'bg-linear-to-r from-red-600 to-red-700 text-white shadow-lg shadow-red-500/25',
                                        icon: 'text-red-600 dark:text-red-400',
                                        text: 'text-red-600 dark:text-red-400'
                                      };
                                    case 'major':
                                      return {
                                        border: 'border-amber-200 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/40',
                                        bg: 'border-l-4 border-l-amber-600 bg-linear-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-slate-800/50 dark:to-amber-900/20',
                                        badge: 'bg-linear-to-r from-amber-600 to-orange-600 text-white shadow-lg shadow-amber-500/25',
                                        icon: 'text-amber-600 dark:text-amber-400',
                                        text: 'text-amber-600 dark:text-amber-400'
                                      };
                                    case 'moderate':
                                      return {
                                        border: 'border-yellow-200 dark:border-yellow-700/60 bg-yellow-50/50 dark:bg-yellow-950/40',
                                        bg: 'border-l-4 border-l-yellow-500 bg-linear-to-br from-yellow-50/80 via-white to-yellow-50/40 dark:from-yellow-950/30 dark:via-slate-800/50 dark:to-yellow-900/20',
                                        badge: 'bg-linear-to-r from-yellow-500 to-amber-500 text-white shadow-lg shadow-yellow-500/25',
                                        icon: 'text-yellow-600 dark:text-yellow-400',
                                        text: 'text-yellow-600 dark:text-yellow-400'
                                      };
                                    default:
                                      return {
                                        border: 'border-blue-200 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/40',
                                        bg: 'border-l-4 border-l-blue-600 bg-linear-to-br from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/30 dark:via-slate-800/50 dark:to-blue-900/20',
                                        badge: 'bg-linear-to-r from-blue-600 to-cyan-600 text-white shadow-lg shadow-blue-500/25',
                                        icon: 'text-blue-600 dark:text-blue-400',
                                        text: 'text-blue-600 dark:text-blue-400'
                                      };
                                  }
                                };

                                const colors = getSeverityColor(event.severity);

                                return (
                                  <div key={`event-${event.id}`} className={`rounded-lg border ${colors.border} ${colors.bg} p-4 hover:shadow-md transition-shadow`}>
                                    <div className="space-y-3">
                                      {/* Header Row */}
                                      <div className="flex items-start justify-between gap-3">
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <div className={`${colors.icon}`}>
                                              <Activity className="w-4 h-4" />
                                            </div>
                                            <p className={`font-bold text-sm ${colors.text}`}>{event.event_type}</p>
                                          </div>
                                          <p className="text-xs text-slate-500 dark:text-slate-400">
                                            <Calendar className="w-3 h-3 inline mr-1" />
                                            {event.event_date} {event.event_time ? `at ${event.event_time}` : ''}
                                          </p>
                                        </div>
                                        <Badge className={`${colors.badge} font-semibold text-xs px-2.5 py-1 uppercase tracking-wider`}>
                                          {event.severity}
                                        </Badge>
                                      </div>

                                      {/* Description */}
                                      <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{event.description}</p>

                                      {/* Metadata Grid */}
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        {event.reported_by && (
                                          <div className="flex items-center gap-2">
                                            <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                            <span><span className="font-semibold">Reported:</span> {event.reported_by}</span>
                                          </div>
                                        )}
                                        {event.location && (
                                          <div className="flex items-center gap-2">
                                            <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                            <span><span className="font-semibold">Location:</span> {event.location}</span>
                                          </div>
                                        )}
                                        {event.event_categories?.category_type && (
                                          <div className="flex items-center gap-2">
                                            <AlertTriangle className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                            <span><span className="font-semibold">Category:</span> {event.event_categories.category_type}</span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                          <span><span className="font-semibold">Parent Notified:</span> {event.parent_notified ? '✓ Yes' : '✗ No'}</span>
                                        </div>
                                      </div>

                                      {/* Action Taken & Notes */}
                                      {(event.action_taken || event.notes) && (
                                        <div className="space-y-1 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                                          {event.action_taken && (
                                            <p><span className="font-semibold">Action Taken:</span> {event.action_taken}</p>
                                          )}
                                          {event.notes && (
                                            <p><span className="font-semibold">Notes:</span> {event.notes}</p>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}

                              {filteredChildAchievements.map((achievement: any) => {
                                const rawNotes = achievement.notes ? String(achievement.notes) : '';
                                const structuredNoteLines = rawNotes
                                  .split(/(?=Achievement Level:|Recognition Channel:|Skill Tags:|Leadership Score\/Points:|Impact Summary:)/)
                                  .map((line: string) => line.trim())
                                  .filter(Boolean);
                                const noteLines = structuredNoteLines.length > 1 ? structuredNoteLines : [rawNotes].filter(Boolean);

                                return (
                                <div key={`achievement-${achievement.id}`} className="rounded-lg border border-orange-200 dark:border-orange-700/60 bg-orange-50/50 dark:bg-orange-950/40 border-l-4 border-l-orange-600 bg-linear-to-br from-orange-50/80 via-white to-orange-50/40 dark:from-orange-950/30 dark:via-slate-800/50 dark:to-orange-900/20 p-4 hover:shadow-md transition-shadow">
                                  <div className="space-y-3">
                                    {/* Header Row */}
                                    <div className="flex items-start justify-between gap-3">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                          <div className="text-orange-600 dark:text-orange-400">
                                            <Award className="w-4 h-4" />
                                          </div>
                                          <p className="font-bold text-sm text-orange-600 dark:text-orange-400">{achievement.achievement_type}</p>
                                        </div>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">
                                          <Calendar className="w-3 h-3 inline mr-1" />
                                          {achievement.achievement_date} {achievement.achievement_time ? `at ${achievement.achievement_time}` : ''}
                                        </p>
                                      </div>
                                      <Badge className="bg-linear-to-r from-orange-600 to-amber-600 text-white font-semibold text-xs px-2.5 py-1 uppercase tracking-wider shadow-lg shadow-orange-500/25">
                                        positive
                                      </Badge>
                                    </div>

                                    {/* Description */}
                                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{achievement.description}</p>

                                    {/* Metadata Grid */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                                      {achievement.achievement_category && (
                                        <div className="flex items-center gap-2">
                                          <Sparkles className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                          <span><span className="font-semibold">Category:</span> {achievement.achievement_category}</span>
                                        </div>
                                      )}
                                      {achievement.awarded_by && (
                                        <div className="flex items-center gap-2">
                                          <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                          <span><span className="font-semibold">Awarded by:</span> {achievement.awarded_by}</span>
                                        </div>
                                      )}
                                    </div>

                                    {/* Notes */}
                                    {noteLines.length > 0 && (
                                      <div className="text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-200 dark:border-slate-700">
                                        <p className="font-semibold flex items-center gap-1.5 mb-1.5">
                                          <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                          Notes
                                        </p>
                                        <div className="space-y-1.5 pl-5">
                                          {noteLines.map((line: string, idx: number) => (
                                            <p key={`note-${achievement.id}-${idx}`}>{line}</p>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              )})}
                            </div>
                          </DialogContent>
                        </Dialog>
                      </CardContent>
                    </Card>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
