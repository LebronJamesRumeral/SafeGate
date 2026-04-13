'use client';

import { useEffect, useMemo, useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { 
  CalendarDays, 
  CheckCircle, 
  ClipboardList, 
  TrendingDown, 
  TrendingUp, 
  Loader2,
  Download,
  Filter,
  Search,
  Users,
  Clock,
  Clock3,
  AlertCircle,
  BarChart3,
  Calendar,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Zap,
  Activity,
  Sparkles,
  ArrowUpDown,
  Minus,
  Info,
  AlertTriangle,
  XCircle,
  FileText
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sortByLevel } from '@/lib/level-order';
import { toast } from '@/components/ui/use-toast';
import { MLDashboard } from '@/components/ml-dashboard';
import AttendanceSkeleton from '@/components/attendance-skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

type DateMode = 'all' | 'single' | 'range' | 'month';

type StudentRow = {
  lrn: string;
  name: string;
  level: string;
};

type AttendanceLog = {
  id: number;
  student_lrn: string;
  check_in_time: string;
  check_out_time: string | null;
  date: string;
};

const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

function normalizeRange(start: string, end: string) {
  if (!start || !end) return [end, end];
  return start <= end ? [start, end] : [end, start];
}

function getMonthRange(monthValue: string) {
  if (!monthValue) return null;
  const [year, month] = monthValue.split('-').map(Number);
  if (!year || !month) return null;
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

function getSchoolDays(start: string, end: string) {
  if (!start || !end) return [] as string[];
  const days: string[] = [];
  const startDate = new Date(start);
  const endDate = new Date(end);
  const current = new Date(startDate);
  while (current <= endDate) {
    const day = current.getDay();
    if (day >= 1 && day <= 5) {
      days.push(current.toISOString().split('T')[0]);
    }
    current.setDate(current.getDate() + 1);
  }
  return days;
}

// Enforce consistent layout structure for attendance page
export default function AttendancePage() {
  const isMobile = useIsMobile();
  const today = new Date().toISOString().split('T')[0];
  const [dateMode, setDateMode] = useState<DateMode>('all');
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [singleDate, setSingleDate] = useState(today);
  const [monthValue, setMonthValue] = useState(today.slice(0, 7));
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string }>({ start: today, end: today });
  const [showFilters, setShowFilters] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'absentDays', direction: 'desc' });
  const [exportLoading, setExportLoading] = useState(false);
  const [parentNotes, setParentNotes] = useState<Record<string, Array<{ studentLrn: string; parentEmail: string; noteText: string; createdAt: string; attendanceDate: string }>>>({});
  const [openNotesModal, setOpenNotesModal] = useState<string | null>(null);

  useEffect(() => {
    if (isMobile) {
      setShowFilters(false);
    }
  }, [isMobile]);

  useEffect(() => {
    fetchData();
  }, [dateMode, rangeStart, rangeEnd, singleDate, monthValue, selectedLevel, severityFilter]);

  const fetchData = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      let studentsQuery = supabase.from('students').select('lrn, name, level');
      
      if (selectedLevel !== 'all') {
        studentsQuery = studentsQuery.eq('level', selectedLevel);
      }

      const { data: studentsData, error: studentsError } = await studentsQuery;

      if (studentsError) {
        toast({
          title: 'Failed to fetch students',
          description: studentsError.message || String(studentsError),
          variant: 'destructive',
        });
        throw studentsError;
      }

      const sortedStudents = sortByLevel(studentsData || []);

      let start = rangeStart;
      let end = rangeEnd;

      if (dateMode === 'single') {
        start = singleDate;
        end = singleDate;
      } else if (dateMode === 'month') {
        const monthRange = getMonthRange(monthValue);
        if (monthRange) {
          start = monthRange.start;
          end = monthRange.end;
        }
      } else if (dateMode === 'all') {
        const { data: earliest, error: earliestError } = await supabase
          .from('attendance_logs')
          .select('date')
          .order('date', { ascending: true })
          .limit(1);

        if (earliestError) {
          toast({
            title: 'Failed to fetch earliest attendance date',
            description: earliestError.message || String(earliestError),
            variant: 'destructive',
          });
          throw earliestError;
        }
        start = earliest && earliest.length > 0 ? earliest[0].date : today;
        end = today;
      } else {
        const [normalizedStart, normalizedEnd] = normalizeRange(rangeStart, rangeEnd);
        start = normalizedStart;
        end = normalizedEnd;
      }

      let attendanceQuery = supabase
        .from('attendance_logs')
        .select('id, student_lrn, check_in_time, check_out_time, date')
        .gte('date', start)
        .lte('date', end)
        .order('date', { ascending: false })
        .order('check_in_time', { ascending: false });

      if (selectedLevel !== 'all' && sortedStudents.length > 0) {
        attendanceQuery = attendanceQuery.in('student_lrn', sortedStudents.map(s => s.lrn));
      }

      const { data: attendanceData, error: attendanceError } = await attendanceQuery;

      if (attendanceError) {
        toast({
          title: 'Failed to fetch attendance',
          description: attendanceError.message || String(attendanceError),
          variant: 'destructive',
        });
        throw attendanceError;
      }

      setStudents(sortedStudents);
      setLogs(attendanceData || []);
      setAppliedRange({ start, end });

      // Fetch parent notes for all students
      const { data: notesData } = await supabase
        .from('parent_attendance_notes')
        .select('attendance_log_id, student_lrn, parent_email, note_text, created_at')
        .in('student_lrn', sortedStudents.map(s => s.lrn));

      // Fetch attendance log dates
      const attendanceLogIds = notesData?.map(n => n.attendance_log_id) || [];
      const { data: attendanceDatesData } = attendanceLogIds.length > 0
        ? await supabase
            .from('attendance_logs')
            .select('id, date')
            .in('id', attendanceLogIds)
        : { data: null };

      const datesByLogId: Record<string, string> = {};
      if (attendanceDatesData) {
        for (const log of attendanceDatesData) {
          datesByLogId[log.id] = log.date;
        }
      }

      const notesByStudent: Record<string, Array<{ studentLrn: string; parentEmail: string; noteText: string; createdAt: string; attendanceDate: string }>> = {};
      if (notesData) {
        for (const note of notesData) {
          if (!notesByStudent[note.student_lrn]) {
            notesByStudent[note.student_lrn] = [];
          }
          notesByStudent[note.student_lrn].push({
            studentLrn: note.student_lrn,
            parentEmail: note.parent_email,
            noteText: note.note_text,
            createdAt: note.created_at,
            attendanceDate: datesByLogId[note.attendance_log_id] || '',
          });
        }
      }
      setParentNotes(notesByStudent);

      toast({
        title: 'Attendance Loaded',
        description: 'Attendance data loaded successfully.',
        variant: 'default',
      });
    } catch (error) {
      console.error('Error fetching attendance data:', error);
      toast({
        title: 'Failed to fetch attendance data',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    try {
      const data = {
        exportDate: new Date().toISOString(),
        filters: {
          dateMode,
          range: appliedRange,
          level: selectedLevel,
          severity: severityFilter
        },
        summary: summaryRows,
        logs: logs,
        insights: {
          totalStudents,
          schoolDays: schoolDays.length,
          totalCheckIns,
          totalAbsences,
          averageAttendance: ((totalCheckIns / (totalStudents * schoolDays.length)) * 100).toFixed(1)
        }
      };

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const schoolDays = useMemo(
    () => getSchoolDays(appliedRange.start, appliedRange.end),
    [appliedRange]
  );

  const studentMap = useMemo(() => {
    return students.reduce((acc, student) => {
      acc[student.lrn] = student;
      return acc;
    }, {} as Record<string, StudentRow>);
  }, [students]);

  const attendanceByStudent = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (!acc[log.student_lrn]) {
        acc[log.student_lrn] = new Set<string>();
      }
      acc[log.student_lrn].add(log.date);
      return acc;
    }, {} as Record<string, Set<string>>);
  }, [logs]);

  const attendanceByDate = useMemo(() => {
    return logs.reduce((acc, log) => {
      if (!acc[log.date]) {
        acc[log.date] = new Set<string>();
      }
      acc[log.date].add(log.student_lrn);
      return acc;
    }, {} as Record<string, Set<string>>);
  }, [logs]);

  const summaryRows = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    let rows = students
      .filter((student) => (selectedLevel === 'all' ? true : student.level === selectedLevel))
      .filter((student) =>
        normalizedSearch
          ? (student.name && student.name.toLowerCase().includes(normalizedSearch)) ||
            (student.lrn && student.lrn.toLowerCase().includes(normalizedSearch))
          : true
      )
      .map((student) => {
        const presentDays = attendanceByStudent[student.lrn]?.size || 0;
        const absentDays = Math.max(schoolDays.length - presentDays, 0);
        const attendanceRate = schoolDays.length
          ? ((presentDays / schoolDays.length) * 100).toFixed(1)
          : '0.0';
        // Severity logic: classify by attendance rate
        let severity = 'Positive';
        if (attendanceRate < 50) severity = 'Critical';
        else if (attendanceRate < 75) severity = 'Major';
        else if (attendanceRate < 90) severity = 'Minor';
        else if (attendanceRate < 95) severity = 'Neutral';
        // else Positive
        return {
          ...student,
          presentDays,
          absentDays,
          attendanceRate: parseFloat(attendanceRate),
          severity,
        };
      })
      .filter((row) => severityFilter === 'all' ? true : row.severity === severityFilter);

    // Apply sorting
    rows.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof typeof a];
      const bVal = b[sortConfig.key as keyof typeof b];
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      if (sortConfig.direction === 'asc') return aStr.localeCompare(bStr);
      return bStr.localeCompare(aStr);
    });
    return rows;
  }, [attendanceByStudent, schoolDays.length, search, students, sortConfig, selectedLevel, severityFilter]);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  // Remove selectedStudentSummary logic (no per-student details with severity filter)
  const selectedStudentSummary = null;

  const absentDatesForStudent = useMemo(() => {
    if (!selectedStudentSummary) return [] as string[];
    const presentDates = attendanceByStudent[selectedStudentSummary.lrn] || new Set<string>();
    return schoolDays.filter((date) => !presentDates.has(date));
  }, [attendanceByStudent, schoolDays, selectedStudentSummary]);

  const totalAbsences = summaryRows.reduce((sum, row) => sum + row.absentDays, 0);
  const totalCheckIns = logs.length;
  const totalStudents = students.length;
  const averageAttendance = totalStudents && schoolDays.length
    ? ((totalCheckIns / (totalStudents * schoolDays.length)) * 100).toFixed(1)
    : '0.0';

  const weekdayStats = useMemo(() => {
    const map = new Map<string, { totalPresent: number; countDays: number }>();
    schoolDays.forEach((date) => {
      const weekday = weekdayLabels[new Date(date).getDay()];
      const presentCount = attendanceByDate[date]?.size || 0;
      const existing = map.get(weekday) || { totalPresent: 0, countDays: 0 };
      map.set(weekday, {
        totalPresent: existing.totalPresent + presentCount,
        countDays: existing.countDays + 1,
      });
    });

    const stats = Array.from(map.entries()).map(([weekday, data]) => {
      const rate = totalStudents
        ? (data.totalPresent / (data.countDays * totalStudents)) * 100
        : 0;
      return { weekday, rate };
    });

    stats.sort((a, b) => b.rate - a.rate);
    return stats;
  }, [attendanceByDate, schoolDays, totalStudents]);

  const levelStats = useMemo(() => {
    const levelMap = new Map<string, { totalRate: number; count: number }>();
    students.forEach((student) => {
      const presentDays = attendanceByStudent[student.lrn]?.size || 0;
      const rate = schoolDays.length ? presentDays / schoolDays.length : 0;
      const existing = levelMap.get(student.level) || { totalRate: 0, count: 0 };
      levelMap.set(student.level, {
        totalRate: existing.totalRate + rate,
        count: existing.count + 1,
      });
    });

    return Array.from(levelMap.entries())
      .map(([level, data]) => ({
        level,
        rate: data.count ? (data.totalRate / data.count) * 100 : 0,
      }))
      .sort((a, b) => a.rate - b.rate);
  }, [attendanceByStudent, schoolDays.length, students]);

  const lastSevenDays = schoolDays.slice(-7);
  const previousSevenDays = schoolDays.slice(-14, -7);

  const trendRate = (dates: string[]) => {
    if (!dates.length || !totalStudents) return 0;
    const totalPresent = dates.reduce((sum, date) => sum + (attendanceByDate[date]?.size || 0), 0);
    return (totalPresent / (dates.length * totalStudents)) * 100;
  };

  const recentRate = trendRate(lastSevenDays);
  const previousRate = trendRate(previousSevenDays);
  const trendDelta = recentRate - previousRate;

  const bestWeekday = weekdayStats[0];
  const worstWeekday = weekdayStats[weekdayStats.length - 1];
  const lowestLevel = levelStats[0];
  const highestLevel = levelStats[levelStats.length - 1];

  const chartData = lastSevenDays.map(date => ({
    date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
    attendance: attendanceByDate[date]?.size || 0,
    rate: totalStudents ? ((attendanceByDate[date]?.size || 0) / totalStudents) * 100 : 0
  }));

  const levelChartData = levelStats.map(level => ({
    level: level.level,
    rate: level.rate
  }));

  if (loading && isInitialLoad) {
    return <AttendanceSkeleton />;
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-7xl mx-auto animate-fade-in-up"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Attendance Records
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              Track and analyze student attendance patterns with detailed insights
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              size="sm"
              onClick={handleExport}
              disabled={exportLoading}
              className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
            >
              {exportLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Download className="w-4 h-4" />
              )}
              Export Data
            </Button>
          </div>
        </div>

        {/* Date Range Display */}
        <div className="flex w-full flex-wrap items-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 border border-blue-200/60 dark:border-blue-700/40 sm:w-fit">
          <CalendarDays className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <span className="text-sm font-medium text-slate-900 dark:text-white">
            {appliedRange.start} — {appliedRange.end}
          </span>
          <Badge variant="outline" className="ml-2 border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
            {schoolDays.length} school days
          </Badge>
        </div>

        {/* Filters Card */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50 rounded-2xl p-2 md:p-6">
                <CardHeader className="pb-1 border-b border-slate-200/40 dark:border-slate-700/30 px-0 md:px-2">
                  <CardTitle className="flex items-center gap-2 text-lg px-0 md:px-1">
                    <Filter className="w-5 h-5 text-blue-500" />
                    Filters
                  </CardTitle>
                  <CardDescription className="mt-1">Customize your attendance view</CardDescription>
                </CardHeader>
                <CardContent className="space-y-1 pt-2 px-0 md:px-2">
                  {/* Date Mode Tabs */}
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-slate-100/40 dark:bg-slate-800/50 p-2 md:p-3">
                    {(['all', 'single', 'range', 'month'] as DateMode[]).map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setDateMode(mode)}
                        className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all whitespace-nowrap ${
                          dateMode === mode
                            ? 'bg-blue-600 dark:bg-blue-700 text-white shadow-md'
                            : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 hover:bg-white/40 dark:hover:bg-slate-700/40'
                        }`}
                      >
                        {mode === 'all' ? 'All dates' : mode === 'single' ? 'Single date' : mode === 'range' ? 'Date range' : 'Month'}
                      </button>
                    ))}
                  </div>

                  {/* Input Fields Grid */}
                  <div className="flex flex-col gap-1">
                    {/* Date pickers row (if any) */}
                    <div className="flex flex-wrap gap-4">
                      {dateMode === 'single' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Single date
                          </label>
                          <Input 
                            type="date" 
                            value={singleDate} 
                            onChange={(e) => setSingleDate(e.target.value)}
                            className="h-10 dark:bg-slate-800 dark:border-slate-600 dark:text-white border-slate-300 rounded-lg"
                          />
                        </div>
                      )}
                      {dateMode === 'range' && (
                        <>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              Range start
                            </label>
                            <Input 
                              type="date" 
                              value={rangeStart} 
                              onChange={(e) => setRangeStart(e.target.value)}
                              className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200"
                            />
                          </div>
                          <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                              Range end
                            </label>
                            <Input 
                              type="date" 
                              value={rangeEnd} 
                              onChange={(e) => setRangeEnd(e.target.value)}
                              className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200"
                            />
                          </div>
                        </>
                      )}
                      {dateMode === 'month' && (
                        <div className="flex flex-col gap-2">
                          <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                            Month
                          </label>
                          <Input 
                            type="month" 
                            value={monthValue} 
                            onChange={(e) => setMonthValue(e.target.value)}
                            className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200"
                          />
                        </div>
                      )}
                    </div>
                    {/* Main filter row */}
                    <div className="flex flex-col md:flex-row gap-4 w-full">
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2 block">
                          Student Level
                        </label>
                        <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                          <SelectTrigger className="h-10 w-full dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder="All Levels" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-border/40">
                            <SelectItem value="all">All Levels</SelectItem>
                            {[
                              'Toddler & Nursery',
                              'Pre-K',
                              'Kinder 1',
                              'Kinder 2',
                              'Grade 1',
                              'Grade 2',
                              'Grade 3',
                              'Grade 4',
                              'Grade 5',
                              'Grade 6',
                              'Grade 7',
                              'Grade 8',
                            ].map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2 block">
                          Severity
                        </label>
                        <Select value={severityFilter} onValueChange={setSeverityFilter}>
                          <SelectTrigger className="h-10 w-full dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700">
                            <SelectValue placeholder="All Severities" />
                          </SelectTrigger>
                          <SelectContent className="dark:bg-slate-800 dark:border-border/40">
                            <SelectItem value="all">All Severities</SelectItem>
                            <SelectItem value="Positive"><CheckCircle className="inline w-4 h-4 mr-2 text-emerald-600" />Positive</SelectItem>
                            <SelectItem value="Neutral"><Minus className="inline w-4 h-4 mr-2 text-gray-500" />Neutral</SelectItem>
                            <SelectItem value="Minor"><Info className="inline w-4 h-4 mr-2 text-yellow-500" />Minor</SelectItem>
                            <SelectItem value="Major"><AlertTriangle className="inline w-4 h-4 mr-2 text-orange-500" />Major</SelectItem>
                            <SelectItem value="Critical"><XCircle className="inline w-4 h-4 mr-2 text-red-600" />Critical</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-2 block">
                          Search
                        </label>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Name or LRN"
                            className="h-10 w-full pl-9 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-700"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {/* Total Students Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Students</p>
                  <div className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{totalStudents}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Registered in system</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Users className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
            </Card>
          </motion.div>

          {/* Check-ins Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Attendance Events</p>
                  <div className="text-xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{totalCheckIns}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Attendance events</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <CheckCircle className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
            </Card>
          </motion.div>

          {/* Absences Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Absences</p>
                  <div className="text-xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{totalAbsences}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Missed school days</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <AlertCircle className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
            </Card>
          </motion.div>

          {/* Avg. Attendance Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 bg-gradient-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/10 dark:bg-violet-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-violet-500/5 dark:bg-violet-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-violet-600 dark:text-violet-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Avg. Attendance</p>
                  <div className="text-xl sm:text-3xl font-bold text-violet-600 dark:text-violet-400">{averageAttendance}%</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Attendance rate</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-violet-600 text-white items-center justify-center shadow-lg shadow-violet-500/25 dark:shadow-violet-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <BarChart3 className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-violet-400 to-violet-600 dark:from-violet-500 dark:to-violet-700" />
            </Card>
          </motion.div>
        </div>

        {/* Insights Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  trendDelta >= 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-amber-100 dark:bg-amber-900/30'
                }`}>
                  {trendDelta >= 0 ? (
                    <TrendingUp className={`w-4 h-4 ${trendDelta >= 0 ? 'text-emerald-600' : 'text-amber-600'}`} />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-amber-600" />
                  )}
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Weekly Trend</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {trendDelta >= 0 ? '+' : ''}{trendDelta.toFixed(1)}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Calendar className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Best Day</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {bestWeekday?.weekday || 'N/A'} ({bestWeekday ? bestWeekday.rate.toFixed(0) : '0'}%)
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Needs Attention</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {lowestLevel ? `${lowestLevel.level} (${lowestLevel.rate.toFixed(0)}%)` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30">
                  <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Top Performer</p>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {highestLevel ? `${highestLevel.level} (${highestLevel.rate.toFixed(0)}%)` : 'N/A'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Table Card */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  Student Attendance Summary
                </CardTitle>
                <CardDescription>
                  {summaryRows.length} students • Click column headers to sort
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-800 self-start sm:self-auto text-xs whitespace-nowrap">
                {schoolDays.length} school days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table className="min-w-210">
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center gap-1">
                        Student
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('level')}
                    >
                      <div className="flex items-center gap-1">
                        Level
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('presentDays')}
                    >
                      <div className="flex items-center gap-1">
                        Present
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('absentDays')}
                    >
                      <div className="flex items-center gap-1">
                        Absent
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                      onClick={() => handleSort('attendanceRate')}
                    >
                      <div className="flex items-center gap-1">
                        Attendance %
                        <ArrowUpDown className="w-3 h-3" />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden md:table-cell">Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    [...Array(5)].map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-32 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-12 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-16 animate-pulse"></div></TableCell>
                        <TableCell><div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-20 animate-pulse"></div></TableCell>
                      </TableRow>
                    ))
                  ) : summaryRows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Users className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 dark:text-gray-400">No students match your filters</p>
                          <Button variant="outline" size="sm" onClick={() => {
                            setSelectedLevel('all');
                            setStudentFilter('all');
                            setSearch('');
                          }}>
                            Clear filters
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    summaryRows.map((row, index) => {
                      const attendanceColor = 
                        row.attendanceRate >= 90 ? 'text-emerald-600' :
                        row.attendanceRate >= 75 ? 'text-blue-600' :
                        row.attendanceRate >= 50 ? 'text-amber-600' :
                        'text-rose-600';
                      
                      return (
                        <motion.tr
                          key={row.lrn}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.03 }}
                          className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                        >
                          <TableCell className="font-medium">
                            <div>
                              <p className="text-sm text-gray-900 dark:text-white truncate max-w-44 sm:max-w-64" title={row.name}>{row.name}</p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">{row.lrn}</p>
                            </div>
                          </TableCell>
                          <TableCell>{row.level}</TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                              {row.presentDays}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="border-gray-200 dark:border-gray-700">
                              {row.absentDays}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`font-semibold ${attendanceColor}`}>
                              {row.attendanceRate}%
                            </span>
                          </TableCell>
                          <TableCell>
                            {row.attendanceRate >= 90 ? (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 gap-1">
                                <CheckCircle className="w-3 h-3" />
                                Excellent
                              </Badge>
                            ) : row.attendanceRate >= 75 ? (
                              <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 gap-1">
                                <Activity className="w-3 h-3" />
                                Good
                              </Badge>
                            ) : row.attendanceRate >= 50 ? (
                              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Fair
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400 border-0 gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Needs Attention
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {parentNotes[row.lrn] && parentNotes[row.lrn].length > 0 ? (
                              <Dialog open={openNotesModal === row.lrn} onOpenChange={(isOpen) => setOpenNotesModal(isOpen ? row.lrn : null)}>
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="outline" className="h-8 px-2.5 border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                                    <FileText className="w-3.5 h-3.5 mr-1" />
                                    View Notes
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="w-[96vw] sm:w-[92vw] max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                                  <DialogHeader className="sticky top-0 bg-transparent z-10 pb-4 border-b border-slate-200 dark:border-slate-700">
                                    <DialogTitle className="text-lg">Parent Feedback Notes</DialogTitle>
                                    <DialogDescription>
                                      All parent feedback and notes submitted for {row.name} ({row.lrn})
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="flex-1 overflow-y-auto pr-4 space-y-4">
                                    {parentNotes[row.lrn].map((note, idx) => (
                                      <div
                                        key={idx}
                                        className="rounded-lg border-l-4 border-l-blue-500 border border-slate-200 dark:border-slate-700 bg-blue-50/50 dark:bg-blue-950/20 p-4 hover:shadow-md transition-shadow"
                                      >
                                        <div className="space-y-3">
                                          {/* Header Row */}
                                          <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1">
                                              <div className="flex items-center gap-2 mb-2">
                                                <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                                                <p className="font-bold text-sm text-blue-600 dark:text-blue-400">{note.parentEmail}</p>
                                              </div>
                                              <p className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                Attendance Date: {note.attendanceDate}
                                              </p>
                                              <p className="text-xs text-slate-500 dark:text-slate-500 mt-1 flex items-center gap-1">
                                                <Clock3 className="w-3 h-3" />
                                                Submitted: {new Date(note.createdAt).toLocaleDateString()} at {new Date(note.createdAt).toLocaleTimeString()}
                                              </p>
                                            </div>
                                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold text-xs px-2.5 py-1 uppercase tracking-wider border-0">
                                              Parent Note
                                            </Badge>
                                          </div>

                                          {/* Note Content */}
                                          <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">{note.noteText}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            ) : (
                              <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-0 text-xs">
                                No Notes
                              </Badge>
                            )}
                          </TableCell>
                        </motion.tr>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Selected Student Details */}
        {selectedStudentSummary && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-900">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Eye className="w-5 h-5 text-blue-500" />
                  Student Details: {selectedStudentSummary.name}
                </CardTitle>
                <CardDescription>
                  LRN: {selectedStudentSummary.lrn} • Level: {selectedStudentSummary.level}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Present Days</p>
                    <p className="text-2xl font-bold text-emerald-600">{selectedStudentSummary.presentDays}</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Absent Days</p>
                    <p className="text-2xl font-bold text-amber-600">{selectedStudentSummary.absentDays}</p>
                  </div>
                  <div className="p-4 bg-white dark:bg-slate-800 rounded-lg shadow-sm">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Attendance Rate</p>
                    <p className="text-2xl font-bold text-blue-600">{selectedStudentSummary.attendanceRate}%</p>
                  </div>
                </div>

                {absentDatesForStudent.length > 0 && (
                  <>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                      Absent Dates ({absentDatesForStudent.length})
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {absentDatesForStudent.slice(0, 20).map((date) => (
                        <Badge key={date} variant="outline" className="border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20">
                          {date}
                        </Badge>
                      ))}
                      {absentDatesForStudent.length > 20 && (
                        <Badge variant="outline" className="border-gray-200 dark:border-gray-700">
                          +{absentDatesForStudent.length - 20} more
                        </Badge>
                      )}
                    </div>
                  </>
                )}

                {absentDatesForStudent.length === 0 && (
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                    <span>Perfect attendance! No absences recorded.</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Attendance Logs Table */}
        <Card className="border-0 shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="w-5 h-5 text-purple-500" />
              Detailed Attendance Logs
            </CardTitle>
            <CardDescription>
              {logs.length} check-in records • Most recent first
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
              <Table className="min-w-220">
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead className="hidden md:table-cell">Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead className="hidden md:table-cell">Duration</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <ClipboardList className="w-12 h-12 text-gray-300" />
                          <p className="text-gray-500 dark:text-gray-400">No attendance logs found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => {
                      const student = studentMap[log.student_lrn];
                      const checkIn = new Date(log.check_in_time);
                      const checkOut = log.check_out_time ? new Date(log.check_out_time) : null;
                      const duration = checkOut 
                        ? Math.round((checkOut.getTime() - checkIn.getTime()) / (1000 * 60)) 
                        : null;
                      
                      const isLate = checkIn.getHours() > 8 || (checkIn.getHours() === 8 && checkIn.getMinutes() > 30);

                      return (
                        <TableRow key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{log.date}</span>
                              <span className="text-xs text-gray-500">{weekdayLabels[new Date(log.date).getDay()]}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm font-medium">{student?.name || log.student_lrn}</span>
                              <span className="text-xs text-gray-500">{log.student_lrn}</span>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{student?.level || 'N/A'}</TableCell>
                          <TableCell>
                            {checkOut ? (
                              <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300 border-0">
                                Completed
                              </Badge>
                            ) : (
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0">
                                Active
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="text-sm">
                                {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {isLate && (
                                <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-xs mt-1">
                                  Late
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {checkOut ? (
                              checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {duration ? (
                              <span className="text-sm">
                                {duration} min
                              </span>
                            ) : (
                              <span className="text-gray-400">--</span>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </DashboardLayout>
  );
}