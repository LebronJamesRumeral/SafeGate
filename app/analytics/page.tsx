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
  const [activeTab, setActiveTab] = useState<'overview' | 'behavioral'>('overview');
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


  useEffect(() => {
    fetchAnalyticsData();
  }, [dateMode, rangeStart, rangeEnd, singleDate, selectedLevel]);



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

      const dateRange = buildDateRange(normalizedStart, normalizedEnd);
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
        
        for (const student of students || []) {
          const studentStats = studentEventMap.get(student.lrn) || { positive: 0, negative: 0 };
          const studentAttendance = attendance?.filter(a => a.student_lrn === student.lrn).length || 0;
          const attendanceRate = (studentAttendance / dateRange.length) * 100;
          
          let riskLevel = 'low';
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

        const applySummaryCard = (
          sheet: any,
          range: string,
          label: string,
          value: string,
          accent: string
        ) => {
          sheet.mergeCells(range);
          const cell = sheet.getCell(range.split(':')[0]);
          cell.value = `${label}\n${value}`;
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: theme.slate900 } };
          cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
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
              } else {
                cell.font = { name: 'Calibri', size: 10, color: { argb: theme.slate700 } };
                cell.fill = solidFill(row % 2 === 0 ? theme.slate50 : theme.white);
                cell.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
              }
            }
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
              // place image to the left side of the title area (approx column A/B), preserve aspect ratio
              sheet.addImage(logoId, {
                tl: { col: 0.25, row: 0.08 },
                ext: { width, height },
                editAs: 'oneCell',
              });
            }
          } catch (logoError) {
            console.warn('SGCDC logo could not be embedded in Excel export:', logoError);
          }

          sheet.getRow(1).height = 30;
          sheet.getRow(2).height = 40;
          sheet.getRow(3).height = 22;
          sheet.getRow(4).height = 22;

          sheet.mergeCells(options.kickerRange);
          const kickerCell = sheet.getCell(options.kickerRange.split(':')[0]);
          kickerCell.value = `  ${options.kickerText}`;
          kickerCell.font = { name: 'Calibri', size: 9, bold: true, color: { argb: theme.gold } };
          kickerCell.fill = solidFill(theme.navy);
          kickerCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
          kickerCell.border = borderAll(theme.navy);

          sheet.mergeCells(options.titleRange);
          const titleCell = sheet.getCell(options.titleRange.split(':')[0]);
          titleCell.value = options.titleText;
          titleCell.font = { name: 'Calibri', size: 28, bold: true, color: { argb: theme.white } };
          titleCell.fill = solidFill(theme.blue);
          titleCell.alignment = { vertical: 'middle', horizontal: 'left' };
          titleCell.border = borderAll(theme.blue);
          titleCell.border = borderAll(theme.blue);

          sheet.mergeCells(options.badgeRange);
          const badgeCell = sheet.getCell(options.badgeRange.split(':')[0]);
          badgeCell.value = options.badgeText;
          badgeCell.font = { name: 'Calibri', size: 10, bold: true, color: { argb: theme.white } };
          badgeCell.fill = solidFill(options.badgeFill);
          badgeCell.alignment = { vertical: 'middle', horizontal: 'center' };
          badgeCell.border = borderAll(options.badgeBorder);

          sheet.getRow(1).height = 30;
          sheet.getRow(2).height = 40;
          sheet.getRow(3).height = 22;
          sheet.getRow(4).height = 22;
        };

        // Attendance worksheet
        const ws = wb.addWorksheet('Attendance', { views: [{ state: 'frozen', ySplit: 5 }] });
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

        ws.mergeCells('B3:G3');
        const metaAttendance = ws.getCell('B3');
        // Use a proper Excel date for export timestamp so consumers can sort/filter by it
        metaAttendance.value = new Date();
        metaAttendance.numFmt = 'mm/dd/yyyy hh:mm:ss AM/PM';
        metaAttendance.font = { name: 'Calibri', size: 10, color: { argb: theme.white } };
        metaAttendance.fill = solidFill(theme.navy);
        metaAttendance.alignment = { vertical: 'middle', horizontal: 'left' };

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
          const headerRow = ws.addRow(headers);
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
          const headerRow = ws.addRow(headers);
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
        } else {
          const emptyRow = ws.addRow(['No monthly trend data available']);
          emptyRow.eachCell((cell: ExcelCell) => {
            cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: theme.slate500 } };
            cell.fill = solidFill(theme.slate50);
            cell.border = borderAll();
          });
        }

        // Column widths
        ws.columns = [
          { key: 'col1', width: 18 },
          { key: 'col2', width: 14 },
          { key: 'col3', width: 12 },
          { key: 'col4', width: 12 },
          { key: 'col5', width: 14 },
          { key: 'col6', width: 14 },
          { key: 'col7', width: 14 },
        ];

        // Behavioral worksheet
        const wbBeh = wb.addWorksheet('Behavioral', { views: [{ state: 'frozen', ySplit: 5 }] });
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

        wbBeh.mergeCells('B3:G3');
        const bMeta = wbBeh.getCell('B3');
        bMeta.value = new Date();
        bMeta.numFmt = 'mm/dd/yyyy hh:mm:ss AM/PM';
        bMeta.font = { name: 'Calibri', size: 10, color: { argb: theme.white } };
        bMeta.fill = solidFill(theme.navy);
        bMeta.alignment = { vertical: 'middle', horizontal: 'left' };

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
          const headerRow = wbBeh.addRow(headers);
          behavioralStats.weeklyTrend.forEach((r: any) => wbBeh.addRow(Object.values(r)));

          styleTable(wbBeh, headerRow.number, wbBeh.lastRow.number, 1, headers.length, theme.navy, theme.orange);
        } else {
          const emptyRow = wbBeh.addRow(['No weekly behavioral trend data available']);
          emptyRow.eachCell((cell: ExcelCell) => {
            cell.font = { name: 'Calibri', size: 10, italic: true, color: { argb: theme.slate500 } };
            cell.fill = solidFill(theme.slate50);
            cell.border = borderAll();
          });
        }

        wbBeh.columns = [
          { key: 'bcol1', width: 26 },
          { key: 'bcol2', width: 16 },
          { key: 'bcol3', width: 14 },
          { key: 'bcol4', width: 12 },
          { key: 'bcol5', width: 12 },
          { key: 'bcol6', width: 12 },
          { key: 'bcol7', width: 12 },
        ];

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
            { id: 'behavioral', label: 'Behavioral', icon: Activity }
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

        {/* Date and Level Filter */}
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm p-3 sm:p-6 rounded-xl border border-slate-200/60 dark:border-slate-700/40 shadow-lg">
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
        </div>

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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {/* Total Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}>
                  <Card className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-500/5 dark:bg-sky-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Events</p>
                        <div className="text-xl sm:text-4xl font-bold text-sky-600 dark:text-sky-400">{behavioralStats.totalEvents}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">all behavioral events</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-sky-500 to-sky-600 text-white items-center justify-center shadow-lg shadow-sky-500/25 dark:shadow-sky-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <BarChart3 className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" />
                  </Card>
                </motion.div>

                {/* Positive Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Positive Behavior Events</p>
                        <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{behavioralStats.positiveEvents}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">reinforcing student progress</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                  </Card>
                </motion.div>

                {/* Negative Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Major/Critical Incidents</p>
                        <div className="text-xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400">{behavioralStats.negativeEvents}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">major and critical incidents</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <XCircle className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
                  </Card>
                </motion.div>

                {/* At Risk Students Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Students Needing Intervention</p>
                        <div className="text-xl sm:text-4xl font-bold text-red-600 dark:text-red-400">{behavioralStats.studentsAtRisk}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">high or critical risk level</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-lg shadow-red-500/25 dark:shadow-red-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
                  </Card>
                </motion.div>
              </div>

              {/* Charts Grid */}
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
                          <Tooltip
                            contentStyle={{
                              backgroundColor: 'rgba(255, 255, 255, 0.95)',
                              borderRadius: '8px',
                              border: 'none',
                              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                            }}
                          />
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
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                {/* Total Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.05 }}>
                  <Card className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-sky-500/5 dark:bg-sky-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Events</p>
                        <div className="text-xl sm:text-4xl font-bold text-sky-600 dark:text-sky-400">{behavioralStats.totalEvents}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">all behavioral events</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-sky-500 to-sky-600 text-white items-center justify-center shadow-lg shadow-sky-500/25 dark:shadow-sky-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <BarChart3 className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" />
                  </Card>
                </motion.div>

                {/* Positive Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 }}>
                  <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Positive Behavior Events</p>
                        <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{behavioralStats.positiveEvents}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">reinforcing student progress</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <CheckCircle className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                  </Card>
                </motion.div>

                {/* Negative Events Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.2 }}>
                  <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Major/Critical Incidents</p>
                        <div className="text-xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400">{behavioralStats.negativeEvents}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">major and critical incidents</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <XCircle className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
                  </Card>
                </motion.div>

                {/* At Risk Students Card */}
                <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }}>
                  <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
                    <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                      <div>
                        <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Students Needing Intervention</p>
                        <div className="text-xl sm:text-4xl font-bold text-red-600 dark:text-red-400">{behavioralStats.studentsAtRisk}</div>
                        <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">high or critical risk level</p>
                      </div>
                      <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-lg shadow-red-500/25 dark:shadow-red-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                        <AlertTriangle className="w-8 h-8" />
                      </div>
                    </CardContent>
                    <div className="h-1 w-full bg-linear-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
                  </Card>
                </motion.div>
              </div>

              {/* Behavioral Charts */}
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
                    <div className="h-60 sm:h-75 lg:h-96">
                      <ResponsiveContainer width="100%" height="100%">
                        <RePieChart>
                          <Pie
                            data={behavioralStats.categoryBreakdown}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="count"
                            nameKey="type"
                          >
                            {behavioralStats.categoryBreakdown.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={[COLORS.emerald[0], COLORS.amber[0], COLORS.rose[0], COLORS.blue[0], COLORS.violet[0]][index % 5]} 
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend />
                        </RePieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Risk Distribution */}
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="w-5 h-5 text-amber-500" />
                      Risk Level Distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {behavioralStats.riskDistribution.map((item, index) => (
                        <div key={item.level} className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-slate-600 dark:text-slate-400">{item.level}</span>
                            <span className="font-medium text-slate-900 dark:text-white">
                              {item.count} students ({item.percentage?.toFixed(1)}%)
                            </span>
                          </div>
                          <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${item.percentage}%` }}
                              transition={{ duration: 1, delay: index * 0.1 }}
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
              </div>

              {/* Weekly Behavioral Trend */}
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
            </motion.div>
          )}


        </AnimatePresence>
      </motion.div>
    </DashboardLayout>
  );
}