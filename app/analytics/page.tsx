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
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/lib/supabase';
import { MLDashboard } from '@/components/ml-dashboard';
import { AnalyticsPageSkeleton } from '@/components/analytics-skeleton';
import { DateLevelFilter } from '@/components/date-level-filter';
import { motion, AnimatePresence } from 'framer-motion';
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
      const last7Days = dateRange.slice(-7);

      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*, students!inner(*)')
        .gte('date', dateRange[0])
        .lte('date', dateRange[dateRange.length - 1]);

      if (attendanceError) {
        setLoading(false);
        toast({
          title: 'Failed to fetch attendance',
          description: attendanceError.message || String(attendanceError),
          variant: 'destructive',
        });
        return;
      }

      // Calculate weekly stats (last 7 days)
      const weeklyData = last7Days.map(date => {
        const dayAttendance = attendance?.filter(a => a.date === date) || [];
        const lateCount = dayAttendance.filter(a => {
          const checkInTime = new Date(a.check_in_time);
          const cutoffTime = new Date(checkInTime);
          cutoffTime.setHours(8, 30, 0, 0);
          return checkInTime > cutoffTime;
        }).length;

        return {
          day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
          date,
          present: dayAttendance.length,
          absent: totalStudents - dayAttendance.length,
          late: lateCount,
          attendanceRate: totalStudents > 0 ? (dayAttendance.length / totalStudents) * 100 : 0
        };
      });

      // Calculate monthly trend
      const monthlyTrend = dateRange.map(date => {
        const dayAttendance = attendance?.filter(a => a.date === date) || [];
        return {
          date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          attendance: totalStudents > 0 ? (dayAttendance.length / totalStudents) * 100 : 0,
          present: dayAttendance.length
        };
      });

      // Calculate average attendance
      const totalPresent = weeklyData.reduce((sum, day) => sum + day.present, 0);
      const averageAttendance = totalStudents > 0 ? (totalPresent / (totalStudents * weeklyData.length)) * 100 : 0;

      // Calculate total late arrivals this week
      const lateArrivals = weeklyData.reduce((sum, day) => sum + day.late, 0);

      // Calculate level stats
      const levels = [...new Set(students?.map(s => s.level))];
      const levelStats = await Promise.all(levels.map(async level => {
        const levelStudents = students?.filter(s => s.level === level) || [];
        const levelTotal = levelStudents.length;
        
        const { data: levelAttendance } = supabase
          ? await supabase
              .from('attendance_logs')
              .select('student_lrn')
              .in('student_lrn', levelStudents.map(s => s.lrn))
              .gte('date', last7Days[0])
              .lte('date', last7Days[last7Days.length - 1])
          : { data: [] };

        const uniqueAttendances = new Set(levelAttendance?.map(a => a.student_lrn)).size;
        const attendance = levelTotal > 0 ? (uniqueAttendances / levelTotal) * 100 : 0;

        return {
          grade: level,
          total: levelTotal,
          present: uniqueAttendances,
          attendance: parseFloat(attendance.toFixed(1)),
          trend: attendance > 75 ? 'up' : attendance < 50 ? 'down' : 'stable'
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

      // Fetch behavioral data
      let behavioralQuery = supabase
        .from('behavioral_events')
        .select('*, event_categories(category_type), students!inner(*)')
        .gte('event_date', dateRange[0])
        .lte('event_date', dateRange[dateRange.length - 1]);

      if (students && students.length > 0) {
        behavioralQuery = behavioralQuery.in('student_lrn', students.map(s => s.lrn));
      }

      const { data: behavioralEvents, error: behavioralError } = await behavioralQuery;

      if (!behavioralError && behavioralEvents) {
        const positiveEvents = behavioralEvents.filter(e => e.severity === 'positive').length;
        const negativeEvents = behavioralEvents.filter(e => 
          e.severity === 'major' || e.severity === 'critical'
        ).length;


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

        // Weekly trend
        const weeklyTrend = last7Days.map(date => {
          const dayEvents = behavioralEvents.filter(e => e.event_date === date);
          return {
            date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
            positive: dayEvents.filter(e => e.severity === 'positive').length,
            negative: dayEvents.filter(e => e.severity === 'major' || e.severity === 'critical').length,
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
          if (event.severity === 'positive') {
            stats.positive++;
          } else if (event.severity === 'major' || event.severity === 'critical') {
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
    const data = {
      attendance: stats,
      behavioral: behavioralStats,
      exportDate: new Date().toISOString(),
      filters: {
        dateMode,
        rangeStart,
        rangeEnd,
        selectedLevel
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
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
                    <div className="h-75">
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
                          <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="late" fill="#f59e0b" radius={[4, 4, 0, 0]} />
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
                    <div className="h-75">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={behavioralStats.weeklyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="behavioralGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
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
                            dataKey="total"
                            stroke="#ef4444"
                            strokeWidth={2}
                            fill="url(#behavioralGradient)"
                          />
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
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            grade.trend === 'up' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                            grade.trend === 'down' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                            'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                          }`}>
                            {grade.trend === 'up' ? '↑' : grade.trend === 'down' ? '↓' : '→'} {grade.attendance}%
                          </span>
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
                    <div className="h-75">
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
                    <div className="h-75">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={behavioralStats.weeklyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="date" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <Tooltip />
                        <Legend />
                        <Line type="monotone" dataKey="positive" stroke="#10b981" strokeWidth={2} />
                        <Line type="monotone" dataKey="negative" stroke="#ef4444" strokeWidth={2} />
                        <Line type="monotone" dataKey="total" stroke="#3b82f6" strokeWidth={2} />
                      </LineChart>
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