'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from '@/components/ui/command';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { GuidanceReviewPageSkeleton } from '@/components/guidance-review-skeleton';
import { Skeleton } from '@/components/ui/skeleton';
import { Activity, AlertTriangle, CalendarDays, CheckCircle, Clock, Eye, Loader2, UserCircle2, Users, XCircle, ChevronDownIcon, Minus, Info, Printer, ClipboardCheck } from 'lucide-react';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator
} from '@/components/ui/select';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { createRoleNotification } from '@/lib/role-notifications';
import { buildEarlyPreventionNote } from '@/lib/prevention-notes';
import { motion } from 'framer-motion';

type GuidanceStatus = 'pending_guidance' | 'approved_for_ml' | 'denied_by_guidance';

type StudentRecord = {
  lrn: string;
  name: string;
  level: string;
  status: string;
};

type BehavioralEventRecord = {
  id: number;
  student_lrn: string;
  event_type: string;
  severity: string;
  description: string;
  event_date: string;
  event_time: string;
  location: string | null;
  reported_by: string;
  guidance_status: GuidanceStatus;
  guidance_reviewed_by: string | null;
  guidance_reviewed_at: string | null;
  guidance_intervention_notes: string | null;
  parent_notified?: boolean;
  follow_up_required?: boolean;
  notes?: string | null;
  created_at: string;
  students?: {
    name: string;
    level: string;
  } | {
    name: string;
    level: string;
  }[];
};

type AttendanceLogRecord = {
  id: number;
  student_lrn: string;
  date: string;
  check_in_time: string;
  check_out_time: string | null;
  created_at: string;
};

type TimelineItem = {
  id: string;
  kind: 'event' | 'attendance';
  when: string;
  title: string;
  subtitle: string;
  badge: string;
};

function formatDate(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatDateOnly(value?: string | null) {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString();
}

function getGuidanceBadge(status: GuidanceStatus) {
  if (status === 'approved_for_ml') {
    return <Badge className="bg-emerald-100 text-emerald-700 border-0">Approved</Badge>;
  }

  if (status === 'denied_by_guidance') {
    return <Badge className="bg-rose-100 text-rose-700 border-0">Denied</Badge>;
  }

  return <Badge className="bg-amber-100 text-amber-700 border-0">Pending</Badge>;
}

function getSeverityBadgeClass(severity: string) {
  const normalized = severity.toLowerCase();
  if (normalized.includes('high') || normalized.includes('major') || normalized.includes('severe')) {
    return 'bg-rose-100 text-rose-700 border-rose-200';
  }

  if (normalized.includes('medium') || normalized.includes('moderate')) {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }

  return 'bg-slate-100 text-slate-700 border-slate-200';
}

function getIncidentReportCardClass(severity: string) {
  const normalized = String(severity || '').toLowerCase();
  if (normalized.includes('critical')) {
    return 'border-red-200 dark:border-red-700/60 border-l-4 border-l-red-600 bg-gradient-to-br from-red-50/80 via-white to-red-50/40 dark:from-red-950/30 dark:via-slate-800/50 dark:to-red-900/20';
  }
  if (normalized.includes('major') || normalized.includes('high') || normalized.includes('severe')) {
    return 'border-amber-200 dark:border-amber-700/60 border-l-4 border-l-amber-600 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-slate-800/50 dark:to-amber-900/20';
  }
  if (normalized.includes('positive')) {
    return 'border-emerald-200 dark:border-emerald-700/60 border-l-4 border-l-emerald-600 bg-gradient-to-br from-emerald-50/80 via-white to-emerald-50/40 dark:from-emerald-950/30 dark:via-slate-800/50 dark:to-emerald-900/20';
  }
  return 'border-slate-200 dark:border-slate-700/60 border-l-4 border-l-slate-500 bg-gradient-to-br from-slate-50/80 via-white to-slate-50/40 dark:from-slate-900/60 dark:via-slate-800/50 dark:to-slate-900/30';
}

function computeSuggestedBehaviorScore(event: BehavioralEventRecord) {
  const severity = event.severity.toLowerCase();
  let score = 50;

  if (severity.includes('critical')) score = 90;
  else if (severity.includes('high') || severity.includes('major') || severity.includes('severe')) score = 78;
  else if (severity.includes('medium') || severity.includes('moderate')) score = 62;
  else if (severity.includes('minor') || severity.includes('low')) score = 45;
  else if (severity.includes('positive')) score = 25;

  const eventType = event.event_type.toLowerCase();
  if (eventType.includes('chronic absent')) score += 8;
  if (eventType.includes('bully')) score += 10;
  if (eventType.includes('leadership') || eventType.includes('high consistency')) score -= 8;

  const description = event.description.toLowerCase();
  if (description.includes('very low attendance')) score += 5;
  if (description.includes('excellent attendance')) score -= 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}

function parseBehavioralScoreFromNotes(notes?: string | null) {
  if (!notes) return null;
  const match = notes.match(/\[Behavioral Score:\s*(\d{1,3})\s*,\s*(confirmed|overridden)\]/i);
  if (!match) return null;

  const parsed = Number(match[1]);
  if (Number.isNaN(parsed)) return null;

  return {
    value: Math.max(0, Math.min(100, parsed)),
    mode: (match[2] || 'confirmed').toLowerCase() as 'confirmed' | 'overridden',
  };
}

function stripBehavioralScoreFromNotes(notes: string) {
  return notes.replace(/\[Behavioral Score:\s*\d{1,3}\s*,\s*(confirmed|overridden)\]\s*/gi, '').trim();
}

export default function GuidanceReviewPage() {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [guidanceSubmitting, setGuidanceSubmitting] = useState(false);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [selectedStudentLrn, setSelectedStudentLrn] = useState<string>('');
  const [pendingStudentLrn, setPendingStudentLrn] = useState<string>('');
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [reportDate, setReportDate] = useState('');

  // Deselect student function
  const handleStudentSelect = (studentLrn: string) => {
    if (selectedStudentLrn === studentLrn) {
      setSelectedStudentLrn('');
      setPendingStudentLrn('');
      setEvents([]);
      setAttendanceLogs([]);
      setLastLoadedStudentLrn('');
    } else {
      setLoadingDetails(true);
      setEvents([]);
      setAttendanceLogs([]);
      setLastLoadedStudentLrn('');
      setPendingStudentLrn(studentLrn);
      setSelectedStudentLrn(studentLrn);
    }
    setStudentPickerOpen(false);
  };
  // Student level filter state
  const [studentLevelFilter, setStudentLevelFilter] = useState<string>("");
  // Student search filter
  const filteredStudentOptions = useMemo(() => {
    let filtered = students;
    if (studentLevelFilter) {
      filtered = filtered.filter(s => s.level === studentLevelFilter);
    }
    const query = studentSearchQuery.trim().toLowerCase();
    if (!query) return filtered;
    return filtered.filter(student =>
      student.name.toLowerCase().includes(query) ||
      student.lrn.toLowerCase().includes(query)
    );
  }, [students, studentSearchQuery, studentLevelFilter]);

  const [lastLoadedStudentLrn, setLastLoadedStudentLrn] = useState<string>('');
  const [events, setEvents] = useState<BehavioralEventRecord[]>([]);

  // Filter events by severity (ensure always array)
  const filteredEvents = useMemo(() => {
    const safeEvents = Array.isArray(events) ? events : [];
    if (severityFilter === 'all') return safeEvents;
    return safeEvents.filter(event => event.severity === severityFilter);
  }, [events, severityFilter]);

  const [pendingQueue, setPendingQueue] = useState<BehavioralEventRecord[]>([]);
  const [attendanceLogs, setAttendanceLogs] = useState<AttendanceLogRecord[]>([]);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewEvent, setReviewEvent] = useState<BehavioralEventRecord | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [behaviorScoreInput, setBehaviorScoreInput] = useState('');
  const [suggestedBehaviorScore, setSuggestedBehaviorScore] = useState<number | null>(null);
  const [approvedReportsOpen, setApprovedReportsOpen] = useState(false);
  const [loadingApprovedReports, setLoadingApprovedReports] = useState(false);
  const [approvedLogs, setApprovedLogs] = useState<BehavioralEventRecord[]>([]);
  const [approvedDateFrom, setApprovedDateFrom] = useState('');
  const [approvedDateTo, setApprovedDateTo] = useState('');
  const [approvedStudentPickerOpen, setApprovedStudentPickerOpen] = useState(false);
  const [approvedStudentQuery, setApprovedStudentQuery] = useState('');
  const [approvedStudentSelection, setApprovedStudentSelection] = useState<string[]>([]);

  const filteredApprovedStudentOptions = useMemo(() => {
    const query = approvedStudentQuery.trim().toLowerCase();
    if (!query) return students;
    return students.filter(
      (student) =>
        student.name.toLowerCase().includes(query) ||
        student.lrn.toLowerCase().includes(query)
    );
  }, [students, approvedStudentQuery]);

  const toggleApprovedStudentSelection = (studentLrn: string) => {
    setApprovedStudentSelection((prev) =>
      prev.includes(studentLrn)
        ? prev.filter((lrn) => lrn !== studentLrn)
        : [...prev, studentLrn]
    );
  };

  const [isClientMounted, setIsClientMounted] = useState(false);
  const minimumInitialSkeletonMs = 1400;

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    const rawUser = localStorage.getItem('safegate_user');
    if (!rawUser) {
      router.push('/login');
      return;
    }

    const parsed = JSON.parse(rawUser);
    const role = String(parsed?.role || '').toLowerCase();
    if (role !== 'guidance' && role !== 'admin') {
      router.push('/');
      return;
    }

    setCurrentUser(parsed);
    setAuthChecked(true);
  }, [router]);

  const fetchStudents = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent === true;
    if (!supabase) {
      if (!isSilent) {
        setLoadingStudents(false);
      }
      return;
    }

    try {
      if (!isSilent) {
        setLoadingStudents(true);
      }
      const { data, error } = await supabase
        .from('students')
        .select('lrn, name, level, status')
        .eq('status', 'active')
        .order('name', { ascending: true });

      if (error) throw error;

      const loaded = (data || []) as StudentRecord[];
      setStudents(loaded);

      // Keep details empty by default until the user explicitly selects a student.
      if (loaded.length === 0) {
        setSelectedStudentLrn('');
      }
    } catch (error) {
      console.error('Failed to load students for guidance review:', error);
      if (!isSilent) {
        toast({
          title: 'Failed to load students',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      if (!isSilent) {
        setLoadingStudents(false);
      }
    }
  };

  const fetchStudentDetails = async (studentLrn: string, options?: { silent?: boolean }) => {
    const isSilent = options?.silent === true;
    if (!supabase || !studentLrn) {
      setEvents([]);
      setAttendanceLogs([]);
      return;
    }

    try {
      if (!isSilent) {
        setLoadingDetails(true);
      }
      const [eventsResult, attendanceResult] = await Promise.all([
        supabase
          .from('behavioral_events')
          .select(
            'id, student_lrn, event_type, severity, description, event_date, event_time, location, reported_by, guidance_status, guidance_reviewed_by, guidance_reviewed_at, guidance_intervention_notes, created_at'
          )
          .eq('student_lrn', studentLrn)
          .order('created_at', { ascending: false })
          .limit(200),
        supabase
          .from('attendance_logs')
          .select('id, student_lrn, date, check_in_time, check_out_time, created_at')
          .eq('student_lrn', studentLrn)
          .order('date', { ascending: false })
          .order('check_in_time', { ascending: false })
          .limit(200),
      ]);

      if (eventsResult.error) throw eventsResult.error;
      if (attendanceResult.error) throw attendanceResult.error;

      setEvents((eventsResult.data || []) as BehavioralEventRecord[]);
      setAttendanceLogs((attendanceResult.data || []) as AttendanceLogRecord[]);
      setLastLoadedStudentLrn(studentLrn);
    } catch (error) {
      console.error('Failed to load student guidance details:', error);
      if (!isSilent) {
        toast({
          title: 'Failed to load student records',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      if (!isSilent) {
        setLoadingDetails(false);
        setPendingStudentLrn('');
      }
    }
  };

  const fetchPendingQueue = async (options?: { silent?: boolean }) => {
    const isSilent = options?.silent === true;
    if (!supabase) {
      setPendingQueue([]);
      return;
    }

    try {
      if (!isSilent) {
        setLoadingPending(true);
      }
      const { data, error } = await supabase
        .from('behavioral_events')
        .select(
          'id, student_lrn, event_type, severity, description, event_date, event_time, location, reported_by, guidance_status, guidance_reviewed_by, guidance_reviewed_at, guidance_intervention_notes, created_at, students(name, level)'
        )
        .eq('guidance_status', 'pending_guidance')
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;

      const normalized = ((data || []) as BehavioralEventRecord[]).map(event => ({
        ...event,
        students: Array.isArray(event.students) ? event.students[0] : event.students,
      }));

      setPendingQueue(normalized);
    } catch (error) {
      console.error('Failed to load pending queue:', error);
      if (!isSilent) {
        toast({
          title: 'Failed to load pending logs',
          description: error instanceof Error ? error.message : 'Unknown error',
          variant: 'destructive',
        });
      }
    } finally {
      if (!isSilent) {
        setLoadingPending(false);
      }
    }
  };

  const fetchApprovedLogsReport = async () => {
    if (!supabase || !approvedReportsOpen) return;

    try {
      setLoadingApprovedReports(true);

      let query = supabase
        .from('behavioral_events')
        .select(
          'id, student_lrn, event_type, severity, description, event_date, event_time, location, reported_by, guidance_status, guidance_reviewed_by, guidance_reviewed_at, guidance_intervention_notes, parent_notified, follow_up_required, notes, created_at, students(name, level)'
        )
        .eq('guidance_status', 'approved_for_ml')
        .order('event_date', { ascending: false })
        .order('event_time', { ascending: false })
        .limit(500);

      if (approvedDateFrom) query = query.gte('event_date', approvedDateFrom);
      if (approvedDateTo) query = query.lte('event_date', approvedDateTo);
      if (approvedStudentSelection.length > 0) query = query.in('student_lrn', approvedStudentSelection);

      const { data, error } = await query;
      if (error) throw error;

      const normalized = ((data || []) as BehavioralEventRecord[]).map((event) => ({
        ...event,
        students: Array.isArray(event.students) ? event.students[0] : event.students,
      }));

      setApprovedLogs(normalized);
    } catch (error) {
      console.error('Failed to load approved report logs:', error);
      toast({
        title: 'Failed to load approved logs',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setLoadingApprovedReports(false);
    }
  };

  useEffect(() => {
    if (!approvedReportsOpen) return;
    void fetchApprovedLogsReport();
  }, [approvedReportsOpen, approvedDateFrom, approvedDateTo, approvedStudentSelection]);

  const printApprovedLogsReport = () => {
    if (approvedLogs.length === 0) {
      toast({
        title: 'No logs to print',
        description: 'Adjust date or student filters to include approved logs.',
        variant: 'destructive',
      });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=1080,height=780');
    if (!printWindow) {
      toast({
        title: 'Popup blocked',
        description: 'Allow popups to print approved logs report.',
        variant: 'destructive',
      });
      return;
    }

    const selectedStudentNames = approvedStudentSelection
      .map((lrn) => students.find((student) => student.lrn === lrn)?.name || lrn)
      .join(', ');

    const cards = approvedLogs
      .map((event) => {
        const relationStudent = Array.isArray(event.students) ? event.students[0] : event.students;
        const studentName = relationStudent?.name || students.find((student) => student.lrn === event.student_lrn)?.name || event.student_lrn;
        const level = relationStudent?.level || students.find((student) => student.lrn === event.student_lrn)?.level || '-';
        const normalizedSeverity = String(event.severity || '').toLowerCase();
        const severityClass =
          normalizedSeverity === 'critical'
            ? 'critical'
            : normalizedSeverity === 'major' || normalizedSeverity === 'high'
              ? 'major'
              : normalizedSeverity === 'moderate' || normalizedSeverity === 'medium'
                ? 'moderate'
                : normalizedSeverity === 'minor'
                  ? 'minor'
                  : 'positive';

        return `
          <article class="log-card ${severityClass}">
            <div class="log-header">
              <div>
                <h3>${event.event_type}</h3>
                <p class="event-date">${formatDateOnly(event.event_date)} at ${event.event_time || '-'}</p>
              </div>
              <span class="severity-pill ${severityClass}">${event.severity || 'N/A'}</span>
            </div>
            <p class="description">${event.description || '-'}</p>
            <div class="meta-grid">
              <div><span>Student:</span> ${studentName}</div>
              <div><span>LRN:</span> ${event.student_lrn}</div>
              <div><span>Level:</span> ${level}</div>
              <div><span>Reviewed By:</span> ${event.guidance_reviewed_by || 'Guidance'}</div>
            </div>
          </article>
        `;
      })
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Approved Logs Report</title>
          <style>
            @page { margin: 14mm; }
            * { box-sizing: border-box; }
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
            .sheet { background: #ffffff; border: 1px solid #dbe3ee; border-radius: 14px; overflow: hidden; }
            .brand-header {
              background-color: #1e3a5f !important;
              background-image: linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%) !important;
              border-bottom: 1px solid #1d4ed8;
              padding: 18px 20px;
            }
            .brand-kicker { margin: 0; color: #93c5fd; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
            .brand-title { margin: 6px 0 0; color: #ffffff; font-size: 20px; font-weight: 700; }
            .content { padding: 16px 20px 18px; }
            .topline { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; line-height: 1.15; }
            .subtitle { margin: 5px 0 0; color: #475569; font-size: 13px; }
            .meta { margin-top: 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
            .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; font-size: 12px; }
            .meta-item span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
            .summary { margin: 12px 0 14px; border: 1px solid #dbe3ee; border-radius: 10px; padding: 9px 11px; font-weight: 700; font-size: 13px; background: #f8fafc; }
            .logs { display: grid; gap: 10px; }
            .log-card { border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 10px; padding: 10px 12px; background: #ffffff; page-break-inside: avoid; }
            .log-card.critical { border-left-color: #dc2626; background: #fef2f2; }
            .log-card.major { border-left-color: #ea580c; background: #fff7ed; }
            .log-card.moderate { border-left-color: #d97706; background: #fffbeb; }
            .log-card.minor { border-left-color: #ca8a04; background: #fefce8; }
            .log-card.positive { border-left-color: #16a34a; background: #f0fdf4; }
            .log-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; }
            .log-header h3 { margin: 0; font-size: 15px; }
            .event-date { margin: 3px 0 0; color: #64748b; font-size: 12px; }
            .severity-pill { border-radius: 999px; padding: 4px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; font-weight: 700; color: #fff; display: inline-flex; align-items: center; justify-content: center; align-self: flex-start; min-width: 84px; margin-top: 1px; }
            .severity-pill.critical { background: #dc2626; }
            .severity-pill.major { background: #ea580c; }
            .severity-pill.moderate { background: #d97706; }
            .severity-pill.minor { background: #ca8a04; }
            .severity-pill.positive { background: #16a34a; }
            .description { margin: 8px 0; font-size: 12.5px; line-height: 1.45; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px 10px; font-size: 12px; color: #334155; }
            .meta-grid span { font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="brand-header" style="background:#1e3a5f;background-image:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);">
              <p class="brand-kicker">Safe Gate Student Monitoring System</p>
              <p class="brand-title">Approved Logs Report</p>
            </div>
            <div class="content">
              <div class="topline">
                <span>${new Date().toLocaleString()}</span>
                <span>Guidance Review</span>
              </div>
              <h1>Guidance Approved Logs Report</h1>
              <p class="subtitle">Complete approved guidance incident logs for selected filters.</p>

            <div class="meta">
              <div class="meta-item"><span>Date Generated</span>${new Date().toLocaleString()}</div>
              <div class="meta-item"><span>Date Range</span>${approvedDateFrom ? formatDateOnly(approvedDateFrom) : 'Any'} - ${approvedDateTo ? formatDateOnly(approvedDateTo) : 'Any'}</div>
              <div class="meta-item"><span>Students</span>${selectedStudentNames || 'All Students'}</div>
            </div>

            <div class="summary">Total Approved Logs: ${approvedLogs.length}</div>

              <section class="logs">
                ${cards}
              </section>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const triggerParentAutomation = async (params: {
    eventId: number;
    studentLrn: string;
    triggerSource: 'behavior_event_logged' | 'manual_recheck' | 'guidance_approved';
  }) => {
    const response = await fetch('/api/automation/parent-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.detail || payload.error || 'Failed to trigger parent automation');
    }

    return payload;
  };

  const openReviewDialog = async (event: BehavioralEventRecord) => {
    const suggestedScore = computeSuggestedBehaviorScore(event);
    const savedScore = parseBehavioralScoreFromNotes(event.guidance_intervention_notes);

    setReviewEvent(event);
    setReviewNote(event.guidance_intervention_notes || '');
    setSuggestedBehaviorScore(suggestedScore);
    setBehaviorScoreInput(String(savedScore?.value ?? suggestedScore));
    setReviewDialogOpen(true);

    if (selectedStudentLrn !== event.student_lrn) {
      setSelectedStudentLrn(event.student_lrn);
      await fetchStudentDetails(event.student_lrn);
    }
  };

  const handleGuidanceDecision = async (decision: 'approved_for_ml' | 'denied_by_guidance') => {
    if (!supabase || !reviewEvent || guidanceSubmitting) {
      return;
    }

    const reviewerName =
      currentUser?.display_name ||
      currentUser?.full_name ||
      currentUser?.name ||
      currentUser?.username ||
      'Guidance';

    setGuidanceSubmitting(true);
    try {
      const parsedScore = Number(behaviorScoreInput);
      const suggestedScore = suggestedBehaviorScore ?? computeSuggestedBehaviorScore(reviewEvent);
      const finalBehaviorScore = Number.isFinite(parsedScore)
        ? Math.max(0, Math.min(100, Math.round(parsedScore)))
        : suggestedScore;
      const scoringMode: 'confirmed' | 'overridden' = finalBehaviorScore === suggestedScore ? 'confirmed' : 'overridden';

      const cleanedNotes = stripBehavioralScoreFromNotes(reviewNote.trim());
      const scoreLine = `[Behavioral Score: ${finalBehaviorScore}, ${scoringMode}]`;
      const finalGuidanceNotes = [cleanedNotes, scoreLine].filter(Boolean).join('\n').trim();

      const { error: updateError } = await supabase
        .from('behavioral_events')
        .update({
          guidance_status: decision,
          guidance_reviewed_by: reviewerName,
          guidance_reviewed_at: new Date().toISOString(),
          guidance_intervention_notes: finalGuidanceNotes || null,
        })
        .eq('id', reviewEvent.id);

      if (updateError) throw updateError;

      if (decision === 'approved_for_ml') {
        const automationResult = await triggerParentAutomation({
          eventId: reviewEvent.id,
          studentLrn: reviewEvent.student_lrn,
          triggerSource: 'guidance_approved',
        });

        if (automationResult?.queued) {
          const { error: notifyUpdateError } = await supabase
            .from('behavioral_events')
            .update({ parent_notified: true })
            .eq('id', reviewEvent.id);

          if (notifyUpdateError) {
            console.error('Unable to set parent_notified flag from guidance review page:', notifyUpdateError);
          }
        }

        toast({
          title: 'Guidance Approved',
          description: automationResult?.queued
            ? 'Event approved. Parent notification was sent based on ML decision.'
            : 'Event approved. ML decision did not require parent notification.',
        });

        await createRoleNotification({
          title: 'Log Reviewed By Guidance',
          message: `${reviewStudentIdentity?.name || reviewEvent.student_lrn} (${reviewEvent.event_type}) was approved by guidance.`,
          targetRoles: ['teacher', 'admin'],
          createdBy: reviewerName,
          relatedEventId: reviewEvent.id,
          meta: {
            href: '/behavioral-events',
            student_lrn: reviewEvent.student_lrn,
            guidance_status: 'approved_for_ml',
            report_owner_name: reviewEvent.reported_by || null,
            report_owner_username: reviewEvent.reported_by || null,
            prevention_note: buildEarlyPreventionNote({
              eventType: reviewEvent.event_type,
              severity: reviewEvent.severity,
              guidanceStatus: 'approved_for_ml',
            }),
          },
        });
      } else {
        toast({
          title: 'Guidance Denied',
          description: 'Event was denied and parent notification remained blocked.',
        });

        await createRoleNotification({
          title: 'Log Reviewed By Guidance',
          message: `${reviewStudentIdentity?.name || reviewEvent.student_lrn} (${reviewEvent.event_type}) was denied by guidance.`,
          targetRoles: ['teacher', 'admin'],
          createdBy: reviewerName,
          relatedEventId: reviewEvent.id,
          meta: {
            href: '/behavioral-events',
            student_lrn: reviewEvent.student_lrn,
            guidance_status: 'denied_by_guidance',
            report_owner_name: reviewEvent.reported_by || null,
            report_owner_username: reviewEvent.reported_by || null,
            prevention_note: buildEarlyPreventionNote({
              eventType: reviewEvent.event_type,
              severity: reviewEvent.severity,
              guidanceStatus: 'denied_by_guidance',
            }),
          },
        });
      }

      setReviewDialogOpen(false);
      setReviewEvent(null);
      setReviewNote('');
      setBehaviorScoreInput('');
      setSuggestedBehaviorScore(null);
      await Promise.all([
        fetchPendingQueue(),
        fetchStudentDetails(reviewEvent.student_lrn),
      ]);
    } catch (error) {
      console.error('Guidance decision failed:', error);
      toast({
        title: 'Guidance Action Failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setGuidanceSubmitting(false);
    }
  };

  useEffect(() => {
    if (!authChecked) return;
    const loadInitialData = async () => {
      const startTime = Date.now();
      try {
        await Promise.all([fetchStudents(), fetchPendingQueue()]);
      } finally {
        const elapsedMs = Date.now() - startTime;
        const remainingMs = Math.max(minimumInitialSkeletonMs - elapsedMs, 0);
        if (remainingMs > 0) {
          await new Promise(resolve => setTimeout(resolve, remainingMs));
        }
        setIsInitialLoad(false);
      }
    };

    void loadInitialData();
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked || !selectedStudentLrn) return;
    void fetchStudentDetails(selectedStudentLrn);
  }, [authChecked, selectedStudentLrn]);

  useEffect(() => {
    if (!authChecked) return;

    const intervalMs = 15000;
    const interval = setInterval(() => {
      void fetchPendingQueue({ silent: true });
      void fetchStudents({ silent: true });
      if (selectedStudentLrn) {
        void fetchStudentDetails(selectedStudentLrn, { silent: true });
      }
    }, intervalMs);

    return () => clearInterval(interval);
  }, [authChecked, selectedStudentLrn]);

  const selectedStudent = useMemo(
    () => students.find(student => student.lrn === selectedStudentLrn) || null,
    [students, selectedStudentLrn]
  );

  const pendingStudent = useMemo(
    () => students.find(student => student.lrn === pendingStudentLrn) || null,
    [students, pendingStudentLrn]
  );

  const displayStudent = pendingStudent || selectedStudent;

  const reviewStudentIdentity = useMemo(() => {
    if (!reviewEvent) return null;
    const relationStudent = Array.isArray(reviewEvent.students) ? reviewEvent.students[0] : reviewEvent.students;
    const lookupStudent = students.find(student => student.lrn === reviewEvent.student_lrn) || null;
    return {
      name: relationStudent?.name || lookupStudent?.name || reviewEvent.student_lrn,
      level: relationStudent?.level || lookupStudent?.level || null,
      lrn: reviewEvent.student_lrn,
    };
  }, [reviewEvent, students]);

  const summary = useMemo(() => {
    const pending = events.filter(event => event.guidance_status === 'pending_guidance').length;
    const approved = events.filter(event => event.guidance_status === 'approved_for_ml').length;
    const denied = events.filter(event => event.guidance_status === 'denied_by_guidance').length;

    return {
      totalEvents: events.length,
      pending,
      approved,
      denied,
      attendanceCount: attendanceLogs.length,
    };
  }, [events, attendanceLogs]);

  const queueSummary = useMemo(() => {
    const highSeverityCount = pendingQueue.filter(event => {
      const severity = event.severity.toLowerCase();
      return severity.includes('high') || severity.includes('major') || severity.includes('severe');
    }).length;

    return {
      totalPending: pendingQueue.length,
      highSeverityCount,
      studentCount: students.length,
    };
  }, [pendingQueue, students]);

  const timeline = useMemo<TimelineItem[]>(() => {
    const eventItems: TimelineItem[] = events.map(event => ({
      id: `event-${event.id}`,
      kind: 'event',
      when: event.created_at || `${event.event_date}T${event.event_time}`,
      title: event.event_type,
      subtitle: `${event.severity.toUpperCase()} - ${event.description}`,
      badge: event.guidance_status,
    }));

    const attendanceItems: TimelineItem[] = attendanceLogs.map(log => ({
      id: `attendance-${log.id}`,
      kind: 'attendance',
      when: log.created_at || log.check_in_time || `${log.date}T00:00:00`,
      title: `Attendance: ${formatDateOnly(log.date)}`,
      subtitle: `Check-in ${formatDate(log.check_in_time)}${log.check_out_time ? ` | Check-out ${formatDate(log.check_out_time)}` : ''}`,
      badge: 'attendance',
    }));

    return [...eventItems, ...attendanceItems].sort((a, b) => {
      const aTime = new Date(a.when).getTime();
      const bTime = new Date(b.when).getTime();
      return bTime - aTime;
    });
  }, [events, attendanceLogs]);

  const latestRecordDate = useMemo(() => {
    const eventDates = events.map((event) => event.event_date).filter(Boolean);
    const attendanceDates = attendanceLogs.map((log) => log.date).filter(Boolean);
    const allDates = [...eventDates, ...attendanceDates];
    if (allDates.length === 0) return '';
    return allDates.sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0];
  }, [events, attendanceLogs]);

  useEffect(() => {
    if (!selectedStudentLrn) {
      setReportDate('');
      return;
    }

    if (!reportDate && latestRecordDate) {
      setReportDate(latestRecordDate);
    }
  }, [selectedStudentLrn, latestRecordDate, reportDate]);

  const dateReport = useMemo(() => {
    if (!reportDate) {
      return {
        events: [] as BehavioralEventRecord[],
        attendance: [] as AttendanceLogRecord[],
        pending: 0,
        approved: 0,
        denied: 0,
      };
    }

    const sameDayEvents = events.filter((event) => event.event_date === reportDate);
    const sameDayAttendance = attendanceLogs.filter((log) => log.date === reportDate);

    return {
      events: sameDayEvents,
      attendance: sameDayAttendance,
      pending: sameDayEvents.filter((event) => event.guidance_status === 'pending_guidance').length,
      approved: sameDayEvents.filter((event) => event.guidance_status === 'approved_for_ml').length,
      denied: sameDayEvents.filter((event) => event.guidance_status === 'denied_by_guidance').length,
    };
  }, [events, attendanceLogs, reportDate]);

  const printCompactDailyReport = () => {
    if (!displayStudent || !reportDate) {
      toast({
        title: 'Select date first',
        description: 'Choose a report date before printing.',
        variant: 'destructive',
      });
      return;
    }

    const printWindow = window.open('', '_blank', 'width=980,height=760');
    if (!printWindow) {
      toast({
        title: 'Popup blocked',
        description: 'Allow popups to print the compact report.',
        variant: 'destructive',
      });
      return;
    }

    const eventCards = dateReport.events
      .map(
        (event) => `
          <article class="record-card">
            <div class="row-top">
              <strong>${event.event_type || '-'}</strong>
              <span class="mini-pill">${event.severity || '-'}</span>
            </div>
            <div class="row-meta">Time: ${event.event_time || '-'} | Status: ${event.guidance_status.replaceAll('_', ' ')}</div>
          </article>
        `
      )
      .join('');

    const attendanceCards = dateReport.attendance
      .map(
        (log) => `
          <article class="record-card">
            <div class="row-top">
              <strong>${formatDateOnly(log.date)}</strong>
              <span class="mini-pill neutral">Attendance</span>
            </div>
            <div class="row-meta">Check-in: ${log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : '-'} | Check-out: ${log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '-'}</div>
          </article>
        `
      )
      .join('');

    printWindow.document.write(`
      <html>
        <head>
          <title>Guidance Compact Report</title>
          <style>
            @page { margin: 14mm; }
            * { box-sizing: border-box; }
            html, body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
              color-adjust: exact !important;
            }
            body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; margin: 0; color: #0f172a; background: #f8fafc; }
            .sheet { background: #ffffff; border: 1px solid #dbe3ee; border-radius: 14px; overflow: hidden; }
            .brand-header {
              background-color: #1e3a5f !important;
              background-image: linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%) !important;
              border-bottom: 1px solid #1d4ed8;
              padding: 18px 20px;
            }
            .brand-kicker { margin: 0; color: #93c5fd; font-size: 11px; letter-spacing: .08em; text-transform: uppercase; font-weight: 700; }
            .brand-title { margin: 6px 0 0; color: #ffffff; font-size: 20px; font-weight: 700; }
            .content { padding: 16px 20px 18px; }
            .topline { display: flex; justify-content: space-between; font-size: 11px; color: #64748b; margin-bottom: 10px; }
            h1 { margin: 0; font-size: 24px; line-height: 1.15; }
            .subtitle { margin: 5px 0 0; color: #475569; font-size: 13px; }
            .meta { margin-top: 12px; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
            .meta-item { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; font-size: 12px; }
            .meta-item span { display: block; color: #64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .06em; margin-bottom: 3px; }
            .grid { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 8px; margin: 12px 0 14px; }
            .card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 8px 10px; background: #f8fafc; }
            .label { font-size: 10px; color: #64748b; text-transform: uppercase; letter-spacing: .04em; }
            .value { font-size: 20px; font-weight: 700; margin-top: 3px; }
            h2 { margin: 14px 0 8px; font-size: 14px; text-transform: uppercase; letter-spacing: .05em; color: #334155; }
            .records { display: grid; gap: 8px; }
            .record-card { border: 1px solid #e2e8f0; border-radius: 10px; padding: 9px 11px; background: #ffffff; page-break-inside: avoid; }
            .row-top { display: flex; justify-content: space-between; gap: 8px; align-items: center; }
            .row-top strong { font-size: 13px; }
            .mini-pill { border-radius: 999px; background: #1d4ed8; color: #fff; font-size: 10px; font-weight: 700; padding: 3px 8px; text-transform: uppercase; letter-spacing: .04em; }
            .mini-pill.neutral { background: #475569; }
            .row-meta { margin-top: 4px; font-size: 12px; color: #475569; }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="brand-header" style="background:#1e3a5f;background-image:linear-gradient(135deg,#1e3a5f 0%,#1d4ed8 100%);">
              <p class="brand-kicker">Safe Gate Student Monitoring System</p>
              <p class="brand-title">Student Daily Report</p>
            </div>
            <div class="content">
              <div class="topline">
                <span>${new Date().toLocaleString()}</span>
                <span>Guidance Review</span>
              </div>
              <h1>Guidance Daily Compact Report</h1>
              <p class="subtitle">Student daily summary from attendance and behavioral guidance logs.</p>
              <div class="meta">
                <div class="meta-item"><span>Student</span>${displayStudent.name} (${displayStudent.level})</div>
                <div class="meta-item"><span>LRN</span>${displayStudent.lrn}</div>
                <div class="meta-item"><span>Date</span>${formatDateOnly(reportDate)}</div>
              </div>

            <div class="grid">
              <div class="card"><div class="label">Attendance Logs</div><div class="value">${dateReport.attendance.length}</div></div>
              <div class="card"><div class="label">Total Events</div><div class="value">${dateReport.events.length}</div></div>
              <div class="card"><div class="label">Pending</div><div class="value">${dateReport.pending}</div></div>
              <div class="card"><div class="label">Approved</div><div class="value">${dateReport.approved}</div></div>
              <div class="card"><div class="label">Denied</div><div class="value">${dateReport.denied}</div></div>
            </div>

              <h2>Behavioral Events</h2>
              <section class="records">
                ${eventCards || '<article class="record-card"><div class="row-meta">No events on selected date.</div></article>'}
              </section>

              <h2>Attendance Logs</h2>
              <section class="records">
                ${attendanceCards || '<article class="record-card"><div class="row-meta">No attendance logs on selected date.</div></article>'}
              </section>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const isTopSummaryLoading = loadingStudents || loadingPending;
  const isSelectingStudent = Boolean(selectedStudentLrn) && loadingDetails && lastLoadedStudentLrn !== selectedStudentLrn;
  const isStudentCardsLoading = isSelectingStudent;
  const isSelectedSummaryLoading = isSelectingStudent;

  if (authChecked && isInitialLoad && (loadingStudents || loadingPending)) {
    return (
      <DashboardLayout>
        <GuidanceReviewPageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-5 max-w-7xl mx-auto"
      >
        <Card className="border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm">
          <CardContent className="p-5 sm:p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">Guidance Review Center</h1>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-2xl">
                  Review pending behavior logs, check student context, and complete a clear approve or deny decision.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <Badge className="bg-blue-100 text-blue-700 border-0">Guidance Workflow</Badge>
                <Badge variant="outline" className="text-xs">Queue: {queueSummary.totalPending}</Badge>
                <Badge variant="outline" className="text-xs">Auto-updates every 15s</Badge>
              </div>
            </div>

            {/* Animated Metric Cards */}
            <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-2">
              {/* Pending queue */}
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                <Card className="border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300 min-h-30">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-amber-500/10 dark:bg-amber-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-amber-500/5 dark:bg-amber-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                  <CardContent className="p-2 flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-[9px] text-amber-700 dark:text-amber-400 font-semibold mb-0.5 tracking-wider leading-tight">Pending queue</p>
                      <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                        {isTopSummaryLoading ? <Skeleton className="h-6 w-10" /> : queueSummary.totalPending}
                      </div>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Awaiting review</p>
                    </div>
                  </CardContent>
                  <div className="h-0.5 w-full bg-linear-to-r from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700" />
                </Card>
              </motion.div>

              {/* High severity pending */}
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                <Card className="border-0 bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300 min-h-30">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 dark:bg-rose-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-rose-500/5 dark:bg-rose-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                  <CardContent className="p-2 flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-[9px] text-rose-700 dark:text-rose-400 font-semibold mb-0.5 tracking-wider leading-tight">High severity pending</p>
                      <div className="text-lg font-bold text-rose-700 dark:text-rose-400">
                        {isTopSummaryLoading ? <Skeleton className="h-6 w-10" /> : queueSummary.highSeverityCount}
                      </div>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Major/critical logs</p>
                    </div>
                  </CardContent>
                  <div className="h-0.5 w-full bg-linear-to-r from-rose-400 to-rose-600 dark:from-rose-500 dark:to-rose-700" />
                </Card>
              </motion.div>

              {/* Students loaded */}
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
                <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300 min-h-30">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                  <CardContent className="p-2 flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-[9px] text-blue-700 dark:text-blue-400 font-semibold mb-0.5 tracking-wider leading-tight">Students loaded</p>
                      <div className="text-lg font-bold text-blue-700 dark:text-blue-400">
                        {isTopSummaryLoading ? <Skeleton className="h-6 w-10" /> : queueSummary.studentCount}
                      </div>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">Active in system</p>
                    </div>
                  </CardContent>
                  <div className="h-0.5 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
                </Card>
              </motion.div>

              {/* Selected student events */}
              <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}>
                <Card className="border-0 bg-linear-to-br from-slate-50 to-white dark:from-slate-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300 min-h-30">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-slate-500/10 dark:bg-slate-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                  <div className="absolute bottom-0 left-0 w-10 h-10 bg-slate-500/5 dark:bg-slate-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                  <CardContent className="p-2 flex items-center justify-between relative z-10">
                    <div>
                      <p className="text-[9px] text-slate-700 dark:text-slate-300 font-semibold mb-0.5 tracking-wider leading-tight">Selected student events</p>
                      <div className="text-lg font-bold text-slate-900 dark:text-white">
                        {isTopSummaryLoading || isSelectedSummaryLoading ? <Skeleton className="h-6 w-10" /> : summary.totalEvents}
                      </div>
                      <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">For current student</p>
                    </div>
                  </CardContent>
                  <div className="h-0.5 w-full bg-linear-to-r from-slate-400 to-slate-600 dark:from-slate-500 dark:to-slate-700" />
                </Card>
              </motion.div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="w-5 h-5 text-blue-600" />
                Students
              </CardTitle>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => setApprovedReportsOpen(true)}
              >
                <ClipboardCheck className="w-4 h-4" />
                Report
              </Button>
            </div>
            <CardDescription>Select a student to open records. You can type in the dropdown to jump to a name or filter by level.</CardDescription>
            <div className="pt-1 max-w-xl flex gap-2">
              {isClientMounted ? (
                <>
                  <div className="flex flex-row gap-2 w-full">
                    {/* All Levels filter */}
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">
                        Student Level
                      </label>
                      <Select value={studentLevelFilter || "all"} onValueChange={val => setStudentLevelFilter(val === "all" ? "" : val)}>
                        <SelectTrigger className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 w-full">
                          <SelectValue placeholder="All Levels" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-border/40">
                          <SelectItem value="all">All Levels</SelectItem>
                          {Array.from(new Set(students.map(s => s.level))).sort().map((level) => (
                            <SelectItem key={level} value={level}>
                              {level}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {/* Severity filter */}
                    <div className="flex flex-col gap-2 w-full max-w-xs">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">
                        Severity
                      </label>
                      <Select value={severityFilter || "all"} onValueChange={val => setSeverityFilter(val === "all" ? "" : val)}>
                        <SelectTrigger className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 w-full">
                          <SelectValue placeholder="All Severities" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-border/40 min-w-55">
                          <SelectItem value="all">
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-slate-400" />
                              All Severities
                            </span>
                          </SelectItem>
                          <SelectItem value="positive">
                            <span className="flex items-center gap-2">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                              Positive
                            </span>
                          </SelectItem>
                          <SelectItem value="neutral">
                            <span className="flex items-center gap-2">
                              <Minus className="w-4 h-4 text-gray-500" />
                              Neutral
                            </span>
                          </SelectItem>
                          <SelectItem value="minor">
                            <span className="flex items-center gap-2">
                              <Info className="w-4 h-4 text-yellow-500" />
                              Minor
                            </span>
                          </SelectItem>
                          <SelectItem value="major">
                            <span className="flex items-center gap-2">
                              <AlertTriangle className="w-4 h-4 text-orange-500" />
                              Major
                            </span>
                          </SelectItem>
                          <SelectItem value="critical">
                            <span className="flex items-center gap-2">
                              <XCircle className="w-4 h-4 text-red-600" />
                              Critical
                            </span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  {/* Student Search & Picker */}
                  <div className="flex flex-col gap-2 w-full">
                    <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">
                      Search Student
                    </label>
                    <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          role="combobox"
                          aria-expanded={studentPickerOpen}
                          className="w-full justify-between h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200"
                        >
                          {selectedStudentLrn
                            ? students.find((s) => s.lrn === selectedStudentLrn)?.name || 'Select student'
                            : 'Select student'}
                          <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-87.5 p-0 dark:bg-slate-800 dark:border-border/40">
                        <Command>
                          <CommandInput
                            placeholder="Search by name or LRN..."
                            value={studentSearchQuery}
                            onValueChange={setStudentSearchQuery}
                            className="h-9"
                            autoFocus
                          />
                          <CommandList>
                            <CommandEmpty>No students found.</CommandEmpty>
                            <CommandGroup>
                              {filteredStudentOptions.map((student) => (
                                <CommandItem
                                  key={student.lrn}
                                  value={student.name}
                                  onSelect={() => {
                                    handleStudentSelect(student.lrn);
                                    setStudentPickerOpen(false);
                                  }}
                                  className={
                                    student.lrn === selectedStudentLrn
                                      ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-200'
                                      : ''
                                  }
                                >
                                  <div className="flex flex-col">
                                    <span className="font-medium">{student.name}</span>
                                    <span className="text-xs text-slate-500">{student.lrn} • {student.level}</span>
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                  </div>
                </>
              ) : (
                <div className="flex flex-row gap-2 w-full">
                  <div className="w-full max-w-xs space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="w-full max-w-xs space-y-2">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                  <div className="w-full space-y-2">
                    <Skeleton className="h-3 w-28" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            {loadingStudents && (
              <div className="space-y-3 py-2">
                <Skeleton className="h-10 w-full max-w-xl" />
                <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3 space-y-2 bg-white/70 dark:bg-slate-900/30">
                  <Skeleton className="h-5 w-64" />
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-4 w-48" />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 items-start">
          <div className="xl:col-span-5 space-y-4">
            <Card className="border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <AlertTriangle className="w-5 h-5 text-amber-600" />
                  Work Queue
                  <Badge variant="outline" className="ml-1">{pendingQueue.length}</Badge>
                </CardTitle>
                <CardDescription>Open a log to review and finalize a guidance decision.</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingPending ? (
                  <div className="space-y-2 max-h-112 overflow-auto pr-1">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="rounded-xl border border-border/70 p-3 bg-white/80 dark:bg-slate-900/40 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          <Skeleton className="h-5 w-36" />
                          <Skeleton className="h-5 w-16" />
                        </div>
                        <Skeleton className="h-4 w-28" />
                        <Skeleton className="h-4 w-full" />
                        <div className="flex items-center justify-between gap-2 mt-3">
                          <Skeleton className="h-3 w-28" />
                          <Skeleton className="h-8 w-20" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : pendingQueue.length === 0 ? (
                  <div className="py-8 text-center text-slate-500">No pending logs right now.</div>
                ) : (
                  <div className="space-y-2 max-h-112 overflow-auto pr-1">
                    {pendingQueue.map(event => {
                      const studentInfo = Array.isArray(event.students) ? event.students[0] : event.students;
                      return (
                        <div
                          key={`pending-${event.id}`}
                          className="rounded-xl border border-border/70 p-3 bg-white/80 dark:bg-slate-900/40 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-semibold text-slate-900 dark:text-white truncate">{studentInfo?.name || event.student_lrn}</p>
                              <p className="text-xs text-slate-500">{event.student_lrn}</p>
                            </div>
                            <Badge variant="outline" className={`capitalize ${getSeverityBadgeClass(event.severity)}`}>
                              {event.severity}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium mt-2">{event.event_type}</p>
                          <p className="text-xs text-slate-500 line-clamp-2 mt-1">{event.description}</p>
                          <div className="flex items-center justify-between mt-3 gap-2">
                            <p className="text-xs text-slate-500 truncate">{formatDate(event.created_at)}</p>
                            <Button size="sm" variant="outline" className="gap-2 shrink-0" onClick={() => void openReviewDialog(event)}>
                              <Eye className="w-4 h-4" />
                              Review
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

          </div>

          <div className="xl:col-span-7 space-y-4">
            {!selectedStudentLrn ? (
              <Card className="border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm">
                <CardContent className="py-16 text-center">
                  <UserCircle2 className="w-10 h-10 text-slate-400 mx-auto mb-3" />
                  <p className="text-base font-semibold text-slate-800 dark:text-slate-200">No student selected yet</p>
                  <p className="text-sm text-slate-500 mt-1">Select a student above to view records.</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <Card className="border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <UserCircle2 className="w-5 h-5 text-blue-600" />
                      <>{displayStudent ? `${displayStudent.name} (${displayStudent.level})` : 'Select a student'}</>
                    </CardTitle>
                    <CardDescription>
                      <>{displayStudent?.lrn || 'Choose a student from the list to begin review.'}</>
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {isStudentCardsLoading ? (
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div key={`selected-summary-skeleton-${i}`} className="rounded-xl border border-border/70 bg-white/70 dark:bg-slate-900/30 p-3 space-y-2">
                            <Skeleton className="h-3 w-20" />
                            <Skeleton className="h-7 w-12" />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                        <div className="rounded-xl border border-blue-200/70 bg-blue-50/70 dark:bg-blue-900/20 p-3">
                          <p className="text-xs text-blue-700 dark:text-blue-300">Attendance Logs</p>
                          <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{summary.attendanceCount}</p>
                        </div>
                        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:bg-slate-900/30 p-3">
                          <p className="text-xs text-slate-500">Total Events</p>
                          <p className="text-xl font-bold text-slate-900 dark:text-white">{summary.totalEvents}</p>
                        </div>
                        <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 dark:bg-amber-900/20 p-3">
                          <p className="text-xs text-amber-700 dark:text-amber-300">Pending</p>
                          <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{summary.pending}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 dark:bg-emerald-900/20 p-3">
                          <p className="text-xs text-emerald-700 dark:text-emerald-300">Approved</p>
                          <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{summary.approved}</p>
                        </div>
                        <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 dark:bg-rose-900/20 p-3">
                          <p className="text-xs text-rose-700 dark:text-rose-300">Denied</p>
                          <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{summary.denied}</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="border border-border/70 bg-white/80 dark:bg-slate-900/55 backdrop-blur shadow-sm">
                  <CardContent className="pt-6">
                    <Tabs defaultValue="events" className="space-y-4">
                      <TabsList className="grid grid-cols-4 w-full max-w-3xl">
                        <TabsTrigger value="events" className="gap-2">
                          <AlertTriangle className="w-4 h-4" />
                          Events
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="gap-2">
                          <CalendarDays className="w-4 h-4" />
                          Attendance
                        </TabsTrigger>
                        <TabsTrigger value="timeline" className="gap-2">
                          <Activity className="w-4 h-4" />
                          Timeline
                        </TabsTrigger>
                        <TabsTrigger value="report" className="gap-2">
                          <ClipboardCheck className="w-4 h-4" />
                          Report
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="events">
                        {loadingDetails ? (
                          <div className="space-y-3">
                            <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
                              Loading events for {displayStudent?.name || 'selected student'}...
                            </div>
                            {Array.from({ length: 3 }).map((_, i) => (
                              <div key={i} className="rounded-xl border border-border/70 bg-white/80 dark:bg-slate-900/30 p-4 space-y-3">
                                <Skeleton className="h-6 w-44" />
                                <div className="flex items-center justify-between gap-3">
                                  <Skeleton className="h-5 w-56" />
                                  <Skeleton className="h-8 w-16" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <Skeleton className="h-14 w-full" />
                                  <Skeleton className="h-14 w-full" />
                                  <Skeleton className="h-14 w-full" />
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : filteredEvents.length === 0 ? (
                          <div className="py-8 text-center text-slate-500">No behavioral events found for this student.</div>
                        ) : (
                          <div className="space-y-3 max-h-112 overflow-auto pr-1">
                            {filteredEvents.map(event => (
                              <div
                                key={event.id}
                                className="rounded-xl border border-border/70 bg-white/80 dark:bg-slate-900/30 p-4"
                              >
                                {(() => {
                                  const savedScore = parseBehavioralScoreFromNotes(event.guidance_intervention_notes);
                                  const displayScore = savedScore?.value ?? computeSuggestedBehaviorScore(event);
                                  const label = savedScore ? `Guidance ${savedScore.mode}` : 'AI suggested';

                                  return (
                                    <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs text-blue-700">
                                      <span className="font-semibold">Behavior Score:</span>
                                      <span>{displayScore}/100</span>
                                      <span className="text-blue-600/80">({label})</span>
                                    </div>
                                  );
                                })()}
                                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                  <div className="min-w-0">
                                    <p className="font-semibold text-slate-900 dark:text-white">{event.event_type}</p>
                                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-1 wrap-break-word">{event.description}</p>
                                  </div>
                                  <Button size="sm" variant="outline" className="gap-2 self-start" onClick={() => void openReviewDialog(event)}>
                                    <Eye className="w-4 h-4" />
                                    View
                                  </Button>
                                </div>

                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                                  <div className="rounded-lg border border-border/60 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                                    <p className="text-xs text-slate-500 mb-1">Severity</p>
                                    <Badge variant="outline" className={`capitalize ${getSeverityBadgeClass(event.severity)}`}>
                                      {event.severity}
                                    </Badge>
                                  </div>
                                  <div className="rounded-lg border border-border/60 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                                    <p className="text-xs text-slate-500 mb-1">Guidance Status</p>
                                    {getGuidanceBadge(event.guidance_status)}
                                  </div>
                                  <div className="rounded-lg border border-border/60 p-2.5 bg-slate-50/70 dark:bg-slate-800/40">
                                    <p className="text-xs text-slate-500 mb-1">Reviewer</p>
                                    <p className="font-medium text-slate-800 dark:text-slate-200">{event.guidance_reviewed_by || 'Pending'}</p>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="attendance">
                        {loadingDetails ? (
                          <div className="space-y-2">
                            <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
                              Loading attendance for {displayStudent?.name || 'selected student'}...
                            </div>
                            <div className="border rounded-xl overflow-hidden bg-white/70 dark:bg-slate-900/25">
                            <div className="p-3 border-b border-border/70">
                              <div className="grid grid-cols-4 gap-3">
                                {Array.from({ length: 4 }).map((_, i) => (
                                  <Skeleton key={i} className="h-4 w-full" />
                                ))}
                              </div>
                            </div>
                            <div className="p-3 space-y-3">
                              {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="grid grid-cols-4 gap-3">
                                  {Array.from({ length: 4 }).map((__, j) => (
                                    <Skeleton key={j} className="h-4 w-full" />
                                  ))}
                                </div>
                              ))}
                            </div>
                          </div>
                          </div>
                        ) : attendanceLogs.length === 0 ? (
                          <div className="py-8 text-center text-slate-500">No attendance logs found for this student.</div>
                        ) : (
                          <div className="border rounded-xl overflow-hidden bg-white/70 dark:bg-slate-900/25">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Date</TableHead>
                                  <TableHead>Check-in</TableHead>
                                  <TableHead>Check-out</TableHead>
                                  <TableHead>Recorded At</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {attendanceLogs.map(log => (
                                  <TableRow key={log.id}>
                                    <TableCell>{formatDateOnly(log.date)}</TableCell>
                                    <TableCell>{formatDate(log.check_in_time)}</TableCell>
                                    <TableCell>{log.check_out_time ? formatDate(log.check_out_time) : 'Not checked out'}</TableCell>
                                    <TableCell>{formatDate(log.created_at)}</TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="timeline">
                        {loadingDetails ? (
                          <div className="space-y-2">
                            <div className="rounded-lg border border-blue-200 bg-blue-50/70 px-3 py-2 text-xs text-blue-700">
                              Building timeline for {displayStudent?.name || 'selected student'}...
                            </div>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <div key={i} className="rounded-xl border border-border/70 p-3 bg-white/75 dark:bg-slate-900/30 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <Skeleton className="h-5 w-48" />
                                  <Skeleton className="h-6 w-24" />
                                </div>
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-3 w-36" />
                              </div>
                            ))}
                          </div>
                        ) : timeline.length === 0 ? (
                          <div className="py-8 text-center text-slate-500">No timeline entries available for this student.</div>
                        ) : (
                          <div className="space-y-2 max-h-112 overflow-auto pr-1">
                            {timeline.map(item => (
                              <div key={item.id} className="rounded-xl border border-border/70 p-3 bg-white/75 dark:bg-slate-900/30">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                  <p className="font-medium text-slate-900 dark:text-white">{item.title}</p>
                                  <Badge variant="outline" className="capitalize">{item.badge.replaceAll('_', ' ')}</Badge>
                                </div>
                                <p className="text-sm text-slate-600 dark:text-slate-300 mt-1">{item.subtitle}</p>
                                <p className="text-xs text-slate-500 mt-2">{formatDate(item.when)}</p>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="report">
                        {loadingDetails ? (
                          <div className="space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <div className="space-y-2">
                                <Skeleton className="h-4 w-44" />
                                <Skeleton className="h-3 w-72" />
                              </div>
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-9 w-44" />
                                <Skeleton className="h-9 w-28" />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                              {Array.from({ length: 5 }).map((_, i) => (
                                <div key={`report-summary-skeleton-${i}`} className="rounded-xl border border-border/70 bg-white/70 dark:bg-slate-900/30 p-3 space-y-2">
                                  <Skeleton className="h-3 w-20" />
                                  <Skeleton className="h-7 w-10" />
                                </div>
                              ))}
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {Array.from({ length: 2 }).map((_, i) => (
                                <div key={`report-panel-skeleton-${i}`} className="rounded-xl border border-border/70 bg-white/75 dark:bg-slate-900/30 p-3 space-y-3">
                                  <Skeleton className="h-4 w-40" />
                                  <div className="space-y-2">
                                    {Array.from({ length: 4 }).map((__, j) => (
                                      <div key={`report-item-skeleton-${i}-${j}`} className="rounded-lg border border-border/60 p-2.5 bg-slate-50/60 dark:bg-slate-800/30 space-y-1.5">
                                        <Skeleton className="h-3.5 w-28" />
                                        <Skeleton className="h-3 w-full" />
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">Compact Date Report</p>
                                <p className="text-xs text-slate-500">Select a date to generate a printable compact report for this student.</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <Input
                                  type="date"
                                  value={reportDate}
                                  onChange={(e) => setReportDate(e.target.value)}
                                  className="h-9 w-44"
                                />
                                <Button size="sm" className="gap-2" onClick={printCompactDailyReport} disabled={!reportDate}>
                                  <Printer className="w-4 h-4" />
                                  Print Report
                                </Button>
                              </div>
                            </div>

                            {!reportDate ? (
                              <div className="py-8 text-center text-slate-500">Select a report date to view compact records.</div>
                            ) : (
                              <>
                                <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
                                  <div className="rounded-xl border border-blue-200/70 bg-blue-50/70 dark:bg-blue-900/20 p-3">
                                    <p className="text-xs text-blue-700 dark:text-blue-300">Attendance Logs</p>
                                    <p className="text-xl font-bold text-blue-700 dark:text-blue-300">{dateReport.attendance.length}</p>
                                  </div>
                                  <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 dark:bg-slate-900/30 p-3">
                                    <p className="text-xs text-slate-500">Total Events</p>
                                    <p className="text-xl font-bold text-slate-900 dark:text-white">{dateReport.events.length}</p>
                                  </div>
                                  <div className="rounded-xl border border-amber-200/70 bg-amber-50/70 dark:bg-amber-900/20 p-3">
                                    <p className="text-xs text-amber-700 dark:text-amber-300">Pending</p>
                                    <p className="text-xl font-bold text-amber-700 dark:text-amber-300">{dateReport.pending}</p>
                                  </div>
                                  <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/70 dark:bg-emerald-900/20 p-3">
                                    <p className="text-xs text-emerald-700 dark:text-emerald-300">Approved</p>
                                    <p className="text-xl font-bold text-emerald-700 dark:text-emerald-300">{dateReport.approved}</p>
                                  </div>
                                  <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 dark:bg-rose-900/20 p-3">
                                    <p className="text-xs text-rose-700 dark:text-rose-300">Denied</p>
                                    <p className="text-xl font-bold text-rose-700 dark:text-rose-300">{dateReport.denied}</p>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                  <div className="rounded-xl border border-border/70 bg-white/75 dark:bg-slate-900/30 p-3">
                                    <p className="text-sm font-semibold mb-2">Behavioral Events ({dateReport.events.length})</p>
                                    {dateReport.events.length === 0 ? (
                                      <p className="text-sm text-slate-500">No behavioral events on this date.</p>
                                    ) : (
                                      <div className="space-y-2 max-h-48 overflow-auto pr-1">
                                        {dateReport.events.map((event) => (
                                          <div key={`report-event-${event.id}`} className="rounded-lg border border-border/60 p-2.5 bg-slate-50/60 dark:bg-slate-800/30">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">{event.event_type}</p>
                                            <p className="text-xs text-slate-500 mt-0.5">{event.event_time} • {event.severity} • {event.guidance_status.replaceAll('_', ' ')}</p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>

                                  <div className="rounded-xl border border-border/70 bg-white/75 dark:bg-slate-900/30 p-3">
                                    <p className="text-sm font-semibold mb-2">Attendance Logs ({dateReport.attendance.length})</p>
                                    {dateReport.attendance.length === 0 ? (
                                      <p className="text-sm text-slate-500">No attendance logs on this date.</p>
                                    ) : (
                                      <div className="space-y-2 max-h-48 overflow-auto pr-1">
                                        {dateReport.attendance.map((log) => (
                                          <div key={`report-attendance-${log.id}`} className="rounded-lg border border-border/60 p-2.5 bg-slate-50/60 dark:bg-slate-800/30">
                                            <p className="text-sm font-medium text-slate-900 dark:text-white">Attendance Record</p>
                                            <p className="text-xs text-slate-500 mt-0.5">
                                              Check-in: {formatDate(log.check_in_time)}
                                              {log.check_out_time ? ` | Check-out: ${formatDate(log.check_out_time)}` : ' | Check-out: Not checked out'}
                                            </p>
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>

        <Dialog open={approvedReportsOpen} onOpenChange={setApprovedReportsOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col border border-border/70 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-6">
            <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4 pr-8">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <Info className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <DialogTitle className="text-xl font-bold">Approved Logs Report</DialogTitle>
                  </div>
                  <DialogDescription className="mt-2 text-sm">
                    Complete approved guidance logs with date and multi-student filtering.
                  </DialogDescription>
                </div>
                <Badge className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white shadow-lg shadow-emerald-500/25 text-xs font-semibold px-3 py-1 whitespace-nowrap mr-8">
                  {approvedLogs.length} Approved
                </Badge>
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
              <div className="flex flex-wrap items-end gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3">
                <div className="space-y-1 flex-1 min-w-40">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
                  <Input
                    type="date"
                    value={approvedDateFrom}
                    onChange={(e) => setApprovedDateFrom(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1 flex-1 min-w-40">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">To Date</label>
                  <Input type="date" value={approvedDateTo} onChange={(e) => setApprovedDateTo(e.target.value)} className="h-9 text-xs" />
                </div>
                <div className="space-y-1 flex-1 min-w-40">
                  <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Students</label>
                  <Popover open={approvedStudentPickerOpen} onOpenChange={setApprovedStudentPickerOpen}>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className="w-full justify-between h-9 text-xs">
                        {approvedStudentSelection.length > 0 ? `${approvedStudentSelection.length} selected` : 'All Students'}
                        <ChevronDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-90 p-0 dark:bg-slate-800 dark:border-border/40">
                      <Command>
                        <CommandInput
                          placeholder="Search students..."
                          value={approvedStudentQuery}
                          onValueChange={setApprovedStudentQuery}
                          className="h-9"
                        />
                        <CommandList>
                          <CommandEmpty>No students found.</CommandEmpty>
                          <CommandGroup>
                            <CommandItem
                              onSelect={() => setApprovedStudentSelection([])}
                              className="flex items-center justify-between"
                            >
                              <span>All Students</span>
                              <Checkbox checked={approvedStudentSelection.length === 0} />
                            </CommandItem>
                            {filteredApprovedStudentOptions.map((student) => (
                              <CommandItem
                                key={`approved-filter-${student.lrn}`}
                                onSelect={() => toggleApprovedStudentSelection(student.lrn)}
                                className="flex items-center justify-between"
                              >
                                <div className="flex flex-col">
                                  <span>{student.name}</span>
                                  <span className="text-xs text-slate-500">{student.lrn}</span>
                                </div>
                                <Checkbox checked={approvedStudentSelection.includes(student.lrn)} />
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1 w-full sm:w-auto sm:min-w-28">
                  <label className="text-[10px] uppercase tracking-wider text-transparent select-none">Print</label>
                  <Button className="h-9 w-full gap-2" onClick={printApprovedLogsReport} disabled={approvedLogs.length === 0}>
                    <Printer className="w-4 h-4" />
                    Print
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/40 overflow-hidden">
                {loadingApprovedReports && approvedLogs.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin mx-auto mb-2" />
                    Loading approved logs...
                  </div>
                ) : approvedLogs.length === 0 ? (
                  <div className="py-10 text-center text-slate-500">No approved logs found for current filters.</div>
                ) : (
                  <div className="max-h-[52vh] overflow-y-auto relative p-3 space-y-3">
                    {loadingApprovedReports ? (
                      <div className="absolute top-2 right-2 z-10 rounded-full bg-white/90 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-700 px-2.5 py-1 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Updating...
                      </div>
                    ) : null}
                    {approvedLogs.map((event) => {
                      const relationStudent = Array.isArray(event.students) ? event.students[0] : event.students;
                      const studentName = relationStudent?.name || students.find((student) => student.lrn === event.student_lrn)?.name || event.student_lrn;

                      return (
                        <div
                          key={`approved-report-row-${event.id}`}
                          className={`rounded-lg border p-4 hover:shadow-md transition-shadow ${getIncidentReportCardClass(event.severity)}`}
                        >
                          <div className="space-y-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-sm text-slate-900 dark:text-white">{event.event_type}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  <CalendarDays className="w-3 h-3 inline mr-1" />
                                  {new Date(event.event_date).toLocaleDateString('en-US', {
                                    weekday: 'short',
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric',
                                  })}{' '}
                                  at {event.event_time}
                                </p>
                              </div>
                              <Badge className={`capitalize font-semibold text-xs px-2.5 py-1 uppercase tracking-wider ${getSeverityBadgeClass(event.severity)}`}>
                                {event.severity}
                              </Badge>
                            </div>

                            <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{event.description}</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span><span className="font-semibold">Student:</span> {studentName} ({event.student_lrn})</span>
                              </div>
                              {event.location ? (
                                <div className="flex items-center gap-2">
                                  <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                  <span><span className="font-semibold">Location:</span> {event.location}</span>
                                </div>
                              ) : null}
                              <div className="flex items-center gap-2">
                                <Info className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span><span className="font-semibold">Reviewed By:</span> {event.guidance_reviewed_by || 'Guidance'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                <span><span className="font-semibold">Follow-up:</span> {event.follow_up_required ? 'Required' : 'Completed'}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] sm:max-w-3xl max-h-[90vh] overflow-y-auto border border-border/70 bg-white/95 dark:bg-slate-900/95 p-4 sm:p-6">
            <DialogHeader className="pr-8">
              <DialogTitle>Review Pending Log</DialogTitle>
              <DialogDescription>
                Read the event details and current attendance context, then approve or deny this log.
              </DialogDescription>
            </DialogHeader>

            {reviewEvent ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/30">
                    <p className="text-xs text-slate-500">Student</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{reviewStudentIdentity?.name || reviewEvent.student_lrn}</p>
                    <p className="text-xs text-slate-500">{reviewStudentIdentity?.lrn || reviewEvent.student_lrn}</p>
                    {reviewStudentIdentity?.level && <p className="text-xs text-slate-500">{reviewStudentIdentity.level}</p>}
                  </div>
                  <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/30">
                    <p className="text-xs text-slate-500">Logged At</p>
                    <p className="font-semibold text-slate-900 dark:text-white">{formatDate(reviewEvent.created_at)}</p>
                    <p className="text-xs text-slate-500">{formatDateOnly(reviewEvent.event_date)} {reviewEvent.event_time}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-white dark:bg-slate-900/30">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <p className="font-semibold text-slate-900 dark:text-white">{reviewEvent.event_type}</p>
                    <Badge variant="outline" className="capitalize">{reviewEvent.severity}</Badge>
                    {getGuidanceBadge(reviewEvent.guidance_status)}
                  </div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">{reviewEvent.description}</p>
                  <div className="mt-3 text-xs text-slate-500 space-y-1">
                    <p>Location: {reviewEvent.location || 'Not provided'}</p>
                    <p>Reported by: {reviewEvent.reported_by}</p>
                  </div>
                </div>

                <div className="rounded-lg border p-4 bg-white dark:bg-slate-900/30">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white mb-2">Recent Attendance Context</p>
                  {attendanceLogs.length === 0 ? (
                    <p className="text-sm text-slate-500">No attendance records found for this student.</p>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-auto pr-1">
                      {attendanceLogs.slice(0, 8).map(log => (
                        <div key={`review-att-${log.id}`} className="text-xs rounded border px-2 py-1.5 bg-slate-50 dark:bg-slate-800/50">
                          <span className="font-medium">{formatDateOnly(log.date)}</span>
                          <span className="text-slate-500"> | In: {formatDate(log.check_in_time)}</span>
                          <span className="text-slate-500"> | Out: {log.check_out_time ? formatDate(log.check_out_time) : 'Not checked out'}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Behavioral Score Review</p>
                  <div className="rounded-lg border p-3 bg-slate-50 dark:bg-slate-900/30 space-y-2">
                    <p className="text-xs text-slate-600 dark:text-slate-300">
                      Suggested Score: <span className="font-semibold text-slate-900 dark:text-white">{suggestedBehaviorScore ?? 'N/A'}/100</span>
                    </p>
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        value={behaviorScoreInput}
                        onChange={(e) => setBehaviorScoreInput(e.target.value)}
                        placeholder="0 to 100"
                        className="sm:max-w-45"
                      />
                      <p className="text-xs text-slate-500">Keep the suggested value to confirm, or adjust to override.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Guidance Intervention Notes</p>
                  <Textarea
                    value={reviewNote}
                    onChange={(e) => setReviewNote(e.target.value)}
                    placeholder="Write intervention details, counseling actions, and recommendation."
                    rows={4}
                    className="resize-none"
                  />
                </div>

                <div className="flex flex-wrap justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setReviewDialogOpen(false)} disabled={guidanceSubmitting}>
                    Close
                  </Button>
                  {reviewEvent.guidance_status !== 'denied_by_guidance' && (
                    <Button
                      variant="outline"
                      className="gap-2 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                      onClick={() => void handleGuidanceDecision('denied_by_guidance')}
                      disabled={guidanceSubmitting}
                    >
                      {guidanceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      Deny Log
                    </Button>
                  )}
                  {reviewEvent.guidance_status !== 'approved_for_ml' && (
                    <Button
                      className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                      onClick={() => void handleGuidanceDecision('approved_for_ml')}
                      disabled={guidanceSubmitting}
                    >
                      {guidanceSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      Approve Log
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-8 text-center text-slate-500">No log selected.</div>
            )}
          </DialogContent>
        </Dialog>
      </motion.div>
    </DashboardLayout>
  );
}
