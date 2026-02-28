'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  UserPlus, 
  Download, 
  Search, 
  Eye, 
  Mail, 
  Phone, 
  QrCode, 
  Printer, 
  Calendar, 
  CalendarDays, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle, 
  Loader2,
  Filter,
  RefreshCw,
  ArrowUpDown,
  MapPin,
  Clock,
  Users,
  GraduationCap,
  User,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  Sparkles,
  Award,
  Bell,
  XCircle,
  Info,
  Minus,
  Shield,
  Zap
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { calculateAgeWithDecimal, shouldShowAge } from '@/lib/age-calculator';
import { supabase, type Student } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import Link from 'next/link';
import { sortByLevel } from '@/lib/level-order';
import { calculateStudentRiskScore, getActionRecommendations, type RiskScore } from '@/lib/ml-risk-calculator';
import { StudentRiskCard } from '@/components/ml-dashboard';
import { TablePageSkeleton } from '@/components/loading-skeletons';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer,
  PieChart as RePieChart,
  Pie,
  Cell
} from 'recharts';

const QRCodeCanvas = dynamic(() => import('qrcode.react').then(mod => ({ default: mod.QRCodeCanvas })), { ssr: false });

// Helper function to get risk level colors
function getRiskLevelColor(riskLevel: string): { color: string; bg: string; border: string; icon: any } {
  switch (riskLevel) {
    case 'critical':
      return { color: 'text-red-700', bg: 'bg-red-100', border: 'border-red-200', icon: XCircle };
    case 'high':
      return { color: 'text-orange-700', bg: 'bg-orange-100', border: 'border-orange-200', icon: AlertTriangle };
    case 'medium':
      return { color: 'text-yellow-700', bg: 'bg-yellow-100', border: 'border-yellow-200', icon: Minus };
    case 'low':
    default:
      return { color: 'text-green-700', bg: 'bg-green-100', border: 'border-green-200', icon: CheckCircle };
  }
}

const LEVEL_COLORS = {
  'Toddler & Nursery': '#f59e0b',
  'Pre-K': '#10b981',
  'Kinder 1': '#3b82f6',
  'Kinder 2': '#8b5cf6',
  'Grade 1': '#ec4899',
  'Grade 2': '#ef4444',
  'Grade 3': '#14b8a6',
  'Grade 4': '#f97316',
  'Grade 5': '#6366f1',
  'Grade 6': '#a855f7',
  'Grade 7': '#06b6d4',
  'Grade 8': '#d946ef'
};

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];

// Enforce consistent layout structure for students page
export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  
  const [newSchoolYearOpen, setNewSchoolYearOpen] = useState(false);
  const [processingStudents, setProcessingStudents] = useState<{ [key: string]: string }>({});
  const [processedCount, setProcessedCount] = useState(0);
  const [previousStudentData, setPreviousStudentData] = useState<Student[]>([]);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [undoInProgress, setUndoInProgress] = useState(false);
  const qrRef = useRef(null);
  const [behavioralData, setBehavioralData] = useState<any>(null);
  const [loadingBehavioral, setLoadingBehavioral] = useState(false);
  const [attendanceByLrn, setAttendanceByLrn] = useState<Record<string, { checkInTime?: string; checkOutTime?: string; passedDayEnd?: boolean }>>({});
  const [riskScores, setRiskScores] = useState<Record<string, RiskScore | null>>({});
  const [yearLevelTimes, setYearLevelTimes] = useState<Record<string, string>>({
    'Toddler & Nursery': '11:30',
    'Pre-K': '11:30',
    'Kinder 1': '12:00',
    'Kinder 2': '12:00',
    'Grade 1': '15:00',
    'Grade 2': '15:00',
    'Grade 3': '15:00',
    'Grade 4': '16:00',
    'Grade 5': '16:00',
    'Grade 6': '16:00',
    'Grade 7': '16:00',
    'Grade 8': '16:00',
  });

  // Function to calculate duration
  const calculateDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  // Function to check if school day has ended based on year level
  const isSchoolDayEnded = (studentLevel: string): boolean => {
    const now = new Date();
    const configuredTime = yearLevelTimes[studentLevel] || '16:00';
    const [hours, minutes] = configuredTime.split(':').map(Number);
    
    const endTime = new Date();
    endTime.setHours(hours, minutes, 0, 0);
    
    return now >= endTime;
  };

  // Load year level times from localStorage on mount
  useEffect(() => {
    const savedTimes = localStorage.getItem('yearLevelCheckoutTimes');
    if (savedTimes) {
      try {
        const times = JSON.parse(savedTimes);
        const timeMap: Record<string, string> = {};
        times.forEach((item: { level: string; time: string }) => {
          timeMap[item.level] = item.time;
        });
        setYearLevelTimes(timeMap);
      } catch (error) {
        console.error('Error loading year level times:', error);
        toast({
          title: 'Failed to load year level times',
          description: error instanceof Error ? error.message : String(error),
          variant: 'destructive',
        });
      }
    }
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      
      if (!supabase) {
        const msg = 'Supabase client not initialized';
        console.error(msg);
        toast({
          title: 'Internal Error',
          description: msg,
          variant: 'destructive',
        });
        return;
      }
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        toast({
          title: 'Failed to fetch students',
          description: error.message || String(error),
          variant: 'destructive',
        });
        throw error;
      }

      const today = new Date().toISOString().split('T')[0];
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('student_lrn, check_in_time, check_out_time')
        .eq('date', today);

      if (attendanceError) {
        toast({
          title: 'Failed to fetch attendance',
          description: attendanceError.message || String(attendanceError),
          variant: 'destructive',
        });
        throw attendanceError;
      }

      // If school day has ended, reset all unchecked-out students to "not checked in"
      const attendanceMap: Record<string, any> = {};
      
      if (attendance && attendance.length > 0) {
        attendance.forEach((entry) => {
          const student = data.find((s: Student) => s.lrn === entry.student_lrn);
          if (student) {
            const schoolDayEnded = isSchoolDayEnded(student.level);
            
            if (schoolDayEnded && !entry.check_out_time) {
              // School day ended and student hasn't checked out
              attendanceMap[entry.student_lrn] = {
                checkInTime: entry.check_in_time,
                checkOutTime: undefined,
                passedDayEnd: true,
              };
            } else {
              attendanceMap[entry.student_lrn] = {
                checkInTime: entry.check_in_time,
                checkOutTime: entry.check_out_time || undefined,
              };
            }
          }
        });
      }

      setAttendanceByLrn(attendanceMap);
      toast({
        title: 'Students Loaded',
        description: 'Student and attendance data loaded successfully.',
        variant: 'default',
      });
      
      // Map database fields to component format
      const mappedStudents = data.map(student => ({
        ...student,
        parentName: student.parent_name,
        parentContact: student.parent_contact,
      }));
      
      // Sort by level order
      setStudents(sortByLevel(mappedStudents));

      // Fetch risk scores for all students
      const riskScorePromises = mappedStudents.map(async (student) => {
        try {
          const score = await calculateStudentRiskScore(student.lrn);
          return { lrn: student.lrn, score };
        } catch (error) {
          console.error(`Error fetching risk score for ${student.lrn}:`, error);
          toast({
            title: `Failed to fetch risk score for ${student.lrn}`,
            description: error instanceof Error ? error.message : String(error),
            variant: 'destructive',
          });
          return { lrn: student.lrn, score: null };
        }
      });

      const riskResults = await Promise.all(riskScorePromises);
      const riskMap: Record<string, RiskScore | null> = {};
      riskResults.forEach(result => {
        riskMap[result.lrn] = result.score;
      });
      setRiskScores(riskMap);

    } catch (error) {
      console.error('Error fetching students:', error);
      toast({
        title: 'Failed to fetch students',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStudents();
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const fetchBehavioralData = async (studentLrn: string) => {
    if (!supabase) return;
    
    try {
      setLoadingBehavioral(true);
      
      // Fetch recent behavioral events
      const { data: events, error: eventsError } = await supabase
        .from('behavioral_events')
        .select(`
          *,
          event_categories(name, category_type, color_code)
        `)
        .eq('student_lrn', studentLrn)
        .order('event_date', { ascending: false })
        .order('event_time', { ascending: false })
        .limit(10);

      if (eventsError) throw eventsError;

      // Fetch attendance data for the month
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_lrn', studentLrn)
        .gte('date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Use ML-based risk scoring instead of simple thresholds
      const riskScore = await calculateStudentRiskScore(studentLrn);

      // Calculate stats
      const positiveEvents = events?.filter(e => e.severity === 'positive').length || 0;
      const negativeEvents = events?.filter(e => e.severity === 'major' || e.severity === 'critical').length || 0;
      const minorEvents = events?.filter(e => e.severity === 'minor').length || 0;
      
      setBehavioralData({
        events: events || [],
        attendance: attendance || [],
        stats: {
          positiveEvents,
          negativeEvents,
          minorEvents,
          totalEvents: events?.length || 0,
          riskLevel: riskScore?.risk_level || 'low',
          riskColor: getRiskLevelColor(riskScore?.risk_level || 'low').color,
          riskBg: getRiskLevelColor(riskScore?.risk_level || 'low').bg,
          riskScore: riskScore
        }
      });

      // Store risk score for table display
      if (riskScore) {
        setRiskScores(prev => ({
          ...prev,
          [studentLrn]: riskScore
        }));
      }

    } catch (error) {
      console.error('Error fetching behavioral data:', error);
    } finally {
      setLoadingBehavioral(false);
    }
  };

  const handlePrintQR = () => {
    if (qrRef.current) {
      const canvas = qrRef.current.querySelector('canvas');
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = image;
      link.download = `${selectedStudent?.lrn}_qr.png`;
      link.click();
    }
  };

  // Grade progression mapping
  const gradeProgression: { [key: string]: string } = {
    'Toddler & Nursery': 'Pre-K',
    'Pre-K': 'Kinder 1',
    'Kinder 1': 'Kinder 2',
    'Kinder 2': 'Grade 1',
    'Grade 1': 'Grade 2',
    'Grade 2': 'Grade 3',
    'Grade 3': 'Grade 4',
    'Grade 4': 'Grade 5',
    'Grade 5': 'Grade 6',
    'Grade 6': 'Grade 7',
    'Grade 7': 'Grade 8',
    'Grade 8': 'graduated', // Graduation
  };

  const handleNewSchoolYear = async () => {
    setProcessingStudents({});
    setProcessedCount(0);
    setPreviousStudentData(students); // Store original data for undo
    setUndoAvailable(false);

    try {
      for (const student of students) {
        setProcessingStudents(prev => ({ ...prev, [student.id]: 'processing' }));

        const nextLevel = gradeProgression[student.level];
        const status = nextLevel === 'graduated' ? 'graduated' : 'active';
        const newLevel = nextLevel === 'graduated' ? student.level : nextLevel;

        // Update student in database
        const { error } = await supabase
          .from('students')
          .update({
            level: newLevel,
            status: status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', student.id);

        if (error) {
          setProcessingStudents(prev => ({ ...prev, [student.id]: 'error' }));
          console.error('Error updating student:', error);
        } else {
          setProcessingStudents(prev => ({ ...prev, [student.id]: 'completed' }));
          setProcessedCount(prev => prev + 1);
        }

        // Small delay to show progress animation
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Refresh students list after all updates
      await fetchStudents();
      setUndoAvailable(true); // Enable undo after successful completion
      
    } catch (error) {
      console.error('Error processing new school year:', error);
    }
  };

  const handleUndoSchoolYear = async () => {
    if (previousStudentData.length === 0) return;

    setUndoInProgress(true);
    setProcessedCount(0);
    
    try {
      for (let i = 0; i < previousStudentData.length; i++) {
        const student = previousStudentData[i];
        
        // Revert to original level and status
        const { error } = await supabase
          .from('students')
          .update({
            level: student.level,
            status: student.status,
            updated_at: new Date().toISOString(),
          })
          .eq('id', student.id);

        if (error) {
          console.error('Error reverting student:', error);
        } else {
          setProcessedCount(i + 1);
        }

        // Small delay to show progress animation
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Refresh students list after all updates
      await fetchStudents();
      setUndoAvailable(false);
      setPreviousStudentData([]);
      
    } catch (error) {
      console.error('Error undoing school year changes:', error);
    } finally {
      setUndoInProgress(false);
    }
  };

  // Filter and sort students
  const filteredStudents = useMemo(() => {
    let filtered = students.filter(student => {
      const term = search.toLowerCase();
      const matchesSearch = student.name.toLowerCase().includes(term) ||
                            student.lrn.toLowerCase().includes(term) ||
                            student.parentName.toLowerCase().includes(term);
      const matchesLevel = filterGrade === 'all' || student.level === filterGrade;
      const matchesGender = filterGender === 'all' || student.gender === filterGender;
      
      // Risk filter
      if (filterRisk !== 'all') {
        const riskScore = riskScores[student.lrn];
        if (!riskScore) return false;
        return riskScore.risk_level === filterRisk;
      }
      
      return matchesSearch && matchesLevel && matchesGender;
    });

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortConfig.key as keyof Student];
      let bVal: any = b[sortConfig.key as keyof Student];

      // Handle special cases
      if (sortConfig.key === 'riskLevel') {
        const riskOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        aVal = riskScores[a.lrn]?.risk_level || 'low';
        bVal = riskScores[b.lrn]?.risk_level || 'low';
        return sortConfig.direction === 'asc' 
          ? riskOrder[aVal as keyof typeof riskOrder] - riskOrder[bVal as keyof typeof riskOrder]
          : riskOrder[bVal as keyof typeof riskOrder] - riskOrder[aVal as keyof typeof riskOrder];
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      return 0;
    });

    return filtered;
  }, [students, search, filterGrade, filterGender, filterRisk, riskScores, sortConfig]);

  // Analytics calculations
  const stats = useMemo(() => {
    const total = students.length;
    const male = students.filter(s => s.gender === 'Male').length;
    const female = students.filter(s => s.gender === 'Female').length;
    
    // Level distribution
    const levelMap = new Map();
    students.forEach(student => {
      levelMap.set(student.level, (levelMap.get(student.level) || 0) + 1);
    });
    const levelDistribution = Array.from(levelMap.entries()).map(([level, count]) => ({
      level,
      count
    })).sort((a, b) => a.level.localeCompare(b.level));

    // Risk distribution
    const riskCounts = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0
    };
    
    Object.values(riskScores).forEach(score => {
      if (score) {
        riskCounts[score.risk_level as keyof typeof riskCounts]++;
      }
    });

    const riskDistribution = [
      { level: 'Low', count: riskCounts.low, color: '#10b981' },
      { level: 'Medium', count: riskCounts.medium, color: '#f59e0b' },
      { level: 'High', count: riskCounts.high, color: '#ef4444' },
      { level: 'Critical', count: riskCounts.critical, color: '#7f1d1d' }
    ].filter(item => item.count > 0);

    // Today's attendance stats
    const checkedIn = Object.keys(attendanceByLrn).length;
    const checkedOut = Object.values(attendanceByLrn).filter(a => a.checkOutTime).length;

    return {
      total,
      male,
      female,
      levelDistribution,
      riskDistribution,
      checkedIn,
      checkedOut,
      attendanceRate: total > 0 ? (checkedIn / total * 100).toFixed(1) : '0'
    };
  }, [students, riskScores, attendanceByLrn]);

  const exportToCSV = () => {
    const headers = ['LRN', 'Name', 'Gender', 'Birthday', 'Age', 'Level', 'Risk Level', 'Parent Name', 'Parent Contact', 'Address', 'Status'];
    const csvData = filteredStudents.map(student => {
      const age = shouldShowAge(student.level) ? calculateAgeWithDecimal(student.birthday) : 'N/A';
      const riskLevel = riskScores[student.lrn]?.risk_level || 'Unknown';
      return [
        student.lrn,
        student.name,
        student.gender,
        student.birthday,
        age,
        student.level,
        riskLevel.toUpperCase(),
        student.parentName,
        student.parentContact,
        student.address || '',
        student.status || 'active'
      ];
    });

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `students-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
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
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Current Students
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              Active students enrolled in S.Y. 2025-2026 • {filteredStudents.length} students
            </p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="gap-2"
            >
              <Link href="/attendance">
                <CalendarDays className="w-4 h-4" />
                Attendance
              </Link>
            </Button>
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
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Dialog open={newSchoolYearOpen} onOpenChange={setNewSchoolYearOpen}>
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                  <Calendar size={16} />
                  New School Year
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-bold">Start New School Year (S.Y. 2026-2027)</DialogTitle>
                  <DialogDescription>Validate and advance {students.length} students to their new grade levels</DialogDescription>
                </DialogHeader>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={processedCount === 0 ? 'initial' : 'processing'}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="space-y-4"
                  >
                    {processedCount === 0 && !undoInProgress ? (
                      <>
                        <div className="bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/50 rounded-lg p-4 space-y-3">
                          <h3 className="font-semibold text-foreground flex items-center gap-2">
                            <Sparkles className="w-4 h-4 text-blue-600" />
                            What will happen:
                          </h3>
                          <ul className="text-sm text-muted-foreground space-y-2">
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                              <span>Students will be advanced to their next grade level</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                              <span>Grade 8 students will be marked as <strong>Graduated</strong></span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span className="text-blue-600 dark:text-blue-400 font-bold">✓</span>
                              <span>All data will be synced to the Masterlist</span>
                            </li>
                          </ul>
                        </div>
                        <Button 
                          onClick={handleNewSchoolYear}
                          variant="default"
                          className="w-full"
                        >
                          Proceed with School Year Advancement
                        </Button>
                        <Button 
                          onClick={() => setNewSchoolYearOpen(false)}
                          variant="outline"
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <div className="space-y-4">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {undoInProgress ? 'Reverting Changes...' : 'Processing Students...'}
                            </span>
                            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                              {processedCount} / {students.length}
                            </span>
                          </div>
                          <div className="w-full bg-muted/50 rounded-lg h-3 overflow-hidden">
                            <motion.div 
                              className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${(processedCount / students.length) * 100}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground text-center">
                            {undoInProgress 
                              ? 'Restoring previous data...'
                              : processedCount === students.length 
                              ? '✓ All students processed successfully!'
                              : 'Please wait while we update student records...'}
                          </p>
                        </div>
                        
                        {processedCount === students.length && !undoInProgress && undoAvailable && (
                          <Button 
                            onClick={handleUndoSchoolYear}
                            disabled={undoInProgress}
                            variant="secondary"
                            className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            Undo Changes (Back to S.Y. 2025-2026)
                          </Button>
                        )}
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </DialogContent>
            </Dialog>
            <Button variant="default" size="sm" className="gap-2">
              <UserPlus size={16} />
              Add Student
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
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
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
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
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">Male / Female</p>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.male} / {stats.female}</p>
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
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-blue-700 dark:text-blue-300 font-medium">Checked In Today</p>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.checkedIn}</p>
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
            <Card className="border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/40 dark:to-amber-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 text-white">
                    <Activity className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 font-medium">Attendance Rate</p>
                    <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.attendanceRate}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
            >
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Filter className="w-5 h-5 text-blue-500" />
                    Search & Filter Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="relative md:col-span-2">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by LRN, name, or parent..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    <Select value={filterGrade} onValueChange={setFilterGrade}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {Object.keys(LEVEL_COLORS).map(level => (
                          <SelectItem key={level} value={level}>{level}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterGender} onValueChange={setFilterGender}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterRisk} onValueChange={setFilterRisk}>
                      <SelectTrigger>
                        <SelectValue placeholder="Filter by risk" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Risk Levels</SelectItem>
                        <SelectItem value="low">Low Risk</SelectItem>
                        <SelectItem value="medium">Medium Risk</SelectItem>
                        <SelectItem value="high">High Risk</SelectItem>
                        <SelectItem value="critical">Critical Risk</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="mt-4 text-sm text-muted-foreground">
                    Showing <span className="font-bold text-foreground">{filteredStudents.length}</span> of{' '}
                    <span className="font-bold text-foreground">{students.length}</span> students
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs for List and Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" className="gap-2">
              <Users className="w-4 h-4" />
              Student List
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <PieChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Students Table */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-5 h-5 text-blue-500" />
                      Student Directory
                    </CardTitle>
                    <CardDescription>
                      Complete list of enrolled students with LRN, level, and parent contact details
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-slate-800">
                    Sorted by {sortConfig.key} ({sortConfig.direction})
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
                          onClick={() => handleSort('lrn')}
                        >
                          <div className="flex items-center gap-1">
                            LRN
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800"
                          onClick={() => handleSort('gender')}
                        >
                          <div className="flex items-center gap-1">
                            Gender
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead>Birthday</TableHead>
                        <TableHead>Age</TableHead>
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
                          onClick={() => handleSort('riskLevel')}
                        >
                          <div className="flex items-center gap-1">
                            Risk Level
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead>Parent Info</TableHead>
                        <TableHead>Today</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            <p className="text-sm text-muted-foreground mt-2">Loading students...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={10} className="text-center py-12">
                            <div className="flex flex-col items-center gap-2">
                              <Users className="w-12 h-12 text-gray-300" />
                              <p className="text-gray-500 dark:text-gray-400">No students found</p>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => {
                                  setSearch('');
                                  setFilterGrade('all');
                                  setFilterGender('all');
                                  setFilterRisk('all');
                                }}
                              >
                                Clear filters
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredStudents.map((student, index) => {
                          const age = shouldShowAge(student.level) 
                            ? calculateAgeWithDecimal(student.birthday) 
                            : null;
                          const riskScore = riskScores[student.lrn];
                          const riskLevel = riskScore?.risk_level || 'low';
                          const riskColors = getRiskLevelColor(riskLevel);
                          const RiskIcon = riskColors.icon;
                          const attendance = attendanceByLrn[student.lrn];
                          
                          return (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <TableCell className="font-mono text-sm font-medium">{student.lrn}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="font-medium">{student.name}</span>
                                </div>
                              </TableCell>
                              <TableCell>{student.gender}</TableCell>
                              <TableCell>{student.birthday}</TableCell>
                              <TableCell>
                                {age ? (
                                  <Badge variant="outline" className="border-blue-200 dark:border-blue-800">
                                    {age} yrs
                                  </Badge>
                                ) : (
                                  <span className="text-muted-foreground text-sm">—</span>
                                )}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  style={{ 
                                    backgroundColor: `${LEVEL_COLORS[student.level as keyof typeof LEVEL_COLORS]}20`,
                                    color: LEVEL_COLORS[student.level as keyof typeof LEVEL_COLORS],
                                    borderColor: `${LEVEL_COLORS[student.level as keyof typeof LEVEL_COLORS]}40`
                                  }}
                                >
                                  {student.level}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                {riskScore ? (
                                  <Badge className={`${riskColors.bg} ${riskColors.color} border-0 gap-1`}>
                                    <RiskIcon className="w-3 h-3" />
                                    {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)}
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-gray-200">
                                    Unknown
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">{student.parentName}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">{student.parentContact}</span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>
                                {attendance ? (
                                  <div className="flex flex-col gap-1">
                                    {attendance.passedDayEnd ? (
                                      <Badge className="bg-gray-200 text-gray-800 border-0 text-xs">
                                        No Check Out
                                      </Badge>
                                    ) : attendance.checkOutTime ? (
                                      <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">
                                        Checked Out
                                      </Badge>
                                    ) : (
                                      <Badge className="bg-blue-100 text-blue-700 border-0 text-xs">
                                        Checked In
                                      </Badge>
                                    )}
                                    <span className="text-[10px] text-muted-foreground">
                                      {new Date(attendance.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                  </div>
                                ) : (
                                  <Badge variant="outline" className="border-border/60 text-muted-foreground text-xs">
                                    Not Checked In
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Dialog
                                  open={selectedStudent?.id === student.id}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setSelectedStudent(null);
                                      setDetailsOpen(false);
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setSelectedStudent(student);
                                        setDetailsOpen(false);
                                        fetchBehavioralData(student.lrn);
                                      }}
                                      className="gap-1.5 hover:bg-primary/10 hover:text-primary"
                                    >
                                      <Eye size={14} />
                                      View
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                                    {selectedStudent && (
                                      <>
                                        <DialogHeader>
                                          <div className="flex items-center gap-3">
                                            <Avatar className="h-12 w-12">
                                              <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-lg">
                                                {selectedStudent.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                              </AvatarFallback>
                                            </Avatar>
                                            <div>
                                              <DialogTitle className="text-2xl">{selectedStudent.name}</DialogTitle>
                                              <DialogDescription>
                                                {selectedStudent.lrn} • {selectedStudent.level}
                                              </DialogDescription>
                                            </div>
                                          </div>
                                        </DialogHeader>

                                        <Tabs defaultValue="overview" className="mt-4">
                                          <TabsList className="grid w-full grid-cols-4">
                                            <TabsTrigger value="overview">Overview</TabsTrigger>
                                            <TabsTrigger value="attendance">Attendance</TabsTrigger>
                                            <TabsTrigger value="behavioral">Behavioral</TabsTrigger>
                                            <TabsTrigger value="qr">QR Code</TabsTrigger>
                                          </TabsList>

                                          <TabsContent value="overview" className="space-y-4 mt-4">
                                            {/* Risk Banner */}
                                            {riskScore && (
                                              <div className={`${riskColors.bg} ${riskColors.color} rounded-lg p-4 border ${riskColors.border}`}>
                                                <div className="flex items-center gap-3">
                                                  <RiskIcon className="w-6 h-6" />
                                                  <div>
                                                    <p className="font-semibold text-lg">Risk Level: {riskLevel.toUpperCase()}</p>
                                                    <p className="text-sm opacity-90">
                                                      Risk Score: {riskScore.risk_score.toFixed(1)}/100 • Confidence: {riskScore.confidence.toFixed(0)}%
                                                    </p>
                                                  </div>
                                                </div>
                                              </div>
                                            )}

                                            {/* Student Info Grid */}
                                            <div className="grid grid-cols-2 gap-4">
                                              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                  <Calendar className="w-3 h-3" />
                                                  Birthday
                                                </p>
                                                <p className="font-medium">{selectedStudent.birthday}</p>
                                                {age && (
                                                  <p className="text-sm text-muted-foreground mt-1">{age} years old</p>
                                                )}
                                              </div>
                                              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                  <User className="w-3 h-3" />
                                                  Gender
                                                </p>
                                                <p className="font-medium">{selectedStudent.gender}</p>
                                              </div>
                                              <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                                                  <MapPin className="w-3 h-3" />
                                                  Address
                                                </p>
                                                <p className="font-medium">{selectedStudent.address || 'No address provided'}</p>
                                              </div>
                                              <div className="col-span-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-2">Parent/Guardian Information</p>
                                                <div className="space-y-2">
                                                  <div className="flex items-center gap-2">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm font-medium">{selectedStudent.parentName}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    <span className="text-sm">{selectedStudent.parentContact}</span>
                                                  </div>
                                                </div>
                                              </div>
                                            </div>
                                          </TabsContent>

                                          <TabsContent value="attendance" className="space-y-4 mt-4">
                                            {attendanceByLrn[selectedStudent.lrn] ? (
                                              <div className="border border-blue-200 dark:border-blue-900/50 rounded-lg p-6 bg-blue-50/60 dark:bg-blue-950/30">
                                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                                  <Clock className="w-5 h-5 text-blue-600" />
                                                  Today's Attendance
                                                </h3>
                                                <div className="grid grid-cols-3 gap-4">
                                                  <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                                                    <p className="text-xs text-muted-foreground">Check In</p>
                                                    <p className="font-bold text-xl mt-1">
                                                      {new Date(attendanceByLrn[selectedStudent.lrn].checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </p>
                                                  </div>
                                                  {attendanceByLrn[selectedStudent.lrn].checkOutTime && (
                                                    <>
                                                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                                                        <p className="text-xs text-muted-foreground">Check Out</p>
                                                        <p className="font-bold text-xl mt-1">
                                                          {new Date(attendanceByLrn[selectedStudent.lrn].checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                      </div>
                                                      <div className="bg-white dark:bg-slate-800 rounded-lg p-4">
                                                        <p className="text-xs text-muted-foreground">Duration</p>
                                                        <p className="font-bold text-xl mt-1 text-blue-600">
                                                          {calculateDuration(
                                                            attendanceByLrn[selectedStudent.lrn].checkInTime,
                                                            attendanceByLrn[selectedStudent.lrn].checkOutTime
                                                          )}
                                                        </p>
                                                      </div>
                                                    </>
                                                  )}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="text-center py-8 text-muted-foreground">
                                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No attendance record for today</p>
                                              </div>
                                            )}
                                          </TabsContent>

                                          <TabsContent value="behavioral" className="space-y-4 mt-4">
                                            {loadingBehavioral ? (
                                              <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                              </div>
                                            ) : behavioralData ? (
                                              <>
                                                {/* Stats Grid */}
                                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                                  <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-2">
                                                      <CheckCircle className="w-4 h-4" />
                                                      <span className="text-xs font-semibold">Positive</span>
                                                    </div>
                                                    <p className="text-3xl font-bold text-green-800 dark:text-green-300">{behavioralData.stats.positiveEvents}</p>
                                                  </div>
                                                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 mb-2">
                                                      <AlertTriangle className="w-4 h-4" />
                                                      <span className="text-xs font-semibold">Negative</span>
                                                    </div>
                                                    <p className="text-3xl font-bold text-red-800 dark:text-red-300">{behavioralData.stats.negativeEvents}</p>
                                                  </div>
                                                  <div className="bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-900/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400 mb-2">
                                                      <Minus className="w-4 h-4" />
                                                      <span className="text-xs font-semibold">Minor</span>
                                                    </div>
                                                    <p className="text-3xl font-bold text-yellow-800 dark:text-yellow-300">{behavioralData.stats.minorEvents}</p>
                                                  </div>
                                                  <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-lg p-4">
                                                    <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 mb-2">
                                                      <Activity className="w-4 h-4" />
                                                      <span className="text-xs font-semibold">Total</span>
                                                    </div>
                                                    <p className="text-3xl font-bold text-blue-800 dark:text-blue-300">{behavioralData.stats.totalEvents}</p>
                                                  </div>
                                                </div>

                                                {/* Recent Events */}
                                                <div className="border rounded-lg p-4">
                                                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                                                    <Bell className="w-4 h-4" />
                                                    Recent Events
                                                  </h3>
                                                  {behavioralData.events.length === 0 ? (
                                                    <p className="text-center py-4 text-muted-foreground">No recent events</p>
                                                  ) : (
                                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                                      {behavioralData.events.map((event: any) => (
                                                        <div key={event.id} className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg text-sm">
                                                          <div className="flex items-center gap-2 mb-1">
                                                            <span className="font-semibold">{event.event_type}</span>
                                                            <Badge className={
                                                              event.severity === 'positive' ? 'bg-green-100 text-green-700' :
                                                              event.severity === 'minor' ? 'bg-yellow-100 text-yellow-700' :
                                                              event.severity === 'major' ? 'bg-orange-100 text-orange-700' :
                                                              event.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                              'bg-gray-100 text-gray-700'
                                                            }>
                                                              {event.severity}
                                                            </Badge>
                                                          </div>
                                                          <p className="text-muted-foreground">{event.description}</p>
                                                          <p className="text-xs text-muted-foreground mt-1">
                                                            {new Date(event.event_date).toLocaleDateString()}
                                                          </p>
                                                        </div>
                                                      ))}
                                                    </div>
                                                  )}
                                                </div>
                                              </>
                                            ) : (
                                              <div className="text-center py-8 text-muted-foreground">
                                                <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No behavioral data available</p>
                                              </div>
                                            )}
                                          </TabsContent>

                                          <TabsContent value="qr" className="space-y-4 mt-4">
                                            <div className="text-center">
                                              <p className="text-muted-foreground mb-4">Scan this QR code to check-in/check-out</p>
                                              <div ref={qrRef} className="flex justify-center p-6 bg-white rounded-lg border-2 inline-block mx-auto">
                                                <QRCodeCanvas
                                                  value={selectedStudent.lrn}
                                                  size={200}
                                                  level="H"
                                                  includeMargin={true}
                                                  bgColor="#ffffff"
                                                  fgColor="#000000"
                                                />
                                              </div>
                                              <div className="flex gap-3 mt-4 justify-center">
                                                <Button variant="outline" onClick={handlePrintQR} className="gap-2">
                                                  <Printer size={16} />
                                                  Download QR
                                                </Button>
                                              </div>
                                            </div>
                                          </TabsContent>
                                        </Tabs>
                                      </>
                                    )}
                                  </DialogContent>
                                </Dialog>
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
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Level Distribution */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Students by Level
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.levelDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="level" stroke="#6B7280" angle={-45} textAnchor="end" height={80} />
                        <YAxis stroke="#6B7280" />
                        <Tooltip />
                        <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Risk Distribution */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="w-5 h-5 text-purple-500" />
                    Risk Level Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={stats.riskDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="count"
                          label={({ level, percent }) => `${level} ${(percent * 100).toFixed(0)}%`}
                        >
                          {stats.riskDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Summary Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Award className="w-5 h-5 text-amber-500" />
                  Key Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Most Populated Level</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.levelDistribution.reduce((max, item) => item.count > max.count ? item : max, { count: 0 }).level || 'N/A'}
                    </p>
                    <p className="text-xs text-blue-600/70 mt-1">
                      {stats.levelDistribution.reduce((max, item) => item.count > max.count ? item : max, { count: 0 }).count || 0} students
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">Risk Overview</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.riskDistribution.find(r => r.level === 'High')?.count || 0} High Risk
                    </p>
                    <p className="text-xs text-emerald-600/70 mt-1">
                      {stats.riskDistribution.find(r => r.level === 'Critical')?.count || 0} Critical •{' '}
                      {stats.riskDistribution.find(r => r.level === 'Medium')?.count || 0} Medium
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Today's Attendance</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.checkedIn} / {stats.total}
                    </p>
                    <p className="text-xs text-blue-600/70 dark:text-blue-400/70 mt-1">
                      {stats.checkedOut} checked out • {stats.total - stats.checkedIn} not checked in
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}