'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Download, 
  TrendingUp, 
  TrendingDown, 
  Users, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  BarChart3,
  Calendar,
  Filter,
  RefreshCw,
  PieChart,
  Target,
  Award,
  Clock,
  Activity,
  Sparkles,
  Brain,
  Shield,
  Heart,
  Zap,
  Eye
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { useState, useEffect } from 'react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { MLDashboard } from '@/components/ml-dashboard';
import { AnalyticsPageSkeleton } from '@/components/analytics-skeleton';
import { DateLevelFilter } from '@/components/date-level-filter';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { calculateStudentRiskScore, detectAbsencePatterns, getAttendanceMetrics } from '@/lib/ml-risk-calculator';
import type { Cell as ExcelCell } from 'exceljs';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  PieChart as RePieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';

type DateMode = 'all' | 'single' | 'range';

const COLORS = {
  emerald: ['#10b981', '#34d399', '#6ee7b7'],
  amber: ['#f59e0b', '#fbbf24', '#fcd34d'],
  rose: ['#ef4444', '#f87171', '#fca5a5'],
  blue: ['#3b82f6', '#60a5fa', '#93c5fd'],
  violet: ['#8b5cf6', '#a78bfa', '#c4b5fd'],
  gradient: {
    start: 'rgba(16, 185, 129, 0.2)',
    end: 'rgba(16, 185, 129, 0.02)'
  }
};

const TYPE_CHART_LIMIT = 6;
const TYPE_COLORS = [COLORS.emerald[0], COLORS.amber[0], COLORS.rose[0], COLORS.blue[0], COLORS.violet[0], '#14b8a6'];

function normalizeText(value: string | null | undefined) {
  return (value || '').toLowerCase().trim();
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function resolveBehaviorSeverity(event: any) {
  const category = getSingleRelation(event.event_categories);
  const resolved = normalizeText(event.severity || category?.severity_level || null);
  if (resolved === 'positive' || resolved === 'minor' || resolved === 'major' || resolved === 'critical' || resolved === 'neutral') {
    return resolved;
  }
  return 'other';
}

function formatEventTypeLabel(value: string) {
  if (value === 'parent_report') return 'Parent report';
  if (value === 'Other') return 'Other';

  return value
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function buildTypeBreakdown(items: { type: string; count: number }[]) {
  const sorted = [...items].sort((left, right) => right.count - left.count);
  const top = sorted.slice(0, TYPE_CHART_LIMIT).map((item, index) => ({
    ...item,
    color: TYPE_COLORS[index % TYPE_COLORS.length],
    isOther: false,
  }));
  const otherCount = sorted.slice(TYPE_CHART_LIMIT).reduce((total, item) => total + item.count, 0);

  const chartData = otherCount > 0
    ? [...top, { type: 'Other', count: otherCount, color: '#94a3b8', isOther: true }]
    : top;

  const total = sorted.reduce((sum, item) => sum + item.count, 0);

  return {
    sorted,
    chartData,
    total,
    hasOverflow: sorted.length > TYPE_CHART_LIMIT,
  };
}

// Enforce consistent layout structure for analytics
export default function AnalyticsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [dateMode, setDateMode] = useState<DateMode>('all');
  const [rangeStart, setRangeStart] = useState(today);
  const [rangeEnd, setRangeEnd] = useState(today);
  const [singleDate, setSingleDate] = useState(today);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'behavioral' | 'ml'>('overview');
  const [stats, setStats] = useState({
    averageAttendance: 0,
    totalStudents: 0,
    lateArrivals: 0,
    weeklyData: [] as any[],
    levelStats: [] as any[],
    monthlyTrend: [] as any[],
    attendanceByHour: [] as any[]
  });
  const [behavioralStats, setBehavioralStats] = useState({
    totalEvents: 0,
    positiveEvents: 0,
    negativeEvents: 0,
    studentsAtRisk: 0,
    categoryBreakdown: [] as any[],
    riskDistribution: [] as any[],
    weeklyTrend: [] as any[],
    severityDistribution: [] as any[]
  });
  const [mlInsights, setMlInsights] = useState({
    totalStudentsAnalyzed: 0,
    criticalRiskStudents: 0,
    highRiskStudents: 0,
    atRiskStudents: 0,
    patternsDetected: 0,
    averageRiskScore: 0,
    loadingMl: false
  });
  const isMobile = useIsMobile();
  const [showFilters, setShowFilters] = useState(false);
  const [mobileOverviewPanel, setMobileOverviewPanel] = useState<'weekly' | 'behavioral' | 'grade'>('weekly');
  const [mobileBehavioralPanel, setMobileBehavioralPanel] = useState<'weekly' | 'type' | 'risk'>('weekly');
  const [showAllEventTypes, setShowAllEventTypes] = useState(false);
  const [atRiskStudents, setAtRiskStudents] = useState<any[]>([]);
  const [mobileMlPanel, setMobileMlPanel] = useState<'evidence' | 'drivers'>('evidence');


  useEffect(() => {
    fetchAnalyticsData();
  }, [dateMode, rangeStart, rangeEnd, singleDate, selectedLevel]);

  const getDateRangeText = () => {
    if (dateMode === 'all') return 'All dates';
    if (dateMode === 'single') return new Date(singleDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    return `${new Date(rangeStart).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} - ${new Date(rangeEnd).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`;
  };



  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAnalyticsData();
    setRefreshing(false);
  };

  const fetchAnalyticsData = async () => {
    if (!supabase) {
      setLoading(false);
      toast({
        title: 'Analytics Loaded',
        description: 'Analytics data loaded successfully.',
        variant: 'default',
      });
      return;
    }

    try {
      setLoading(true);

      // Fetch total students
      if (!supabase) {
        setLoading(false);
        toast({
          title: 'Supabase not initialized',
          description: 'Database connection is not available.',
          variant: 'destructive',
        });
        return;
      }
      let studentsQuery = supabase.from('students').select('*', { count: 'exact' });
      if (selectedLevel !== 'all') {
        studentsQuery = studentsQuery.eq('level', selectedLevel);
      }
      const { data: students, error: studentsError } = await studentsQuery;

      if (studentsError) {
        toast({
          title: 'Failed to fetch students',
          description: studentsError.message || String(studentsError),
          variant: 'destructive',
        });
        throw studentsError;
      }

      const totalStudents = students?.length || 0;

      // Fetch the active school year, then fall back to the latest school year record
      // so analytics still respects the closed school-year boundary after it ends.
      const { data: currentSchoolYear } = await supabase
        .from('school_years')
        .select('end_date, is_current')
        .eq('is_current', true)
        .maybeSingle();

      let schoolYearEndDate = currentSchoolYear?.end_date || null;

      if (!schoolYearEndDate) {
        const { data: latestSchoolYear } = await supabase
          .from('school_years')
          .select('end_date, is_current')
          .order('start_date', { ascending: false })
          .limit(1)
          .maybeSingle();

        schoolYearEndDate = latestSchoolYear?.end_date || null;
      }

      const normalizeRange = (start: string, end: string) => {
        if (!start || !end) return [end, end];
        return start <= end ? [start, end] : [end, start];
      };

      const [normalizedStart, normalizedEnd] =
        dateMode === 'range'
          ? normalizeRange(rangeStart, rangeEnd)
          : dateMode === 'single'
            ? [singleDate, singleDate]
            : (() => {
                const end = new Date();
                const start = new Date();
                start.setDate(end.getDate() - 29);
                return [
                  start.toISOString().split('T')[0],
                  end.toISOString().split('T')[0]
                ];
              })();

      let constrainedStart = normalizedStart;
      let constrainedEnd = normalizedEnd;
      
      // Constrain dates to school year boundaries
      if (schoolYearEndDate) {
        const schoolYearEnd = new Date(schoolYearEndDate);
        schoolYearEnd.setHours(0, 0, 0, 0);
        const endDateObj = new Date(normalizedEnd);
        endDateObj.setHours(0, 0, 0, 0);
        const startDateObj = new Date(normalizedStart);
        startDateObj.setHours(0, 0, 0, 0);
        
        // If end date is after school year end, constrain it
        if (endDateObj > schoolYearEnd) {
          constrainedEnd = schoolYearEndDate;
        }
        
        // If start date is after school year end, show no data (beyond school year)
        if (startDateObj > schoolYearEnd) {
          constrainedStart = schoolYearEndDate;
          constrainedEnd = schoolYearEndDate;
        }
      }

      const buildDateRange = (start: string, end: string) => {
        const days: string[] = [];
        const startDate = new Date(start);
        const endDate = new Date(end);
        const current = new Date(startDate);
        while (current <= endDate) {
          days.push(current.toISOString().split('T')[0]);
          current.setDate(current.getDate() + 1);
        }
        return days;
      };

      const dateRange = buildDateRange(constrainedStart, constrainedEnd);
      // Filter to only weekdays (Monday-Friday, not Saturday-Sunday)
      const last7Days = dateRange.slice(-7).filter(dateStr => {
        const date = new Date(dateStr);
        const dayOfWeek = date.getDay();
        return dayOfWeek >= 1 && dayOfWeek <= 5; // 1 = Monday, 5 = Friday
      });

      // Fetch attendance logs with specific fields (matching attendance page pattern)
      let attendanceQuery = supabase
        .from('attendance_logs')
        .select('id, student_lrn, check_in_time, check_out_time, date, attendance_status, is_present')
        .gte('date', dateRange[0])
        .lte('date', dateRange[dateRange.length - 1]);

      if (selectedLevel !== 'all' && students && students.length > 0) {
        const levelStudentLrns = students.map(s => s.lrn);
        attendanceQuery = attendanceQuery.in('student_lrn', levelStudentLrns);
      }

      const { data: attendance, error: attendanceError } = await attendanceQuery;

      if (attendanceError) {
        setLoading(false);
        toast({
          title: 'Failed to fetch attendance',
          description: attendanceError.message || String(attendanceError),
          variant: 'destructive',
        });
        return;
      }

      // Calculate weekly stats (last 7 days) — include cancelled and holiday counts
      const weeklyData = last7Days.map(date => {
        const dayAttendance = attendance?.filter(a => a.date === date) || [];

        const holidayCount = dayAttendance.filter(a => String(a.attendance_status || '').toLowerCase() === 'holiday').length;
        const cancelledCount = dayAttendance.filter(a => String(a.attendance_status || '').toLowerCase() === 'cancelled_class').length;

        const presentCount = dayAttendance.filter(a => {
          const status = String(a.attendance_status || '').toLowerCase();
          const isNoClass = status === 'holiday' || status === 'cancelled_class';
          return !isNoClass && (a.is_present !== false);
        }).length;

        const lateCount = dayAttendance.filter(a => {
          const status = String(a.attendance_status || '').toLowerCase();
          const isNoClass = status === 'holiday' || status === 'cancelled_class';
          if (isNoClass) return false;
          if (!a.check_in_time) return false;
          const checkInTime = new Date(a.check_in_time);
          const cutoffTime = new Date(checkInTime);
          cutoffTime.setHours(8, 30, 0, 0);
          return checkInTime > cutoffTime;
        }).length;

        const effectiveTotal = Math.max(totalStudents - cancelledCount - holidayCount, 0);
        const attendanceRate = effectiveTotal > 0 ? (presentCount / effectiveTotal) * 100 : 0;

        return {
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          date,
          present: presentCount,
          absent: Math.max(effectiveTotal - presentCount, 0),
          late: lateCount,
          cancelled: cancelledCount,
          holiday: holidayCount,
          attendanceRate
        };
      });

      // Calculate monthly trend with cancelled/holiday adjustment
      const monthlyTrend = dateRange.map(date => {
        const dayAttendance = attendance?.filter(a => a.date === date) || [];
        const holidayCount = dayAttendance.filter(a => String(a.attendance_status || '').toLowerCase() === 'holiday').length;
        const cancelledCount = dayAttendance.filter(a => String(a.attendance_status || '').toLowerCase() === 'cancelled_class').length;
        const presentCount = dayAttendance.filter(a => {
          const status = String(a.attendance_status || '').toLowerCase();
          const isNoClass = status === 'holiday' || status === 'cancelled_class';
          return !isNoClass && (a.is_present !== false);
        }).length;
        const effectiveTotal = Math.max(totalStudents - cancelledCount - holidayCount, 0);
        const attendancePct = effectiveTotal > 0 ? (presentCount / effectiveTotal) * 100 : 0;
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          attendance: attendancePct,
          present: presentCount
        };
      });

      // Calculate average attendance (average of daily effective rates)
      const averageAttendance = weeklyData.length > 0 ? (weeklyData.reduce((sum, day) => sum + (day.attendanceRate || 0), 0) / weeklyData.length) : 0;

      // Calculate total late arrivals this week
      const lateArrivals = weeklyData.reduce((sum, day) => sum + (day.late || 0), 0);

      // Calculate level stats and include cancelled/holiday counts for badges
      const levels = [...new Set(students?.map(s => s.level))];
      const levelStats = await Promise.all(levels.map(async level => {
        const levelStudents = students?.filter(s => s.level === level) || [];
        const levelTotal = levelStudents.length;
        
        const { data: levelAttendance } = supabase
          ? await supabase
              .from('attendance_logs')
              .select('student_lrn, attendance_status, date, is_present')
              .in('student_lrn', levelStudents.map(s => s.lrn))
              .gte('date', last7Days[0])
              .lte('date', last7Days[last7Days.length - 1])
          : { data: [] };

        const presentSet = new Set();
        const cancelledDates = new Set();
        const holidayDates = new Set();

        (levelAttendance || []).forEach(a => {
          const status = String(a.attendance_status || '').toLowerCase();
          if (status === 'cancelled_class') {
            if (a.date) cancelledDates.add(a.date);
            return;
          }
          if (status === 'holiday') {
            if (a.date) holidayDates.add(a.date);
            return;
          }
          if (a.is_present !== false) {
            presentSet.add(a.student_lrn);
          }
        });

        const uniquePresent = presentSet.size;
        const attendancePct = levelTotal > 0 ? (uniquePresent / levelTotal) * 100 : 0;

        return {
          grade: level,
          total: levelTotal,
          present: uniquePresent,
          attendance: parseFloat(attendancePct.toFixed(1)),
          trend: attendancePct > 75 ? 'up' : attendancePct < 50 ? 'down' : 'stable',
          cancelledDays: cancelledDates.size,
          holidayDays: holidayDates.size
        };
      }));

      setStats({
        averageAttendance: parseFloat(averageAttendance.toFixed(1)),
        totalStudents,
        lateArrivals,
        weeklyData,
        levelStats: levelStats.sort((a, b) => a.grade.localeCompare(b.grade)),
        monthlyTrend,
        attendanceByHour: generateHourlyData(attendance || [])
      });

      // Fetch behavioral data (matching behavioral-events page pattern)
      let behavioralQuery = supabase
        .from('behavioral_events')
        .select(`
          id,
          student_lrn,
          event_type,
          severity,
          event_date,
          event_time,
          created_at,
          students(name, level),
          event_categories(name, category_type, color_code, severity_level)
        `)
        .gte('event_date', dateRange[0])
        .lte('event_date', dateRange[dateRange.length - 1]);

      if (selectedLevel !== 'all' && students && students.length > 0) {
        const levelStudentLrns = students.map(s => s.lrn);
        behavioralQuery = behavioralQuery.in('student_lrn', levelStudentLrns);
      }

      const { data: behavioralEvents, error: behavioralError } = await behavioralQuery;

      if (!behavioralError && behavioralEvents) {
        const positiveEvents = behavioralEvents.filter(e => resolveBehaviorSeverity(e) === 'positive').length;
        const negativeEvents = behavioralEvents.filter(e => {
          const severity = resolveBehaviorSeverity(e);
          return severity === 'major' || severity === 'critical';
        }).length;


        // Type breakdown (use event_type field)
        const typeMap = new Map();
        behavioralEvents.forEach(event => {
          const type = event.event_type || 'Other';
          typeMap.set(type, (typeMap.get(type) || 0) + 1);
        });
        const typeBreakdown = Array.from(typeMap.entries()).map(([type, count]) => ({
          type,
          count
        }));

        // Severity distribution
        const severityMap = new Map();
        behavioralEvents.forEach(event => {
          const severity = event.severity || 'unknown';
          severityMap.set(severity, (severityMap.get(severity) || 0) + 1);
        });
        const severityDistribution = Array.from(severityMap.entries()).map(([severity, count]) => ({
          severity,
          count
        }));

        // Weekly trend (detailed by severity)
        const weeklyTrend = last7Days.map(date => {
          const dayEvents = behavioralEvents.filter(e => e.event_date === date);
          const positive = dayEvents.filter(e => resolveBehaviorSeverity(e) === 'positive').length;
          const minor = dayEvents.filter(e => resolveBehaviorSeverity(e) === 'minor').length;
          const major = dayEvents.filter(e => resolveBehaviorSeverity(e) === 'major').length;
          const critical = dayEvents.filter(e => resolveBehaviorSeverity(e) === 'critical').length;
          const other = dayEvents.filter(e => resolveBehaviorSeverity(e) === 'other').length;
          return {
            date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            positive,
            minor,
            major,
            critical,
            other,
            total: dayEvents.length
          };
        });

        // Calculate students at risk
        const studentEventMap = new Map();
        behavioralEvents.forEach(event => {
          const lrn = event.student_lrn;
          if (!studentEventMap.has(lrn)) {
            studentEventMap.set(lrn, { positive: 0, negative: 0 });
          }
          const stats = studentEventMap.get(lrn);
          const severity = resolveBehaviorSeverity(event);
          if (severity === 'positive') {
            stats.positive++;
          } else if (severity === 'major' || severity === 'critical') {
            stats.negative++;
          }
        });

        let studentsAtRisk = 0;
        const riskDistribution = { high: 0, medium: 0, low: 0 };
        const atRiskStudentsList = [];

        // Prefer canonical risk level from student_attendance_summary when available
        const levelStudentLrns = (students || []).map((s: any) => s.lrn).filter(Boolean);
        const summaryMap = new Map<string, string>();
        if (levelStudentLrns.length > 0) {
          try {
            const { data: summaries } = await supabase
              .from('student_attendance_summary')
              .select('student_lrn, risk_level')
              .in('student_lrn', levelStudentLrns);
            (summaries || []).forEach((row: any) => summaryMap.set(row.student_lrn, row.risk_level));
          } catch (err) {
            // if summary fetch fails, we'll fallback to heuristic below
            console.error('Failed to fetch student summaries for analytics:', err);
          }
        }

        for (const student of students || []) {
          const studentStats = studentEventMap.get(student.lrn) || { positive: 0, negative: 0 };
          const studentAttendance = attendance?.filter(a => a.student_lrn === student.lrn).length || 0;
          const attendanceRate = (studentAttendance / dateRange.length) * 100;

          // Use DB summary risk if available
          const summaryRisk = summaryMap.get(student.lrn);
          let riskLevel = 'low';
          if (summaryRisk) {
            riskLevel = summaryRisk;
            if (riskLevel === 'high' || riskLevel === 'critical') {
              studentsAtRisk++;
              riskDistribution.high++;
            } else if (riskLevel === 'medium') {
              riskDistribution.medium++;
            } else {
              riskDistribution.low++;
            }
          } else {
            // Fallback heuristic (legacy behavior)
            if (studentStats.negative >= 3 || attendanceRate < 70) {
              riskLevel = 'high';
              studentsAtRisk++;
              riskDistribution.high++;
            } else if (studentStats.negative >= 1 || attendanceRate < 85) {
              riskLevel = 'medium';
              riskDistribution.medium++;
            } else {
              riskDistribution.low++;
            }
          }

            if (riskLevel !== 'low') {
              atRiskStudentsList.push({
                name: student.full_name || student.lrn,
                lrn: student.lrn,
                riskLevel,
                attendanceRate,
                negativeEvents: studentStats.negative,
                positiveEvents: studentStats.positive
              });
            }
        }

          // expose at-risk students separately so we can render a quick list
          setAtRiskStudents(atRiskStudentsList);

          setBehavioralStats({
          totalEvents: behavioralEvents.length,
          positiveEvents,
          negativeEvents,
          studentsAtRisk,
          categoryBreakdown: typeBreakdown,
          riskDistribution: [
            { level: 'Low Risk', count: riskDistribution.low, color: 'emerald', percentage: (riskDistribution.low / totalStudents) * 100 },
            { level: 'Medium Risk', count: riskDistribution.medium, color: 'amber', percentage: (riskDistribution.medium / totalStudents) * 100 },
            { level: 'High Risk', count: riskDistribution.high, color: 'rose', percentage: (riskDistribution.high / totalStudents) * 100 }
          ],
          weeklyTrend,
          severityDistribution
        });


      }

    } catch (error) {
      console.error('Error fetching analytics data:', error);
      toast({
        title: 'Failed to fetch analytics data',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
      setRefreshing(false);
    }
  };

  const generateHourlyData = (attendance: any[]) => {
    const hours = Array.from({ length: 12 }, (_, i) => i + 7); // 7 AM to 6 PM
    return hours.map(hour => {
      const count = attendance.filter(a => {
        const checkInHour = new Date(a.check_in_time).getHours();
        return checkInHour === hour;
      }).length;
      return {
        hour: `${hour}:00`,
        count
      };
    });
  };

  const fetchMlInsights = async (students: any[]) => {
    try {
      setMlInsights(prev => ({ ...prev, loadingMl: true }));
      
      let criticalCount = 0;
      let highCount = 0;
      let patternsCount = 0;
      let totalRiskScores = 0;
      let analyzedCount = 0;

      // Analyze all active students so the insights match the student page and ML dashboard.
      for (const student of students) {
        try {
          // Fetch risk score
          const riskScore = await calculateStudentRiskScore(student.lrn);
          if (riskScore) {
            totalRiskScores += riskScore.risk_score;
            analyzedCount++;
            
            if (riskScore.risk_level === 'critical') {
              criticalCount++;
            } else if (riskScore.risk_level === 'high') {
              highCount++;
            }
          }

          // Detect patterns
          const patterns = await detectAbsencePatterns(student.lrn, 30);
          if (patterns && patterns.length > 0) {
            patternsCount += patterns.length;
          }
        } catch (err) {
          console.error(`Error analyzing student ${student.lrn}:`, err);
        }
      }

      const avgRiskScore = analyzedCount > 0 ? (totalRiskScores / analyzedCount) : 0;

      setMlInsights({
        totalStudentsAnalyzed: analyzedCount,
        criticalRiskStudents: criticalCount,
        highRiskStudents: highCount,
        atRiskStudents: criticalCount + highCount,
        patternsDetected: patternsCount,
        averageRiskScore: Math.round(avgRiskScore * 10) / 10,
        loadingMl: false
      });
    } catch (error) {
      console.error('Error fetching ML insights:', error);
      setMlInsights(prev => ({ ...prev, loadingMl: false }));
    }
  };

  useEffect(() => {
    if (stats.totalStudents > 0 && !mlInsights.loadingMl) {
      const allStudents = supabase
        ? (async () => {
            const { data } = await supabase.from('students').select('lrn').eq('status', 'active');
            if (data && data.length > 0) {
              fetchMlInsights(data);
            }
          })()
        : null;
    }
  }, [stats.totalStudents]);

  const generateRecommendations = (avgAttendance: number, atRisk: number, late: number, positive: number, negative: number) => {
    const recs = [];
    if (avgAttendance < 80) {
      recs.push('Implement attendance incentive program to boost daily participation');
    }
    if (atRisk > 10) {
      recs.push('Schedule individual counseling sessions for at-risk students');
    }
    if (late > 20) {
      recs.push('Review morning procedures and consider starting a punctuality campaign');
    }
    if (negative > positive) {
      recs.push('Introduce positive reinforcement programs to balance behavioral metrics');
    }
    if (recs.length === 0) {
      recs.push('Continue current strategies - all metrics are within healthy ranges');
    }
    return recs;
  };

  const exportData = () => {
    // Use ExcelJS for rich styling (colors, fonts, borders). Build workbook in-memory and trigger download.
    void (async () => {
      try {
        const mod = await import('exceljs');
        const ExcelJS = (mod && (mod.default || mod)) as any;

        const theme = {
          navy: 'FF1E3A8A',
          blue: 'FF2563EB',
          sky: 'FF60A5FA',
          orange: 'FFFF8A00',
          gold: 'FFFBBF24',
          emerald: 'FF10B981',
          amber: 'FFF59E0B',
          rose: 'FFEF4444',
          indigo: 'FF1D4ED8',
          cyan: 'FF0891B2',
          slate900: 'FF0F172A',
          slate700: 'FF334155',
          slate500: 'FF64748B',
          slate200: 'FFE2E8F0',
          slate100: 'FFF1F5F9',
          slate50: 'FFF8FAFC',
          white: 'FFFFFFFF',
        };

        const solidFill = (argb: string) => ({
          type: 'pattern' as const,
          pattern: 'solid' as const,
          fgColor: { argb },
        });

        const borderAll = (argb = theme.slate200) => ({
          top: { style: 'thin' as any, color: { argb } },
          left: { style: 'thin' as any, color: { argb } },
          bottom: { style: 'thin' as any, color: { argb } },
          right: { style: 'thin' as any, color: { argb } },
        });

        const formatHeaderLabel = (key: string) =>
          key
            .replace(/_/g, ' ')
            .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
            .replace(/\s+/g, ' ')
            .trim()
            .replace(/\b\w/g, (c) => c.toUpperCase())
            .replace(/(Rate|Percent)$/i, '$1 (%)');

        const fitTableColumns = (
          sheet: any,
          startRow: number,
          endRow: number,
          startCol: number,
          headers: string[],
          options?: { minWidth?: number; maxWidth?: number; padding?: number }
        ) => {
          const minWidth = options?.minWidth ?? 10;
          const maxWidth = options?.maxWidth ?? 28;
          const padding = options?.padding ?? 2;

          headers.forEach((header, index) => {
            let widest = String(header || '').length;
            for (let row = startRow + 1; row <= endRow; row++) {
              const cell = sheet.getCell(row, startCol + index);
              const value = cell.value;
              const text = value instanceof Date
                ? cell.numFmt?.includes('hh')
                  ? value.toLocaleString()
                  : value.toLocaleDateString()
                : Array.isArray(value)
                  ? value.join(' ')
                  : typeof value === 'object' && value !== null && 'text' in value
                    ? String((value as any).text || '')
                    : String(value ?? '');
              widest = Math.max(widest, text.length);
            }

            sheet.getColumn(startCol + index).width = Math.min(maxWidth, Math.max(minWidth, widest + padding));
          });
        };

        const applySummaryCard = (
          sheet: any,
          range: string,
          label: string,
          value: string,
          accent: string
        ) => {
          sheet.mergeCells(range);
          const cell = sheet.getCell(range.split(':')[0]);
          cell.value = {
            richText: [
              { text: `${label}\n`, font: { name: 'Calibri', size: 10, bold: true, color: { argb: theme.slate500 } } },
              { text: value, font: { name: 'Calibri', size: 15, bold: true, color: { argb: theme.slate900 } } },
            ],
          };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true, indent: 1 };
          cell.fill = solidFill(theme.white);
          cell.border = {
            top: { style: 'thick' as any, color: { argb: accent } },
            left: { style: 'thin' as any, color: { argb: theme.slate200 } },
            bottom: { style: 'thin' as any, color: { argb: theme.slate200 } },
            right: { style: 'thin' as any, color: { argb: theme.slate200 } },
          };
        };

        const styleTable = (sheet: any, startRow: number, endRow: number, startCol: number, endCol: number, headerFill: string, accent: string) => {
          for (let row = startRow; row <= endRow; row++) {
            for (let col = startCol; col <= endCol; col++) {
              const cell = sheet.getCell(row, col);
              cell.border = borderAll() as any;
              if (row === startRow) {
                cell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
                cell.fill = solidFill(headerFill);
                cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                const headerText = String(cell.value ?? '').toLowerCase();
                if (headerText.includes('rate') || headerText.includes('percent') || headerText.includes('%')) {
                  for (let dataRow = row + 1; dataRow <= endRow; dataRow++) {
                    const dataCell = sheet.getCell(dataRow, col);
                    if (typeof dataCell.value === 'number') {
                      dataCell.numFmt = '0.0';
                    }
                  }
                }
              } else {
                cell.font = { name: 'Calibri', size: 10, color: { argb: theme.slate700 } };
                cell.fill = solidFill(row % 2 === 0 ? theme.slate50 : theme.white);
                const isNumeric = typeof cell.value === 'number';
                cell.alignment = { horizontal: isNumeric ? 'center' : 'left', vertical: 'middle', wrapText: true };
              }
            }
            sheet.getRow(row).height = row === startRow ? 24 : 22;
          }
          sheet.getCell(startRow, startCol).border = {
            top: { style: 'thin' as any, color: { argb: theme.slate200 } },
            left: { style: 'thick' as any, color: { argb: accent } },
            bottom: { style: 'thin' as any, color: { argb: theme.slate200 } },
            right: { style: 'thin' as any, color: { argb: theme.slate200 } },
          };
        };

        const blobToBase64 = (blob: Blob) =>
          new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const result = reader.result as string;
              resolve(result.split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          });

        const wb = new ExcelJS.Workbook();
        wb.creator = 'SafeGate';
        wb.created = new Date();
        wb.title = 'SafeGate Analytics Export';
        wb.subject = 'Attendance and behavioral analytics';
        wb.company = 'SafeGate';

        const applyEmailHeader = async (sheet: any, options: {
          logoCol?: string;
          headerStartCol: string;
          headerEndCol: string;
          kickerRange: string;
          titleRange: string;
          badgeRange: string;
          kickerText: string;
          titleText: string;
          badgeText: string;
          badgeFill: string;
          badgeBorder: string;
        }) => {
          sheet.properties.defaultRowHeight = 22;
          sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 5 }];
          sheet.headerFooter = {
            oddFooter: '&LGenerated by SafeGate Analytics&C&F&RPage &P of &N',
          };
          sheet.pageSetup = {
            orientation: 'landscape',
            paperSize: 9,
            fitToPage: true,
            fitToWidth: 1,
            fitToHeight: 0,
            margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
          };
          sheet.columns = [
            { width: 3.5 },
            { width: 7.5 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
            { width: 14 },
          ];

          const colNumberToName = (n: number) => {
            let s = '';
            while (n > 0) {
              const m = (n - 1) % 26;
              s = String.fromCharCode(65 + m) + s;
              n = Math.floor((n - 1) / 26);
            }
            return s;
          };

          try {
            // Use SGCDC.png explicitly and preserve image aspect ratio so it does not stretch
            const logoResponse = await fetch('/SGCDC.png');
            if (logoResponse.ok) {
              const logoBlob = await logoResponse.blob();
              const logoBase64 = await blobToBase64(logoBlob);
              // Create an HTMLImageElement to measure natural dimensions (runs in browser)
              const img = new (window as any).Image();
              img.src = `data:image/png;base64,${logoBase64}`;
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = (e: any) => reject(e);
              });
              const maxHeight = 72; // px - increase header logo size
              const ratio = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
              const height = Math.min(maxHeight, img.naturalHeight || maxHeight);
              const width = Math.round(height * ratio);
              const logoId = wb.addImage({ base64: logoBase64, extension: 'png' });
              // center the logo across header width
              const lastCol = Math.max(1, (sheet.columns && sheet.columns.length) || 1);
              const centerCol = lastCol / 2;
              const approxColsForImage = Math.max(1, Math.round(width / 40));
              const tlCol = Math.max(0.25, centerCol - approxColsForImage / 2);
              sheet.addImage(logoId, { tl: { col: tlCol, row: 0.08 }, ext: { width, height }, editAs: 'oneCell' });
            }
          } catch (logoError) {
            console.warn('SGCDC logo could not be embedded in Excel export:', logoError);
          }

          sheet.getRow(1).height = 80;
          sheet.getRow(2).height = 44;
          sheet.getRow(3).height = 22;
          sheet.getRow(4).height = 22;

          const lastColLetter = colNumberToName(Math.max(1, sheet.columns.length || 1));
          sheet.mergeCells(`A1:${lastColLetter}1`);
          const kickerCell = sheet.getCell('A1');
          // Use richText to style the organization name larger, with address below and blue email
          kickerCell.value = {
            richText: [
              { text: 'SUBIC GATEWAY CHILD DEVELOPMENT CENTER, INC.\n', font: { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } } },
              { text: 'Building 5144 & 5145, Argonaut Highway, West Kalayaan,\nSubic Bay Freeport Zone, 2222\nTel. No.: (047)639-4690\n', font: { name: 'Calibri', size: 11, color: { argb: 'FF000000' } } },
              { text: 'subicgatewayedc@gmail.com', font: { name: 'Calibri', size: 11, color: { argb: 'FF0563C1' } } },
            ],
          } as any;
          kickerCell.font = { name: 'Calibri', size: 12, bold: true, color: { argb: 'FF000000' } };
          kickerCell.fill = undefined as any;
          kickerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          kickerCell.border = borderAll(theme.slate200);

          sheet.mergeCells(`A2:${lastColLetter}2`);
          const titleCell = sheet.getCell('A2');
          titleCell.value = options.titleText;
          titleCell.font = { name: 'Calibri', size: 20, bold: true, color: { argb: 'FF000000' } };
          // Remove colored fill to match guidance print (plain white background)
          titleCell.fill = undefined as any;
          titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
          titleCell.border = borderAll(theme.slate200);

          // badge: place on far right of header area
          const badgeStart = Math.max(1, sheet.columns.length - 1);
          const badgeStartLetter = colNumberToName(badgeStart);
          sheet.mergeCells(`${badgeStartLetter}1:${lastColLetter}1`);
          const badgeCell = sheet.getCell(`${badgeStartLetter}1`);
          badgeCell.value = options.badgeText;
          // Make badge subdued / border-only to match plain print header
          badgeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: 'FF000000' } };
          badgeCell.fill = undefined as any;
          badgeCell.alignment = { vertical: 'middle', horizontal: 'center' };
          badgeCell.border = borderAll(theme.slate200);

          sheet.getRow(1).height = 80;
          sheet.getRow(2).height = 44;
          sheet.getRow(3).height = 22;
          sheet.getRow(4).height = 22;
        };

        // Attendance worksheet
        const ws = wb.addWorksheet('Attendance', { views: [{ state: 'frozen', ySplit: 5 }] });
        ws.properties.tabColor = { argb: theme.blue };
        ws.properties.defaultRowHeight = 22;
        await applyEmailHeader(ws, {
          headerStartCol: 'B',
          headerEndCol: 'G',
          kickerRange: 'B1:E1',
          titleRange: 'B2:G2',
          badgeRange: 'F1:G1',
          kickerText: 'SGCDC • SafeGate Student Monitoring System',
          titleText: 'Attendance Analytics Report',
          badgeText: 'Attendance Summary',
          badgeFill: theme.orange,
          badgeBorder: theme.gold,
        });

        ws.mergeCells('B3:E3');
        const metaAttendanceLabel = ws.getCell('B3');
        metaAttendanceLabel.value = 'Report metadata: Attendance analytics snapshot';
        metaAttendanceLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
        metaAttendanceLabel.fill = solidFill(theme.navy);
        metaAttendanceLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        metaAttendanceLabel.border = borderAll(theme.navy);

        ws.mergeCells('F3:G3');
        const metaAttendanceDate = ws.getCell('F3');
        metaAttendanceDate.value = new Date();
        metaAttendanceDate.numFmt = 'mm/dd/yyyy hh:mm:ss AM/PM';
        metaAttendanceDate.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
        metaAttendanceDate.fill = solidFill(theme.navy);
        metaAttendanceDate.alignment = { vertical: 'middle', horizontal: 'center' };
        metaAttendanceDate.border = borderAll(theme.navy);

        // Split filter row: filters text + start date + end date (as proper Excel dates)
        ws.mergeCells('B4:C4');
        const filtersCell = ws.getCell('B4');
        filtersCell.value = `Filters: mode=${dateMode} | level=${selectedLevel}`;
        filtersCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
        filtersCell.fill = solidFill(theme.navy);
        filtersCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        filtersCell.border = borderAll(theme.navy);

        ws.mergeCells('D4:E4');
        const startCell = ws.getCell('D4');
        startCell.value = rangeStart && !isNaN(Date.parse(rangeStart)) ? new Date(rangeStart) : null;
        if (startCell.value) startCell.numFmt = 'mm/dd/yyyy';
        startCell.font = { name: 'Calibri', size: 10, color: { argb: theme.slate900 } };
        startCell.fill = solidFill(theme.slate100);
        startCell.alignment = { vertical: 'middle', horizontal: 'center' };
        startCell.border = borderAll(theme.slate200);

        ws.mergeCells('F4:G4');
        const endCell = ws.getCell('F4');
        endCell.value = rangeEnd && !isNaN(Date.parse(rangeEnd)) ? new Date(rangeEnd) : null;
        if (endCell.value) endCell.numFmt = 'mm/dd/yyyy';
        endCell.font = { name: 'Calibri', size: 10, color: { argb: theme.slate900 } };
        endCell.fill = solidFill(theme.slate100);
        endCell.alignment = { vertical: 'middle', horizontal: 'center' };
        endCell.border = borderAll(theme.slate200);

        applySummaryCard(ws, 'B6:C7', 'Average Attendance', `${stats.averageAttendance.toFixed(1)}%`, theme.emerald);
        applySummaryCard(ws, 'D6:E7', 'Total Students', `${stats.totalStudents}`, theme.blue);
        applySummaryCard(ws, 'F6:G7', 'Late Arrivals', `${stats.lateArrivals}`, theme.orange);
        applySummaryCard(ws, 'B8:C9', 'Coverage Window', `${stats.weeklyData.length} days`, theme.gold);
        applySummaryCard(ws, 'D8:E9', 'Levels Filtered', selectedLevel === 'all' ? 'All levels' : selectedLevel, theme.sky);
        // (Removed per request) no logo under Late Arrivals — header logo now placed on left

        let rowIndex = 11; // start of weekly section (1-based)
        ws.mergeCells(`A${rowIndex}:G${rowIndex}`);
        ws.getCell(`A${rowIndex}`).value = 'Weekly Attendance';
        ws.getCell(`A${rowIndex}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: theme.slate900 } };
        ws.getCell(`A${rowIndex}`).fill = solidFill(theme.slate100);
        ws.getCell(`A${rowIndex}`).border = borderAll() as any;
        rowIndex++;

        // Add header for weekly data
        if (stats.weeklyData && stats.weeklyData.length > 0) {
          const headers = Object.keys(stats.weeklyData[0]);
          const displayHeaders = headers.map((h) => formatHeaderLabel(h));
          const headerRow = ws.addRow(displayHeaders);
          // Add data rows, converting any parseable date columns to real Date objects
          stats.weeklyData.forEach((r: any) => {
            const rowVals = headers.map((h) => {
              const val = r[h];
              if (h.toLowerCase() === 'date' && val && !isNaN(Date.parse(String(val)))) {
                return new Date(val);
              }
              return val;
            });
            ws.addRow(rowVals);
          });

          // Apply date formatting to the date column (if present)
          const dateColIndex = headers.findIndex(h => h.toLowerCase() === 'date') + 1;
          if (dateColIndex > 0) {
            for (let r = headerRow.number + 1; r <= ws.lastRow.number; r++) {
                const cell = ws.getCell(r, dateColIndex);
              if (cell.value instanceof Date) {
                cell.numFmt = 'mm/dd/yyyy';
              } else if (typeof cell.value === 'string' && !isNaN(Date.parse(cell.value))) {
                cell.value = new Date(cell.value);
                cell.numFmt = 'mm/dd/yyyy';
              }
            }
          }

          styleTable(ws, headerRow.number, ws.lastRow.number, 1, headers.length, theme.navy, theme.orange);
          fitTableColumns(ws, headerRow.number, ws.lastRow.number, 1, displayHeaders, { minWidth: 10, maxWidth: 20, padding: 2 });
        } else {
          const emptyRow = ws.addRow(['No weekly data available']);
          emptyRow.eachCell((cell: ExcelCell) => {
            cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: theme.slate500 } };
            cell.fill = solidFill(theme.slate50);
            cell.border = borderAll() as any;
          });
        }

        // Add spacing then Monthly Trend
        ws.addRow([]);
        const monthlySection = ws.addRow(['Monthly Trend']);
        monthlySection.eachCell((cell: ExcelCell) => {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: theme.slate900 } };
          cell.fill = solidFill(theme.slate100);
          cell.border = borderAll() as any;
        });
        if (stats.monthlyTrend && stats.monthlyTrend.length > 0) {
          const headers = Object.keys(stats.monthlyTrend[0]);
          const displayHeaders = headers.map((h) => formatHeaderLabel(h));
          const headerRow = ws.addRow(displayHeaders);
          // Convert parseable date values into Date objects so Excel recognizes them
          stats.monthlyTrend.forEach((r: any) => {
            const rowVals = headers.map((h) => {
              const val = r[h];
              if (h.toLowerCase() === 'date' && val && !isNaN(Date.parse(String(val)))) {
                return new Date(val);
              }
              return val;
            });
            ws.addRow(rowVals);
          });

          const dateColIndex = headers.findIndex(h => h.toLowerCase() === 'date') + 1;
          if (dateColIndex > 0) {
            for (let r = headerRow.number + 1; r <= ws.lastRow.number; r++) {
              const cell = ws.getCell(r, dateColIndex);
              if (cell.value instanceof Date) cell.numFmt = 'mm/dd';
              else if (typeof cell.value === 'string' && !isNaN(Date.parse(cell.value))) {
                cell.value = new Date(cell.value);
                cell.numFmt = 'mm/dd';
              }
            }
          }

          styleTable(ws, headerRow.number, ws.lastRow.number, 1, headers.length, theme.blue, theme.gold);
          fitTableColumns(ws, headerRow.number, ws.lastRow.number, 1, displayHeaders, { minWidth: 10, maxWidth: 18, padding: 2 });
        } else {
          const emptyRow = ws.addRow(['No monthly trend data available']);
          emptyRow.eachCell((cell: ExcelCell) => {
            cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: theme.slate500 } };
            cell.fill = solidFill(theme.slate50);
            cell.border = borderAll();
          });
        }

        ws.getColumn(1).width = 14;
        ws.getColumn(2).width = 14;
        ws.getColumn(3).width = 12;
        ws.getColumn(4).width = 12;
        ws.getColumn(5).width = 12;
        ws.getColumn(6).width = 12;
        ws.getColumn(7).width = 14;

        // Behavioral worksheet
        const wbBeh = wb.addWorksheet('Behavioral', { views: [{ state: 'frozen', ySplit: 5 }] });
        wbBeh.properties.tabColor = { argb: theme.orange };
        wbBeh.properties.defaultRowHeight = 22;
        await applyEmailHeader(wbBeh, {
          headerStartCol: 'B',
          headerEndCol: 'G',
          kickerRange: 'B1:E1',
          titleRange: 'B2:G2',
          badgeRange: 'F1:G1',
          kickerText: 'SGCDC • SafeGate Student Monitoring System',
          titleText: 'Behavioral Incident Notice',
          badgeText: 'Major Severity',
          badgeFill: theme.orange,
          badgeBorder: theme.gold,
        });

        wbBeh.mergeCells('B3:E3');
        const bMetaLabel = wbBeh.getCell('B3');
        bMetaLabel.value = 'Report metadata: Behavioral analytics snapshot';
        bMetaLabel.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
        bMetaLabel.fill = solidFill(theme.navy);
        bMetaLabel.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        bMetaLabel.border = borderAll(theme.navy);

        wbBeh.mergeCells('F3:G3');
        const bMetaDate = wbBeh.getCell('F3');
        bMetaDate.value = new Date();
        bMetaDate.numFmt = 'mm/dd/yyyy hh:mm:ss AM/PM';
        bMetaDate.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
        bMetaDate.fill = solidFill(theme.navy);
        bMetaDate.alignment = { vertical: 'middle', horizontal: 'center' };
        bMetaDate.border = borderAll(theme.navy);

        // Split filter row on Behavioral sheet: filters + start + end (dates)
        wbBeh.mergeCells('B4:C4');
        const bFiltersCell = wbBeh.getCell('B4');
        bFiltersCell.value = `Filters: mode=${dateMode} | level=${selectedLevel}`;
        bFiltersCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
        bFiltersCell.fill = solidFill(theme.navy);
        bFiltersCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
        bFiltersCell.border = borderAll(theme.navy);

        wbBeh.mergeCells('D4:E4');
        const bStartCell = wbBeh.getCell('D4');
        bStartCell.value = rangeStart && !isNaN(Date.parse(rangeStart)) ? new Date(rangeStart) : null;
        if (bStartCell.value) bStartCell.numFmt = 'mm/dd/yyyy';
        bStartCell.font = { name: 'Calibri', size: 10, color: { argb: theme.slate900 } };
        bStartCell.fill = solidFill(theme.slate100);
        bStartCell.alignment = { vertical: 'middle', horizontal: 'center' };
        bStartCell.border = borderAll(theme.slate200);

        wbBeh.mergeCells('F4:G4');
        const bEndCell = wbBeh.getCell('F4');
        bEndCell.value = rangeEnd && !isNaN(Date.parse(rangeEnd)) ? new Date(rangeEnd) : null;
        if (bEndCell.value) bEndCell.numFmt = 'mm/dd/yyyy';
        bEndCell.font = { name: 'Calibri', size: 10, color: { argb: theme.slate900 } };
        bEndCell.fill = solidFill(theme.slate100);
        bEndCell.alignment = { vertical: 'middle', horizontal: 'center' };
        bEndCell.border = borderAll(theme.slate200);

        applySummaryCard(wbBeh, 'B6:C7', 'Total Events', `${behavioralStats.totalEvents || 0}`, theme.blue);
        applySummaryCard(wbBeh, 'D6:E7', 'Positive Events', `${behavioralStats.positiveEvents || 0}`, theme.emerald);
        applySummaryCard(wbBeh, 'F6:G7', 'Negative Events', `${behavioralStats.negativeEvents || 0}`, theme.orange);
        applySummaryCard(wbBeh, 'B8:C9', 'Students At Risk', `${behavioralStats.studentsAtRisk || 0}`, theme.rose);
        applySummaryCard(wbBeh, 'D8:E9', 'Weekly Trend', `${behavioralStats.weeklyTrend.length} days`, theme.gold);
        // (Removed per request) no logo under Late Arrivals — header logo now placed on left

        wbBeh.addRow([]);
        const summaryRow = wbBeh.addRow(['Summary']);
        summaryRow.eachCell((cell: ExcelCell) => {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: theme.slate900 } };
          cell.fill = solidFill(theme.slate100);
          cell.border = borderAll();
        });
        const summaryStartRow = wbBeh.lastRow.number + 1;
        wbBeh.addRow(['Total Events', behavioralStats.totalEvents || 0]);
        wbBeh.addRow(['Positive Events', behavioralStats.positiveEvents || 0]);
        wbBeh.addRow(['Negative Events', behavioralStats.negativeEvents || 0]);
        wbBeh.addRow(['Students At Risk', behavioralStats.studentsAtRisk || 0]);
        styleTable(wbBeh, summaryStartRow, wbBeh.lastRow.number, 1, 2, theme.navy, theme.orange);
        wbBeh.addRow([]);
        const weeklyLabel = wbBeh.addRow(['Weekly Trend']);
        weeklyLabel.eachCell((cell: ExcelCell) => {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: theme.slate900 } };
          cell.fill = solidFill(theme.slate100);
          cell.border = borderAll();
        });

        if (behavioralStats.weeklyTrend && behavioralStats.weeklyTrend.length > 0) {
          const headers = Object.keys(behavioralStats.weeklyTrend[0]);
          const displayHeaders = headers.map((h) => formatHeaderLabel(h));
          const headerRow = wbBeh.addRow(displayHeaders);
          behavioralStats.weeklyTrend.forEach((r: any) => wbBeh.addRow(Object.values(r)));

          styleTable(wbBeh, headerRow.number, wbBeh.lastRow.number, 1, headers.length, theme.navy, theme.orange);
          fitTableColumns(wbBeh, headerRow.number, wbBeh.lastRow.number, 1, displayHeaders, { minWidth: 10, maxWidth: 20, padding: 2 });
        } else {
          const emptyRow = wbBeh.addRow(['No weekly behavioral trend data available']);
          emptyRow.eachCell((cell: ExcelCell) => {
            cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: theme.slate500 } };
            cell.fill = solidFill(theme.slate50);
            cell.border = borderAll();
          });
        }

        wbBeh.getColumn(1).width = 26;
        wbBeh.getColumn(2).width = 16;
        wbBeh.getColumn(3).width = 14;
        wbBeh.getColumn(4).width = 12;
        wbBeh.getColumn(5).width = 12;
        wbBeh.getColumn(6).width = 12;
        wbBeh.getColumn(7).width = 12;

        // Write workbook to buffer and download
        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export analytics as Excel:', err);
        toast({ title: 'Export failed', description: 'Unable to generate Excel file. Try again or contact support.', variant: 'destructive' });
      }
    })();
  };

  const maxPresent = Math.max(...(stats.weeklyData.length ? stats.weeklyData.map(s => s.present) : [1]));
  const typeBreakdown = buildTypeBreakdown(behavioralStats.categoryBreakdown);
  const eventTypeLegendData = showAllEventTypes ? typeBreakdown.sorted : typeBreakdown.chartData;
  const eventTypeSubtitle = typeBreakdown.hasOverflow
    ? `Showing top ${TYPE_CHART_LIMIT} + Other`
    : `${typeBreakdown.sorted.length} categories`;

  const renderEventTypeItem = (entry: { type: string; count: number; color?: string; isOther?: boolean }, index: number) => {
    const percentage = typeBreakdown.total > 0 ? (entry.count / typeBreakdown.total) * 100 : 0;

    return (
      <div
        key={`${entry.type}-${index}`}
        className={`space-y-2 rounded-xl border p-3 ${entry.isOther ? 'border-slate-300/80 bg-slate-100/80 dark:border-slate-700/60 dark:bg-slate-900/50' : 'border-slate-200/70 bg-white/80 dark:border-slate-700/40 dark:bg-slate-950/20'}`}
      >
        <div className="flex items-center justify-between gap-3 text-xs sm:text-sm">
          <span className="min-w-0 truncate font-medium text-slate-700 dark:text-slate-200">
            {formatEventTypeLabel(entry.type)}
          </span>
          <span className="shrink-0 font-semibold text-slate-900 dark:text-white">
            {entry.count}
            <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">
              ({percentage.toFixed(1)}%)
            </span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-slate-200/80 dark:bg-slate-700/70 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.max(percentage, 4)}%`, backgroundColor: entry.color || TYPE_COLORS[index % TYPE_COLORS.length] }}
          />
        </div>
      </div>
    );
  };

  if (loading && isInitialLoad) {
    return (
      <DashboardLayout>
        <AnalyticsPageSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header with Actions */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Analytics & Insights
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              Comprehensive attendance and behavioral analytics with AI-powered predictions
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportData}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex w-full gap-2 overflow-x-auto p-1 bg-slate-100 dark:bg-slate-800/50 rounded-xl sm:w-fit">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'behavioral', label: 'Behavioral', icon: Activity },
            { id: 'ml', label: 'Insights', icon: Brain }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date and Level Filter - Mobile Optimized (collapsible). On desktop show full filter without hide/show. */}
        {isMobile ? (
          <AnimatePresence>
            {!showFilters ? (
              <motion.div
                key="analytics-filters-summary"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="mb-2"
              >
                <div className="flex items-center justify-between gap-3 px-4 py-2 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-700/40">
                  <div className="text-sm truncate">
                    <strong className="mr-2">Filters</strong>
                    <span className="text-muted-foreground">{getDateRangeText()} • {selectedLevel === 'all' ? 'All Levels' : selectedLevel}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setShowFilters(true)} className="gap-2">
                      Show
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="analytics-filters-expanded"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.28 }}
              >
                <div className="mb-2">
                  <Card className="overflow-hidden rounded-xl border-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-0 shadow-lg">
                    <CardHeader className="flex items-center justify-between gap-3 px-4 py-3 border-b border-slate-200/60 dark:border-slate-700/40">
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-white">Filter Dates</CardTitle>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setShowFilters(false)}>Hide</Button>
                      </div>
                    </CardHeader>
                    <div className="p-4">
                      <DateLevelFilter
                        dateMode={dateMode}
                        setDateMode={setDateMode}
                        singleDate={singleDate}
                        setSingleDate={setSingleDate}
                        rangeStart={rangeStart}
                        setRangeStart={setRangeStart}
                        rangeEnd={rangeEnd}
                        setRangeEnd={setRangeEnd}
                        selectedLevel={selectedLevel}
                        setSelectedLevel={setSelectedLevel}
                        forceExpanded={true}
                        noWrapper={true}
                      />
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        ) : (
          <DateLevelFilter
            dateMode={dateMode}
            setDateMode={setDateMode}
            singleDate={singleDate}
            setSingleDate={setSingleDate}
            rangeStart={rangeStart}
            setRangeStart={setRangeStart}
            rangeEnd={rangeEnd}
            setRangeEnd={setRangeEnd}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
          />
        )}

        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Behavioral Summary Cards - Dashboard Style */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                {/* Total Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}>
                  <Card className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/15 dark:bg-sky-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-sky-600 dark:text-sky-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Total Events</p>
                        <div className="text-lg sm:text-2xl font-bold text-sky-600 dark:text-sky-400 leading-tight">{behavioralStats.totalEvents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">all behavioral events</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-sky-500 to-sky-600 text-white items-center justify-center shadow-md shadow-sky-500/20 dark:shadow-sky-500/10 group-hover:scale-105 transition-all duration-300">
                        <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" />
                  </Card>
                </motion.div>

                {/* Positive Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Positive Behavior Events</p>
                        <div className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{behavioralStats.positiveEvents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">reinforcing student progress</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10 group-hover:scale-105 transition-all duration-300">
                        <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                  </Card>
                </motion.div>

                {/* Negative Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/15 dark:bg-orange-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-orange-600 dark:text-orange-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Major/Critical Incidents</p>
                        <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400 leading-tight">{behavioralStats.negativeEvents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">major and critical incidents</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-md shadow-orange-500/20 dark:shadow-orange-500/10 group-hover:scale-105 transition-all duration-300">
                        <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
                  </Card>
                </motion.div>

                {/* At Risk Students Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/15 dark:bg-red-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-red-600 dark:text-red-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Students Needing Intervention</p>
                        <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400 leading-tight">{behavioralStats.studentsAtRisk}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">high or critical risk level</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-md shadow-red-500/20 dark:shadow-red-500/10 group-hover:scale-105 transition-all duration-300">
                        <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
                  </Card>
                </motion.div>
              </div>

              {/* Mobile overview switcher */}
              {isMobile && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 shadow-sm overflow-x-auto no-scrollbar">
                  {[
                    { id: 'weekly', label: 'Weekly', icon: BarChart3 },
                    { id: 'behavioral', label: 'Behavior', icon: Activity },
                    { id: 'grade', label: 'Grade', icon: PieChart },
                  ].map((panel) => (
                    <button
                      key={panel.id}
                      onClick={() => setMobileOverviewPanel(panel.id as typeof mobileOverviewPanel)}
                      className={`flex min-w-24 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        mobileOverviewPanel === panel.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <panel.icon className="h-4 w-4" />
                      {panel.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Charts Grid */}
              {isMobile ? (
                <AnimatePresence mode="wait">
                  {mobileOverviewPanel === 'weekly' && (
                    <motion.div
                      key="mobile-weekly"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.24 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-xl">
                        <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <BarChart3 className="w-5 h-5 text-emerald-500" />
                            Weekly Attendance Trend
                          </CardTitle>
                          <CardDescription>Daily attendance breakdown for the last 7 days</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={stats.weeklyData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis dataKey="day" stroke="#6B7280" />
                                <YAxis stroke="#6B7280" />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Legend />
                                <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="cancelled" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                                <Bar dataKey="holiday" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                              </BarChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {mobileOverviewPanel === 'behavioral' && (
                    <motion.div
                      key="mobile-behavioral"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.24 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-xl">
                        <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                          <CardTitle className="flex items-center gap-2 text-lg">
                            <AreaChart className="w-5 h-5 text-blue-500" />
                            Behavioral Event Trend
                          </CardTitle>
                          <CardDescription>Monthly behavioral event pattern</CardDescription>
                        </CardHeader>
                        <CardContent className="p-4">
                          <div className="h-60">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={behavioralStats.weeklyTrend} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis dataKey="date" stroke="#6B7280" />
                                <YAxis stroke="#6B7280" />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Legend />
                                <Area type="monotone" dataKey="positive" stackId="a" stroke="#10b981" fill="#a7f3d0" />
                                <Area type="monotone" dataKey="minor" stackId="a" stroke="#f59e0b" fill="#fde68a" />
                                <Area type="monotone" dataKey="major" stackId="a" stroke="#fb923c" fill="#ffedd5" />
                                <Area type="monotone" dataKey="critical" stackId="a" stroke="#ef4444" fill="#fecaca" />
                                <Area type="monotone" dataKey="other" stackId="a" stroke="#6B7280" fill="#e6e7ea" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {mobileOverviewPanel === 'grade' && (
                    <motion.div
                      key="mobile-grade"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.24 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-xl">
                        <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                            Attendance by Grade Level
                          </CardTitle>
                          <CardDescription className="text-sm sm:text-base">Performance comparison across different grades</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-4">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-3">
                            {stats.levelStats.map((grade, index) => (
                              <motion.div
                                key={grade.grade}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.08 }}
                                className="min-w-0 p-2.5 sm:p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-linear-to-br from-white to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50"
                              >
                                <div className="flex items-start justify-between gap-1.5 mb-2">
                                  <span className="min-w-0 truncate text-sm sm:text-base font-semibold text-slate-900 dark:text-white">{grade.grade}</span>
                                  <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${
                                    grade.trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                    grade.trend === 'down' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                  }`}>
                                    {grade.trend === 'up' ? '↑' : grade.trend === 'down' ? '↓' : '→'} {grade.attendance}%
                                  </span>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between gap-2 text-[11px] sm:text-sm">
                                    <span className="text-slate-600 dark:text-slate-400">Present</span>
                                    <span className="font-medium text-slate-900 dark:text-white">{grade.present}/{grade.total}</span>
                                  </div>
                                  <div className="h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                    <motion.div
                                      initial={{ width: 0 }}
                                      animate={{ width: `${grade.attendance}%` }}
                                      transition={{ duration: 1, delay: index * 0.08 }}
                                      className={`h-full rounded-full ${
                                        grade.attendance >= 75 ? 'bg-linear-to-r from-emerald-500 to-emerald-400' :
                                        grade.attendance >= 50 ? 'bg-linear-to-r from-amber-500 to-amber-400' :
                                        'bg-linear-to-r from-rose-500 to-rose-400'
                                      }`}
                                    />
                                  </div>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Weekly Attendance Chart */}
                    <Card className="overflow-hidden border-0 shadow-xl">
                      <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <BarChart3 className="w-5 h-5 text-emerald-500" />
                          Weekly Attendance Trend
                        </CardTitle>
                        <CardDescription>Daily attendance breakdown for the last 7 days</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="h-60 sm:h-75 lg:h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.weeklyData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                              <XAxis dataKey="day" stroke="#6B7280" />
                              <YAxis stroke="#6B7280" />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                              <Legend />
                              <Bar dataKey="present" fill="#10b981" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="cancelled" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="holiday" fill="#60a5fa" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Behavioral Event Trend (replaces Attendance Trend) */}
                    <Card className="overflow-hidden border-0 shadow-xl">
                      <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                        <CardTitle className="flex items-center gap-2 text-lg">
                          <AreaChart className="w-5 h-5 text-blue-500" />
                          Behavioral Event Trend
                        </CardTitle>
                        <CardDescription>Monthly behavioral event pattern</CardDescription>
                      </CardHeader>
                      <CardContent className="p-6">
                        <div className="h-60 sm:h-75 lg:h-96">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={behavioralStats.weeklyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                              <XAxis dataKey="date" stroke="#6B7280" />
                              <YAxis stroke="#6B7280" />
                              <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                              <Legend />
                              <Area type="monotone" dataKey="positive" stackId="a" stroke="#10b981" fill="#a7f3d0" />
                              <Area type="monotone" dataKey="minor" stackId="a" stroke="#f59e0b" fill="#fde68a" />
                              <Area type="monotone" dataKey="major" stackId="a" stroke="#fb923c" fill="#ffedd5" />
                              <Area type="monotone" dataKey="critical" stackId="a" stroke="#ef4444" fill="#fecaca" />
                              <Area type="monotone" dataKey="other" stackId="a" stroke="#6B7280" fill="#e6e7ea" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Grade-wise Attendance */}
                  <Card className="overflow-hidden border-0 shadow-xl">
                    <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <PieChart className="w-5 h-5 text-violet-500" />
                        Attendance by Grade Level
                      </CardTitle>
                      <CardDescription>Performance comparison across different grades</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {stats.levelStats.map((grade, index) => (
                          <motion.div
                            key={grade.grade}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-linear-to-br from-white to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50"
                          >
                            <div className="flex items-center justify-between mb-3">
                              <span className="font-semibold text-slate-900 dark:text-white">{grade.grade}</span>
                              <div className="flex items-center gap-2">
                                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  grade.trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                  grade.trend === 'down' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                  'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                                }`}>
                                  {grade.trend === 'up' ? '↑' : grade.trend === 'down' ? '↓' : '→'} {grade.attendance}%
                                </span>

                                {grade.holidayDays > 0 && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-sky-100 text-sky-700 border-0">Holiday {grade.holidayDays}</span>
                                )}
                                {grade.cancelledDays > 0 && (
                                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700 border-0">Cancelled {grade.cancelledDays}</span>
                                )}
                              </div>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">Present</span>
                                <span className="font-medium text-slate-900 dark:text-white">{grade.present}/{grade.total}</span>
                              </div>
                              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${grade.attendance}%` }}
                                  transition={{ duration: 1, delay: index * 0.1 }}
                                  className={`h-full rounded-full ${
                                    grade.attendance >= 75 ? 'bg-linear-to-r from-emerald-500 to-emerald-400' :
                                    grade.attendance >= 50 ? 'bg-linear-to-r from-amber-500 to-amber-400' :
                                    'bg-linear-to-r from-rose-500 to-rose-400'
                                  }`}
                                />
                              </div>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </motion.div>
          )}

          {activeTab === 'ml' && (
            <motion.div
              key="ml"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <Brain className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">AI/ML Risk Insights</h2>
                {mlInsights.loadingMl && <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400 animate-spin" />}
              </div>
              <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-slate-600 dark:text-slate-400">
                <span>Machine learning-based analysis of student risk factors</span>
                <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300">
                  Average risk score: {mlInsights.averageRiskScore.toFixed(1)}/100
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-300">
                  Patterns detected: {mlInsights.patternsDetected}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}>
                  <Card className="border-0 bg-linear-to-br from-violet-50 to-white dark:from-violet-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-violet-500/15 dark:bg-violet-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-violet-600 dark:text-violet-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Students Analyzed</p>
                        <div className="text-lg sm:text-2xl font-bold text-violet-600 dark:text-violet-400 leading-tight">{mlInsights.totalStudentsAnalyzed}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">ML analysis complete</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-violet-500 to-violet-600 text-white items-center justify-center shadow-md shadow-violet-500/20 dark:shadow-violet-500/10 group-hover:scale-105 transition-all duration-300">
                        <Brain className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-violet-400 to-violet-600 dark:from-violet-500 dark:to-violet-700" />
                  </Card>
                </motion.div>

                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <Card className="border-0 bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-rose-500/15 dark:bg-rose-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-rose-600 dark:text-rose-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Critical Risk Students</p>
                        <div className="text-lg sm:text-2xl font-bold text-rose-600 dark:text-rose-400 leading-tight">{mlInsights.criticalRiskStudents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">immediate attention needed</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-rose-500 to-rose-600 text-white items-center justify-center shadow-md shadow-rose-500/20 dark:shadow-rose-500/10 group-hover:scale-105 transition-all duration-300">
                        <Shield className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-rose-400 to-rose-600 dark:from-rose-500 dark:to-rose-700" />
                  </Card>
                </motion.div>

                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.15 }}>
                  <Card className="border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/15 dark:bg-amber-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-amber-600 dark:text-amber-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">High Risk Students</p>
                        <div className="text-lg sm:text-2xl font-bold text-amber-600 dark:text-amber-400 leading-tight">{mlInsights.highRiskStudents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">requiring monitoring</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-amber-500 to-amber-600 text-white items-center justify-center shadow-md shadow-amber-500/20 dark:shadow-amber-500/10 group-hover:scale-105 transition-all duration-300">
                        <Eye className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-amber-400 to-amber-600 dark:from-amber-500 dark:to-amber-700" />
                  </Card>
                </motion.div>

                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Card className="border-0 bg-linear-to-br from-cyan-50 to-white dark:from-cyan-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/15 dark:bg-cyan-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-cyan-600 dark:text-cyan-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Students At Risk</p>
                        <div className="text-lg sm:text-2xl font-bold text-cyan-600 dark:text-cyan-400 leading-tight">{mlInsights.atRiskStudents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">high + critical risk level</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-cyan-500 to-cyan-600 text-white items-center justify-center shadow-md shadow-cyan-500/20 dark:shadow-cyan-500/10 group-hover:scale-105 transition-all duration-300">
                        <Zap className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-cyan-400 to-cyan-600 dark:from-cyan-500 dark:to-cyan-700" />
                  </Card>
                </motion.div>
              </div>

              {isMobile ? (
                <div>
                  <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 shadow-sm overflow-x-auto no-scrollbar">
                    {[
                      { id: 'evidence', label: 'Evidence', icon: Brain },
                      { id: 'drivers', label: 'Drivers', icon: Zap }
                    ].map((panel) => (
                      <button
                        key={panel.id}
                        onClick={() => setMobileMlPanel(panel.id as typeof mobileMlPanel)}
                        className={`flex min-w-24 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                          mobileMlPanel === panel.id
                            ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        <panel.icon className="h-4 w-4" />
                        {panel.label}
                      </button>
                    ))}
                  </div>

                  <AnimatePresence>
                    {mobileMlPanel === 'evidence' && (
                      <motion.div
                        key="mobile-ml-evidence"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.24 }}
                        className="mt-3"
                      >
                        <Card className="overflow-hidden border-0 shadow-xl">
                          <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                              ML Evidence Breakdown
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-6">
                            <div className="h-48 sm:h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <RadarChart
                                  data={[
                                    { metric: 'Attendance', value: stats.averageAttendance, fullMark: 100 },
                                    { metric: 'Late Arrivals', value: Math.min((stats.lateArrivals / Math.max(stats.totalStudents, 1)) * 10, 100), fullMark: 100 },
                                    { metric: 'Behavior Issues', value: Math.min((behavioralStats.negativeEvents / Math.max(behavioralStats.totalEvents, 1)) * 100, 100), fullMark: 100 },
                                    { metric: 'Positive Signals', value: Math.min((behavioralStats.positiveEvents / Math.max(behavioralStats.totalEvents, 1)) * 100, 100), fullMark: 100 },
                                    { metric: 'Risk Score', value: mlInsights.averageRiskScore, fullMark: 100 }
                                  ]}
                                  margin={{ top: 12, right: 24, bottom: 12, left: 24 }}
                                  cx="50%"
                                  cy="52%"
                                >
                                  <PolarGrid />
                                  <PolarAngleAxis dataKey="metric" tick={{ fontSize: 10, fill: '#64748b' }} />
                                  <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: '#64748b' }} />
                                  <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                                </RadarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}

                    {mobileMlPanel === 'drivers' && (
                      <motion.div
                        key="mobile-ml-drivers"
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        transition={{ duration: 0.24 }}
                        className="mt-3"
                      >
                        <Card className="overflow-hidden border-0 shadow-xl">
                          <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                              <Zap className="w-4 h-4 sm:w-5 sm:h-5 text-cyan-500" />
                              Risk Driver Signals
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-6">
                            <div className="h-44 sm:h-64">
                              <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                  data={[
                                    { name: 'Critical', count: mlInsights.criticalRiskStudents, color: '#f43f5e' },
                                    { name: 'High', count: mlInsights.highRiskStudents, color: '#f59e0b' },
                                    { name: 'Patterns', count: mlInsights.patternsDetected, color: '#8b5cf6' },
                                    { name: 'Late Avg', count: Math.round(stats.lateArrivals / Math.max(stats.weeklyData.length, 1)), color: '#06b6d4' }
                                  ]}
                                  margin={{ top: 8, right: 8, left: 0, bottom: 28 }}
                                >
                                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.06} />
                                  <XAxis dataKey="name" stroke="#6B7280" />
                                  <YAxis stroke="#6B7280" />
                                  <Tooltip
                                    contentStyle={{
                                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                      borderRadius: '8px',
                                      border: 'none',
                                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                                    }}
                                  />
                                  <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={18}>
                                    {[
                                      { name: 'Critical', count: mlInsights.criticalRiskStudents, color: '#f43f5e' },
                                      { name: 'High', count: mlInsights.highRiskStudents, color: '#f59e0b' },
                                      { name: 'Patterns', count: mlInsights.patternsDetected, color: '#8b5cf6' },
                                      { name: 'Late Avg', count: Math.round(stats.lateArrivals / Math.max(stats.weeklyData.length, 1)), color: '#06b6d4' }
                                    ].map((entry) => (
                                      <Cell key={entry.name} fill={entry.color} />
                                    ))}
                                  </Bar>
                                </BarChart>
                              </ResponsiveContainer>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="overflow-hidden border-0 shadow-xl">
                    <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Brain className="w-5 h-5 text-violet-500" />
                        ML Evidence Breakdown
                      </CardTitle>
                      <CardDescription>Key signals the model used to produce the insights</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-64 sm:h-80 lg:h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <RadarChart
                            data={[
                              { metric: 'Attendance', value: stats.averageAttendance, fullMark: 100 },
                              { metric: 'Late Arrivals', value: Math.min((stats.lateArrivals / Math.max(stats.totalStudents, 1)) * 10, 100), fullMark: 100 },
                              { metric: 'Behavior Issues', value: Math.min((behavioralStats.negativeEvents / Math.max(behavioralStats.totalEvents, 1)) * 100, 100), fullMark: 100 },
                              { metric: 'Positive Signals', value: Math.min((behavioralStats.positiveEvents / Math.max(behavioralStats.totalEvents, 1)) * 100, 100), fullMark: 100 },
                              { metric: 'Risk Score', value: mlInsights.averageRiskScore, fullMark: 100 }
                            ]}
                            margin={{ top: 24, right: 48, bottom: 24, left: 48 }}
                            cx="50%"
                            cy="52%"
                          >
                            <PolarGrid />
                            <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: '#64748b' }} />
                            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 10, fill: '#64748b' }} />
                            <Radar dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} />
                          </RadarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="overflow-hidden border-0 shadow-xl">
                    <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Zap className="w-5 h-5 text-cyan-500" />
                        Risk Driver Signals
                      </CardTitle>
                      <CardDescription>Aggregated signals that push students into higher risk categories</CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="h-60 sm:h-75 lg:h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={[
                              { name: 'Critical', count: mlInsights.criticalRiskStudents, color: '#f43f5e' },
                              { name: 'High', count: mlInsights.highRiskStudents, color: '#f59e0b' },
                              { name: 'Patterns', count: mlInsights.patternsDetected, color: '#8b5cf6' },
                              { name: 'Late Avg', count: Math.round(stats.lateArrivals / Math.max(stats.weeklyData.length, 1)), color: '#06b6d4' }
                            ]}
                            margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
                          >
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                            <XAxis dataKey="name" stroke="#6B7280" />
                            <YAxis stroke="#6B7280" />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: 'rgba(255, 255, 255, 0.95)',
                                borderRadius: '8px',
                                border: 'none',
                                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                              {[
                                { name: 'Critical', count: mlInsights.criticalRiskStudents, color: '#f43f5e' },
                                { name: 'High', count: mlInsights.highRiskStudents, color: '#f59e0b' },
                                { name: 'Patterns', count: mlInsights.patternsDetected, color: '#8b5cf6' },
                                { name: 'Late Avg', count: Math.round(stats.lateArrivals / Math.max(stats.weeklyData.length, 1)), color: '#06b6d4' }
                              ].map((entry) => (
                                <Cell key={entry.name} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'behavioral' && (
            <motion.div
              key="behavioral"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* Behavioral Summary */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-4 sm:gap-6">
                {/* Total Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}>
                  <Card className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-sky-500/15 dark:bg-sky-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-sky-600 dark:text-sky-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Total Events</p>
                        <div className="text-lg sm:text-2xl font-bold text-sky-600 dark:text-sky-400 leading-tight">{behavioralStats.totalEvents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">all behavioral events</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-sky-500 to-sky-600 text-white items-center justify-center shadow-md shadow-sky-500/20 dark:shadow-sky-500/10 group-hover:scale-105 transition-all duration-300">
                        <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" />
                  </Card>
                </motion.div>

                {/* Positive Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Positive Behavior Events</p>
                        <div className="text-lg sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{behavioralStats.positiveEvents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">reinforcing student progress</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10 group-hover:scale-105 transition-all duration-300">
                        <CheckCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                  </Card>
                </motion.div>

                {/* Negative Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/15 dark:bg-orange-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-orange-600 dark:text-orange-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Major/Critical Incidents</p>
                        <div className="text-lg sm:text-2xl font-bold text-orange-600 dark:text-orange-400 leading-tight">{behavioralStats.negativeEvents}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">major and critical incidents</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-md shadow-orange-500/20 dark:shadow-orange-500/10 group-hover:scale-105 transition-all duration-300">
                        <XCircle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
                  </Card>
                </motion.div>

                {/* At Risk Students Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/15 dark:bg-red-400/10 rounded-full -mr-8 -mt-8 group-hover:scale-125 transition-transform duration-500" />
                    <CardContent className="p-2.5 sm:p-4 flex items-start justify-between relative z-10 gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[9px] sm:text-[10px] text-red-600 dark:text-red-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Students At Risk</p>
                        <div className="text-lg sm:text-2xl font-bold text-red-600 dark:text-red-400 leading-tight">{behavioralStats.studentsAtRisk}</div>
                        <p className="text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">high + critical risk level</p>
                      </div>
                      <div className="hidden sm:flex shrink-0 w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-linear-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-md shadow-red-500/20 dark:shadow-red-500/10 group-hover:scale-105 transition-all duration-300">
                        <AlertTriangle className="w-6 h-6 sm:w-7 sm:h-7" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
                  </Card>
                </motion.div>
              </div>

              {/* Mobile behavioral switcher */}
              {isMobile && (
                <div className="flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800/60 p-1 shadow-sm overflow-x-auto no-scrollbar">
                  {[
                    { id: 'weekly', label: 'Weekly', icon: BarChart3 },
                    { id: 'type', label: 'Types', icon: PieChart },
                    { id: 'risk', label: 'Risk', icon: Shield },
                  ].map((panel) => (
                    <button
                      key={panel.id}
                      onClick={() => setMobileBehavioralPanel(panel.id as typeof mobileBehavioralPanel)}
                      className={`flex min-w-24 flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-medium transition-all ${
                        mobileBehavioralPanel === panel.id
                          ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <panel.icon className="h-4 w-4" />
                      {panel.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Behavioral Charts */}
              {isMobile ? (
                <AnimatePresence mode="wait">
                  {mobileBehavioralPanel === 'weekly' && (
                    <motion.div
                      key="mobile-behavioral-weekly"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.24 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-xl">
                        <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5 text-sky-500" />
                            Weekly Behavioral Trend
                          </CardTitle>
                          <CardDescription className="text-sm sm:text-base">Daily severity breakdown for the last 7 days</CardDescription>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6">
                          <div className="h-56 sm:h-75 lg:h-96">
                            <ResponsiveContainer width="100%" height="100%">
                              <AreaChart data={behavioralStats.weeklyTrend} margin={{ top: 20, right: 16, left: 0, bottom: 5 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                                <XAxis dataKey="date" stroke="#6B7280" />
                                <YAxis stroke="#6B7280" />
                                <Tooltip contentStyle={{ backgroundColor: 'rgba(255, 255, 255, 0.95)', borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }} />
                                <Legend />
                                <Area type="monotone" dataKey="positive" stackId="a" stroke="#10b981" fill="#a7f3d0" />
                                <Area type="monotone" dataKey="minor" stackId="a" stroke="#f59e0b" fill="#fde68a" />
                                <Area type="monotone" dataKey="major" stackId="a" stroke="#fb923c" fill="#ffedd5" />
                                <Area type="monotone" dataKey="critical" stackId="a" stroke="#ef4444" fill="#fecaca" />
                                <Area type="monotone" dataKey="other" stackId="a" stroke="#6B7280" fill="#e6e7ea" />
                              </AreaChart>
                            </ResponsiveContainer>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {mobileBehavioralPanel === 'type' && (
                    <motion.div
                      key="mobile-behavioral-type"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.24 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-xl">
                        <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <PieChart className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" />
                            Events by Type
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6">
                          <div className="h-48 sm:h-68 lg:h-88">
                            <ResponsiveContainer width="100%" height="100%">
                              <RePieChart>
                                <Pie
                                  data={typeBreakdown.chartData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={34}
                                  outerRadius={56}
                                  paddingAngle={4}
                                  dataKey="count"
                                  nameKey="type"
                                >
                                  {typeBreakdown.chartData.map((entry, index) => (
                                    <Cell
                                      key={`cell-${index}`}
                                      fill={entry.color || TYPE_COLORS[index % TYPE_COLORS.length]}
                                    />
                                  ))}
                                </Pie>
                                <Tooltip />
                              </RePieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="mt-4 space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-semibold text-slate-900 dark:text-white">{eventTypeSubtitle}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                  {typeBreakdown.hasOverflow ? 'Long tails are grouped into Other.' : 'All event types fit in the chart.'}
                                </p>
                              </div>
                              {typeBreakdown.hasOverflow && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setShowAllEventTypes((value) => !value)}
                                  className="h-8 px-3 text-xs"
                                >
                                  {showAllEventTypes ? 'Show less' : `Show all (${typeBreakdown.sorted.length})`}
                                </Button>
                              )}
                            </div>
                            <div className={showAllEventTypes ? 'max-h-52 space-y-2 overflow-y-auto pr-1 scrollbar-thin' : 'grid gap-2 sm:grid-cols-2'}>
                              {eventTypeLegendData.map((entry, index) => renderEventTypeItem(entry, index))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  )}

                  {mobileBehavioralPanel === 'risk' && (
                    <motion.div
                      key="mobile-behavioral-risk"
                      initial={{ opacity: 0, x: 16 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      transition={{ duration: 0.24 }}
                    >
                      <Card className="overflow-hidden border-0 shadow-xl">
                        <CardHeader className="bg-linear-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                          <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                            <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                            Risk Level Distribution
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="p-3 sm:p-6">
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-4">
                            {behavioralStats.riskDistribution.map((item, index) => (
                              <div key={item.level} className="space-y-2 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-white/70 dark:bg-slate-900/40 p-3 sm:p-0 sm:border-0 sm:bg-transparent">
                                <div className="flex items-center justify-between gap-2 text-[11px] sm:text-sm">
                                  <span className="min-w-0 truncate text-slate-600 dark:text-slate-400">{item.level}</span>
                                  <span className="shrink-0 font-medium text-slate-900 dark:text-white">
                                    {item.count}
                                  </span>
                                </div>
                                <div className="h-1.5 sm:h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${item.percentage}%` }}
                                    transition={{ duration: 1, delay: index * 0.08 }}
                                    className={`h-full rounded-full bg-linear-to-r ${
                                      item.color === 'emerald' ? 'from-emerald-500 to-emerald-400' :
                                      item.color === 'amber' ? 'from-amber-500 to-amber-400' :
                                      'from-rose-500 to-rose-400'
                                    }`}
                                  />
                                </div>
                                <div className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400">
                                  {item.percentage?.toFixed(1)}%
                                </div>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>

                      <div className="mt-3">
                        <Card className="overflow-hidden border-0 shadow-sm">
                          <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-sm">
                              <Users className="w-4 h-4 text-sky-500" />
                              Top At-Risk Students
                            </CardTitle>
                            <CardDescription className="text-xs">Quick list (top 3)</CardDescription>
                          </CardHeader>
                          <CardContent className="p-3">
                            {atRiskStudents && atRiskStudents.length > 0 ? (
                              <ul className="space-y-2">
                                {atRiskStudents.slice(0, 3).map((s: any, i: number) => (
                                  <li key={s.lrn || i} className="flex items-center justify-between">
                                    <div className="min-w-0">
                                      <div className="text-sm font-medium text-slate-800 dark:text-white truncate">{s.name}</div>
                                      <div className="text-xs text-slate-500 dark:text-slate-400">LRN: {s.lrn}</div>
                                    </div>
                                    <div className="text-right">
                                      <div className="text-sm font-semibold">{s.negativeEvents} events</div>
                                      <div className="text-xs text-slate-500">{s.riskLevel}</div>
                                    </div>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <div className="text-sm text-slate-500">No at-risk students in range.</div>
                            )}
                            <div className="mt-3 text-right">
                              <Button size="sm" variant="ghost" asChild>
                                <a href="/students">View all students</a>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Category Breakdown */}
                  <Card className="overflow-hidden border-0 shadow-xl">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="w-5 h-5 text-violet-500" />
                        Events by Type
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-60 sm:h-72 lg:h-88">
                        <ResponsiveContainer width="100%" height="100%">
                          <RePieChart>
                            <Pie
                              data={typeBreakdown.chartData}
                              cx="50%"
                              cy="50%"
                              innerRadius={54}
                              outerRadius={76}
                              paddingAngle={4}
                              dataKey="count"
                              nameKey="type"
                            >
                              {typeBreakdown.chartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.color || TYPE_COLORS[index % TYPE_COLORS.length]}
                                />
                              ))}
                            </Pie>
                            <Tooltip />
                          </RePieChart>
                        </ResponsiveContainer>
                      </div>
                      <div className="mt-4 space-y-3 rounded-2xl border border-slate-200/70 bg-slate-50/80 p-3 dark:border-slate-700/50 dark:bg-slate-900/40">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">{eventTypeSubtitle}</p>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                              {typeBreakdown.hasOverflow ? 'Showing the most common types first.' : 'All event types are visible here.'}
                            </p>
                          </div>
                          {typeBreakdown.hasOverflow && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => setShowAllEventTypes((value) => !value)}
                              className="h-8 px-3 text-xs"
                            >
                              {showAllEventTypes ? 'Show less' : `Show all (${typeBreakdown.sorted.length})`}
                            </Button>
                          )}
                        </div>
                        <div className={showAllEventTypes ? 'max-h-56 space-y-2 overflow-y-auto pr-1 scrollbar-thin' : 'grid gap-2 sm:grid-cols-2'}>
                          {eventTypeLegendData.map((entry, index) => renderEventTypeItem(entry, index))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Right column: stack Risk Distribution + At-risk list */}
                  <div className="flex flex-col gap-6">
                    <Card className="overflow-hidden border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Shield className="w-5 h-5 text-amber-500" />
                          Risk Level Distribution
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-6 flex flex-col h-full">
                        <div className="flex flex-col justify-center gap-4 h-44 sm:h-56">
                          {behavioralStats.riskDistribution.map((item, index) => (
                            <div key={item.level} className="space-y-2">
                              <div className="flex justify-between text-sm">
                                <span className="text-slate-600 dark:text-slate-400">{item.level}</span>
                                <span className="font-medium text-slate-900 dark:text-white">
                                  {item.count} students ({item.percentage?.toFixed(1)}%)
                                </span>
                              </div>
                              <div className="h-3 sm:h-4 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.percentage}%` }}
                                  transition={{ duration: 1, delay: index * 0.08 }}
                                  className={`h-full rounded-full bg-linear-to-r ${
                                    item.color === 'emerald' ? 'from-emerald-500 to-emerald-400' :
                                    item.color === 'amber' ? 'from-amber-500 to-amber-400' :
                                    'from-rose-500 to-rose-400'
                                  }`}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="overflow-hidden border-0 shadow-xl">
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="w-5 h-5 text-sky-500" />
                          Top At-Risk Students
                        </CardTitle>
                        <CardDescription>
                          Quick list of students with non-low risk (top 5)
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="p-3 sm:p-4">
                        {atRiskStudents && atRiskStudents.length > 0 ? (
                          <ul className="space-y-2">
                            {atRiskStudents.slice(0, 5).map((s, i) => (
                              <li key={s.lrn || i} className="flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="text-sm font-medium text-slate-800 dark:text-white truncate">{s.name}</div>
                                  <div className="text-xs text-slate-500 dark:text-slate-400">LRN: {s.lrn}</div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-semibold">{s.negativeEvents} events</div>
                                  <div className="text-xs text-slate-500">{s.riskLevel}</div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-sm text-slate-500">No at-risk students in the selected range.</div>
                        )}
                        <div className="mt-4 text-right">
                          <Button size="sm" variant="outline" asChild>
                            <a href="/students">View all students</a>
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}

              {/* Weekly Behavioral Trend */}
              {!isMobile && (
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-blue-500" />
                      Weekly Behavioral Trend
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-60 sm:h-75 lg:h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={behavioralStats.weeklyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
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
                          <Legend />
                          <Area type="monotone" dataKey="positive" stackId="a" stroke="#10b981" fill="#a7f3d0" />
                          <Area type="monotone" dataKey="minor" stackId="a" stroke="#f59e0b" fill="#fde68a" />
                          <Area type="monotone" dataKey="major" stackId="a" stroke="#fb923c" fill="#ffedd5" />
                          <Area type="monotone" dataKey="critical" stackId="a" stroke="#ef4444" fill="#fecaca" />
                          <Area type="monotone" dataKey="other" stackId="a" stroke="#6B7280" fill="#e6e7ea" />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}


        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}