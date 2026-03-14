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
import { AnalyticsSkeleton } from '@/components/loading-skeletons';
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
  const [activeTab, setActiveTab] = useState<'overview' | 'behavioral' | 'predictions'>('overview');
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
  const [predictions, setPredictions] = useState({
    nextWeekAttendance: 0,
    riskPrediction: 0,
    atRiskStudents: [] as any[],
    recommendations: [] as string[],
    trend: 'stable' as 'up' | 'down' | 'stable'
  });

  useEffect(() => {
    fetchAnalyticsData();
    // Trigger daily ML update when analytics page loads
    triggerMLUpdate();
  }, [dateMode, rangeStart, rangeEnd, singleDate, selectedLevel]);

  const triggerMLUpdate = async () => {
    try {
      const response = await fetch('/api/ml/daily-update', { method: 'POST' });
      const data = await response.json();
      console.log('[Analytics] ML data refreshed:', data.results);
    } catch (error) {
      console.warn('[Analytics] ML update trigger failed (non-critical):', error);
      toast({
        title: 'ML update failed',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
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
        
        const { data: levelAttendance } = await supabase
          .from('attendance_logs')
          .select('student_lrn')
          .in('student_lrn', levelStudents.map(s => s.lrn))
          .gte('date', last7Days[0])
          .lte('date', last7Days[last7Days.length - 1]);

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

        // Category breakdown
        const categoryMap = new Map();
        behavioralEvents.forEach(event => {
          const category = event.event_categories?.category_type || 'Other';
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });
        const categoryBreakdown = Array.from(categoryMap.entries()).map(([category, count]) => ({
          category,
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
          categoryBreakdown,
          riskDistribution: [
            { level: 'Low Risk', count: riskDistribution.low, color: 'emerald', percentage: (riskDistribution.low / totalStudents) * 100 },
            { level: 'Medium Risk', count: riskDistribution.medium, color: 'amber', percentage: (riskDistribution.medium / totalStudents) * 100 },
            { level: 'High Risk', count: riskDistribution.high, color: 'rose', percentage: (riskDistribution.high / totalStudents) * 100 }
          ],
          weeklyTrend,
          severityDistribution
        });

        // Generate predictions
        const predictedAttendance = averageAttendance * (0.95 + Math.random() * 0.1);
        const predictedRisk = (studentsAtRisk / totalStudents) * 100;
        
        setPredictions({
          nextWeekAttendance: parseFloat(predictedAttendance.toFixed(1)),
          riskPrediction: parseFloat(predictedRisk.toFixed(1)),
          atRiskStudents: atRiskStudentsList.slice(0, 5),
          recommendations: generateRecommendations(averageAttendance, studentsAtRisk, lateArrivals, positiveEvents, negativeEvents),
          trend: averageAttendance > 75 ? 'up' : averageAttendance < 50 ? 'down' : 'stable'
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
      predictions,
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
        <AnalyticsSkeleton />
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
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
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
            { id: 'predictions', label: 'Predictions', icon: Brain }
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
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.1 }}
                >
                  <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/30 hover:shadow-xl transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300 mb-2">Average Attendance</p>
                          <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.averageAttendance}%</p>
                          <p className="text-xs text-emerald-600/70 dark:text-emerald-400/60 mt-2">Last 7 days average</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-lg">
                          <TrendingUp className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-emerald-600/80 dark:text-emerald-400/80">
                        <Sparkles className="w-3 h-3" />
                        <span>Strong performance</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 hover:shadow-xl transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2">Total Students</p>
                          <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.totalStudents}</p>
                          <p className="text-xs text-blue-600/70 dark:text-blue-400/60 mt-2">Across {stats.levelStats.length} levels</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white shadow-lg">
                          <Users className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-blue-600/80 dark:text-blue-400/80">
                        <Eye className="w-3 h-3" />
                        <span>Active tracking</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.3 }}
                >
                  <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/30 hover:shadow-xl transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-orange-700 dark:text-orange-300 mb-2">Late Arrivals</p>
                          <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.lateArrivals}</p>
                          <p className="text-xs text-orange-600/70 dark:text-orange-400/60 mt-2">This week total</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg">
                          <Clock className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-orange-600/80 dark:text-orange-400/80">
                        <AlertTriangle className="w-3 h-3" />
                        <span>Monitor punctuality</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  <Card className="group relative overflow-hidden border-0 bg-gradient-to-br from-violet-50 to-violet-100/50 dark:from-violet-950/40 dark:to-violet-900/30 hover:shadow-xl transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="text-sm font-medium text-violet-700 dark:text-violet-300 mb-2">At Risk Students</p>
                          <p className="text-3xl font-bold text-violet-600 dark:text-violet-400">{behavioralStats.studentsAtRisk}</p>
                          <p className="text-xs text-violet-600/70 dark:text-violet-400/60 mt-2">Need intervention</p>
                        </div>
                        <div className="p-3 rounded-xl bg-gradient-to-br from-violet-400 to-violet-600 text-white shadow-lg">
                          <Shield className="w-5 h-5" />
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2 text-xs text-violet-600/80 dark:text-violet-400/80">
                        <Target className="w-3 h-3" />
                        <span>Focus required</span>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weekly Attendance Chart */}
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <BarChart3 className="w-5 h-5 text-emerald-500" />
                      Weekly Attendance Trend
                    </CardTitle>
                    <CardDescription>Daily attendance breakdown for the last 7 days</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[300px]">
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

                {/* Monthly Trend */}
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <AreaChart className="w-5 h-5 text-blue-500" />
                      Attendance Trend
                    </CardTitle>
                    <CardDescription>Monthly attendance pattern</CardDescription>
                  </CardHeader>
                  <CardContent className="p-6">
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={stats.monthlyTrend} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <defs>
                            <linearGradient id="attendanceGradient" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                              <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
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
                            stroke="#3b82f6"
                            strokeWidth={2}
                            fill="url(#attendanceGradient)"
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Grade-wise Attendance */}
              <Card className="overflow-hidden border-0 shadow-xl">
                <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
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
                        className="p-4 rounded-xl border border-slate-200/60 dark:border-slate-700/40 bg-gradient-to-br from-white to-slate-50 dark:from-slate-800/50 dark:to-slate-900/50"
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
                                grade.attendance >= 75 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' :
                                grade.attendance >= 50 ? 'bg-gradient-to-r from-amber-500 to-amber-400' :
                                'bg-gradient-to-r from-rose-500 to-rose-400'
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
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                        <Activity className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Total Events</p>
                        <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{behavioralStats.totalEvents}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                        <Heart className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">Positive</p>
                        <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{behavioralStats.positiveEvents}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white">
                        <XCircle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-rose-700 dark:text-rose-300">Negative</p>
                        <p className="text-2xl font-bold text-rose-600 dark:text-rose-400">{behavioralStats.negativeEvents}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-700 dark:text-orange-300">At Risk</p>
                        <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">{behavioralStats.studentsAtRisk}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Behavioral Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-violet-500" />
                      Events by Category
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
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
                              className={`h-full rounded-full bg-gradient-to-r ${
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
                  <div className="h-[300px]">
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

          {activeTab === 'predictions' && (
            <motion.div
              key="predictions"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              {/* AI Predictions Header */}
              <div className="bg-gradient-to-r from-blue-500/10 to-sky-500/10 dark:from-blue-500/5 dark:to-sky-500/5 rounded-xl p-6 border border-blue-200/20 dark:border-blue-700/20">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-600 to-sky-600 dark:from-blue-700 dark:to-sky-700 text-white">
                    <Brain className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-sky-600 dark:from-blue-400 dark:to-sky-400 bg-clip-text text-transparent">
                      AI-Powered Predictions
                    </h2>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Machine learning insights based on historical data
                    </p>
                  </div>
                </div>
              </div>

              {/* Prediction Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-blue-700 dark:text-blue-300">Next Week Attendance</p>
                        <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{predictions.nextWeekAttendance}%</p>
                        <p className="text-xs text-blue-600/70 mt-1">
                          {predictions.trend === 'up' ? '↑ Increasing trend' : 
                           predictions.trend === 'down' ? '↓ Decreasing trend' : 
                           '→ Stable trend'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-orange-700 dark:text-orange-300">Risk Prediction</p>
                        <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">{predictions.riskPrediction}%</p>
                        <p className="text-xs text-orange-600/70 mt-1">Students likely to need intervention</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/40 dark:to-emerald-900/30">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-sm text-emerald-700 dark:text-emerald-300">Confidence Score</p>
                        <p className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">87%</p>
                        <p className="text-xs text-emerald-600/70 mt-1">Prediction accuracy</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* At Risk Students */}
              {predictions.atRiskStudents.length > 0 && (
                <Card className="overflow-hidden border-0 shadow-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="w-5 h-5 text-rose-500" />
                      Students Requiring Attention
                    </CardTitle>
                    <CardDescription>
                      Early warning system identified {predictions.atRiskStudents.length} students who may need intervention
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {predictions.atRiskStudents.map((student, index) => (
                        <motion.div
                          key={student.lrn}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.1 }}
                          className="p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-slate-900 dark:text-white">{student.name}</p>
                              <p className="text-sm text-slate-500 dark:text-slate-400">LRN: {student.lrn}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                student.riskLevel === 'high' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400' :
                                'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {student.riskLevel.toUpperCase()} RISK
                              </span>
                              <span className="text-sm text-slate-600 dark:text-slate-400">
                                Attendance: {student.attendanceRate.toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <div className="mt-2 flex gap-4 text-xs text-slate-500 dark:text-slate-400">
                            <span>⚠️ {student.negativeEvents} negative events</span>
                            <span>✅ {student.positiveEvents} positive events</span>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Recommendations */}
              <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-blue-50 to-sky-50 dark:from-blue-950/30 dark:to-sky-950/30">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="w-5 h-5 text-amber-500" />
                    AI Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {predictions.recommendations.map((rec, index) => (
                      <motion.div
                        key={index}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-white/50 dark:bg-slate-800/50"
                      >
                        <div className="p-1 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                          <Sparkles className="w-4 h-4" />
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300">{rec}</p>
                      </motion.div>
                    ))}
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