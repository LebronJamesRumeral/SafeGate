"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { getParentStudents } from '@/lib/parent-data';
import { supabase } from '@/lib/supabase';
import { createRoleNotification } from '@/lib/role-notifications';
import { Users, CheckCircle2, Clock3, XCircle, TrendingUp, AlertTriangle, Star, MinusCircle, FileText, CalendarDays, Shield, MapPin, UserRound, Bell } from 'lucide-react';
import { motion } from "framer-motion";

type StudentScheduleRow = {
  id: number;
  day_of_week: string;
  day_number: number;
  subject: string;
  start_time: string;
  end_time: string;
  room: string | null;
  teacher_name: string | null;
};

export default function ParentAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed search state
  const [attendanceLogs, setAttendanceLogs] = useState<any>({});
  const [behaviorIndicators, setBehaviorIndicators] = useState<any>({});
  const [behaviorEventsByDate, setBehaviorEventsByDate] = useState<any>({});
  const [attachedNotes, setAttachedNotes] = useState<Record<string, string>>({});
  const [parentActionNotes, setParentActionNotes] = useState<Record<string, string>>({});
  const [savingNoteId, setSavingNoteId] = useState<string | null>(null);
  const [openNoteModal, setOpenNoteModal] = useState<string | null>(null);
  const [dateFilterByChild, setDateFilterByChild] = useState<Record<string, string>>({});
  const [statusFilterByChild, setStatusFilterByChild] = useState<Record<string, string>>({});
  const [behaviorFilterByChild, setBehaviorFilterByChild] = useState<Record<string, string>>({});
  const [childSchedules, setChildSchedules] = useState<Record<string, StudentScheduleRow[]>>({});
  const [loadingScheduleByChild, setLoadingScheduleByChild] = useState<Record<string, boolean>>({});
  const [excuseModalOpen, setExcuseModalOpen] = useState(false);
  const [excuseStudentLrn, setExcuseStudentLrn] = useState('');
  const [excuseDate, setExcuseDate] = useState('');
  const [excuseStatus, setExcuseStatus] = useState<'absent' | 'late'>('absent');
  const [excuseReason, setExcuseReason] = useState('');
  const [savingExcuse, setSavingExcuse] = useState(false);
  const tomorrowIsoDate = (() => {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    return date.toISOString().slice(0, 10);
  })();

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    const parentEmail = user.username;
    if (parentEmail) {
      setLoading(true);
      getParentStudents(parentEmail).then(async (data) => {
        setChildren(data);
        if (!supabase) {
          setAttendanceLogs({});
          setBehaviorIndicators({});
          setBehaviorEventsByDate({});
          setAttachedNotes({});
          setParentActionNotes({});
          setLoading(false);
          return;
        }
        const logs: any = {};
        const behaviorByDate: any = {};
        const behaviorDetailsByDate: any = {};
        const notesByLogId: Record<string, string> = {};
        for (const child of data) {
          const { data: attLogs } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('student_lrn', child.lrn)
            .order('date', { ascending: false });

          const { data: behEvents } = await supabase
            .from('behavioral_events')
            .select('event_date, event_time, severity, event_type, description, location, reported_by, parent_notified, follow_up_required, notes')
            .eq('student_lrn', child.lrn)
            .in('guidance_status', ['approved', 'approved_for_ml'])
            .order('event_date', { ascending: false });

          const { data: noteRows } = await supabase
            .from('parent_attendance_notes')
            .select('attendance_log_id, note_text')
            .eq('student_lrn', child.lrn)
            .eq('parent_email', parentEmail);

          const childBehaviorMap: any = {};
          const childBehaviorDetailsMap: any = {};
          for (const event of behEvents || []) {
            const eventDate = String(event.event_date || '').slice(0, 10);
            if (!eventDate) continue;
            if (!childBehaviorMap[eventDate]) {
              childBehaviorMap[eventDate] = { positive: 0, concern: 0, minor: 0, total: 0, types: {} as Record<string, number> };
            }
            if (!childBehaviorDetailsMap[eventDate]) {
              childBehaviorDetailsMap[eventDate] = [];
            }

            childBehaviorMap[eventDate].total += 1;
            childBehaviorDetailsMap[eventDate].push(event);

            const eventType = String(event.event_type || 'Behavior Event');
            childBehaviorMap[eventDate].types[eventType] = (childBehaviorMap[eventDate].types[eventType] || 0) + 1;

            const severity = String(event.severity || '').toLowerCase();
            if (severity === 'positive') {
              childBehaviorMap[eventDate].positive += 1;
            } else if (severity === 'minor') {
              childBehaviorMap[eventDate].minor += 1;
            } else {
              childBehaviorMap[eventDate].concern += 1;
            }
          }

          logs[child.lrn] = attLogs || [];
          behaviorByDate[child.lrn] = childBehaviorMap;
          behaviorDetailsByDate[child.lrn] = childBehaviorDetailsMap;
          for (const note of noteRows || []) {
            notesByLogId[String(note.attendance_log_id)] = String(note.note_text || '');
          }
        }
        setAttendanceLogs(logs);
        setBehaviorIndicators(behaviorByDate);
        setBehaviorEventsByDate(behaviorDetailsByDate);
        setAttachedNotes(notesByLogId);
        setParentActionNotes(notesByLogId);
        setLoading(false);
      });
    }
  }, [authLoading, user, user?.username]);

  const handleSaveAttendanceNote = async (attendanceLogId: string, studentLrn: string) => {
    if (!supabase || !user?.username) return;
    const noteValue = (parentActionNotes[attendanceLogId] || '').trim();
    setSavingNoteId(attendanceLogId);

    try {
      if (!noteValue) {
        await supabase
          .from('parent_attendance_notes')
          .delete()
          .eq('attendance_log_id', Number(attendanceLogId))
          .eq('parent_email', user.username);

        setAttachedNotes((prev) => {
          const next = { ...prev };
          delete next[attendanceLogId];
          return next;
        });
        setOpenNoteModal(null);
        return;
      }

      await supabase
        .from('parent_attendance_notes')
        .upsert(
          {
            attendance_log_id: Number(attendanceLogId),
            student_lrn: studentLrn,
            parent_email: user.username,
            note_text: noteValue,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'attendance_log_id,parent_email' }
        );

      setAttachedNotes((prev) => ({
        ...prev,
        [attendanceLogId]: noteValue,
      }));
      setOpenNoteModal(null);
    } finally {
      setSavingNoteId(null);
    }
  };

  const resetExcuseForm = () => {
    setExcuseStudentLrn('');
    setExcuseDate('');
    setExcuseStatus('absent');
    setExcuseReason('');
  };

  const handleSubmitExcuseLetter = async () => {
    if (!user?.username || !supabase) return;

    const selectedChild = children.find((child) => child.lrn === excuseStudentLrn);
    const trimmedReason = excuseReason.trim();

    if (!selectedChild || !excuseDate || !trimmedReason) {
      return;
    }

    if (excuseDate < tomorrowIsoDate) {
      return;
    }

    setSavingExcuse(true);
    try {
      const parentDisplayName = user.full_name || user.display_name || user.username;
      const title = `Parent Excuse Letter (${excuseStatus === 'late' ? 'Late' : 'Absence'})`;
      const message = `${parentDisplayName} submitted an excuse letter for ${selectedChild.name} on ${excuseDate}.`;

      await createRoleNotification({
        title,
        message,
        targetRoles: ['teacher', 'admin'],
        createdBy: user.username,
        meta: {
          notification_kind: 'parent_excuse_letter',
          student_lrn: selectedChild.lrn,
          student_name: selectedChild.name,
          student_level: selectedChild.level,
          parent_email: user.username,
          parent_name: parentDisplayName,
          excuse_date: excuseDate,
          excuse_status: excuseStatus,
          excuse_reason: trimmedReason,
          href: '/students',
        },
      });

      setExcuseModalOpen(false);
      resetExcuseForm();
    } finally {
      setSavingExcuse(false);
    }
  };

  const fetchChildSchedule = async (studentLrn: string) => {
    if (!supabase || !studentLrn) return;
    if (loadingScheduleByChild[studentLrn]) return;
    if ((childSchedules[studentLrn] || []).length > 0) return;

    setLoadingScheduleByChild((prev) => ({ ...prev, [studentLrn]: true }));
    try {
      const { data, error } = await supabase
        .from('student_schedules')
        .select('id, day_of_week, day_number, subject, start_time, end_time, room, teacher_name')
        .eq('student_lrn', studentLrn)
        .eq('is_active', true)
        .order('day_number', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) throw error;

      setChildSchedules((prev) => ({
        ...prev,
        [studentLrn]: (data || []) as StudentScheduleRow[],
      }));
    } catch (error) {
      console.warn('Failed to load child schedule.', error);
      setChildSchedules((prev) => ({ ...prev, [studentLrn]: [] }));
    } finally {
      setLoadingScheduleByChild((prev) => ({ ...prev, [studentLrn]: false }));
    }
  };

  const renderBehaviorIndicator = (stats?: { positive: number; concern: number; minor: number; total: number; types: Record<string, number> }) => {
    if (!stats) {
      return (
        <Badge className="bg-gray-100 text-gray-700 border-0 text-xs inline-flex items-center gap-1">
          <MinusCircle className="w-3 h-3" />
          No event
        </Badge>
      );
    }

    const positiveCount = stats.positive;
    const concernCount = stats.concern + stats.minor;
    const typeSummary = Object.entries(stats.types || {})
      .map(([type, count]) => `${type} (${count})`)
      .join(', ');
    const details = `${stats.total} log${stats.total !== 1 ? 's' : ''}: ${typeSummary}`;

    if (positiveCount > 0 && concernCount > 0) {
      return (
        <Badge title={details} className="bg-amber-100 text-amber-700 border-0 text-xs whitespace-nowrap inline-flex items-center gap-1.5">
          <Star className="w-3 h-3" />
          <span>{positiveCount}</span>
          <span>•</span>
          <AlertTriangle className="w-3 h-3" />
          <span>{concernCount}</span>
        </Badge>
      );
    }
    if (concernCount > 0) {
      return (
        <Badge title={details} className="bg-red-100 text-red-700 border-0 text-xs whitespace-nowrap inline-flex items-center gap-1.5">
          <AlertTriangle className="w-3 h-3" />
          <span>{concernCount} log{concernCount !== 1 ? 's' : ''}</span>
        </Badge>
      );
    }

    return (
      <Badge title={details} className="bg-emerald-100 text-emerald-700 border-0 text-xs whitespace-nowrap inline-flex items-center gap-1.5">
        <Star className="w-3 h-3" />
        <span>{positiveCount} log{positiveCount !== 1 ? 's' : ''}</span>
      </Badge>
    );
  };

  const getBehaviorSeverityStyle = (severity?: string) => {
    const tone = String(severity || '').toLowerCase();
    if (tone === 'positive') {
      return {
        border: 'border-emerald-200 dark:border-emerald-800',
        bg: 'bg-emerald-50/80 dark:bg-emerald-950/20',
        badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
    }
    if (tone === 'minor') {
      return {
        border: 'border-amber-200 dark:border-amber-800',
        bg: 'bg-amber-50/80 dark:bg-amber-950/20',
        badge: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
        text: 'text-amber-700 dark:text-amber-300',
      };
    }
    return {
      border: 'border-red-200 dark:border-red-800',
      bg: 'bg-red-50/80 dark:bg-red-950/20',
      badge: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
      text: 'text-red-700 dark:text-red-300',
    };
  };

  const renderBehaviorByDay = (child: any, date: string) => {
    const dateKey = String(date || '').slice(0, 10);
    const stats = behaviorIndicators[child.lrn]?.[dateKey];
    const dayEvents = behaviorEventsByDate[child.lrn]?.[dateKey] || [];

    if (!stats || dayEvents.length === 0) {
      return (
        <Badge className="bg-gray-100 text-gray-700 border-0 text-xs inline-flex items-center gap-1">
          <MinusCircle className="w-3 h-3" />
          No event
        </Badge>
      );
    }

    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            size="sm"
            variant="outline"
            title="View Behavior on this Day"
            className="h-8 px-2.5 border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-700/60 dark:bg-emerald-900/20 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/30"
          >
            <Shield className="w-3.5 h-3.5 mr-1" />
            <span className="text-xs font-semibold mr-1">View Behavior</span>
            <Badge className="h-5 px-1.5 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 border-0 text-[10px]">
              {stats.total}
            </Badge>
          </Button>
        </DialogTrigger>
        <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <DialogTitle className="text-xl font-bold">Behavior on this Day</DialogTitle>
                </div>
                <DialogDescription className="mt-2 text-sm">
                  Behavior log for <span className="font-semibold text-slate-900 dark:text-white">{child.name}</span> ({child.lrn}) on {dateKey}
                </DialogDescription>
              </div>
              <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold px-3 py-1 whitespace-nowrap mr-8">
                {dayEvents.length} Event{dayEvents.length !== 1 ? 's' : ''}
              </Badge>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-4 space-y-3">
            {dayEvents.map((event: any, index: number) => {
              const style = getBehaviorSeverityStyle(event.severity);
              return (
                <div
                  key={`${dateKey}-${event.event_type}-${index}`}
                  className={`rounded-lg border ${style.border} ${style.bg} p-4 hover:shadow-md transition-shadow`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Shield className={`w-4 h-4 ${style.text}`} />
                          <p className={`font-bold text-sm ${style.text}`}>{String(event.event_type || 'Behavior Event')}</p>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {dateKey}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400 inline-flex items-center gap-1 mt-1">
                          <Clock3 className="w-3 h-3" />
                          {String(event.event_time || '--:--')}
                        </p>
                      </div>
                      <Badge className={`${style.badge} font-semibold text-xs px-2.5 py-1 uppercase tracking-wider border-0`}>
                        {String(event.severity || 'unknown')}
                      </Badge>
                    </div>

                    <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                      {String(event.description || 'No description provided.')}
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                      <div className="inline-flex items-center gap-1.5">
                        <UserRound className="w-3 h-3" />
                        <span>Reported by: {String(event.reported_by || 'System')}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" />
                        <span>Location: {String(event.location || 'School Campus')}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <Bell className="w-3 h-3" />
                        <span>Parent notified: {event.parent_notified ? 'Yes' : 'No'}</span>
                      </div>
                      <div className="inline-flex items-center gap-1.5">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Follow-up: {event.follow_up_required ? 'Required' : 'Not required'}</span>
                      </div>
                    </div>

                    {event.notes ? (
                      <div className="pt-2 border-t border-slate-200/70 dark:border-slate-700/70">
                        <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1">Notes</p>
                        <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">{String(event.notes)}</p>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  if (authLoading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  if (loading) {
    return (
      <DashboardLayout>
        <div className="space-y-6 px-2 sm:px-0">
          <div>
            <Skeleton className="h-10 w-56 mb-2" />
            <Skeleton className="h-5 w-80" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-200/70 dark:border-slate-700/60 p-5 bg-white/80 dark:bg-slate-800/70 shadow-lg space-y-3">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-10 w-16" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="rounded-2xl border-2 border-slate-200/70 dark:border-slate-700/60 bg-white/80 dark:bg-slate-800/70 shadow-xl overflow-hidden">
                <div className="h-1.5 bg-slate-200 dark:bg-slate-700" />
                <div className="p-4 space-y-3">
                  <Skeleton className="h-6 w-36" />
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-16 w-full rounded-lg" />
                  <div className="grid grid-cols-3 gap-2.5">
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg" />
                    <Skeleton className="h-14 rounded-lg" />
                  </div>
                  <Skeleton className="h-9 w-full rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Show all children, no filtering
  const filteredChildren = children;
  const attendanceSummary = filteredChildren.reduce(
    (acc, child) => {
      const childLogs = attendanceLogs[child.lrn] || [];
      for (const log of childLogs) {
        const status = String(log.attendance_status || '').toLowerCase();
        if (status === 'present') acc.present += 1;
        else if (status === 'late') acc.late += 1;
        else if (status === 'absent') acc.absent += 1;
      }
      return acc;
    },
    { present: 0, late: 0, absent: 0 }
  );

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 px-2 sm:px-0"
      >
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-1">Parent Attendance</h1>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-base">View your linked children and attendance logs.</p>
          </div>
          <Dialog
            open={excuseModalOpen}
            onOpenChange={(open) => {
              setExcuseModalOpen(open);
              if (open && children.length > 0 && !excuseStudentLrn) {
                setExcuseStudentLrn(children[0].lrn);
              }
              if (!open) {
                resetExcuseForm();
              }
            }}
          >
            <DialogTrigger asChild>
              <Button className="gap-2 bg-linear-to-r from-blue-600 to-cyan-600 text-white">
                <FileText className="w-4 h-4" />
                Submit Excuse Letter
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[96vw] sm:w-[92vw] max-w-xl">
              <DialogHeader>
                <DialogTitle>Submit Excuse Letter</DialogTitle>
                <DialogDescription>
                  Send an advance excuse for absence or late arrival. Teachers and admins will be notified.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Student</label>
                  <Select value={excuseStudentLrn} onValueChange={setExcuseStudentLrn}>
                    <SelectTrigger className="h-10">
                      <SelectValue placeholder="Select child" />
                    </SelectTrigger>
                    <SelectContent>
                      {children.map((child) => (
                        <SelectItem key={child.id} value={child.lrn}>
                          {child.name} ({child.level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Excuse Date</label>
                    <input
                      type="date"
                      value={excuseDate}
                      onChange={(e) => setExcuseDate(e.target.value)}
                      min={tomorrowIsoDate}
                      className="w-full h-10 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</label>
                    <Select value={excuseStatus} onValueChange={(value) => setExcuseStatus(value as 'absent' | 'late')}>
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="absent">Absent</SelectItem>
                        <SelectItem value="late">Late</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400">Explanation</label>
                  <Textarea
                    value={excuseReason}
                    onChange={(e) => setExcuseReason(e.target.value)}
                    placeholder="Explain the reason for this excuse."
                    className="min-h-32 text-sm"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setExcuseModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSubmitExcuseLetter}
                    disabled={savingExcuse || !excuseStudentLrn || !excuseDate || !excuseReason.trim() || excuseDate < tomorrowIsoDate}
                    className="bg-linear-to-r from-blue-600 to-cyan-600 text-white"
                  >
                    {savingExcuse ? 'Submitting...' : 'Submit Letter'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Attendance Summary */}
        <div className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between gap-4 relative z-10">
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Present</p>
                  <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-300">{attendanceSummary.present}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Days present</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
            </Card>

            <Card className="border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 dark:bg-amber-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-amber-500/5 dark:bg-amber-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between gap-4 relative z-10">
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] sm:text-xs text-amber-600 dark:text-amber-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Late</p>
                  <div className="text-xl sm:text-4xl font-bold text-amber-600 dark:text-amber-300">{attendanceSummary.late}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Late arrivals</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-linear-to-br from-amber-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-amber-500/25 dark:shadow-amber-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Clock3 className="w-8 h-8" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-amber-400 to-orange-600 dark:from-amber-500 dark:to-orange-700" />
            </Card>

            <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between gap-4 relative z-10">
                <div className="min-w-0 pr-2">
                  <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Absent</p>
                  <div className="text-xl sm:text-4xl font-bold text-red-600 dark:text-red-300">{attendanceSummary.absent}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Days absent</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 sm:w-16 sm:h-16 shrink-0 rounded-2xl bg-linear-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-lg shadow-red-500/25 dark:shadow-red-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <XCircle className="w-8 h-8" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
            </Card>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40">
              <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white font-mono">Children Attendance</h2>
              <p className="text-slate-600 dark:text-slate-400 font-mono text-sm">Attendance insights and detailed logs per child</p>
            </div>
          </div>

          {filteredChildren.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">No children linked to your account.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredChildren.map((child) => {
                const logs = attendanceLogs[child.lrn] || [];
                const presentCount = logs.filter((log: any) => String(log.attendance_status).toLowerCase() === 'present').length;
                const lateCount = logs.filter((log: any) => String(log.attendance_status).toLowerCase() === 'late').length;
                const absentCount = logs.filter((log: any) => String(log.attendance_status).toLowerCase() === 'absent').length;
                const totalCount = presentCount + lateCount + absentCount;
                const selectedDateFilter = dateFilterByChild[child.lrn] || '';
                const selectedStatusFilter = statusFilterByChild[child.lrn] || 'all';
                const selectedBehaviorFilter = behaviorFilterByChild[child.lrn] || 'all';

                const filteredLogs = logs.filter((log: any) => {
                  const logDate = String(log.date || '').slice(0, 10);
                  const statusRaw = String(log.attendance_status || '').toLowerCase();
                  const status = statusRaw === 'cancelled_class' ? 'cancelled' : statusRaw;
                  const stats = behaviorIndicators[child.lrn]?.[logDate];
                  const hasBehavior = Boolean(stats && stats.total > 0);
                  const positiveCount = stats?.positive || 0;
                  const concernCount = (stats?.concern || 0) + (stats?.minor || 0);

                  const matchDate = !selectedDateFilter || logDate === selectedDateFilter;
                  const matchStatus = selectedStatusFilter === 'all' || status === selectedStatusFilter;

                  let matchBehavior = true;
                  if (selectedBehaviorFilter === 'with_behavior') matchBehavior = hasBehavior;
                  else if (selectedBehaviorFilter === 'no_behavior') matchBehavior = !hasBehavior;
                  else if (selectedBehaviorFilter === 'positive_only') matchBehavior = hasBehavior && positiveCount > 0 && concernCount === 0;
                  else if (selectedBehaviorFilter === 'concern_only') matchBehavior = hasBehavior && concernCount > 0 && positiveCount === 0;
                  else if (selectedBehaviorFilter === 'mixed') matchBehavior = hasBehavior && positiveCount > 0 && concernCount > 0;

                  return matchDate && matchStatus && matchBehavior;
                });

                const attendanceRate = totalCount > 0 ? Math.round(((presentCount + lateCount) / totalCount) * 100) : 0;
                const trendGood = absentCount === 0 && lateCount <= 2;
                const scheduleRows = childSchedules[child.lrn] || [];

                const colors = trendGood
                  ? {
                      cardBg: 'bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80',
                      border: 'border-emerald-300/70 dark:border-emerald-600/60',
                      gradient: 'from-emerald-500 to-emerald-400',
                    }
                  : {
                      cardBg: 'bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80',
                      border: 'border-red-300/70 dark:border-red-600/60',
                      gradient: 'from-red-500 to-red-400',
                    };

                const trendStyle = trendGood
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
                        <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white text-xs px-2.5 py-1">
                          {child.level}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">Attendance Overview</p>
                        <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">{attendanceRate}% attendance rate</p>
                        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">{totalCount} total logged school day{totalCount !== 1 ? 's' : ''}</p>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-100 dark:border-emerald-900/40">
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Present</p>
                          <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{presentCount}</p>
                        </div>
                        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 p-2.5 border border-amber-100 dark:border-amber-900/40">
                          <p className="text-[10px] text-amber-700 dark:text-amber-300 font-semibold uppercase">Late</p>
                          <p className="text-lg font-bold text-amber-700 dark:text-amber-300">{lateCount}</p>
                        </div>
                        <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2.5 border border-red-100 dark:border-red-900/40">
                          <p className="text-[10px] text-red-700 dark:text-red-300 font-semibold uppercase">Absent</p>
                          <p className="text-lg font-bold text-red-700 dark:text-red-300">{absentCount}</p>
                        </div>
                      </div>

                      <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${trendStyle}`}>
                        {trendGood ? <TrendingUp className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
                        <span className="text-xs font-semibold">{trendGood ? 'Consistent Attendance' : 'Needs Attendance Support'}</span>
                      </div>

                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                            View attendance logs
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <DialogTitle className="text-xl font-bold">Attendance History</DialogTitle>
                                <DialogDescription className="mt-2 text-sm">
                                  Detailed attendance logs for <span className="font-semibold text-slate-900 dark:text-white">{child.name}</span> ({child.lrn})
                                </DialogDescription>
                              </div>
                              <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold px-3 py-1 whitespace-nowrap mr-8">
                                {filteredLogs.length} Record{filteredLogs.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </DialogHeader>

                          <div className="flex-1 overflow-y-auto pr-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3 mb-3">
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
                                <input
                                  type="date"
                                  value={selectedDateFilter}
                                  onChange={(e) =>
                                    setDateFilterByChild((prev) => ({
                                      ...prev,
                                      [child.lrn]: e.target.value,
                                    }))
                                  }
                                  className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Status</label>
                                <Select
                                  value={selectedStatusFilter}
                                  onValueChange={(value) =>
                                    setStatusFilterByChild((prev) => ({
                                      ...prev,
                                      [child.lrn]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All status" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Status</SelectItem>
                                    <SelectItem value="present">Present</SelectItem>
                                    <SelectItem value="late">Late</SelectItem>
                                    <SelectItem value="absent">Absent</SelectItem>
                                    <SelectItem value="cancelled">Cancelled</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Behavior</label>
                                <Select
                                  value={selectedBehaviorFilter}
                                  onValueChange={(value) =>
                                    setBehaviorFilterByChild((prev) => ({
                                      ...prev,
                                      [child.lrn]: value,
                                    }))
                                  }
                                >
                                  <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="All behavior" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all">All Behavior</SelectItem>
                                    <SelectItem value="with_behavior">With Behavior</SelectItem>
                                    <SelectItem value="no_behavior">No Behavior</SelectItem>
                                    <SelectItem value="positive_only">Positive Only</SelectItem>
                                    <SelectItem value="concern_only">Concern Only</SelectItem>
                                    <SelectItem value="mixed">Mixed</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="border border-border/50 rounded-lg overflow-x-auto mt-1">
                              <Table>
                                <TableHeader className="bg-muted/40">
                                  <TableRow className="border-border/50 hover:bg-muted/50">
                                    <TableHead className="text-foreground font-semibold">Date</TableHead>
                                    <TableHead className="text-foreground font-semibold">Check In</TableHead>
                                    <TableHead className="text-foreground font-semibold">Check Out</TableHead>
                                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                                    <TableHead className="text-foreground font-semibold">Attached Note</TableHead>
                                    <TableHead className="text-foreground font-semibold">Behavior</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {filteredLogs.length === 0 ? (
                                    <TableRow>
                                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">No attendance records match the selected filters.</TableCell>
                                    </TableRow>
                                  ) : (
                                    filteredLogs.slice(0, 30).map((log: any) => (
                                      <TableRow key={log.id} className="border-border/50 hover:bg-muted/50 transition-colors animate-fade-in-up">
                                        <TableCell className="py-3 px-4 text-sm">{log.date}</TableCell>
                                        <TableCell className="py-3 px-4 text-sm">{log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : '-'}</TableCell>
                                        <TableCell className="py-3 px-4 text-sm">{log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '-'}</TableCell>
                                        <TableCell className="py-3 px-4 text-sm">
                                          <Badge
                                            className={
                                              String(log.attendance_status).toLowerCase() === 'present'
                                                ? 'bg-emerald-100 text-emerald-700 border-0 text-xs'
                                                : String(log.attendance_status).toLowerCase() === 'late'
                                                ? 'bg-orange-100 text-orange-700 border-0 text-xs'
                                                : String(log.attendance_status).toLowerCase() === 'cancelled_class'
                                                ? 'bg-slate-200 text-slate-700 border-0 text-xs'
                                                : 'bg-red-100 text-red-700 border-0 text-xs'
                                            }
                                          >
                                            {String(log.attendance_status).toLowerCase() === 'cancelled_class'
                                              ? 'Cancelled'
                                              : String(log.attendance_status || '').charAt(0).toUpperCase() + String(log.attendance_status || '').slice(1)}
                                          </Badge>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-sm">
                                          <Dialog open={openNoteModal === String(log.id)} onOpenChange={(isOpen) => setOpenNoteModal(isOpen ? String(log.id) : null)}>
                                            <DialogTrigger asChild>
                                              <Button size="sm" variant="outline" className="h-8 px-2.5 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                                <FileText className="w-3.5 h-3.5 mr-1" />
                                                {attachedNotes[String(log.id)] ? 'View Note' : 'Add Note'}
                                              </Button>
                                            </DialogTrigger>
                                            <DialogContent className="w-[96vw] sm:w-[92vw] max-w-xl">
                                              <DialogHeader>
                                                <DialogTitle className="text-lg">Parent Feedback / Action</DialogTitle>
                                                <DialogDescription>
                                                  Add or view the attached parent note for this attendance entry.
                                                </DialogDescription>
                                              </DialogHeader>

                                              <div className="space-y-3">
                                                <Textarea
                                                  placeholder="Reason for late/absence"
                                                  value={parentActionNotes[String(log.id)] || ''}
                                                  onChange={(e) =>
                                                    setParentActionNotes((prev) => ({
                                                      ...prev,
                                                      [String(log.id)]: e.target.value,
                                                    }))
                                                  }
                                                  className="min-h-40 text-sm"
                                                />
                                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                                  This note is saved and attached to the attendance log.
                                                </p>
                                                <div className="flex justify-end">
                                                  <Button
                                                    size="sm"
                                                    onClick={() => handleSaveAttendanceNote(String(log.id), child.lrn)}
                                                    disabled={savingNoteId === String(log.id)}
                                                    className="bg-linear-to-r from-blue-600 to-cyan-600 text-white"
                                                  >
                                                    {savingNoteId === String(log.id)
                                                      ? 'Saving...'
                                                      : (attachedNotes[String(log.id)] ? 'Update Note' : 'Save Note')}
                                                  </Button>
                                                </div>
                                              </div>
                                            </DialogContent>
                                          </Dialog>
                                        </TableCell>
                                        <TableCell className="py-3 px-4 text-sm">
                                          {renderBehaviorByDay(child, String(log.date || ''))}
                                        </TableCell>
                                      </TableRow>
                                    ))
                                  )}
                                </TableBody>
                              </Table>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>

                      <Dialog
                        onOpenChange={(open) => {
                          if (open) {
                            void fetchChildSchedule(child.lrn);
                          }
                        }}
                      >
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                          >
                            View child schedule
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                          <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1">
                                <DialogTitle className="text-xl font-bold">Class Schedule</DialogTitle>
                                <DialogDescription className="mt-2 text-sm">
                                  Weekly class schedule for <span className="font-semibold text-slate-900 dark:text-white">{child.name}</span> ({child.lrn})
                                </DialogDescription>
                              </div>
                              <Badge className="bg-linear-to-r from-blue-600 to-cyan-600 text-white text-xs font-semibold px-3 py-1 whitespace-nowrap mr-8">
                                {scheduleRows.length} Slot{scheduleRows.length !== 1 ? 's' : ''}
                              </Badge>
                            </div>
                          </DialogHeader>

                          <div className="flex-1 overflow-y-auto pr-2 space-y-3">
                            {loadingScheduleByChild[child.lrn] ? (
                              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                Loading child schedule...
                              </div>
                            ) : scheduleRows.length === 0 ? (
                              <div className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                                No class schedule configured yet for this child.
                              </div>
                            ) : (
                              scheduleRows.map((row) => (
                                <div
                                  key={row.id}
                                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40 p-4 hover:shadow-md transition-shadow"
                                >
                                  <div className="flex flex-wrap items-start justify-between gap-3">
                                    <div className="space-y-1">
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">{row.subject || 'Class Session'}</p>
                                      <p className="text-xs text-slate-500 dark:text-slate-400">
                                        {row.day_of_week} - {(row.start_time || '').slice(0, 5)} to {(row.end_time || '').slice(0, 5)}
                                      </p>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      Day {row.day_number}
                                    </Badge>
                                  </div>
                                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-300">
                                    <div>Room: {row.room || 'Not set'}</div>
                                    <div>Teacher: {row.teacher_name || 'Not assigned'}</div>
                                  </div>
                                </div>
                              ))
                            )}
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
      </motion.div>
    </DashboardLayout>
  );
}
