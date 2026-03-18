'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, AlertTriangle, CheckCircle, TrendingUp, XCircle, BarChart3, Activity, Calendar, Filter, Cloud, Sun, Moon } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { supabase } from '@/lib/supabase';
import { calculateStudentRiskScore, calculateBatchRiskScores } from '@/lib/ml-risk-calculator';
import { MLDashboard } from '@/components/ml-dashboard';
import { DashboardSkeleton } from '@/components/loading-skeletons';
import { DateLevelFilter } from '@/components/date-level-filter';
import { motion } from 'framer-motion';
import { useTheme } from 'next-themes';

type DateMode = 'all' | 'single' | 'range';

// Enforce consistent layout structure for dashboard
export default function Dashboard() {
  const router = useRouter();
  const { theme } = useTheme();
  const [authLoading, setAuthLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [dateMode, setDateMode] = useState<DateMode>('all');
  const [singleDate, setSingleDate] = useState(new Date().toISOString().split('T')[0]);
  const [rangeStart, setRangeStart] = useState(new Date().toISOString().split('T')[0]);
  const [rangeEnd, setRangeEnd] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [loading, setLoading] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [stats, setStats] = useState({
    totalPresent: 0,
    totalStudents: 0,
    lateArrivals: 0,
    earlyDepartures: 0,
    absent: 0,
    checkIns: 0
  });
  const [behavioralStats, setBehavioralStats] = useState({
    positiveEvents: 0,
    negativeEvents: 0,
    studentsAtRisk: 0
  });
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const [topGrades, setTopGrades] = useState<any[]>([]);
  const [userRole, setUserRole] = useState<string>('admin');

  // Weather data (mock)
  const weather = {
    temp: 26,
    condition: 'Mostly cloudy',
    icon: Cloud
  };

  // Check authentication on mount
  useEffect(() => {
    const userStr = localStorage.getItem('safegate_user');
    if (!userStr) {
      router.push('/login');
      return;
    }
    try {
      const user = JSON.parse(userStr);
      setUserRole(user.role || 'admin');
    } catch (e) {
      setUserRole('admin');
    }
    setIsAuthenticated(true);
    setAuthLoading(false);
  }, [router]);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchDashboardData();
  }, [dateMode, singleDate, rangeStart, rangeEnd, selectedLevel, isAuthenticated]);

  // Fetch dashboard data with improved error handling and loading state
  const fetchDashboardData = async () => {
    if (!supabase) {
      setLoading(false);
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
        setLoading(false);
        // Optionally show a toast or error message here
        return;
      }
      const totalStudents = students?.length || 0;

      // Build attendance query based on date mode
      let attendanceQuery = supabase
        .from('attendance_logs')
        .select('*, students(name, level)');

      if (dateMode === 'single') {
        attendanceQuery = attendanceQuery.eq('date', singleDate);
      } else if (dateMode === 'range') {
        attendanceQuery = attendanceQuery
          .gte('date', rangeStart)
          .lte('date', rangeEnd);
      }

      const { data: attendance, error: attendanceError } = await attendanceQuery;
      if (attendanceError) {
        setLoading(false);
        // Optionally show a toast or error message here
        return;
      }

      // Filter by level if selected
      let filteredAttendance = attendance || [];
      if (selectedLevel !== 'all') {
        filteredAttendance = filteredAttendance.filter(a => a.students?.level === selectedLevel);
      }

      // Calculate stats
      const totalPresent = new Set(filteredAttendance.map(a => a.student_lrn)).size;
      const totalCheckIns = filteredAttendance.length;
      
      const lateArrivals = filteredAttendance.filter(a => {
        const checkInTime = new Date(a.check_in_time);
        const hours = checkInTime.getHours();
        const minutes = checkInTime.getMinutes();
        return hours > 8 || (hours === 8 && minutes > 30);
      }).length;

      const earlyDepartures = filteredAttendance.filter(a => {
        if (!a.check_out_time) return false;
        const checkOutTime = new Date(a.check_out_time);
        const hours = checkOutTime.getHours();
        return hours < 15;
      }).length;

      setStats({
        totalPresent,
        totalStudents,
        lateArrivals,
        earlyDepartures,
        absent: totalStudents - totalPresent,
        checkIns: totalCheckIns
      });

      // Calculate top students by attendance
      const studentAttendance = filteredAttendance.reduce((acc: any, curr) => {
        const key = curr.student_lrn;
        if (!acc[key]) {
          acc[key] = {
            lrn: key,
            name: curr.students?.name || 'Unknown',
            level: curr.students?.level || 'N/A',
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {});

      const topStudentsData = Object.values(studentAttendance)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 4);
      setTopStudents(topStudentsData);

      // Calculate attendance by grade
      const gradeAttendance = filteredAttendance.reduce((acc: any, curr) => {
        const level = curr.students?.level || 'N/A';
        if (!acc[level]) {
          acc[level] = { level, count: 0 };
        }
        acc[level].count++;
        return acc;
      }, {});

      const topGradesData = Object.values(gradeAttendance)
        .sort((a: any, b: any) => b.count - a.count)
        .slice(0, 4);
      setTopGrades(topGradesData);

      // Fetch behavioral data
      let behavioralQuery = supabase
        .from('behavioral_events')
        .select('*, students(level)');

      if (dateMode === 'single') {
        behavioralQuery = behavioralQuery.eq('event_date', singleDate);
      } else if (dateMode === 'range') {
        behavioralQuery = behavioralQuery
          .gte('event_date', rangeStart)
          .lte('event_date', rangeEnd);
      }

      const { data: behavioralEvents, error: behavioralError } = await behavioralQuery;

      if (!behavioralError && behavioralEvents) {
        let filteredBehavioral = behavioralEvents;
        if (selectedLevel !== 'all') {
          filteredBehavioral = behavioralEvents.filter(e => e.students?.level === selectedLevel);
        }

        const positiveEvents = filteredBehavioral.filter(e => e.severity === 'positive').length;
        const negativeEvents = filteredBehavioral.filter(e => 
          e.severity === 'major' || e.severity === 'critical'
        ).length;

        // Calculate students at risk using improved ML function (with fallback)
        let studentsAtRisk = 0;
        try {
          const studentsData = await supabase
            .from('students')
            .select('lrn')
            .eq('status', 'active');

          if (studentsData.data && studentsData.data.length > 0) {
            const riskScores = await calculateBatchRiskScores(
              studentsData.data.map(s => s.lrn)
            );
            
            riskScores.forEach((score) => {
              if (score && (score.risk_level === 'high' || score.risk_level === 'critical')) {
                studentsAtRisk++;
              }
            });
          }
        } catch (riskError) {
          // Fallback: Simple calculation based on behavioral events
          console.warn('ML risk scoring unavailable, using fallback method:', riskError);
          const studentEventMap = new Map();
          filteredBehavioral.forEach(event => {
            const lrn = event.student_lrn;
            if (!studentEventMap.has(lrn)) {
              studentEventMap.set(lrn, { negative: 0, positive: 0 });
            }
            const stats = studentEventMap.get(lrn);
            if (event.severity === 'positive') {
              stats.positive++;
            } else if (event.severity === 'major' || event.severity === 'critical') {
              stats.negative++;
            }
          });

          studentEventMap.forEach((stats) => {
            if (stats.negative >= 2) {
              studentsAtRisk++;
            }
          });
        }

        setBehavioralStats({
          positiveEvents,
          negativeEvents,
          studentsAtRisk
        });
      }

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
      setIsInitialLoad(false);
    }
  };

  const clearFilters = () => {
    setSelectedLevel('all');
    setDateMode('all');
  };

  const getDateRangeText = () => {
    if (dateMode === 'all') return 'All dates';
    if (dateMode === 'single') return new Date(singleDate).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
    return `${new Date(rangeStart).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })} - ${new Date(rangeEnd).toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' })}`;
  };

  const maxCount = Math.max(...topStudents.map((s: any) => s.count), 1);
  const maxGradeCount = Math.max(...topGrades.map((g: any) => g.count), 1);

  // Don't render if not authenticated (will redirect to login)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <DashboardLayout>
      {authLoading || (loading && isInitialLoad) ? (
        <DashboardSkeleton />
      ) : (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6 max-w-7xl mx-auto"
      >
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              {userRole === 'teacher' ? 'Teacher Dashboard' : userRole === 'guidance' ? 'Guidance Dashboard' : 'Admin Dashboard'}
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
              Track behavioral events and intervention risk first, with attendance and QR data as supporting context.
            </p>
          </div>
          
          {/* Weather Widget */}
          <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-slate-200 dark:border-slate-700 shadow-sm">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-sky-900/40">
              <weather.icon className="w-5 h-5 text-sky-600 dark:text-sky-400" />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">{weather.temp}°C</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{weather.condition}</p>
            </div>
          </div>
        </div>

        {/* Date and Level Filter */}
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

        {/* Metric Cards */}
        <div className="grid grid-cols-3 gap-2 sm:gap-5">
          {/* Positive Behavior Events Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Positive Behavior Events</p>
                  <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{behavioralStats.positiveEvents}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">reinforcing student progress</p>
                </div>
                <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <CheckCircle className="w-8 h-8" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
            </Card>
          </motion.div>

          {/* Students At Risk Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/10 dark:bg-red-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-red-500/5 dark:bg-red-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Students Needing Intervention</p>
                  <div className="text-xl sm:text-4xl font-bold text-red-600 dark:text-red-400">{behavioralStats.studentsAtRisk}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">high or critical risk level</p>
                </div>
                <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-red-500 to-red-600 text-white items-center justify-center shadow-lg shadow-red-500/25 dark:shadow-red-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <AlertTriangle className="w-8 h-8" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-red-400 to-red-600 dark:from-red-500 dark:to-red-700" />
            </Card>
          </motion.div>

          {/* Major/Critical Incidents Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-12 -mb-12 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Major/Critical Incidents</p>
                  <div className="text-xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400">{behavioralStats.negativeEvents}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">major and critical incidents</p>
                </div>
                <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <XCircle className="w-8 h-8" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-gradient-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
            </Card>
          </motion.div>
        </div>

        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          Attendance and QR scanning remain available as secondary operational features.
        </p>

        {/* Tables Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Attendance Snapshot: Top Students by Check-In Events */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-orange-200/40 dark:border-orange-700/30 bg-gradient-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 dark:text-white">Top Students</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">attendance snapshot by check-in events</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-orange-100/50 dark:bg-orange-900/20">
                        <th className="text-left px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">#</th>
                        <th className="text-left px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Student</th>
                        <th className="text-left px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Grade</th>
                        <th className="text-left px-6 py-3 font-semibold text-slate-700 dark:text-slate-300">Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topStudents.length > 0 ? (
                        topStudents.map((student: any, idx: number) => (
                          <tr 
                            key={student.lrn} 
                            className="border-b border-orange-100/30 dark:border-orange-800/20 last:border-0 hover:bg-orange-50/50 dark:hover:bg-orange-900/10 transition-colors"
                          >
                            <td className="px-6 py-4">
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-orange-100 dark:bg-orange-900/40 text-orange-600 dark:text-orange-400 font-semibold text-xs">
                                {idx + 1}
                              </span>
                            </td>
                            <td className="px-6 py-4 font-medium text-slate-900 dark:text-white">{student.name}</td>
                            <td className="px-6 py-4 text-slate-600 dark:text-slate-300">{student.level}</td>
                            <td className="px-6 py-4">
                              <span className="font-bold text-orange-600 dark:text-orange-400 bg-orange-100/50 dark:bg-orange-900/30 px-3 py-1 rounded-full">
                                {student.count}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="px-6 py-12 text-center text-slate-500 dark:text-slate-400">
                            No attendance data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Grade Level Check-In Activity */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden">
              <CardHeader className="border-b border-blue-200/40 dark:border-blue-700/30 bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl text-slate-900 dark:text-white">Grade Levels</CardTitle>
                    <CardDescription className="text-slate-600 dark:text-slate-400">check-in activity</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                {topGrades.length > 0 ? (
                  topGrades.map((grade: any, idx: number) => (
                    <div key={grade.level} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 w-6">{idx + 1}</span>
                          <p className="font-semibold text-slate-900 dark:text-white">{grade.level}</p>
                        </div>
                        <span className="text-sm font-bold text-blue-600 dark:text-blue-400 bg-blue-100/50 dark:bg-blue-900/30 px-3 py-1 rounded-full">
                          {grade.count}
                        </span>
                      </div>
                      <div className="relative">
                        <div className="h-2.5 rounded-full bg-slate-200 dark:bg-slate-700 overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${(grade.count / maxGradeCount) * 100}%` }}
                            transition={{ duration: 1, delay: idx * 0.1 }}
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 dark:from-blue-500 dark:to-blue-400 rounded-full"
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-12">
                    No attendance data available
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* ML Risk Dashboard */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-8"
        >
          <MLDashboard />
        </motion.div>
      </motion.div>
      )}
    </DashboardLayout>
  );
}