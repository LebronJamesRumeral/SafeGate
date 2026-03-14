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
  ArrowUpDown
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { sortByLevel } from '@/lib/level-order';
import { toast } from '@/components/ui/use-toast';
import { MLDashboard } from '@/components/ml-dashboard';
import { TablePageSkeleton } from '@/components/loading-skeletons';
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
  const [studentFilter, setStudentFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [logs, setLogs] = useState<AttendanceLog[]>([]);
  const [appliedRange, setAppliedRange] = useState<{ start: string; end: string }>({ start: today, end: today });
  const [showFilters, setShowFilters] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'absentDays', direction: 'desc' });
  const [exportLoading, setExportLoading] = useState(false);

  useEffect(() => {
    if (isMobile) {
      setShowFilters(false);
    }
  }, [isMobile]);

  useEffect(() => {
    fetchData();
  }, [dateMode, rangeStart, rangeEnd, singleDate, monthValue, studentFilter, selectedLevel]);

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

      if (studentFilter !== 'all') {
        attendanceQuery = attendanceQuery.eq('student_lrn', studentFilter);
      } else if (selectedLevel !== 'all' && sortedStudents.length > 0) {
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
          student: studentFilter
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
      .filter((student) => (studentFilter === 'all' ? true : student.lrn === studentFilter))
      .filter((student) =>
        normalizedSearch
          ? student.name.toLowerCase().includes(normalizedSearch) || student.lrn.toLowerCase().includes(normalizedSearch)
          : true
      )
      .map((student) => {
        const presentDays = attendanceByStudent[student.lrn]?.size || 0;
        const absentDays = Math.max(schoolDays.length - presentDays, 0);
        const attendanceRate = schoolDays.length
          ? ((presentDays / schoolDays.length) * 100).toFixed(1)
          : '0.0';

        return {
          ...student,
          presentDays,
          absentDays,
          attendanceRate: parseFloat(attendanceRate),
        };
      });

    // Apply sorting
    rows.sort((a, b) => {
      const aVal = a[sortConfig.key as keyof typeof a];
      const bVal = b[sortConfig.key as keyof typeof b];
      
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      const aStr = String(aVal).toLowerCase();
      const bStr = String(bVal).toLowerCase();
      
      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      }
      return bStr.localeCompare(aStr);
    });

    return rows;
  }, [attendanceByStudent, schoolDays.length, search, studentFilter, students, sortConfig]);

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const selectedStudentSummary = studentFilter !== 'all'
    ? summaryRows.find((row) => row.lrn === studentFilter)
    : null;

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
    return (
      <DashboardLayout>
        <TablePageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-7xl mx-auto"
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
              <Card className="border-0 shadow-lg bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
                <CardHeader className="pb-4 border-b border-slate-200/40 dark:border-slate-700/30">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="w-5 h-5 text-blue-500" />
                    Filters
                  </CardTitle>
                  <CardDescription>Customize your attendance view</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-6">
                  {/* Date Mode Tabs */}
                  <div className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-slate-100/40 dark:bg-slate-800/50 p-1.5">
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
                  <div className="grid gap-4 md:grid-cols-4">
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

                    {/* Level Selector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                        Student Level
                      </label>
                      <Select value={selectedLevel} onValueChange={setSelectedLevel}>
                        <SelectTrigger className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200">
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

                    {/* Student Selector */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                        Student
                      </label>
                      <Select value={studentFilter} onValueChange={setStudentFilter}>
                        <SelectTrigger className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200">
                          <SelectValue placeholder="All students" />
                        </SelectTrigger>
                        <SelectContent className="dark:bg-slate-800 dark:border-border/40">
                          <SelectItem value="all">All students</SelectItem>
                          {students.map((student) => (
                            <SelectItem key={student.lrn} value={student.lrn}>
                              {student.name} ({student.lrn})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Search */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300">
                        Search
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          value={search}
                          onChange={(e) => setSearch(e.target.value)}
                          placeholder="Name or LRN"
                          className="h-10 pl-9 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Total Students</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{totalStudents}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Check-ins</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{totalCheckIns}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                    <AlertCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Absences</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{totalAbsences}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-violet-700 dark:text-violet-300 font-medium">Avg. Attendance</p>
                    <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">{averageAttendance}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Daily Attendance Chart */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Activity className="w-5 h-5 text-emerald-500" />
                Daily Attendance Trend
              </CardTitle>
              <CardDescription>Last 7 days attendance pattern</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="date" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="attendance"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#attendanceGradient)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Level Performance Chart */}
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
              <CardTitle className="flex items-center gap-2 text-lg">
                <BarChart3 className="w-5 h-5 text-blue-500" />
                Attendance by Level
              </CardTitle>
              <CardDescription>Performance comparison across grades</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={levelChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                    <XAxis dataKey="level" stroke="#6B7280" />
                    <YAxis stroke="#6B7280" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        borderRadius: '8px',
                        border: 'none',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                      }}
                    />
                    <Bar dataKey="rate" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
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
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="w-5 h-5 text-blue-500" />
                  Student Attendance Summary
                </CardTitle>
                <CardDescription>
                  {summaryRows.length} students • Click column headers to sort
                </CardDescription>
              </div>
              <Badge variant="outline" className="bg-white dark:bg-slate-800">
                {schoolDays.length} school days
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
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
                      <TableCell colSpan={6} className="text-center py-12">
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
                              <p className="text-sm text-gray-900 dark:text-white">{row.name}</p>
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
              <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50 sticky top-0">
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Check In</TableHead>
                    <TableHead>Check Out</TableHead>
                    <TableHead>Duration</TableHead>
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
                          <TableCell>{student?.level || 'N/A'}</TableCell>
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
                          <TableCell>
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