'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { humanizeEventType } from '@/lib/event-types';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TimePickerInput } from '@/components/time-picker-input';
import { DatePickerInput } from '@/components/date-picker-input';
import { 
  UserPlus, 
  Download, 
  Upload,
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
  Sun,
  Award,
  Bell,
  XCircle,
  Info,
  Minus,
  Shield,
  Zap,
  Heart,
  AlertOctagon,
  CloudUpload,
  Wifi,
  WifiOff,
  ArrowRightLeft
  , ChevronLeft, ChevronRight
} from 'lucide-react';
import { useState, useRef, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { calculateAgeWithDecimal, shouldShowAge } from '@/lib/age-calculator';
import { supabase, type Student as BaseStudent } from '@/lib/supabase';

// Extend Student type to include isLinked for local use
type Student = BaseStudent & { isLinked?: boolean };
import { toast } from '@/hooks/use-toast';
import { formatTime12h } from '@/lib/time-format';
import { sortByLevel } from '@/lib/level-order';
import { calculateStudentRiskScore, getActionRecommendations, type RiskScore } from '@/lib/ml-risk-calculator';
import { StudentRiskCard } from '@/components/ml-dashboard';
import StudentsSkeleton from '@/components/students-skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import { useIsMobile } from '@/hooks/use-mobile';
import { useAuth } from '@/lib/auth-context';
import { getStudentImportRequiredFieldsHint, parseStudentImportRows } from '@/lib/student-import';
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

const toDisplayLrn = (lrn?: string | null): string => {
  const value = (lrn || '').trim();
  return /^temp-\d+$/i.test(value) ? '' : value;
};

const YEAR_LEVEL_START_TIMES: Record<string, string> = {
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
};

function getLateThreshold(studentLevel?: string | null) {
  return YEAR_LEVEL_START_TIMES[String(studentLevel || '').trim()] || '16:00';
}

function isLateCheckIn(checkInTime?: string, entryTime?: string | null) {
  if (!checkInTime || !entryTime) return false;
  const checkIn = new Date(checkInTime);
  if (Number.isNaN(checkIn.getTime())) return false;

  // entryTime is in HH:MM:SS format
  const [entryHours, entryMinutes] = entryTime.split(':').slice(0, 2).map(Number);
  if (Number.isNaN(entryHours) || Number.isNaN(entryMinutes)) return false;

  return checkIn.getHours() * 60 + checkIn.getMinutes() > entryHours * 60 + entryMinutes;
}
const QRCodeCanvas = dynamic(() => import('qrcode.react').then(mod => ({ default: mod.QRCodeCanvas })), { ssr: false });

// Helper function to get risk level colors
function getRiskLevelColor(riskLevel: string): { color: string; bg: string; border: string; icon: any } {
  switch (riskLevel) {
    case 'critical':
      return {
        color: 'text-red-800 dark:text-red-100',
        bg: 'bg-red-100/95 dark:bg-red-950/60',
        border: 'border-red-200 dark:border-red-800/70',
        icon: XCircle,
      };
    case 'high':
      return {
        color: 'text-orange-800 dark:text-orange-100',
        bg: 'bg-orange-100/95 dark:bg-orange-950/60',
        border: 'border-orange-200 dark:border-orange-800/70',
        icon: AlertTriangle,
      };
    case 'medium':
      return {
        color: 'text-amber-800 dark:text-amber-100',
        bg: 'bg-amber-100/95 dark:bg-amber-950/60',
        border: 'border-amber-200 dark:border-amber-800/70',
        icon: Minus,
      };
    case 'low':
    default:
      return {
        color: 'text-emerald-800 dark:text-emerald-100',
        bg: 'bg-emerald-100/95 dark:bg-emerald-950/60',
        border: 'border-emerald-200 dark:border-emerald-800/70',
        icon: CheckCircle,
      };
  }
}

// Helper function to check if student has completed summer enrollment
function isCompletedSummerStudent(enrollment: { start_date: string; end_date: string } | undefined): boolean {
  if (!enrollment) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const endDate = new Date(enrollment.end_date);
  endDate.setHours(0, 0, 0, 0);
  return today > endDate;
}

// Utility to generate a random temporary LRN
function generateTemporaryLrn() {
  // Example: TEMP-20260428-XXXXXX (date + random 6 digits)
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  const rand = Math.floor(100000 + Math.random() * 900000);
  return `TEMP-${ymd}-${rand}`;
}

function getBehaviorEventVisuals(severity?: string) {
  const normalized = (severity || '').toLowerCase();

  if (normalized === 'critical') {
    return {
      Icon: AlertOctagon,
      card: 'border-red-300/80 bg-red-50/40 dark:bg-red-950/15',
      iconWrap: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
      title: 'text-red-700 dark:text-red-300',
      badge: 'border-red-200 bg-red-600 text-white dark:border-red-700 dark:bg-red-700',
      meta: 'text-red-700/80 dark:text-red-300/80',
    };
  }

  if (normalized === 'major') {
    return {
      Icon: AlertTriangle,
      card: 'border-orange-300/80 bg-orange-50/40 dark:bg-orange-950/15',
      iconWrap: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
      title: 'text-orange-700 dark:text-orange-300',
      badge: 'border-orange-200 bg-orange-600 text-white dark:border-orange-700 dark:bg-orange-700',
      meta: 'text-orange-700/80 dark:text-orange-300/80',
    };
  }

  if (normalized === 'minor') {
    return {
      Icon: Minus,
      card: 'border-amber-300/80 bg-amber-50/40 dark:bg-amber-950/15',
      iconWrap: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
      title: 'text-amber-700 dark:text-amber-300',
      badge: 'border-amber-200 bg-amber-600 text-white dark:border-amber-700 dark:bg-amber-700',
      meta: 'text-amber-700/80 dark:text-amber-300/80',
    };
  }

  if (normalized === 'positive') {
    return {
      Icon: Heart,
      card: 'border-emerald-300/80 bg-emerald-50/40 dark:bg-emerald-950/15',
      iconWrap: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
      title: 'text-emerald-700 dark:text-emerald-300',
      badge: 'border-emerald-200 bg-emerald-600 text-white dark:border-emerald-700 dark:bg-emerald-700',
      meta: 'text-emerald-700/80 dark:text-emerald-300/80',
    };
  }

  return {
    Icon: Info,
    card: 'border-slate-300/80 bg-slate-50/40 dark:bg-slate-900/20',
    iconWrap: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    title: 'text-slate-700 dark:text-slate-300',
    badge: 'border-slate-200 bg-slate-600 text-white dark:border-slate-700 dark:bg-slate-700',
    meta: 'text-slate-700/80 dark:text-slate-300/80',
  };
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

const LEVEL_BADGE_STYLES: Record<string, string> = {
  'Toddler & Nursery': 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/35 dark:text-amber-300 dark:border-amber-800',
  'Pre-K': 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/35 dark:text-emerald-300 dark:border-emerald-800',
  'Kinder 1': 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/35 dark:text-sky-300 dark:border-sky-800',
  'Kinder 2': 'bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/35 dark:text-violet-300 dark:border-violet-800',
  'Grade 1': 'bg-pink-50 text-pink-700 border-pink-200 dark:bg-pink-950/35 dark:text-pink-300 dark:border-pink-800',
  'Grade 2': 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/35 dark:text-rose-300 dark:border-rose-800',
  'Grade 3': 'bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/35 dark:text-cyan-300 dark:border-cyan-800',
  'Grade 4': 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/35 dark:text-orange-300 dark:border-orange-800',
  'Grade 5': 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/35 dark:text-indigo-300 dark:border-indigo-800',
  'Grade 6': 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/35 dark:text-purple-300 dark:border-purple-800',
  'Grade 7': 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/35 dark:text-teal-300 dark:border-teal-800',
  'Grade 8': 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200 dark:bg-fuchsia-950/35 dark:text-fuchsia-300 dark:border-fuchsia-800',
};

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
const YEAR_LEVEL_OPTIONS = [
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
];
const EARLY_LEVEL_OPTIONS = ['Toddler & Nursery', 'Pre-K', 'Kinder 1', 'Kinder 2'];
const GRADE_LEVEL_OPTIONS = [
  'Grade 1',
  'Grade 2',
  'Grade 3',
  'Grade 4',
  'Grade 5',
  'Grade 6',
  'Grade 7',
  'Grade 8',
];
const WEEKDAY_OPTIONS = [
  { label: 'Monday', dayNumber: 1 },
  { label: 'Tuesday', dayNumber: 2 },
  { label: 'Wednesday', dayNumber: 3 },
  { label: 'Thursday', dayNumber: 4 },
  { label: 'Friday', dayNumber: 5 },
];
const DEFAULT_SCHEDULE_SLOTS = [
  { label: 'Session 1', startTime: '08:00', endTime: '09:30' },
  { label: 'Session 2', startTime: '09:45', endTime: '11:15' },
  { label: 'Session 3', startTime: '13:00', endTime: '14:30' },
];

type EditableScheduleRow = {
  id: number;
  day_of_week: string;
  days_of_week: string[];
  day_number: number;
  subject: string;
  start_time: string;
  end_time: string;
  room: string;
  teacher_name: string;
};

const sharedRfidState = {
  connected: false,
  connecting: false,
  disconnecting: false,
  readingActive: false,
  port: null as any,
  reader: null as any,
};

// Enforce consistent layout structure for students page
export default function StudentsPage() {
  // Auth context for role-based UI
  const { user } = useAuth ? useAuth() : { user: null };
  const isAdmin = user?.role === 'admin';
  const searchParams = useSearchParams();
  const [dropDialogOpen, setDropDialogOpen] = useState(false);
  const [dropConfirmEmail, setDropConfirmEmail] = useState('');
  const [dropConfirmPassword, setDropConfirmPassword] = useState('');
  const [dropError, setDropError] = useState('');
  const [dropValidationErrors, setDropValidationErrors] = useState<{ email?: string; password?: string }>({});
  const [droppingStudent, setDroppingStudent] = useState(false);
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [transferConfirmEmail, setTransferConfirmEmail] = useState('');
  const [transferConfirmPassword, setTransferConfirmPassword] = useState('');
  const [transferError, setTransferError] = useState('');
  const [transferValidationErrors, setTransferValidationErrors] = useState<{ email?: string; password?: string }>({});
  const [transferringStudent, setTransferringStudent] = useState(false);
  // Drop student handler
  const handleDropStudent = async () => {
    if (!selectedStudent || !user) return;
    setDropError('');

    const missingInputs: string[] = [];
    const validationErrors: { email?: string; password?: string } = {};

    if (!dropConfirmEmail.trim()) {
      missingInputs.push('Email');
      validationErrors.email = 'Please provide your account email.';
    } else if (dropConfirmEmail.trim().toLowerCase() !== user.username?.toLowerCase()) {
      validationErrors.email = 'Account email does not match.';
    }

    if (!dropConfirmPassword.trim()) {
      missingInputs.push('Password');
      validationErrors.password = 'Please provide your password.';
    }

    if (missingInputs.length > 0) {
      setDropValidationErrors(validationErrors);
      toast({
        title: 'Required Inputs Missing',
        description: `Please complete: ${missingInputs.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (validationErrors.email) {
      setDropValidationErrors(validationErrors);
      toast({
        title: 'Invalid Email',
        description: validationErrors.email,
        variant: 'destructive',
      });
      return;
    }

    if (!supabase) {
      setDropError('Supabase client not initialized.');
      toast({
        title: 'Failed to Drop Student',
        description: 'Supabase client not initialized.',
        variant: 'destructive',
      });
      return;
    }
    setDroppingStudent(true);
    try {
      // Re-authenticate admin
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: dropConfirmEmail,
        password: dropConfirmPassword,
      });
      if (signInError) {
        setDropError('Invalid email or password.');
        toast({
          title: 'Invalid Credentials',
          description: 'Invalid email or password.',
          variant: 'destructive',
        });
        setDroppingStudent(false);
        return;
      }
      const { error } = await supabase.from('students').update({ status: 'inactive', substatus: 'dropped' }).eq('id', selectedStudent.id);
      if (error) throw error;
      setDropDialogOpen(false);
      setSelectedStudent(null);
      setDetailsOpen(false);
      await fetchStudents();
      toast({ title: 'Student dropped', description: 'Student is now marked as dropped and is no longer a current student.' });
    } catch (err) {
      setDropError('Failed to drop student.');
      toast({
        title: 'Failed to Drop Student',
        description: err instanceof Error ? err.message : 'Failed to drop student.',
        variant: 'destructive',
      });
    } finally {
      setDroppingStudent(false);
      setDropConfirmEmail('');
      setDropConfirmPassword('');
      setDropValidationErrors({});
    }
  };
  const handleTransferStudent = async () => {
    if (!selectedStudent || !user) return;
    setTransferError('');

    const missingInputs: string[] = [];
    const validationErrors: { email?: string; password?: string } = {};

    if (!transferConfirmEmail.trim()) {
      missingInputs.push('Email');
      validationErrors.email = 'Please provide your account email.';
    } else if (transferConfirmEmail.trim().toLowerCase() !== user.username?.toLowerCase()) {
      validationErrors.email = 'Account email does not match.';
    }

    if (!transferConfirmPassword.trim()) {
      missingInputs.push('Password');
      validationErrors.password = 'Please provide your password.';
    }

    if (missingInputs.length > 0) {
      setTransferValidationErrors(validationErrors);
      toast({
        title: 'Required Inputs Missing',
        description: `Please complete: ${missingInputs.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (validationErrors.email) {
      setTransferValidationErrors(validationErrors);
      toast({
        title: 'Invalid Email',
        description: validationErrors.email,
        variant: 'destructive',
      });
      return;
    }

    if (!supabase) {
      setTransferError('Supabase client not initialized.');
      toast({
        title: 'Failed to Transfer Student',
        description: 'Supabase client not initialized.',
        variant: 'destructive',
      });
      return;
    }

    setTransferringStudent(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: transferConfirmEmail,
        password: transferConfirmPassword,
      });
      if (signInError) {
        setTransferError('Invalid email or password.');
        toast({
          title: 'Invalid Credentials',
          description: 'Invalid email or password.',
          variant: 'destructive',
        });
        setTransferringStudent(false);
        return;
      }

      const { error } = await supabase
        .from('students')
        .update({ status: 'inactive', substatus: 'transferred' })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      setTransferDialogOpen(false);
      setSelectedStudent(null);
      setDetailsOpen(false);
      await fetchStudents();
      toast({ title: 'Student transferred', description: 'Student is now marked as transferred and hidden from current students.' });
    } catch (err) {
      setTransferError('Failed to transfer student.');
      toast({
        title: 'Failed to Transfer Student',
        description: err instanceof Error ? err.message : 'Failed to transfer student.',
        variant: 'destructive',
      });
    } finally {
      setTransferringStudent(false);
      setTransferConfirmEmail('');
      setTransferConfirmPassword('');
      setTransferValidationErrors({});
    }
  };
  // State for Undo dialog
  const [undoDialogOpen, setUndoDialogOpen] = useState(false);
  // State for validated parent emails
  const [validatedParentEmails, setValidatedParentEmails] = useState<string[]>([]);
    // For LRN confirmation
    const [pendingLrn, setPendingLrn] = useState('');
    const [confirmLrnOpen, setConfirmLrnOpen] = useState(false);
    const [lrnToSave, setLrnToSave] = useState('');
  // Handler for validating/creating parent account
  const handleValidateParentAccount = async (student: Student) => {
    const parentEmail = student.parentEmail?.trim();
    const parentName = student.parentName?.trim();
    if (!parentEmail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(parentEmail)) {
      toast({
        title: 'Invalid Email',
        description: 'Parent email is missing or invalid.',
        variant: 'destructive',
      });
      return;
    }
    try {
      // 1. Check if already validated in state
      if (validatedParentEmails.includes(parentEmail.toLowerCase())) {
        toast({
          title: 'Account already exists',
          description: 'A user with this parent email already exists.',
          variant: 'destructive',
        });
        return;
      }
      // 2. Prepare password: parent's last name (lowercase) + 'Safegate'
      const sourceForLastName = parentName && parentName.trim() ? parentName.trim() : (student.name || '').trim();
      const nameParts = sourceForLastName.split(' ');
      const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1].toLowerCase() : nameParts[0].toLowerCase();
      const password = `${lastName}Safegate`;
      // 3. Create user
      const addRes = await fetch('/api/auth/add-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: parentEmail,
          password,
          full_name: parentName || parentEmail,
          role: 'parent',
        }),
      });
      const addData = await addRes.json();
      if (addData.success && addData.user?.id) {
        // 4. Update parents table to set user_id for this parent_email
        if (supabase) {
          await supabase
            .from('parents')
            .update({ user_id: addData.user.id })
            .eq('parent_email', parentEmail);
        }
        toast({
          title: 'Parent Account Created',
          description: `Account for ${parentEmail} created successfully. Password: ${password}`,
          variant: 'default',
        });
        // Update validated emails state so button disappears
        setValidatedParentEmails((prev) => [...prev, parentEmail.toLowerCase()]);
        // Refetch students to update linkage immediately
        fetchStudents();
      } else {
        toast({
          title: 'Failed to Create Account',
          description: addData.error || 'Unknown error',
          variant: 'destructive',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to validate/create account',
        variant: 'destructive',
      });
    }
  };

  // Handler for unlinking parent account
  const handleUnlinkParentAccount = async (student: Student) => {
    const parentEmail = (student.parentEmail || student.parent_email || '').trim().toLowerCase();
    if (!parentEmail) {
      toast({
        title: 'No Parent Email',
        description: 'Cannot unlink without a parent email.',
        variant: 'destructive',
      });
      return;
    }

    try {
      if (supabase) {
        const { error } = await supabase
          .from('parents')
          .update({ user_id: null })
          .eq('parent_email', parentEmail);
        
        if (error) {
          toast({
            title: 'Failed to Unlink',
            description: error.message || 'Could not unlink parent account',
            variant: 'destructive',
          });
          return;
        }
      }

      toast({
        title: 'Parent Account Unlinked',
        description: `Account for ${parentEmail} has been unlinked.`,
        variant: 'default',
      });

      // Remove from validated emails state
      setValidatedParentEmails((prev) => prev.filter((email) => email !== parentEmail.toLowerCase()));
      
      // Refetch students to update UI
      await fetchStudents();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'Failed to unlink account',
        variant: 'destructive',
      });
    }
  };
    // Fetch validated parent emails on mount
    useEffect(() => {
      const fetchValidatedEmails = async () => {
        try {
          const res = await fetch('/api/auth/users');
          const data = await res.json();
          // Support both .users and .data for compatibility
          const users = data.users || data.data || [];
          setValidatedParentEmails(users.map((u: any) => u.email?.toLowerCase()).filter(Boolean));
        } catch (e) {
          // Ignore error, fallback to empty
          setValidatedParentEmails([]);
        }
      };
      fetchValidatedEmails();
    }, []);
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterGender, setFilterGender] = useState('all');
  const [filterRisk, setFilterRisk] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsTab, setDetailsTab] = useState('overview');
  // Pagination state for student list
  const [currentPage, setCurrentPage] = useState(1);
  const [summerCurrentPage, setSummerCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  const [highlightExcuseDate, setHighlightExcuseDate] = useState('');
  const [notificationDeepLinkHandled, setNotificationDeepLinkHandled] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSchoolYearLabel, setCurrentSchoolYearLabel] = useState('');
  const [currentSchoolYear, setCurrentSchoolYear] = useState<{ label: string, start_date: string, end_date: string } | null>(null);
  const [endSchoolYearOpen, setEndSchoolYearOpen] = useState(false);
  const [includeSummerStudentsOnEnd, setIncludeSummerStudentsOnEnd] = useState(false);
  const [endingSchoolYear, setEndingSchoolYear] = useState(false);
  const [showFilters, setShowFilters] = useState(true);
  const [activeTab, setActiveTab] = useState('list');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });
  const [addStudentOpen, setAddStudentOpen] = useState(false);
  const [addingStudent, setAddingStudent] = useState(false);
  const [selectedScheduleDays, setSelectedScheduleDays] = useState<string[]>(WEEKDAY_OPTIONS.map((d) => d.label));
  // Add state for editing student info
  const [editingStudentInfo, setEditingStudentInfo] = useState(false);
  const [savingStudentInfo, setSavingStudentInfo] = useState(false);
  const [rfidConnected, setRfidConnected] = useState(sharedRfidState.connected);
  const [connectingRfid, setConnectingRfid] = useState(sharedRfidState.connecting);
  const rfidPortRef = useRef<any>(null);
  const rfidReaderRef = useRef<any>(null);
  const rfidReadingActiveRef = useRef(false);
  const rfidDisconnectingRef = useRef(false);

  // Buffer for last name editing
  const [editFirstMiddleName, setEditFirstMiddleName] = useState<string | null>(null);
  const [editLastName, setEditLastName] = useState<string | null>(null);

  const normalizeRfidUid = (value: string) => value.trim().toUpperCase().replace(/[^A-F0-9]/g, '');

  const applyRfidLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const uidMatch = trimmed.match(/(?:card\s*uid|uid)\s*:\s*(.+)$/i);
    if (!uidMatch?.[1]) return;

    const uid = normalizeRfidUid(uidMatch[1]);
    if (uid.length < 4) return;

    setSelectedStudent((current) => {
      if (!current) return current;
      return { ...current, rfid_uid: uid };
    });

    setEditingStudentInfo(true);
  };

  const disconnectRfidReader = async (silent = false) => {
    if (rfidDisconnectingRef.current || sharedRfidState.disconnecting) return;
    rfidDisconnectingRef.current = true;
    sharedRfidState.disconnecting = true;
    rfidReadingActiveRef.current = false;
    sharedRfidState.readingActive = false;

    try {
      const reader = rfidReaderRef.current ?? sharedRfidState.reader;
      const port = rfidPortRef.current ?? sharedRfidState.port;

      if (reader) {
        try {
          await reader.cancel();
        } catch {
          // Reader can already be closed while disconnecting.
        }

        try {
          reader.releaseLock();
        } catch {
          // No-op if lock is already released.
        }
      }

      if (port) {
        try {
          await port.close();
        } catch {
          // Port can already be closed.
        }
      }
    } catch {
      // Best effort cleanup.
    } finally {
      rfidReaderRef.current = null;
      rfidPortRef.current = null;
      sharedRfidState.reader = null;
      sharedRfidState.port = null;
      sharedRfidState.connected = false;
      sharedRfidState.connecting = false;
      sharedRfidState.disconnecting = false;
      sharedRfidState.readingActive = false;
      setRfidConnected(false);
      rfidDisconnectingRef.current = false;
      if (!silent) {
        toast({
          title: 'RFID Reader Disconnected',
          description: 'Manual serial input has been disconnected.',
        });
      }
    }
  };

  const connectRfidReader = async () => {
    if (typeof navigator === 'undefined' || !(navigator as any).serial) {
      toast({
        title: 'Web Serial Not Supported',
        description: 'Use Chrome/Edge and open the app over localhost or HTTPS.',
        variant: 'destructive',
      });
      return;
    }

    setConnectingRfid(true);
    sharedRfidState.connecting = true;
    try {
      if (sharedRfidState.connected || rfidPortRef.current) {
        setRfidConnected(true);
        return;
      }

      const serialApi = (navigator as any).serial;
      const grantedPorts = await serialApi.getPorts();
      const port = grantedPorts[0] ?? await serialApi.requestPort();
      if (!port.readable) {
        await port.open({ baudRate: 115200 });
      }

      rfidPortRef.current = port;
      sharedRfidState.port = port;
      rfidReadingActiveRef.current = true;
      sharedRfidState.readingActive = true;
      setRfidConnected(true);
      setConnectingRfid(false);
      sharedRfidState.connected = true;
      sharedRfidState.connecting = false;
      toast({
        title: 'RFID Reader Connected',
        description: 'Tap a tag and the UID will auto-fill the field below.',
      });

      const decoder = new TextDecoder();
      let buffer = '';

      while (rfidReadingActiveRef.current && port.readable && rfidPortRef.current === port) {
        const reader = port.readable.getReader();
        rfidReaderRef.current = reader;
        sharedRfidState.reader = reader;
        try {
          while (rfidReadingActiveRef.current) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            if (!value) {
              continue;
            }

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              applyRfidLine(line);
            }
          }
        } catch {
          if (!rfidReadingActiveRef.current) {
            break;
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // No-op if lock already released.
          }
          if (rfidReaderRef.current === reader) {
            rfidReaderRef.current = null;
          }
          if (sharedRfidState.reader === reader) {
            sharedRfidState.reader = null;
          }
        }
      }
    } catch (error: any) {
      const cancelled = error?.name === 'NotFoundError';
      if (!cancelled) {
        toast({
          title: 'Failed to Connect RFID Reader',
          description: error?.message || String(error),
          variant: 'destructive',
        });
      }
      await disconnectRfidReader(true);
    } finally {
      setConnectingRfid(false);
      sharedRfidState.connecting = false;
    }
  };

  useEffect(() => {
    setRfidConnected(sharedRfidState.connected);
    setConnectingRfid(sharedRfidState.connecting);

    if (typeof navigator !== 'undefined' && (navigator as any).serial) {
      const serialApi = (navigator as any).serial;
      const handleSerialDisconnect = (event: any) => {
        const activePort = rfidPortRef.current ?? sharedRfidState.port;
        const disconnectedPort = event?.port ?? event?.target;
        if (activePort && disconnectedPort && activePort !== disconnectedPort) {
          return;
        }
        void disconnectRfidReader(true);
      };

      serialApi.addEventListener?.('disconnect', handleSerialDisconnect);
      return () => {
        serialApi.removeEventListener?.('disconnect', handleSerialDisconnect);
        void disconnectRfidReader(true);
      };
    }

    return () => {
      void disconnectRfidReader(true);
    };
  }, []);

  const handleConfirmStudentInfo = async () => {
    if (!selectedStudent || !supabase) {
      return;
    }

    // Check if parent email is being changed and if account exists
    const oldParentEmail = (selectedStudent.parent_email || selectedStudent.parentEmail || '').toLowerCase().trim();
    const newParentEmail = (selectedStudent.parentEmail || '').toLowerCase().trim();
    
    if (oldParentEmail && newParentEmail && oldParentEmail !== newParentEmail) {
      // Email is being changed - check if parent account exists
      try {
        const { data: existingParent, error: checkError } = await supabase
          .from('parents')
          .select('user_id')
          .eq('parent_email', oldParentEmail)
          .single();
        
        if (existingParent && existingParent.user_id) {
          toast({
            title: 'Cannot change parent email',
            description: 'A parent account already exists for this email. Please delete the account first or contact an administrator.',
            variant: 'destructive',
          });
          return;
        }
      } catch (err) {
        // Parent record doesn't exist, safe to proceed
      }
    }

    let updatedName = selectedStudent.name;
    if (editLastName !== null || editFirstMiddleName !== null) {
      const raw = selectedStudent.name.trim();
      let currentLast = '';
      let currentFirstMiddle = '';
      if (raw.includes(',')) {
        const parts = raw.split(',');
        currentLast = (parts[0] || '').trim();
        currentFirstMiddle = (parts[1] || '').trim();
      } else {
        const nameParts = raw.split(' ');
        currentLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
        currentFirstMiddle = nameParts.slice(0, -1).join(' ');
      }

      const nextLast = (editLastName ?? currentLast).trim();
      const nextFirstMiddle = (editFirstMiddleName ?? currentFirstMiddle).trim();

      if (raw.includes(',')) {
        updatedName = `${nextLast}${nextFirstMiddle ? `, ${nextFirstMiddle}` : ''}`.trim();
      } else {
        updatedName = `${nextFirstMiddle}${nextFirstMiddle ? ' ' : ''}${nextLast}`.trim();
      }
    }

    const normalizedRfid = normalizeRfidUid(selectedStudent.rfid_uid || '');

    const payload = {
      name: updatedName,
      gender: (selectedStudent.gender || '').trim() || null,
      birthday: (selectedStudent.birthday || '').trim() || null,
      address: (selectedStudent.address || '').trim() || null,
      parent_name: (selectedStudent.parentName || '').trim() || null,
      parent_contact: (selectedStudent.parentContact || '').trim() || null,
      parent2_name: (selectedStudent.parent2Name || '').trim() || null,
      parent2_contact: (selectedStudent.parent2Contact || '').trim() || null,
      parent_email: (selectedStudent.parentEmail || '').trim() || null,
      rfid_uid: normalizedRfid || null,
      is_special_case: !!selectedStudent.is_special_case,
      updated_at: new Date().toISOString(),
    };

    setSavingStudentInfo(true);

    try {
      // Ensure new parent_email exists in parents table (for FK constraint)
      if (payload.parent_email && payload.parent_email.trim()) {
        try {
          const { data: existingParent } = await supabase
            .from('parents')
            .select('parent_email')
            .eq('parent_email', payload.parent_email)
            .single();

          if (!existingParent) {
            // Parent record doesn't exist, create it
            const { error: insertError } = await supabase
              .from('parents')
              .insert({
                parent_email: payload.parent_email,
                full_name: payload.parent_name || null,
                contact: payload.parent_contact || null,
              });

            if (insertError) {
              toast({
                title: 'Failed to create parent record',
                description: insertError.message || 'Could not create parent entry',
                variant: 'destructive',
              });
              setSavingStudentInfo(false);
              return;
            }
          }
        } catch (err) {
          // If error checking, try to insert anyway
          console.log('Parent check error (will attempt insert):', err);
        }
      }

      const { error } = await supabase
        .from('students')
        .update(payload)
        .eq('id', selectedStudent.id);

      if (error) {
        const duplicateUid = error.code === '23505' && (error.message || '').toLowerCase().includes('rfid_uid');
        toast({
          title: duplicateUid ? 'RFID UID already assigned' : 'Failed to update student',
          description: duplicateUid
            ? 'This RFID UID is already assigned to another student.'
            : (error.message || 'Student information was not saved.'),
          variant: 'destructive',
        });
        return;
      }

      setSelectedStudent({
        ...selectedStudent,
        name: updatedName,
        gender: payload.gender || '',
        birthday: payload.birthday || '',
        address: payload.address || '',
        parentName: payload.parent_name || '',
        parentContact: payload.parent_contact || '',
        parent2Name: payload.parent2_name || '',
        parent2Contact: payload.parent2_contact || '',
        parentEmail: payload.parent_email || '',
        rfid_uid: payload.rfid_uid,
        is_special_case: payload.is_special_case || false,
      });
      // If LRN was edited while in edit mode, attempt to update it via RPC
      if (pendingLrn && pendingLrn.trim() && pendingLrn.trim() !== selectedStudent.lrn) {
        try {
          const newLrn = pendingLrn.trim();
          const { error: lrnError } = await supabase.rpc('update_student_lrn', {
            old_lrn: selectedStudent.lrn,
            new_lrn: newLrn,
            student_id: selectedStudent.id,
          });
          if (lrnError) {
            toast({ title: 'Failed to update LRN', description: lrnError.message || String(lrnError), variant: 'destructive' });
          } else {
            setSelectedStudent((prev) => prev ? { ...prev, lrn: newLrn } : prev);
            toast({ title: 'LRN updated', description: 'Student LRN was updated.' });
          }
        } catch (err) {
          console.error('Failed to update LRN during save:', err);
          toast({ title: 'Failed to update LRN', description: String(err), variant: 'destructive' });
        }
      }
      setEditFirstMiddleName(null);
      setEditLastName(null);
      setEditingStudentInfo(false);
      await fetchStudents();
      toast({ title: 'Student info updated!', description: 'Student information and RFID UID were saved.' });
    } catch (err) {
      toast({
        title: 'Failed to update student',
        description: err instanceof Error ? err.message : String(err),
        variant: 'destructive',
      });
    } finally {
      setSavingStudentInfo(false);
    }
  };
  const [scheduleTimeSlots, setScheduleTimeSlots] = useState<Array<{ label: string; startTime: string; endTime: string }>>([...DEFAULT_SCHEDULE_SLOTS]);
  const [newStudentForm, setNewStudentForm] = useState({
    lrn: '',
    lastName: '',
    firstMiddleName: '',
    gender: '',
    birthday: '',
    level: '',
    address: '',
    parentName: '',
    parentContact: '',
    parent2Name: '',
    parent2Contact: '',
    parentEmail: '',
    status: 'active',
    is_special_case: false,
  });
  const [addStudentValidationErrors, setAddStudentValidationErrors] = useState<{
    lastName?: string;
    firstMiddleName?: string;
    gender?: string;
    birthday?: string;
    level?: string;
    parentName?: string;
    parentContact?: string;
    parentEmail?: string;
    parent2Name?: string;
    parent2Contact?: string;
  }>({});
  const isEarlyLevelSelected = EARLY_LEVEL_OPTIONS.includes(newStudentForm.level);
  const isGradeLevelSelected = GRADE_LEVEL_OPTIONS.includes(newStudentForm.level);
  const shouldShowScheduleConfig = isEarlyLevelSelected || isGradeLevelSelected;
  
  const [newSchoolYearOpen, setNewSchoolYearOpen] = useState(false);
  // Summer class states
  const [summerModalOpen, setSummerModalOpen] = useState(false);
  const [summerSearchQuery, setSummerSearchQuery] = useState('');
  const [summerStartDate, setSummerStartDate] = useState('');
  const [summerEndDate, setSummerEndDate] = useState('');
  const [selectedSummerStudents, setSelectedSummerStudents] = useState<string[]>([]);
  const [summerEnrollments, setSummerEnrollments] = useState<Record<string, { id?: number; start_date: string; end_date: string }>>({});
  const [showOnlySummer, setShowOnlySummer] = useState(false);

  // Reset page when filters/search change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterGrade, filterGender, filterRisk, showOnlySummer, sortConfig]);

  useEffect(() => {
    setSummerCurrentPage(1);
  }, [summerEnrollments]);

  useEffect(() => {
    if (summerModalOpen) {
      // preselect currently enrolled students
      setSelectedSummerStudents(Object.keys(summerEnrollments));
      // default dates to first enrollment or empty
      const keys = Object.keys(summerEnrollments);
      if (keys.length > 0) {
        const first = summerEnrollments[keys[0]];
        if (first) {
          setSummerStartDate(first.start_date || '');
          setSummerEndDate(first.end_date || '');
        }
      }
      setSummerSearchQuery('');
    } else {
      // clear selections on close
      setSelectedSummerStudents([]);
      setSummerStartDate('');
      setSummerEndDate('');
      setSummerSearchQuery('');
    }
  }, [summerModalOpen]);
  const [schoolYearStartDate, setSchoolYearStartDate] = useState('');
  const [schoolYearEndDate, setSchoolYearEndDate] = useState('');
  const [processingStudents, setProcessingStudents] = useState<{ [key: string]: string }>({});
  const [importingStudents, setImportingStudents] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [previousStudentData, setPreviousStudentData] = useState<Student[]>([]);
  const [undoAvailable, setUndoAvailable] = useState(false);
  const [undoInProgress, setUndoInProgress] = useState(false);
  // Track if school year advancement is pending confirmation
  const [pendingSchoolYearConfirmation, setPendingSchoolYearConfirmation] = useState(false);
  // Modal for final confirmation before processing
  const [finalConfirmModalOpen, setFinalConfirmModalOpen] = useState(false);
  // Modal for loading state after confirming advancement
  const [schoolYearLoadingModalOpen, setSchoolYearLoadingModalOpen] = useState(false);
  const qrRef = useRef(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [behavioralData, setBehavioralData] = useState<any>(null);
  const [loadingBehavioral, setLoadingBehavioral] = useState(false);
  const [excuseLettersByLrn, setExcuseLettersByLrn] = useState<Record<string, Array<{
    id: number;
    title: string;
    message: string;
    created_at: string;
    created_by: string | null;
    meta: Record<string, any> | null;
  }>>>({});
  const [loadingExcuseLetters, setLoadingExcuseLetters] = useState(false);
  const [attendanceByLrn, setAttendanceByLrn] = useState<Record<string, { checkInTime?: string; checkOutTime?: string; passedDayEnd?: boolean; scheduledEndTime?: string; attendanceStatus?: string }>>({});
  const [riskScores, setRiskScores] = useState<Record<string, RiskScore | null>>({});
  const [studentSchedules, setStudentSchedules] = useState<Record<string, Array<{
    id: number;
    day_of_week: string;
    day_number: number;
    subject: string;
    start_time: string;
    end_time: string;
    room: string | null;
    teacher_name: string | null;
  }>>>({});
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(false);
  const [savingScheduleChanges, setSavingScheduleChanges] = useState(false);
  const [scheduleDraft, setScheduleDraft] = useState<EditableScheduleRow[]>([]);
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
  const schoolYearClosureKey = 'schoolYearEndedAt';
  const schoolYearMinimumStartDate = useMemo(() => {
    const baseDate = currentSchoolYear?.end_date ? new Date(currentSchoolYear.end_date) : new Date();
    baseDate.setDate(baseDate.getDate() + 1);
    baseDate.setHours(0, 0, 0, 0);
    return baseDate.toISOString().split('T')[0];
  }, [currentSchoolYear?.end_date]);

  const loadSchoolYearMetadata = async () => {
    if (!supabase) return;

    const { data, error } = await supabase
      .from('school_years')
      .select('label, start_date, end_date')
      .eq('is_current', true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const forcedEndDate = typeof window !== 'undefined' ? localStorage.getItem(schoolYearClosureKey) : null;
    if (data) {
      setCurrentSchoolYearLabel(data.label);
      setCurrentSchoolYear(data);
    } else if (forcedEndDate) {
      setCurrentSchoolYearLabel('School Year Closed');
      setCurrentSchoolYear({
        label: 'School Year Closed',
        start_date: forcedEndDate,
        end_date: forcedEndDate,
      });
    } else {
      setCurrentSchoolYearLabel('');
      setCurrentSchoolYear(null);
    }

    try {
      const { data: summerData } = await supabase.from('summer_enrollments').select('*');
      const map: Record<string, { id?: number; start_date: string; end_date: string }> = {};
      (summerData || []).forEach((row: any) => {
        map[row.student_lrn] = { id: row.id, start_date: row.start_date, end_date: row.end_date };
      });
      setSummerEnrollments(map);
    } catch (err) {
      // ignore if table doesn't exist yet
    }
  };

  useEffect(() => {
    if (isMobile) {
      setShowFilters(false);
    }
    void loadSchoolYearMetadata().catch((error) => {
      console.error('Failed to load school year metadata:', error);
    });
  }, [isMobile]);

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

  // School year advancement handler (fix: mark as async)
  // Start school year advancement, but require confirmation
  const handleAdvanceSchoolYear = async () => {
    if (!schoolYearStartDate || !schoolYearEndDate) {
      toast({
        title: 'Missing Dates',
        description: 'Please select both start and end dates.',
        variant: 'destructive',
      });
      return;
    }
    if (schoolYearStartDate < schoolYearMinimumStartDate) {
      toast({
        title: 'Invalid Start Date',
        description: `School year must start on or after ${schoolYearMinimumStartDate}.`,
        variant: 'destructive',
      });
      return;
    }
    if (schoolYearStartDate > schoolYearEndDate) {
      toast({
        title: 'Invalid Dates',
        description: 'End date must be on or after the start date.',
        variant: 'destructive',
      });
      return;
    }
    if (!supabase) {
      toast({
        title: 'Internal Error',
        description: 'Supabase client not initialized',
        variant: 'destructive',
      });
      return;
    }
    // Only set pending confirmation, do not advance yet
    setPendingSchoolYearConfirmation(true);
  };

  // Show final confirmation modal before processing
  const handleConfirmSchoolYear = () => {
    setFinalConfirmModalOpen(true);
  };

  // Actually process advancement after final confirmation
  const handleFinalConfirmSchoolYear = async () => {
    setFinalConfirmModalOpen(false);
    setSchoolYearLoadingModalOpen(true);
    setPreviousStudentData(students); // Save for undo
    setProcessingStudents({});
    setProcessedCount(0);
    setUndoAvailable(false);
    setUndoInProgress(false);
    try {
      // 1. Advance students to next grade or graduate
      let processed = 0;
      for (const student of students) {
        let newLevel = '';
        let newStatus = student.status;
        if (student.level === 'Grade 8') {
          newLevel = 'Grade 8';
          newStatus = 'graduated';
        } else {
          const idx = GRADE_LEVEL_OPTIONS.indexOf(student.level);
          if (idx !== -1 && idx < GRADE_LEVEL_OPTIONS.length - 1) {
            newLevel = GRADE_LEVEL_OPTIONS[idx + 1];
          } else if (EARLY_LEVEL_OPTIONS.includes(student.level)) {
            // Early levels advance
            const earlyIdx = EARLY_LEVEL_OPTIONS.indexOf(student.level);
            if (earlyIdx !== -1 && earlyIdx < EARLY_LEVEL_OPTIONS.length - 1) {
              newLevel = EARLY_LEVEL_OPTIONS[earlyIdx + 1];
            } else {
              newLevel = 'Grade 1';
            }
          } else {
            newLevel = student.level;
          }
        }
        // Update student in DB
        const { error } = await supabase
          .from('students')
          .update({
            level: newLevel,
            status: newStatus,
          })
          .eq('id', student.id);
        if (error) {
          toast({
            title: `Failed to update ${student.name}`,
            description: error.message,
            variant: 'destructive',
          });
        }
        processed++;
        setProcessedCount(processed);
      }
      // 2. Create new school year record
      const startYear = new Date(schoolYearStartDate).getFullYear();
      const endYear = new Date(schoolYearEndDate).getFullYear();
      const label = `S.Y. ${startYear}-${endYear}`;
      await supabase.from('school_years').insert({
        label,
        start_date: schoolYearStartDate,
        end_date: schoolYearEndDate,
        is_current: true,
      });
      // 3. Mark previous school years as not current
      await supabase.from('school_years').update({ is_current: false }).neq('label', label);
      // 4. Sync to masterlist (if needed, add logic here)
      toast({
        title: 'School Year Advanced!',
        description: 'All students have been advanced and data synced.',
      });
      setUndoAvailable(false); // revert to New School Year button after confirm
      setPendingSchoolYearConfirmation(false);
      fetchStudents();
    } catch (error: any) {
      toast({
        title: 'Advancement Failed',
        description: error.message || String(error),
        variant: 'destructive',
      });
    } finally {
      setSchoolYearLoadingModalOpen(false);
    }
  };

  const handleEndSchoolYearDialogChange = (open: boolean) => {
    setEndSchoolYearOpen(open);
    if (!open) {
      setIncludeSummerStudentsOnEnd(false);
    }
  };

  const handleEndSchoolYear = async () => {
    if (!supabase) {
      toast({
        title: 'Internal Error',
        description: 'Supabase client not initialized.',
        variant: 'destructive',
      });
      return;
    }

    let schoolYearToEnd = currentSchoolYear;

    if (!schoolYearToEnd) {
      const { data: fallbackSchoolYear, error: fallbackError } = await supabase
        .from('school_years')
        .select('label, start_date, end_date')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (fallbackError) {
        toast({
          title: 'Missing School Year',
          description: fallbackError.message,
          variant: 'destructive',
        });
        return;
      }

      schoolYearToEnd = fallbackSchoolYear || null;
    }

    if (!schoolYearToEnd) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const endDateValue = endDate.toISOString().split('T')[0];
      localStorage.setItem(schoolYearClosureKey, endDateValue);
      const syntheticSchoolYear = {
        label: 'School Year Closed',
        start_date: endDateValue,
        end_date: endDateValue,
      };

      setCurrentSchoolYearLabel('School Year Closed');
      setCurrentSchoolYear(syntheticSchoolYear);

      await fetchTodaysAttendance({
        currentSchoolYear: syntheticSchoolYear,
        summerEnrollmentsOverride: summerEnrollments,
      });

      toast({
        title: 'School Year Ended',
        description: includeSummerStudentsOnEnd
          ? 'Active students were stopped and summer enrollments were also closed.'
          : 'Active students were stopped. Summer class students remain available.',
      });
      setEndSchoolYearOpen(false);
      setEndingSchoolYear(false);
      return;
    }

    setEndingSchoolYear(true);
    try {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() - 1);
      const endDateValue = endDate.toISOString().split('T')[0];

      const { error: schoolYearError } = await supabase
        .from('school_years')
        .update({ end_date: endDateValue })
        .eq('label', schoolYearToEnd.label);

      if (schoolYearError) {
        throw schoolYearError;
      }

      if (includeSummerStudentsOnEnd && Object.keys(summerEnrollments).length > 0) {
        const { error: summerError } = await supabase
          .from('summer_enrollments')
          .update({ end_date: endDateValue })
          .in('student_lrn', Object.keys(summerEnrollments));

        if (summerError) {
          throw summerError;
        }
      }

      const updatedSchoolYear = { ...schoolYearToEnd, end_date: endDateValue };
      const updatedSummerEnrollments = includeSummerStudentsOnEnd
        ? Object.fromEntries(
            Object.entries(summerEnrollments).map(([lrn, enrollment]) => [
              lrn,
              { ...enrollment, end_date: endDateValue },
            ])
          )
        : summerEnrollments;

      if (updatedSchoolYear) {
        setCurrentSchoolYear(updatedSchoolYear);
      }
      localStorage.setItem(schoolYearClosureKey, endDateValue);
      if (includeSummerStudentsOnEnd) {
        setSummerEnrollments(updatedSummerEnrollments);
      }

      await loadSchoolYearMetadata();
      await fetchStudents();
      await fetchTodaysAttendance({
        currentSchoolYear: updatedSchoolYear,
        summerEnrollmentsOverride: updatedSummerEnrollments,
      });

      toast({
        title: 'School Year Ended',
        description: includeSummerStudentsOnEnd
          ? 'Active students were stopped and summer enrollments were also closed.'
          : 'Active students were stopped. Summer class students remain available.',
      });
      setEndSchoolYearOpen(false);
    } catch (error: any) {
      toast({
        title: 'Failed to End School Year',
        description: error?.message || String(error),
        variant: 'destructive',
      });
    } finally {
      setEndingSchoolYear(false);
    }
  };
  // Function to check if school day has ended based on per-student schedule or year level fallback
  const isSchoolDayEnded = (studentLevel: string, scheduledEndTime?: string): boolean => {
    const now = new Date();
    const configuredTime = (scheduledEndTime ? scheduledEndTime.slice(0, 5) : undefined) || yearLevelTimes[studentLevel] || '16:00';
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

  // Fetch students and parents from Supabase, compute linkage in frontend
  const fetchStudents = async () => {
    try {
      setLoading(true);

      if (!supabase) {
        toast({
          title: 'Database not connected',
          description: 'Supabase client is not initialized.',
          variant: 'destructive',
        });
        return;
      }

      // Fetch all students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*');
      if (studentsError) throw studentsError;

      // Fetch all parents (emails and user_id for linkage)
      const { data: parentsData, error: parentsError } = await supabase
        .from('parents')
        .select('parent_email, user_id');
      if (parentsError) throw parentsError;

      // Only consider parent as linked if user_id is not null
      const parentEmailSet = new Set(
        (parentsData || [])
          .filter((p: any) => p.user_id)
          .map((p: any) => (p.parent_email || '').trim().toLowerCase())
      );

      // Map students and compute linkage
      const mappedStudents = (studentsData || []).map((student: any) => {
        const normalizedParentEmail = (student.parent_email || student.parentEmail || '').trim().toLowerCase();
        return {
          ...student,
          lrn: toDisplayLrn(student.lrn),
          riskLevel: student.risk_level || null,
          parentName: student.parent_name,
          parentContact: student.parent_contact,
          parent2Name: student.parent2_name || null,
          parent2Contact: student.parent2_contact || null,
          parent_email: normalizedParentEmail || null,
          parentEmail: normalizedParentEmail || null,
          isLinked: !!(normalizedParentEmail && parentEmailSet.has(normalizedParentEmail)),
        };
      });
      setStudents(sortByLevel(mappedStudents));

      // Fetch risk scores for all students
      const riskScorePromises = mappedStudents.map(async (student) => {
        try {
          const score = await calculateStudentRiskScore(student.lrn);
          // If no score or no records, default to low
          if (!score || !score.risk_level) {
            return { lrn: student.lrn, score: { risk_level: 'low' } };
          }
          return { lrn: student.lrn, score };
        } catch (error) {
          console.error(`Error fetching risk score for ${student.lrn}:`, error);
          return { lrn: student.lrn, score: { risk_level: 'low' } };
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
    }
  };

  // Fetch students on component mount
  useEffect(() => {
    fetchStudents();
  }, []);

  // Fetch today's attendance separately so cards update immediately
  const isNoClassStatus = (s?: string) => {
    const v = (s || '').toLowerCase();
    return v === 'holiday' || v === 'cancelled_class';
  };

  const fetchTodaysAttendance = async (options?: {
    currentSchoolYear?: { label: string; start_date: string; end_date: string } | null;
    summerEnrollmentsOverride?: Record<string, { id?: number; start_date: string; end_date: string }>;
  }) => {
    if (!supabase) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('student_lrn, check_in_time, check_out_time, attendance_status, is_present')
        .eq('date', today);
      if (attendanceError) throw attendanceError;

      const attendanceMap: Record<string, { checkInTime?: string; checkOutTime?: string; attendanceStatus?: string; scheduledEndTime?: string; isPresent?: boolean }> = {};
      (attendance || []).forEach((entry: any) => {
        attendanceMap[entry.student_lrn] = {
          checkInTime: entry.check_in_time,
          checkOutTime: entry.check_out_time || undefined,
          attendanceStatus: entry.attendance_status || entry.attendanceStatus || undefined,
          isPresent: entry.is_present === true || entry.isPresent === true ? true : false,
        };
      });

      // Enforce summer / school year attendance rules: if today's date is after current school year end,
      // only students enrolled in summer classes should have attendance considered. Others should be marked out_of_session.
      try {
        const todayDate = new Date(today);
        const schoolYearForCheck = options?.currentSchoolYear ?? currentSchoolYear;
        const summerEnrollmentsForCheck = options?.summerEnrollmentsOverride ?? summerEnrollments;
        if (schoolYearForCheck && schoolYearForCheck.end_date) {
          const syEnd = new Date(schoolYearForCheck.end_date);
          if (todayDate > syEnd) {
            // We're past school year end; enforce summer-only attendance
            students.forEach((s) => {
              const enrollment = summerEnrollmentsForCheck[s.lrn];
              if (!enrollment) {
                attendanceMap[s.lrn] = {
                  checkInTime: undefined,
                  checkOutTime: undefined,
                  attendanceStatus: 'out_of_session',
                  isPresent: false,
                };
              } else {
                // If enrollment exists, check if today is within enrollment range
                try {
                  const start = new Date(enrollment.start_date);
                  const end = new Date(enrollment.end_date);
                  if (!(todayDate >= start && todayDate <= end)) {
                    attendanceMap[s.lrn] = {
                      checkInTime: undefined,
                      checkOutTime: undefined,
                      attendanceStatus: 'out_of_session',
                      isPresent: false,
                    };
                  }
                } catch (err) {
                  // fallback: allow attendance
                }
              }
            });
          }
        }
      } catch (err) {
        // ignore date parsing errors
      }

      // Detect if today is marked as a school holiday or cancelled class for the whole school
      const { data: noClassRows } = await supabase
        .from('attendance_logs')
        .select('attendance_status')
        .eq('date', today)
        .in('attendance_status', ['holiday', 'cancelled_class'])
        .limit(1);

      let todayNoClassStatus: string | null = null;
      if (noClassRows && noClassRows.length > 0) {
        // Prefer 'holiday' when present
        const { data: holidayCheck } = await supabase
          .from('attendance_logs')
          .select('attendance_status')
          .eq('date', today)
          .eq('attendance_status', 'holiday')
          .limit(1);
        todayNoClassStatus = (holidayCheck && holidayCheck.length > 0) ? 'holiday' : 'cancelled_class';
      }

      // If the whole day is a no-class day, ensure each active student shows that status (override any check-ins)
      if (todayNoClassStatus && students && students.length > 0) {
        const overridden: Record<string, any> = { ...attendanceMap };
        students.forEach((s) => {
          overridden[s.lrn] = {
            checkInTime: undefined,
            checkOutTime: undefined,
            attendanceStatus: todayNoClassStatus,
            isPresent: false,
          };
        });
        setAttendanceByLrn(overridden);
      } else {
        setAttendanceByLrn(attendanceMap);
      }
    } catch (err) {
      console.error('Failed to fetch today\'s attendance:', err);
    }
  };

  // Load today's attendance once and subscribe to realtime changes
  useEffect(() => {
    void fetchTodaysAttendance();

    if (!supabase) return;

    const today = new Date().toISOString().split('T')[0];
    const channel = supabase
      .channel('attendance_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'attendance_logs', filter: `date=eq.${today}` },
        () => {
          void fetchTodaysAttendance();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  useEffect(() => {
    if (notificationDeepLinkHandled || loading || students.length === 0) {
      return;
    }

    const notificationType = (searchParams.get('notification') || '').trim().toLowerCase();
    const studentLrn = (searchParams.get('studentLrn') || '').trim();
    if (notificationType !== 'parent_excuse_letter' || !studentLrn) {
      return;
    }

    const targetStudent = students.find(
      (student) => (student.lrn || '').trim().toLowerCase() === studentLrn.toLowerCase()
    );
    if (!targetStudent) {
      setNotificationDeepLinkHandled(true);
      return;
    }

    const excuseDate = (searchParams.get('excuseDate') || '').trim();
    setSelectedStudent(targetStudent);
    setDetailsOpen(true);
    setEditingSchedule(false);
    setScheduleDraft([]);
    setDetailsTab('excuse-letters');
    setHighlightExcuseDate(excuseDate);
    fetchBehavioralData(targetStudent.lrn);
    fetchStudentSchedule(targetStudent.lrn);
    fetchExcuseLetters(targetStudent.lrn);
    setNotificationDeepLinkHandled(true);
  }, [loading, notificationDeepLinkHandled, searchParams, students]);

  const resetAddStudentForm = () => {
    setNewStudentForm({
      lrn: '',
      lastName: '',
      firstMiddleName: '',
      gender: '',
      birthday: '',
      level: '',
      address: '',
      parentName: '',
      parentContact: '',
      parent2Name: '',
      parent2Contact: '',
      parentEmail: '',
      status: 'active',
      is_special_case: false,
    });
    setAddStudentValidationErrors({});
    setSelectedScheduleDays(WEEKDAY_OPTIONS.map((d) => d.label));
    setScheduleTimeSlots([...DEFAULT_SCHEDULE_SLOTS]);
  };

  const toggleScheduleDay = (day: string) => {
    setSelectedScheduleDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  };

  const addScheduleSlot = () => {
    setScheduleTimeSlots((prev) => [
      ...prev,
      {
        label: `Session ${prev.length + 1}`,
        startTime: '08:00',
        endTime: '09:00',
      },
    ]);
  };

  const removeScheduleSlot = (slotIndex: number) => {
    setScheduleTimeSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, index) => index !== slotIndex);
    });
  };

  const updateScheduleSlot = (slotIndex: number, field: 'label' | 'startTime' | 'endTime', value: string) => {
    setScheduleTimeSlots((prev) =>
      prev.map((slot, index) =>
        index === slotIndex
          ? { ...slot, [field]: value }
          : slot
      )
    );
  };


  const [confirmNoLrnOpen, setConfirmNoLrnOpen] = useState(false);
  const [pendingAddStudent, setPendingAddStudent] = useState(false);

  // Move handleConfirmNoLrn to component scope
  const handleConfirmNoLrn = async () => {
    setConfirmNoLrnOpen(false);
    setPendingAddStudent(false);
    // Actually proceed to save student with blank LRN
    const isEarlyLevel = EARLY_LEVEL_OPTIONS.includes(newStudentForm.level);
    const isGradeLevel = GRADE_LEVEL_OPTIONS.includes(newStudentForm.level);
    const shouldCreateSchedule = isEarlyLevel || isGradeLevel;
    if (isEarlyLevel && selectedScheduleDays.length === 0) {
      toast({
        title: 'Schedule days required',
        description: 'Please select at least one weekday for the student schedule.',
        variant: 'destructive',
      });
      return;
    }
    if (shouldCreateSchedule && scheduleTimeSlots.length === 0) {
      toast({
        title: 'Schedule slots required',
        description: 'Please add at least one schedule time slot.',
        variant: 'destructive',
      });
      return;
    }
    if (shouldCreateSchedule) {
      const invalidSlot = scheduleTimeSlots.find((slot) => {
        return !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime;
      });
      if (invalidSlot) {
        toast({
          title: 'Invalid schedule slot',
          description: 'Each schedule slot must have start and end time, and start must be earlier than end.',
          variant: 'destructive',
        });
        return;
      }
    }
    // Use student's name as temporary LRN if LRN is missing
      // Capitalize each word in lastName and firstMiddleName
      function capitalizeWords(str: string) {
        return str.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w/g, (c) => c.toLowerCase());
      }
      const capitalizedLastName = capitalizeWords(newStudentForm.lastName.trim());
      const capitalizedFirstMiddle = capitalizeWords(newStudentForm.firstMiddleName.trim());
      const fullName = `${capitalizedLastName}, ${capitalizedFirstMiddle}`;
    const tempLrn = newStudentForm.lrn.trim() || fullName;
    setAddingStudent(true);
    try {
      const normalizedParentEmail = newStudentForm.parentEmail.trim().toLowerCase();
      if (normalizedParentEmail) {
        const { error: parentUpsertError } = await supabase
          .from('parents')
          .upsert(
            [{
              parent_email: normalizedParentEmail,
              full_name: newStudentForm.parentName.trim() || null,
              contact: newStudentForm.parentContact.trim() || null,
            }],
            { onConflict: 'parent_email' }
          );
        if (parentUpsertError) {
          throw parentUpsertError;
        }
      }

      const { error } = await supabase
        .from('students')
        .insert({
          lrn: newStudentForm.lrn.trim() === '' ? generateTemporaryLrn() : newStudentForm.lrn.trim(),
          name: fullName,
          gender: newStudentForm.gender,
          birthday: newStudentForm.birthday,
          level: newStudentForm.level,
          risk_level: 'low',
          address: newStudentForm.address.trim() || null,
          parent_name: newStudentForm.parentName.trim(),
          parent_contact: newStudentForm.parentContact.trim(),
          parent_email: normalizedParentEmail,
          status: newStudentForm.status,
          updated_at: new Date().toISOString(),
        });
      if (error) {
        throw error;
      }
      if (shouldCreateSchedule) {
        const { data: currentSchoolYear } = await supabase
          .from('school_years')
          .select('id')
          .eq('is_current', true)
          .maybeSingle();
        const scheduleDays = isEarlyLevel
          ? selectedScheduleDays
          : WEEKDAY_OPTIONS.map((day) => day.label);
        const scheduleRows = scheduleDays.flatMap((day) => {
          const dayConfig = WEEKDAY_OPTIONS.find((item) => item.label === day);
          return scheduleTimeSlots.map((slot, slotIndex) => ({
            student_lrn: tempLrn,
            school_year_id: currentSchoolYear?.id ?? null,
            day_of_week: day,
            day_number: dayConfig?.dayNumber ?? 1,
            subject: slot.label?.trim() ? `${newStudentForm.level} ${slot.label.trim()}` : `${newStudentForm.level} Session ${slotIndex + 1}`,
            start_time: slot.startTime,
            end_time: slot.endTime,
            room: null,
            teacher_name: null,
            is_active: true,
            updated_at: new Date().toISOString(),
          }));
        });
        const { error: scheduleError } = await supabase
          .from('student_schedules')
          .insert(scheduleRows);
        if (scheduleError) {
          toast({
            title: 'Student added, schedule failed',
            description: scheduleError.message,
            variant: 'destructive',
          });
        }
      }
      toast({
        title: 'Student added',
        description: `${fullName} was added successfully.`,
        variant: 'default',
      });
      setAddStudentOpen(false);
      // Optimistically add new student to UI (all required fields)
      setStudents((prev) => [
        {
          id: -1, // temporary id for optimistic UI
          lrn: newStudentForm.lrn.trim(),
          name: fullName,
          gender: newStudentForm.gender,
          birthday: newStudentForm.birthday,
          address: newStudentForm.address.trim() || null,
          level: newStudentForm.level,
          risk_level: 'low',
          riskLevel: 'low',
          parent_name: newStudentForm.parentName.trim(),
          parent_contact: newStudentForm.parentContact.trim(),
          parent_email: newStudentForm.parentEmail.trim(),
          parentName: newStudentForm.parentName.trim(),
          parentContact: newStudentForm.parentContact.trim(),
          parentEmail: newStudentForm.parentEmail.trim(),
          status: newStudentForm.status,
          created_at: undefined,
          updated_at: new Date().toISOString(),
        } as Student,
        ...prev,
      ]);
      resetAddStudentForm();
      // Optionally refetch in background for full sync
      fetchStudents();
    } catch (error) {
      // Try to extract useful error info
      let errorMsg = '';
      if (error instanceof Error) {
        errorMsg = error.message;
      } else if (error && typeof error === 'object') {
        errorMsg = JSON.stringify(error);
        if ('message' in error) errorMsg = error.message;
        else if ('details' in error) errorMsg = error.details;
      } else {
        errorMsg = String(error);
      }
      console.error('Error adding student:', error);
      toast({
        title: 'Failed to add student',
        description: errorMsg || 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleAddStudent = async () => {
  if (!supabase) {
    toast({
      title: 'Database not connected',
      description: 'Supabase client is not initialized.',
      variant: 'destructive',
    });
    return;
  }

  const missingInputs: string[] = [];
  const validationErrors: {
    lastName?: string;
    firstMiddleName?: string;
    gender?: string;
    birthday?: string;
    level?: string;
    parentName?: string;
    parentContact?: string;
    parentEmail?: string;
  } = {};

  if (!newStudentForm.lastName.trim()) {
    missingInputs.push('Last Name');
    validationErrors.lastName = 'Please provide last name.';
  }
  if (!newStudentForm.firstMiddleName.trim()) {
    missingInputs.push('First/Middle Name');
    validationErrors.firstMiddleName = 'Please provide first/middle name.';
  }
  if (!newStudentForm.gender) {
    missingInputs.push('Gender');
    validationErrors.gender = 'Please select gender.';
  }
  if (!newStudentForm.birthday) {
    missingInputs.push('Birthday');
    validationErrors.birthday = 'Please select birthday.';
  }
  if (!newStudentForm.level) {
    missingInputs.push('Year Level');
    validationErrors.level = 'Please select year level.';
  }
  if (!newStudentForm.parentName.trim()) {
    missingInputs.push('Parent/Guardian Name');
    validationErrors.parentName = 'Please provide parent/guardian name.';
  }
  if (!newStudentForm.parentContact.trim()) {
    missingInputs.push('Parent Contact');
    validationErrors.parentContact = 'Please provide parent contact.';
  }
  if (!newStudentForm.parentEmail.trim()) {
    missingInputs.push('Parent Email');
    validationErrors.parentEmail = 'Please provide parent email.';
  }

  if (missingInputs.length > 0) {
    setAddStudentValidationErrors(validationErrors);
    toast({
      title: 'Required Inputs Missing',
      description: `Please complete: ${missingInputs.join(', ')}`,
      variant: 'destructive',
    });
    return;
  }

  setAddStudentValidationErrors({});

  // Capitalize name
  function capitalizeWords(str: string) {
    return str.replace(/\b\w/g, (c) => c.toUpperCase()).replace(/\B\w/g, (c) => c.toLowerCase());
  }
  const capitalizedLastName = capitalizeWords(newStudentForm.lastName.trim());
  const capitalizedFirstMiddle = capitalizeWords(newStudentForm.firstMiddleName.trim());
  const fullName = `${capitalizedLastName}, ${capitalizedFirstMiddle}`;

  // Check for missing LRN
  if (!newStudentForm.lrn.trim()) {
    setConfirmNoLrnOpen(true);
    setPendingAddStudent(true);
    return;
  }

  const isEarlyLevel = EARLY_LEVEL_OPTIONS.includes(newStudentForm.level);
  const isGradeLevel = GRADE_LEVEL_OPTIONS.includes(newStudentForm.level);
  const shouldCreateSchedule = isEarlyLevel || isGradeLevel;

  if (isEarlyLevel && selectedScheduleDays.length === 0) {
    toast({
      title: 'Schedule days required',
      description: 'Please select at least one weekday for the student schedule.',
      variant: 'destructive',
    });
    return;
  }

  if (shouldCreateSchedule && scheduleTimeSlots.length === 0) {
    toast({
      title: 'Schedule slots required',
      description: 'Please add at least one schedule time slot.',
      variant: 'destructive',
    });
    return;
  }

  if (shouldCreateSchedule) {
    const invalidSlot = scheduleTimeSlots.find((slot) => {
      return !slot.startTime || !slot.endTime || slot.startTime >= slot.endTime;
    });

    if (invalidSlot) {
      toast({
        title: 'Invalid schedule slot',
        description: 'Each schedule slot must have start and end time, and start must be earlier than end.',
        variant: 'destructive',
      });
      return;
    }
  }

  setAddingStudent(true);

  try {
    const normalizedParentEmail = newStudentForm.parentEmail.trim().toLowerCase();
    if (normalizedParentEmail) {
      const { error: parentUpsertError } = await supabase
        .from('parents')
        .upsert(
          [{
            parent_email: normalizedParentEmail,
            full_name: newStudentForm.parentName.trim() || null,
            contact: newStudentForm.parentContact.trim() || null,
          }],
          { onConflict: 'parent_email' }
        );
      if (parentUpsertError) {
        throw parentUpsertError;
      }
    }

    const studentLrn = newStudentForm.lrn.trim();

    const { error } = await supabase
      .from('students')
      .insert({
        lrn: studentLrn,
        name: fullName,
        gender: newStudentForm.gender,
        birthday: newStudentForm.birthday,
        level: newStudentForm.level,
        risk_level: 'low',
        address: newStudentForm.address.trim() || null,
        parent_name: newStudentForm.parentName.trim(),
        parent_contact: newStudentForm.parentContact.trim(),
        parent2_name: newStudentForm.parent2Name.trim() || null,
        parent2_contact: newStudentForm.parent2Contact.trim() || null,
        parent_email: normalizedParentEmail,
        status: newStudentForm.status,
        is_special_case: newStudentForm.is_special_case ?? false,
        updated_at: new Date().toISOString(),
      });

    if (error) {
      throw error;
    }
    
    if (shouldCreateSchedule) {
      const { data: currentSchoolYear } = await supabase
        .from('school_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();
      const scheduleDays = isEarlyLevel
        ? selectedScheduleDays
        : WEEKDAY_OPTIONS.map((day) => day.label);
      const scheduleRows = scheduleDays.flatMap((day) => {
        const dayConfig = WEEKDAY_OPTIONS.find((item) => item.label === day);
        return scheduleTimeSlots.map((slot, slotIndex) => ({
          student_lrn: studentLrn,
          school_year_id: currentSchoolYear?.id ?? null,
          day_of_week: day,
          day_number: dayConfig?.dayNumber ?? 1,
          subject: slot.label?.trim() ? `${newStudentForm.level} ${slot.label.trim()}` : `${newStudentForm.level} Session ${slotIndex + 1}`,
          start_time: slot.startTime,
          end_time: slot.endTime,
          room: null,
          teacher_name: null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }));
      });
      const { error: scheduleError } = await supabase
        .from('student_schedules')
        .insert(scheduleRows);
      if (scheduleError) {
        toast({
          title: 'Student added, schedule failed',
          description: scheduleError.message,
          variant: 'destructive',
        });
      }
    }
    
    toast({
      title: 'Student added',
      description: `${fullName} was added successfully.`,
      variant: 'default',
    });
    setAddStudentOpen(false);
    resetAddStudentForm();
    await fetchStudents();
  } catch (error) {
    console.error('Error adding student:', error);
    toast({
      title: 'Failed to add student',
      description: error instanceof Error ? error.message : String(error),
      variant: 'destructive',
    });
  } finally {
    setAddingStudent(false);
  }
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
        .limit(5);

      if (eventsError) throw eventsError;

      // Fetch attendance data for the month
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const startDateStr = thirtyDaysAgo.toISOString().split('T')[0];
      
      const { data: attendance, error: attendanceError } = await supabase
        .from('attendance_logs')
        .select('*')
        .eq('student_lrn', studentLrn)
        .gte('date', startDateStr)
        .order('date', { ascending: false });

      if (attendanceError) throw attendanceError;

      // Add absent logs for weekdays where student didn't log in
      const enrichedAttendance = [...(attendance || [])];
      const existingDates = new Set((attendance || []).map(a => a.date));
      
      // Generate all weekdays in the 30-day period
      const current = new Date(thirtyDaysAgo);
      const today = new Date();
      while (current <= today) {
        const dateStr = current.toISOString().split('T')[0];
        const dayOfWeek = current.getDay();
        
        // Only check weekdays (Monday=1 to Friday=5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5 && !existingDates.has(dateStr)) {
          // Add an absent entry for this missing weekday
          enrichedAttendance.push({
            student_lrn: studentLrn,
            date: dateStr,
            check_in_time: null,
            check_out_time: null,
            attendance_status: 'absent',
            is_present: false,
            is_late: false,
            is_invalid_timeout: false,
          });
        }
        
        current.setDate(current.getDate() + 1);
      }
      
      // Sort by date descending (most recent first)
      enrichedAttendance.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      // Fetch student's attendance schedule to get their entry_time
      const { data: scheduleData, error: scheduleError } = await supabase
        .from('student_attendance_schedules')
        .select('entry_time')
        .eq('student_lrn', studentLrn)
        .eq('is_active', true)
        .maybeSingle();

      if (scheduleError) console.error('Error fetching schedule:', scheduleError);

      // Use ML-based risk scoring instead of simple thresholds
      const riskScore = await calculateStudentRiskScore(studentLrn);

      // Calculate stats
      const positiveEvents = events?.filter(e => e.severity === 'positive').length || 0;
      const negativeEvents = events?.filter(e => e.severity === 'major' || e.severity === 'critical').length || 0;
      const minorEvents = events?.filter(e => e.severity === 'minor').length || 0;
      
      setBehavioralData({
        events: events || [],
        attendance: enrichedAttendance,
        entryTime: scheduleData?.entry_time || null,
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

  const fetchStudentSchedule = async (studentLrn: string) => {
    if (!supabase || studentSchedules[studentLrn]) return;

    // If the studentLrn is blank, generate and assign a temporary LRN
    if (!studentLrn || studentLrn.trim() === '') {
      if (selectedStudent && (!selectedStudent.lrn || selectedStudent.lrn.trim() === '')) {
        const tempLrn = generateTemporaryLrn();
        // Update in DB
        await supabase
          .from('students')
          .update({ lrn: tempLrn })
          .eq('id', selectedStudent.id);
        // Update in UI state
        setSelectedStudent({ ...selectedStudent, lrn: tempLrn });
        // Use the new tempLrn for fetching schedule
        studentLrn = tempLrn;
      }
    }

    try {
      setLoadingSchedule(true);
      const { data, error } = await supabase
        .from('student_schedules')
        .select('id, day_of_week, day_number, subject, start_time, end_time, room, teacher_name')
        .eq('student_lrn', studentLrn)
        .eq('is_active', true)
        .order('day_number', { ascending: true })
        .order('start_time', { ascending: true });

      if (error) {
        throw error;
      }

      setStudentSchedules((prev) => ({
        ...prev,
        [studentLrn]: data || [],
      }));

      if (selectedStudent?.lrn === studentLrn && !editingSchedule) {
        setScheduleDraft(
          (data || []).map((row) => ({
            id: row.id,
            day_of_week: row.day_of_week,
            days_of_week: [row.day_of_week],
            day_number: row.day_number,
            subject: row.subject,
            start_time: row.start_time?.slice(0, 5) || '08:00',
            end_time: row.end_time?.slice(0, 5) || '09:00',
            room: row.room || '',
            teacher_name: row.teacher_name || '',
          }))
        );
      }
    } catch (error) {
      console.error('Error fetching student schedule:', error);
      toast({
        title: 'Failed to load schedule',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
      setStudentSchedules((prev) => ({
        ...prev,
        [studentLrn]: [],
      }));
    } finally {
      setLoadingSchedule(false);
    }
  };

  const fetchExcuseLetters = async (studentLrn: string) => {
    if (!supabase || !studentLrn) return;

    try {
      setLoadingExcuseLetters(true);
      const { data, error } = await supabase
        .from('role_notifications')
        .select('id, title, message, created_at, created_by, meta')
        .contains('meta', {
          notification_kind: 'parent_excuse_letter',
          student_lrn: studentLrn,
        })
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;

      setExcuseLettersByLrn((prev) => ({
        ...prev,
        [studentLrn]: (data || []) as Array<{
          id: number;
          title: string;
          message: string;
          created_at: string;
          created_by: string | null;
          meta: Record<string, any> | null;
        }>,
      }));
    } catch (error) {
      console.error('Error fetching excuse letters:', error);
      setExcuseLettersByLrn((prev) => ({
        ...prev,
        [studentLrn]: [],
      }));
    } finally {
      setLoadingExcuseLetters(false);
    }
  };

  const openStudentDetails = (student: Student, options?: { tab?: string; highlightDate?: string }) => {
    setSelectedStudent(student);
    // Prefill the pendingLrn input for editing (allow edits when entering Edit Info)
    setPendingLrn(student.lrn || '');
    setDetailsOpen(true);
    setEditingSchedule(false);
    setScheduleDraft([]);
    setDetailsTab(options?.tab || 'overview');
    setHighlightExcuseDate(options?.highlightDate || '');
    fetchBehavioralData(student.lrn);
    fetchStudentSchedule(student.lrn);
    fetchExcuseLetters(student.lrn);
  };

  const startEditingSchedule = () => {
    if (!selectedStudent) return;

    const baseRows = (studentSchedules[selectedStudent.lrn] || []).map((row) => ({
      id: row.id,
      day_of_week: row.day_of_week,
      days_of_week: [row.day_of_week],
      day_number: row.day_number,
      subject: row.subject,
      start_time: row.start_time?.slice(0, 5) || '08:00',
      end_time: row.end_time?.slice(0, 5) || '09:00',
      room: row.room || '',
      teacher_name: row.teacher_name || '',
    }));

    setScheduleDraft(
      baseRows.length > 0
        ? baseRows
        : [
            {
              id: -Date.now(),
              day_of_week: 'Monday',
              days_of_week: ['Monday'],
              day_number: 1,
              subject: `${selectedStudent.level} Session 1`,
              start_time: '08:00',
              end_time: '09:00',
              room: '',
              teacher_name: '',
            },
          ]
    );
    setEditingSchedule(true);
  };

  const addScheduleDraftRow = () => {
    if (!selectedStudent) return;

    setScheduleDraft((prev) => [
      ...prev,
      {
        id: -(Date.now() + prev.length),
        day_of_week: 'Monday',
        days_of_week: ['Monday'],
        day_number: 1,
        subject: `${selectedStudent.level} Session ${prev.length + 1}`,
        start_time: '08:00',
        end_time: '09:00',
        room: '',
        teacher_name: '',
      },
    ]);
  };

  const removeScheduleDraftRow = (rowId: number) => {
    setScheduleDraft((prev) => prev.filter((row) => row.id !== rowId));
  };

  const updateScheduleDraftRow = (rowId: number, field: keyof EditableScheduleRow, value: string | number) => {
    setScheduleDraft((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, [field]: value } : row))
    );
  };

  const getNormalizedDraftDays = (row: Partial<EditableScheduleRow>) => {
    if (Array.isArray(row.days_of_week) && row.days_of_week.length > 0) {
      return row.days_of_week;
    }
    if (row.day_of_week) {
      return [row.day_of_week];
    }
    return [];
  };

  const toggleScheduleDraftDay = (rowId: number, day: string) => {
    setScheduleDraft((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;

        const currentDays = getNormalizedDraftDays(row);
        const hasDay = currentDays.includes(day);
        const nextDays = hasDay
          ? currentDays.filter((d) => d !== day)
          : [...currentDays, day];

        const normalizedDays = nextDays.length > 0 ? nextDays : currentDays;
        return {
          ...row,
          days_of_week: normalizedDays,
          day_of_week: normalizedDays[0] || row.day_of_week,
        };
      })
    );
  };

  const handleSaveScheduleChanges = async () => {
    if (!supabase || !selectedStudent) return;

    if (scheduleDraft.length === 0) {
      toast({
        title: 'No schedule rows',
        description: 'Please add at least one schedule row.',
        variant: 'destructive',
      });
      return;
    }

    const weekdayMap = new Map(WEEKDAY_OPTIONS.map((d) => [d.label, d.dayNumber]));
    const invalidRow = scheduleDraft.find((row) => {
      const validDays = (row.days_of_week || []).filter((day) => weekdayMap.has(day));
      return validDays.length === 0 || !row.subject.trim() || !row.start_time || !row.end_time || row.start_time >= row.end_time;
    });

    if (invalidRow) {
      toast({
        title: 'Invalid schedule row',
        description: 'Each row must have valid weekday, subject, and time range.',
        variant: 'destructive',
      });
      return;
    }

    setSavingScheduleChanges(true);

    try {

      // Use student's name as temporary LRN if LRN is missing
      const tempLrn = selectedStudent.lrn?.trim() || selectedStudent.name.trim();

      const { data: currentSchoolYear } = await supabase
        .from('school_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      const { error: deleteError } = await supabase
        .from('student_schedules')
        .delete()
        .eq('student_lrn', tempLrn)
        .eq('is_active', true);

      if (deleteError) {
        throw deleteError;
      }

      const rowsToInsert = scheduleDraft.flatMap((row) => {
        const uniqueDays = Array.from(new Set(row.days_of_week.filter((day) => weekdayMap.has(day))));
        return uniqueDays.map((day) => ({
          student_lrn: tempLrn,
          school_year_id: currentSchoolYear?.id ?? null,
          day_of_week: day,
          day_number: weekdayMap.get(day) || 1,
          subject: row.subject.trim(),
          start_time: row.start_time,
          end_time: row.end_time,
          room: row.room.trim() || null,
          teacher_name: row.teacher_name.trim() || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        }));
      });

      const { data: insertedRows, error: insertError } = await supabase
        .from('student_schedules')
        .insert(rowsToInsert)
        .select('id, day_of_week, day_number, subject, start_time, end_time, room, teacher_name');

      if (insertError) {
        throw insertError;
      }

      setStudentSchedules((prev) => ({
        ...prev,
        [tempLrn]: insertedRows || [],
      }));

      setScheduleDraft(
        (insertedRows || []).map((row) => ({
          id: row.id,
          day_of_week: row.day_of_week,
          days_of_week: [row.day_of_week],
          day_number: row.day_number,
          subject: row.subject,
          start_time: row.start_time?.slice(0, 5) || '08:00',
          end_time: row.end_time?.slice(0, 5) || '09:00',
          room: row.room || '',
          teacher_name: row.teacher_name || '',
        }))
      );

      if (selectedStudent.parentEmail) {
        try {
          await fetch('/api/automation/schedule-change', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              studentName: selectedStudent.name,
              studentLrn: selectedStudent.lrn,
              level: selectedStudent.level,
              parentName: selectedStudent.parentName,
              parentEmail: selectedStudent.parentEmail,
              scheduleRows: rowsToInsert.map((row) => ({
                dayOfWeek: row.day_of_week,
                subject: row.subject,
                startTime: row.start_time,
                endTime: row.end_time,
                room: row.room,
                teacherName: row.teacher_name,
              })),
            }),
          });
        } catch (mailError) {
          console.error('Failed to trigger schedule change email:', mailError);
          toast({
            title: 'Schedule saved, email failed',
            description: 'Parent email notification could not be sent.',
            variant: 'destructive',
          });
        }
      }

      setEditingSchedule(false);
      toast({
        title: 'Schedule updated',
        description: 'Student schedule has been updated successfully.',
        variant: 'default',
      });
    } catch (error) {
      let errorMsg = '';
      if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMsg = error.message;
        } else if ('details' in error) {
          errorMsg = error.details;
        } else if ('code' in error) {
          errorMsg = `Error code: ${error.code}`;
        } else {
          errorMsg = JSON.stringify(error);
        }
      } else {
        errorMsg = String(error);
      }
      console.error('Error saving schedule changes:', error);
      toast({
        title: 'Failed to save schedule',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setSavingScheduleChanges(false);
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

  const handleConfirmLrn = async () => {
    setConfirmLrnOpen(false);
    if (!selectedStudent) return;
    try {
      // Use the update_student_lrn RPC for atomic LRN update
      const { error } = await supabase.rpc('update_student_lrn', {
        old_lrn: selectedStudent.lrn,
        new_lrn: lrnToSave,
        student_id: selectedStudent.id
      });
      if (error) {
        toast({ title: 'Failed to update LRN', description: error.message, variant: 'destructive' });
        return;
      }
      setSelectedStudent({ ...selectedStudent, lrn: lrnToSave });
      setLrnToSave('');
      setPendingLrn('');
      toast({ title: 'LRN updated', description: 'The LRN was successfully updated.' });
    } catch (err) {
      toast({ title: 'Failed to update LRN', description: String(err), variant: 'destructive' });
    }
  };

  const handleSchoolYearDialogChange = (open: boolean) => {
    setNewSchoolYearOpen(open);
    if (!open) {
      setSchoolYearStartDate('');
      setSchoolYearEndDate('');
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
      // Only include students with status 'active' (exclude inactive: dropped/undergrad)
      if (student.status !== 'active') return false;
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
      // If showing only summer students, ensure enrollment exists
      if (showOnlySummer) {
        if (!summerEnrollments[student.lrn]) return false;
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
  }, [students, search, filterGrade, filterGender, filterRisk, riskScores, sortConfig, showOnlySummer, summerEnrollments]);

  // Analytics calculations
  const stats = useMemo(() => {
    // Use filteredStudents for analytics (current students only)
    const total = filteredStudents.length;
    const male = filteredStudents.filter(s => s.gender === 'Male').length;
    const female = filteredStudents.filter(s => s.gender === 'Female').length;

    // Level distribution
    const levelMap = new Map();
    filteredStudents.forEach(student => {
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
    const checkedIn = Object.values(attendanceByLrn).filter(a => {
      const status = String(a.attendanceStatus || '').toLowerCase();
      if (isNoClassStatus(status)) return false;
      if ((a as any).isPresent !== undefined) return !!(a as any).isPresent;
      if ((a as any).is_present !== undefined) return !!(a as any).is_present;
      // Fallback: consider a check-in time as checked in
      return Boolean(a.checkInTime);
    }).length;
    const checkedOut = Object.values(attendanceByLrn).filter(a => {
      const status = String(a.attendanceStatus || '').toLowerCase();
      if (isNoClassStatus(status)) return false;
      return Boolean(a.checkOutTime);
    }).length;

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
  }, [filteredStudents, riskScores, attendanceByLrn]);

  // Pagination calculations
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingFrom = filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredStudents.length);

  const summerStudents = useMemo(() => {
    return Object.entries(summerEnrollments)
      .map(([lrn, enrollment]) => {
        const student = students.find((s) => s.lrn === lrn);
        return student ? { student, enrollment } : null;
      })
      .filter(Boolean) as Array<{ student: Student; enrollment: { id?: number; start_date: string; end_date: string } }>;
  }, [students, summerEnrollments]);

  const totalSummerPages = Math.max(1, Math.ceil(summerStudents.length / PAGE_SIZE));
  const paginatedSummerStudents = summerStudents.slice((summerCurrentPage - 1) * PAGE_SIZE, summerCurrentPage * PAGE_SIZE);
  const summerShowingFrom = summerStudents.length === 0 ? 0 : (summerCurrentPage - 1) * PAGE_SIZE + 1;
  const summerShowingTo = Math.min(summerCurrentPage * PAGE_SIZE, summerStudents.length);

  const exportToCSV = async () => {
    const headers = ['LRN', 'Name', 'Gender', 'Birthday', 'Age', 'Level', 'Risk Level', 'Parent Name', 'Parent Contact', 'Parent Email', 'Additional Parent Name', 'Additional Parent Contact', 'Address', 'Status'];
    const exportRows = filteredStudents.map((student) => {
      const age = shouldShowAge(student.level) ? calculateAgeWithDecimal(student.birthday) : 'N/A';
      const riskLevel = student.riskLevel || '';
      return {
        LRN: student.lrn || '',
        Name: student.name || '',
        Gender: student.gender || '',
        Birthday: student.birthday || '',
        Age: age,
        Level: student.level || '',
        'Risk Level': riskLevel ? String(riskLevel).toUpperCase() : '',
        'Parent Name': student.parentName || '',
        'Parent Contact': student.parentContact || '',
        'Parent Email': student.parentEmail || '',
        'Additional Parent Name': (student as any).parent2Name || '',
        'Additional Parent Contact': (student as any).parent2Contact || '',
        Address: student.address || '',
        Status: student.status || 'active',
      };
    });

    const sanitizedSchoolYear = currentSchoolYearLabel
      .replace(/[\\/:*?"<>|]/g, '-')
      .replace(/\s+/g, ' ')
      .trim();
    const baseFileName = `SGCDC (${sanitizedSchoolYear || 'School Year'})`;

    try {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
      XLSX.writeFile(workbook, `${baseFileName}.xlsx`);
      return;
    } catch (excelError) {
      console.warn('XLSX export failed, falling back to CSV:', excelError);
    }

    const csvContent = [
      headers.join(','),
      ...exportRows.map((row) =>
        headers
          .map((header) => {
            const rawValue = String(row[header as keyof typeof row] ?? '');
            const escaped = rawValue.replace(/"/g, '""');
            return `"${escaped}"`;
          })
          .join(','),
      ),
    ].join('\n');

    const blob = new Blob([`\uFEFF${csvContent}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${baseFileName}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportStudents = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!supabase) {
      toast({
        title: 'Database not connected',
        description: 'Supabase client is not initialized.',
        variant: 'destructive',
      });
      event.target.value = '';
      return;
    }

    setImportingStudents(true);

    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];

      if (!firstSheetName) {
        toast({
          title: 'Import failed',
          description: 'The selected file has no worksheet.',
          variant: 'destructive',
        });
        return;
      }

      const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheetName], {
        defval: '',
      });

      const parsed = parseStudentImportRows(rawRows);

      if (parsed.rows.length === 0) {
        toast({
          title: 'No valid records to import',
          description: `Required columns: ${getStudentImportRequiredFieldsHint()}. Skipped ${parsed.skippedMissingRequired} rows with missing required info.`,
          variant: 'destructive',
        });
        return;
      }


      // Strictly clean/validate parent emails and ensure required fields
      const uniqueParents = new Map();
      parsed.rows.forEach((row) => {
        // Clean and validate parent email
        let email = (row.parent_email || '').toString().trim().toLowerCase();
        if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return;
        if (!uniqueParents.has(email)) {
          uniqueParents.set(email, {
            parent_email: email,
            full_name: (row.parent_name || '').toString().trim() || email,
            contact: (row.parent_contact || '').toString().trim() || null,
          });
        }
        // Also update the row to use the cleaned email
        row.parent_email = email;

        // Robust gender normalization: accept 'f', 'female', 'm', 'male' (case-insensitive, trimmed)
        if (row.gender) {
          let g = row.gender.toString().trim().toLowerCase();
          if (g === 'f' || g === 'female') {
            row.gender = 'Female';
          } else if (g === 'm' || g === 'male') {
            row.gender = 'Male';
          } else {
            row.gender = '';
          }
        }
      });

      if (uniqueParents.size > 0) {
        const parentRows = Array.from(uniqueParents.values());
        const { error: parentUpsertError } = await supabase
          .from('parents')
          .upsert(parentRows, { onConflict: 'parent_email' });

        if (parentUpsertError) {
          toast({
            title: 'Parent import failed',
            description: parentUpsertError.message || 'Unable to import parent records. Please check your Excel file for missing or invalid parent emails.',
            variant: 'destructive',
          });
          setImportingStudents(false);
          event.target.value = '';
          return;
        }
      }

      const chunkSize = 200;
      for (let i = 0; i < parsed.rows.length; i += chunkSize) {
        const chunk = parsed.rows.slice(i, i + chunkSize);
        const { error } = await supabase
          .from('students')
          .upsert(chunk, { onConflict: 'lrn' });

        if (error) {
          throw error;
        }
      }

      await fetchStudents();

      toast({
        title: 'Import completed',
        description: `Imported ${parsed.rows.length} student records. Skipped ${parsed.skippedMissingRequired} missing required and ${parsed.skippedEmpty} empty rows. Masterlist is now updated.`,
      });
    } catch (error) {
      console.error('Error importing students:', error);

      let detail = 'Unable to import file.';
      if (error instanceof Error && error.message) {
        detail = error.message;
      } else if (error && typeof error === 'object') {
        const maybe = error as Record<string, unknown>;
        const message = typeof maybe.message === 'string' ? maybe.message : '';
        const details = typeof maybe.details === 'string' ? maybe.details : '';
        const hint = typeof maybe.hint === 'string' ? maybe.hint : '';
        const code = typeof maybe.code === 'string' ? maybe.code : '';

        const parts = [message, details, hint, code ? `Code: ${code}` : ''].filter(Boolean);
        if (parts.length > 0) {
          detail = parts.join(' | ');
        }
      }

      toast({
        title: 'Import failed',
        description: detail,
        variant: 'destructive',
      });
    } finally {
      setImportingStudents(false);
      event.target.value = '';
    }
  };


  if (loading) {
    return <StudentsSkeleton />;
  }

  return (
    <DashboardLayout>
      {/* Confirmation Dialog for missing LRN */}
      {/* Loading Modal for School Year Advancement */}
      <Dialog open={schoolYearLoadingModalOpen}>
        <DialogContent className="max-w-xs flex flex-col items-center justify-center gap-6 py-10">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold mb-1">Advancing School Year...</DialogTitle>
          </DialogHeader>
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-2" />
          <div className="w-full text-center">
            <div className="text-sm text-muted-foreground mb-4">Please wait while we update student records.</div>
            <div className="w-full bg-muted/50 rounded-lg h-3 overflow-hidden mb-2">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-blue-500"
                initial={{ width: 0 }}
                animate={{ width: `${(processedCount / students.length) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {processedCount} / {students.length} students processed
            </div>
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={confirmNoLrnOpen} onOpenChange={setConfirmNoLrnOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">Are you sure this student does not have an LRN?</DialogTitle>
            <DialogDescription>
              This student will be saved <span className="font-semibold">without an LRN</span>.<br />
              You can edit and add the LRN later.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-3 justify-end mt-6">
            <Button variant="outline" onClick={() => { setConfirmNoLrnOpen(false); setPendingAddStudent(false); }}>Cancel</Button>
            <Button variant="default" onClick={handleConfirmNoLrn}>Yes, Save Without LRN</Button>
          </div>
        </DialogContent>
      </Dialog>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Current Students
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              Active students enrolled in {currentSchoolYearLabel} • {filteredStudents.length} students
            </p>
          </div>
          
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* School Year Advancement/Undo/Confirm Buttons */}
            {pendingSchoolYearConfirmation ? (
              <>
                <Button
                  variant="warning"
                  size="sm"
                  className="gap-2 bg-orange-400 hover:bg-orange-500 text-white font-semibold"
                  onClick={() => {
                    setPendingSchoolYearConfirmation(false);
                    setUndoAvailable(false);
                  }}
                  style={{ minWidth: 0 }}
                >
                  Undo School Year
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600"
                  onClick={handleConfirmSchoolYear}
                  style={{ minWidth: 0 }}
                >
                  Confirm School Year
                </Button>
                {/* Final confirmation modal */}
                <Dialog open={finalConfirmModalOpen} onOpenChange={setFinalConfirmModalOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Are you sure you want to start the new school year?</DialogTitle>
                      <DialogDescription>
                        This will advance all students to their new grade levels and update the school year to <span className="font-semibold">S.Y. {(() => {
                          const startYear = new Date(schoolYearStartDate).getFullYear();
                          const endYear = new Date(schoolYearEndDate).getFullYear();
                          return `${startYear}-${endYear}`;
                        })()}</span>.<br />
                        This action cannot be undone except by using the Undo School Year function.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex gap-3 justify-end mt-6">
                      <Button variant="outline" onClick={() => setFinalConfirmModalOpen(false)}>Cancel</Button>
                      <Button variant="default" onClick={handleFinalConfirmSchoolYear}>Yes, Start New School Year</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : undoAvailable && processedCount === students.length && !undoInProgress ? (
              <>
                <Button
                  variant="warning"
                  size="sm"
                  className="gap-2 bg-orange-400 hover:bg-orange-500 text-white font-semibold"
                  onClick={() => setUndoDialogOpen(true)}
                  style={{ minWidth: 0 }}
                >
                  Undo School Year
                </Button>
                <Dialog open={undoDialogOpen} onOpenChange={setUndoDialogOpen}>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-xl font-bold">Undo School Year Advancement</DialogTitle>
                      <DialogDescription>
                        {(() => {
                          if (currentSchoolYear) {
                            const prevStart = new Date(currentSchoolYear.start_date);
                            prevStart.setFullYear(prevStart.getFullYear() - 1);
                            const prevEnd = new Date(currentSchoolYear.end_date);
                            prevEnd.setFullYear(prevEnd.getFullYear() - 1);
                            return `This will revert all students back to their previous grade levels and restore S.Y. ${prevStart.getFullYear()}-${prevEnd.getFullYear()}.`;
                          }
                          return 'This will revert all students back to their previous grade levels and restore the previous school year.';
                        })()}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-4 mt-4">
                      <Button
                        onClick={handleUndoSchoolYear}
                        disabled={undoInProgress}
                        variant="secondary"
                        className="w-full disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {(() => {
                          if (currentSchoolYear) {
                            const prevStart = new Date(currentSchoolYear.start_date);
                            prevStart.setFullYear(prevStart.getFullYear() - 1);
                            const prevEnd = new Date(currentSchoolYear.end_date);
                            prevEnd.setFullYear(prevEnd.getFullYear() - 1);
                            return `Undo Changes (Back to S.Y. ${prevStart.getFullYear()}-${prevEnd.getFullYear()})`;
                          }
                          return 'Undo Changes (Back to Previous S.Y.)';
                        })()}
                      </Button>
                      <Button
                        onClick={() => setUndoDialogOpen(false)}
                        variant="outline"
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </>
            ) : (
              <Dialog open={newSchoolYearOpen} onOpenChange={handleSchoolYearDialogChange}>
                <DialogTrigger asChild>
                  <Button variant="default" size="sm" className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                    <Calendar size={16} />
                    New School Year
                  </Button>
                </DialogTrigger>
                {/* Summer Class button (orange) */}
                <Dialog open={summerModalOpen} onOpenChange={setSummerModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="default" size="sm" className="gap-2 bg-orange-400 hover:bg-orange-500 text-white font-semibold">
                      <Users size={16} />
                      Summer Class
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold">Summer Class Enrollment</DialogTitle>
                      <DialogDescription>Select students to enroll in the summer class and set the summer dates.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Summer Start Date</label>
                          <Input type="date" value={summerStartDate} onChange={(e) => setSummerStartDate(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-sm font-medium">Summer End Date</label>
                          <Input type="date" value={summerEndDate} onChange={(e) => setSummerEndDate(e.target.value)} />
                        </div>
                      </div>
                      <div className="relative">
                        <Command shouldFilter={false} className="border rounded-lg">
                          <CommandInput
                            placeholder="Type student name, LRN, or level"
                            value={summerSearchQuery}
                            onValueChange={setSummerSearchQuery}
                          />
                          <CommandList className="max-h-80">
                            <CommandEmpty>No student found. Try another name or LRN.</CommandEmpty>
                            <CommandGroup>
                              {students
                                .filter((s) => {
                                  const query = summerSearchQuery.toLowerCase();
                                  return (
                                    s.name.toLowerCase().includes(query) ||
                                    s.lrn.toLowerCase().includes(query) ||
                                    s.level.toLowerCase().includes(query)
                                  );
                                })
                                .map((s) => {
                                  const isSelected = selectedSummerStudents.includes(s.lrn);
                                  return (
                                    <CommandItem
                                      key={s.lrn}
                                      value={`${s.name} ${s.lrn} ${s.level}`}
                                      onSelect={() => {
                                        setSelectedSummerStudents(prev =>
                                          prev.includes(s.lrn) ? prev.filter(x => x !== s.lrn) : [...prev, s.lrn]
                                        );
                                      }}
                                      className="cursor-pointer"
                                    >
                                      <Checkbox checked={isSelected} className="pointer-events-none" />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{s.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {s.lrn} • {s.level}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => setSummerModalOpen(false)}>Cancel</Button>
                        <Button
                          onClick={async () => {
                            if (!summerStartDate || !summerEndDate) {
                              toast({ title: 'Missing Dates', description: 'Please select both start and end dates for the summer class.', variant: 'destructive' });
                              return;
                            }
                            if (!supabase) {
                              toast({ title: 'Database not connected', description: 'Supabase client not initialized.', variant: 'destructive' });
                              return;
                            }
                            try {
                              // Upsert enrollments for selected students
                              const rows = selectedSummerStudents.map(lrn => ({ student_lrn: lrn, start_date: summerStartDate, end_date: summerEndDate }));
                              const { error } = await supabase.from('summer_enrollments').upsert(rows, { onConflict: 'student_lrn' });
                              if (error) throw error;
                              // Refresh enrollments
                              const { data: summerData } = await supabase.from('summer_enrollments').select('*');
                              const map: Record<string, { id?: number; start_date: string; end_date: string }> = {};
                              (summerData || []).forEach((row: any) => {
                                map[row.student_lrn] = { id: row.id, start_date: row.start_date, end_date: row.end_date };
                              });
                              setSummerEnrollments(map);
                              setSummerModalOpen(false);
                              setSelectedSummerStudents([]);
                              toast({ title: 'Summer enrollments saved', description: `${rows.length} students enrolled for summer class.` });
                              await fetchStudents();
                              void fetchTodaysAttendance();
                            } catch (err: any) {
                              console.error('Failed to save summer enrollments:', err);
                              toast({ title: 'Failed to save', description: err?.message || String(err), variant: 'destructive' });
                            }
                          }}
                          className="bg-orange-500 hover:bg-orange-600 text-white"
                        >
                          Save Enrollments
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={endSchoolYearOpen} onOpenChange={handleEndSchoolYearDialogChange}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="gap-2 bg-red-500 hover:bg-red-600 text-white font-semibold">
                      <XCircle size={16} />
                      End School Year
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle className="text-2xl font-bold">End Current School Year</DialogTitle>
                      <DialogDescription>
                        This will stop attendance tracking for active students right away by closing the current school year.
                        Summer class students can remain active unless you include them below.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="flex items-start gap-3 rounded-lg border p-4">
                        <Checkbox
                          checked={includeSummerStudentsOnEnd}
                          onCheckedChange={(checked) => setIncludeSummerStudentsOnEnd(Boolean(checked))}
                        />
                        <div className="space-y-1">
                          <p className="text-sm font-medium">Also end summer class enrollments</p>
                          <p className="text-sm text-muted-foreground">
                            Turn this on if you are cancelling summer class as well.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3 justify-end">
                        <Button variant="outline" onClick={() => handleEndSchoolYearDialogChange(false)}>
                          Cancel
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={handleEndSchoolYear}
                          disabled={endingSchoolYear}
                          className="bg-red-600 hover:bg-red-700 text-white"
                        >
                          {endingSchoolYear ? 'Ending...' : 'End School Year'}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle className="text-2xl font-bold">
                      {schoolYearStartDate && schoolYearEndDate
                        ? `Start New School Year (S.Y. ${new Date(schoolYearStartDate).getFullYear()}-${new Date(schoolYearEndDate).getFullYear()})`
                        : 'Start New School Year'}
                    </DialogTitle>
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
                          <div className="space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1.5">
                                <label htmlFor="school-year-start" className="text-sm font-medium text-foreground">
                                  School Year Start Date
                                </label>
                                <Input
                                  id="school-year-start"
                                  type="date"
                                  value={schoolYearStartDate}
                                  min={schoolYearMinimumStartDate}
                                  onChange={(e) => setSchoolYearStartDate(e.target.value)}
                                />
                              </div>
                              <div className="space-y-1.5">
                                <label htmlFor="school-year-end" className="text-sm font-medium text-foreground">
                                  School Year End Date
                                </label>
                                <Input
                                  id="school-year-end"
                                  type="date"
                                  value={schoolYearEndDate}
                                  min={schoolYearStartDate || schoolYearMinimumStartDate}
                                  onChange={(e) => setSchoolYearEndDate(e.target.value)}
                                />
                              </div>
                            </div>
                            {schoolYearStartDate && schoolYearStartDate < schoolYearMinimumStartDate && (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                Start date cannot be before {schoolYearMinimumStartDate}.
                              </p>
                            )}
                            {schoolYearStartDate && schoolYearEndDate && new Date(schoolYearStartDate) > new Date(schoolYearEndDate) && (
                              <p className="text-xs text-red-600 dark:text-red-400">
                                End date must be on or after the start date.
                              </p>
                            )}
                          </div>
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
                            onClick={handleAdvanceSchoolYear}
                            variant="default"
                            className="w-full"
                            disabled={
                              !schoolYearStartDate ||
                              !schoolYearEndDate ||
                              new Date(schoolYearStartDate) > new Date(schoolYearEndDate)
                            }
                          >
                            Proceed with School Year Advancement
                          </Button>
                          <Button 
                            onClick={() => handleSchoolYearDialogChange(false)}
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
                        </div>
                      )}
                    </motion.div>
                  </AnimatePresence>
                </DialogContent>
              </Dialog>
            )}
            <Dialog
              open={addStudentOpen}
              onOpenChange={(open) => {
                setAddStudentOpen(open);
                if (!open) {
                  resetAddStudentForm();
                }
              }}
            >
              <DialogTrigger asChild>
                <Button variant="default" size="sm" className="gap-2">
                  <UserPlus size={16} />
                  Add Student
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] sm:w-[92vw] max-w-5xl lg:max-w-4xl h-auto sm:h-[86vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
                <div className="flex-1 max-h-[92vh] overflow-y-auto p-6 md:p-8 space-y-4">
                  <DialogHeader>
                    <DialogTitle className="text-xl font-bold">Add New Student</DialogTitle>
                    <DialogDescription>Fill out the required details to register a student.</DialogDescription>
                  </DialogHeader>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">LRN *</label>
                    <Input
                      value={newStudentForm.lrn}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, lrn: e.target.value }))}
                      placeholder="E.g., LRN-2026-0016"
                      className="capitalize"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Last Name *</label>
                    <Input
                      value={newStudentForm.lastName}
                      onChange={(e) => {
                        setNewStudentForm((prev) => ({ ...prev, lastName: e.target.value }));
                        if (e.target.value.trim()) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, lastName: undefined }));
                        }
                      }}
                      placeholder="Student Last Name"
                      className="capitalize"
                    />
                    {addStudentValidationErrors.lastName && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.lastName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">First/Middle Name *</label>
                    <Input
                      value={newStudentForm.firstMiddleName}
                      onChange={(e) => {
                        setNewStudentForm((prev) => ({ ...prev, firstMiddleName: e.target.value }));
                        if (e.target.value.trim()) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, firstMiddleName: undefined }));
                        }
                      }}
                      placeholder="Student First and Middle Name"
                      className="capitalize"
                    />
                    {addStudentValidationErrors.firstMiddleName && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.firstMiddleName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Gender *</label>
                    <Select
                      value={newStudentForm.gender}
                      onValueChange={(value) => {
                        setNewStudentForm((prev) => ({ ...prev, gender: value }));
                        if (value) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, gender: undefined }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    {addStudentValidationErrors.gender && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.gender}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Birthday *</label>
                    <DatePickerInput
                      value={newStudentForm.birthday}
                      onChange={(val) => {
                        setNewStudentForm((prev) => ({ ...prev, birthday: val }));
                        if (val) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, birthday: undefined }));
                        }
                      }}
                      placeholder="DD/MM/YYYY"
                    />
                    {addStudentValidationErrors.birthday && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.birthday}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Year Level *</label>
                    <Select
                      value={newStudentForm.level}
                      onValueChange={(value) => {
                        setNewStudentForm((prev) => ({ ...prev, level: value }));
                        if (value) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, level: undefined }));
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Year Level" />
                      </SelectTrigger>
                      <SelectContent>
                        {YEAR_LEVEL_OPTIONS.map((level) => (
                          <SelectItem key={level} value={level}>{level.replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {addStudentValidationErrors.level && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.level}</p>
                    )}
                  </div>

                  {shouldShowScheduleConfig && (
                    <div className="md:col-span-2 rounded-[24px] border border-blue-200/70 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-5">
                      <div>
                        <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Student Schedule Setup</p>
                        <p className="mt-1 text-xs leading-6 text-blue-700/80 dark:text-blue-400/80">
                          {isEarlyLevelSelected
                            ? 'Select weekdays (Monday to Friday). You can choose 3-4 days or fewer, and add multiple daily schedule slots.'
                            : 'Weekdays are automatically set to Monday-Friday for Grades 1-8. Set the daily time slots below.'}
                        </p>
                      </div>

                      {isEarlyLevelSelected && (
                        <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
                          {WEEKDAY_OPTIONS.map((day) => (
                            <label
                              key={day.label}
                              className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                            >
                              <input
                                type="checkbox"
                                checked={selectedScheduleDays.includes(day.label)}
                                onChange={() => toggleScheduleDay(day.label)}
                                className="h-4 w-4 accent-blue-600"
                              />
                              <span>{day.label}</span>
                            </label>
                          ))}
                        </div>
                      )}

                      <div className="space-y-3">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                          <label className="text-sm font-medium">Daily Time Slots</label>
                          <Button type="button" variant="outline" size="sm" onClick={addScheduleSlot} className="rounded-[18px] px-5">
                            Add Slot
                          </Button>
                        </div>
                        <div className="space-y-2">
                          {scheduleTimeSlots.map((slot, slotIndex) => (
                            <div key={`${slot.label}-${slotIndex}`} className="grid grid-cols-1 items-center gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-3 shadow-sm sm:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] dark:border-slate-700 dark:bg-slate-900/65">
                              <Input
                                value={slot.label}
                                onChange={(e) => updateScheduleSlot(slotIndex, 'label', e.target.value)}
                                placeholder={`Session ${slotIndex + 1}`}
                                className="h-12 rounded-[18px] border-orange-200 bg-white dark:bg-slate-950"
                              />
                              <TimePickerInput
                                value={slot.startTime}
                                onChange={(value) => updateScheduleSlot(slotIndex, 'startTime', value)}
                                className="h-12 rounded-[18px] border-orange-200 bg-white dark:bg-slate-950"
                              />
                              <TimePickerInput
                                value={slot.endTime}
                                onChange={(value) => updateScheduleSlot(slotIndex, 'endTime', value)}
                                className="h-12 rounded-[18px] border-orange-200 bg-white dark:bg-slate-950"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                disabled={scheduleTimeSlots.length <= 1}
                                onClick={() => removeScheduleSlot(slotIndex)}
                                className="h-12 rounded-[18px] px-4 font-medium"
                              >
                                Remove
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="flex items-start gap-6">
                      <div className="space-y-2 w-48">
                        <label className="text-sm font-medium">Status</label>
                        <Select
                          value={newStudentForm.status}
                          onValueChange={(value) => setNewStudentForm((prev) => ({ ...prev, status: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-3 w-full max-w-xs">
                        <label className="text-sm font-medium">Special Education needs</label>
                        <p className="text-xs leading-relaxed text-muted-foreground">Does this learner have educational needs?</p>
                        <div className="flex items-center gap-2">
                          <Switch
                            className="data-[state=unchecked]:bg-slate-300 data-[state=unchecked]:border data-[state=unchecked]:border-slate-500 data-[state=checked]:bg-blue-600"
                            checked={!!newStudentForm.is_special_case}
                            onCheckedChange={(v) => setNewStudentForm((prev) => ({ ...prev, is_special_case: !!v }))}
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Address</label>
                    <Input
                      value={newStudentForm.address}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, address: e.target.value }))}
                      placeholder="Home Address"
                      className="capitalize"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parent/Guardian Name *</label>
                    <Input
                      required
                      value={newStudentForm.parentName}
                      onChange={(e) => {
                        setNewStudentForm((prev) => ({ ...prev, parentName: e.target.value }));
                        if (e.target.value.trim()) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, parentName: undefined }));
                        }
                      }}
                      placeholder="Parent/Guardian Full Name"
                      className="capitalize"
                    />
                    {addStudentValidationErrors.parentName && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.parentName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parent Contact *</label>
                    <Input
                      required
                      value={newStudentForm.parentContact}
                      onChange={(e) => {
                        setNewStudentForm((prev) => ({ ...prev, parentContact: e.target.value }));
                        if (e.target.value.trim()) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, parentContact: undefined }));
                        }
                      }}
                      placeholder="E.g., 0917-555-0116"
                    />
                    {addStudentValidationErrors.parentContact && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.parentContact}</p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-2">
                    <label className="text-sm font-medium">Parent Email *</label>
                    <Input
                      required
                      type="email"
                      value={newStudentForm.parentEmail}
                      onChange={(e) => {
                        setNewStudentForm((prev) => ({ ...prev, parentEmail: e.target.value }));
                        if (e.target.value.trim()) {
                          setAddStudentValidationErrors((prev) => ({ ...prev, parentEmail: undefined }));
                        }
                      }}
                      placeholder="Parent@example.com"
                    />
                    {addStudentValidationErrors.parentEmail && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addStudentValidationErrors.parentEmail}</p>
                    )}
                  </div>

                  <div className="md:col-span-2 space-y-1 pt-2 border-t border-gray-200 dark:border-gray-700 mt-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Additional Parent/Guardian (optional)</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium"> Parent/Guardian Name (optional)</label>
                    <Input
                      value={newStudentForm.parent2Name}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, parent2Name: e.target.value }))}
                      placeholder="Additional Parent/Guardian Full Name"
                      className="capitalize"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Parent Contact (optional)</label>
                    <Input
                      value={newStudentForm.parent2Contact}
                      onChange={(e) => setNewStudentForm((prev) => ({ ...prev, parent2Contact: e.target.value }))}
                      placeholder="E.g., 0917-555-0117"
                    />
                  </div>
                  </div>
                </div>
                {/* Sticky footer for actions */}
                <div className="flex-shrink-0 border-t bg-white dark:bg-slate-900/80 px-6 md:px-8 py-4 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end items-stretch sm:items-center">
                  <Button
                    variant="outline"
                    onClick={() => setAddStudentOpen(false)}
                    disabled={addingStudent}
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleAddStudent}
                    disabled={addingStudent}
                    className="w-full sm:w-auto"
                  >
                    {addingStudent ? <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Saving...</span> : 'Save Student'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {/* Total Students Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Students</p>
                  <div className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">registered in system</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Users className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
            </Card>
          </motion.div>

          {/* Male / Female Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Male / Female</p>
                  <div className="text-lg sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{stats.male} / {stats.female}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">gender distribution</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <User className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
            </Card>
          </motion.div>

          {/* Checked In Today Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Checked In Today</p>
                  <div className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.checkedIn}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">attendance today</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <CheckCircle className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
            </Card>
          </motion.div>

          {/* Attendance Rate Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Attendance Rate</p>
                  <div className="text-xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{stats.attendanceRate}%</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">overall attendance</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Activity className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
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
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 gap-3 lg:grid-cols-12">
                    <div className="relative lg:col-span-5">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by LRN, name, or parent..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 h-10"
                      />
                    </div>
                    <Select value={filterGrade} onValueChange={setFilterGrade}>
                      <SelectTrigger className="h-10 lg:col-span-2">
                        <SelectValue placeholder="Filter By Level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Levels</SelectItem>
                        {Object.keys(LEVEL_COLORS).map(level => (
                          <SelectItem key={level} value={level}>{level.replace(/\b\w/g, c => c.toUpperCase())}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select value={filterGender} onValueChange={setFilterGender}>
                      <SelectTrigger className="h-10 lg:col-span-2">
                        <SelectValue placeholder="Filter By Gender" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Genders</SelectItem>
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={filterRisk} onValueChange={setFilterRisk}>
                      <SelectTrigger className="h-10 lg:col-span-3">
                        <SelectValue placeholder="Filter By Risk" />
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
                  <div className="flex flex-col gap-2 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                    <p>
                      Showing <span className="font-bold text-foreground">{filteredStudents.length}</span> of{' '}
                      <span className="font-bold text-foreground">{students.length}</span> students
                    </p>
                    {showOnlySummer && (
                      <span className="inline-flex w-fit rounded-full border border-orange-200 bg-orange-50 px-3 py-1 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300">
                        Summer filter active
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs for List and Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-lg grid-cols-3">
            <TabsTrigger value="list" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Student List</span>
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <PieChart className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="summer" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="text-xs sm:text-sm">Summer students</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Students Table */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <User className="w-5 h-5 text-blue-500" />
                      Student Directory
                    </CardTitle>
                    <CardDescription>
                      Complete list of enrolled students with LRN, level, and parent contact details
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                    <input
                      ref={importInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleImportStudents}
                      className="hidden"
                      disabled={importingStudents}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => importInputRef.current?.click()}
                      className="gap-2"
                      disabled={importingStudents}
                    >
                      {importingStudents ? (
                        <span className="flex items-center gap-2"><Loader2 className="animate-spin w-4 h-4" /> Importing...</span>
                      ) : (
                        <span className="flex items-center gap-2"><Upload className="w-4 h-4" />Import</span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={exportToCSV}
                      className="gap-2"
                      disabled={importingStudents}
                    >
                      <Download className="w-4 h-4" />
                      Export
                    </Button>
                    <Badge variant="outline" className="bg-white dark:bg-slate-800 text-xs whitespace-nowrap">
                      {{
                       lrn: 'LRN',
                       name: 'Name',
                       level: 'Grade Level',
                       riskLevel: 'Risk Level',
                      }[sortConfig.key] ?? sortConfig.key}
                      {' \u2014 '}
                      {sortConfig.direction === 'asc' ? 'A \u2192 Z' : 'Z \u2192 A'}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="min-w-230">
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-900/50">
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          onClick={() => handleSort('lrn')}
                        >
                          <div className="flex items-center gap-1">
                            LRN
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center gap-1">
                            Name
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          onClick={() => handleSort('level')}
                        >
                          <div className="flex items-center gap-1">
                            Level
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 whitespace-nowrap"
                          onClick={() => handleSort('riskLevel')}
                        >
                          <div className="flex items-center gap-1">
                            Risk Level
                            <ArrowUpDown className="w-3 h-3" />
                          </div>
                        </TableHead>
                        <TableHead className="hidden lg:table-cell whitespace-nowrap">Parent Info</TableHead>
                        <TableHead className="hidden md:table-cell whitespace-nowrap">Today</TableHead>
                        <TableHead className="text-center whitespace-nowrap">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8">
                            <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                            <p className="text-sm text-muted-foreground mt-2">Loading students...</p>
                          </TableCell>
                        </TableRow>
                      ) : filteredStudents.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-12">
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
                        paginatedStudents.map((student, index) => {
                          const riskScore = riskScores[student.lrn];
                          const riskLevel = riskScore?.risk_level || 'low';
                          const riskColors = getRiskLevelColor(riskLevel);
                          const RiskIcon = riskColors.icon;
                          const attendance = attendanceByLrn[student.lrn];
                          const summerEnrollment = summerEnrollments[student.lrn];
                          const isCompletedSummer = isCompletedSummerStudent(summerEnrollment);
                          
                          return (
                            <motion.tr
                              key={student.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="border-b border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
                            >
                              <TableCell className="font-mono text-sm font-medium whitespace-nowrap">{student.lrn}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-45">
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium leading-tight truncate max-w-44 sm:max-w-60 md:max-w-80" title={student.name}>
                                      {student.name}
                                    </span>
                                    {student.is_special_case && (
                                      <img src="/Helping-Hand.png" alt="Special Case" className="w-4 h-4 ml-2" />
                                    )}
                                    {summerEnrollment && (
                                      <Sun className="w-4 h-4 text-orange-500 dark:text-orange-400 flex-shrink-0" title="Summer Class" />
                                    )}
                                    {isCompletedSummer && (
                                      <Award className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" title="Completed Summer Class" />
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={`font-semibold shadow-none hover:shadow-none ${LEVEL_BADGE_STYLES[student.level] || 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-900/40 dark:text-slate-300 dark:border-slate-700'}`}
                                >
                                  {student.level}
                                </Badge>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
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
                              <TableCell className="hidden lg:table-cell">
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2 text-sm">
                                    <Mail className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">{(student.parent_email || student.parentEmail || '').trim() || <span className="italic text-gray-400">No Email</span>}</span>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1">
                                    {student.isLinked ? (
                                      <div className="flex items-center gap-1">
                                        <Badge className="bg-emerald-100 text-emerald-700 border-0 text-xs">Linked</Badge>
                                        <Button
                                          size="xs"
                                          variant="outline"
                                          className="bg-red-100 text-red-700 border-0 text-xs px-2 py-1 h-auto min-h-0 min-w-0 rounded hover:bg-red-200"
                                          onClick={async () => {
                                            await handleUnlinkParentAccount(student);
                                          }}
                                          title="Unlink parent account"
                                        >
                                          Unlink
                                        </Button>
                                      </div>
                                    ) : (
                                      <Button
                                        size="xs"
                                        variant="outline"
                                        className="bg-gray-200 text-gray-700 border-0 text-xs px-2 py-1 h-auto min-h-0 min-w-0 rounded"
                                        onClick={async () => {
                                          await handleValidateParentAccount(student);
                                          fetchStudents();
                                        }}
                                        disabled={validatedParentEmails.includes(((student.parent_email || student.parentEmail || '')).toLowerCase())}
                                        title="Link parent account"
                                      >
                                        Link
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="hidden md:table-cell whitespace-nowrap">
                                {attendance ? (
                                  (() => {
                                    const status = attendance.attendanceStatus;
                                    if (status && isNoClassStatus(status)) {
                                      const normalized = status.toLowerCase();
                                      const label = normalized === 'holiday' ? 'Holiday' : 'Cancelled';
                                      const badgeClass = normalized === 'holiday' ? 'bg-sky-100 text-sky-700 border-0 text-xs' : 'bg-slate-100 text-slate-700 border-0 text-xs';
                                      return (
                                        <div className="flex flex-col gap-1">
                                          <Badge className={badgeClass}>{label}</Badge>
                                        </div>
                                      );
                                    }

                                    return (
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
                                          {attendance.checkInTime ? formatTime12h(attendance.checkInTime) : '--'}
                                        </span>
                                        {attendance.scheduledEndTime && (
                                          <span className="text-[10px] text-muted-foreground">
                                            Until {formatTime12h(attendance.scheduledEndTime)}
                                          </span>
                                        )}
                                      </div>
                                    );
                                  })()
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
                                      setEditingSchedule(false);
                                      setScheduleDraft([]);
                                      setDetailsTab('overview');
                                      setHighlightExcuseDate('');
                                      setPendingLrn('');
                                      setEditingStudentInfo(false);
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        openStudentDetails(student, { tab: 'overview' });
                                      }}
                                      className="gap-1.5 hover:bg-primary/10 hover:text-primary whitespace-nowrap"
                                    >
                                      <Eye size={14} />
                                      <span className="hidden sm:inline">View</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent
                                    className="w-full max-w-5xl lg:max-w-5xl p-0 flex flex-col sm:w-[96vw]"
                                  >
                                    <div className="relative h-full p-2 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
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
                                              <DialogTitle className="text-2xl">
                                                {selectedStudent.name}
                                                {selectedStudent.is_special_case && (
                                                  <img src="/Helping-Hand.png" alt="Special Case" className="w-5 h-5 inline-block ml-3" />
                                                )}
                                              </DialogTitle>
                                              <DialogDescription>
                                                <span className="flex items-center gap-2">
                                                  <Input
                                                    value={pendingLrn}
                                                    onChange={e => setPendingLrn(e.target.value)}
                                                    placeholder="Enter LRN"
                                                    className="capitalize w-48"
                                                    disabled={!editingStudentInfo}
                                                  />
                                                  {/* LRN update is now handled via main Confirm button */}
                                                  {selectedStudent.lrn && selectedStudent.lrn.startsWith('TEMP-') && (
                                                    <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">Temporary LRN</span>
                                                  )}
                                                </span>
                                                <span className="ml-2">• {selectedStudent.level}</span>
                                                {summerEnrollments[selectedStudent.lrn] && (
                                                  <span className="ml-3 inline-block align-middle">
                                                    <Badge className="bg-orange-100 text-orange-700 border-0 text-sm">
                                                      Summer: {new Date(summerEnrollments[selectedStudent.lrn].start_date).toLocaleDateString()} — {new Date(summerEnrollments[selectedStudent.lrn].end_date).toLocaleDateString()}
                                                    </Badge>
                                                  </span>
                                                )}
                                              </DialogDescription>
                                                  {/* Confirmation Dialog for LRN update */}
                                                  <Dialog open={confirmLrnOpen} onOpenChange={setConfirmLrnOpen}>
                                                    <DialogContent className="max-w-md">
                                                      <DialogHeader>
                                                        <DialogTitle className="text-xl font-bold">Confirm LRN Update</DialogTitle>
                                                        <DialogDescription>
                                                          Are you sure you want to set this student's LRN to <span className="font-semibold">{lrnToSave}</span>?<br />
                                                          This action will update the student's LRN.
                                                        </DialogDescription>
                                                      </DialogHeader>
                                                      <div className="flex gap-3 justify-end mt-6">
                                                        <Button variant="outline" onClick={() => setConfirmLrnOpen(false)}>Cancel</Button>
                                                        <Button variant="default" onClick={handleConfirmLrn}>Yes, Update LRN</Button>
                                                      </div>
                                                    </DialogContent>
                                                  </Dialog>
                                            </div>
                                          </div>
                                        </DialogHeader>

                                        <Tabs defaultValue="overview" className="mt-6 space-y-4">
                                          <TabsList
                                            className="
                                              grid grid-cols-2 grid-rows-3 gap-1 w-full p-1
                                              sm:flex sm:flex-row sm:overflow-x-auto sm:whitespace-nowrap sm:text-base
                                              text-xs
                                              relative z-10 bg-white/90 dark:bg-slate-900/80
                                              mb-3 sm:mb-4
                                            "
                                            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.03)' }}
                                          >
                                            <TabsTrigger value="overview" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Overview</TabsTrigger>
                                            <TabsTrigger value="attendance" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Attendance</TabsTrigger>
                                            <TabsTrigger value="excuse-letters" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Excuse Letters</TabsTrigger>
                                            <TabsTrigger value="schedule" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Schedule</TabsTrigger>
                                            <TabsTrigger value="behavioral" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Behavioral</TabsTrigger>
                                            <TabsTrigger value="qr" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">QR Code</TabsTrigger>
                                          </TabsList>

                                          {savingStudentInfo && (
                                            <div className="absolute inset-0 z-20 rounded-2xl bg-white/85 dark:bg-slate-950/85 backdrop-blur-sm border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-center px-6">
                                              <div className="w-full max-w-2xl space-y-4 animate-pulse">
                                                <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
                                                  <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
                                                  <div className="col-span-2 h-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
                                                </div>
                                                <div className="h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
                                              </div>
                                            </div>
                                          )}

                                          <TabsContent value="overview" className="space-y-4 mt-4">

                                            {/* Student Info Grid */}
                                            <div className="grid grid-cols-1 gap-3 relative sm:grid-cols-2">
                                              {/* Name Section - Only Last Name Editable */}
                                              {(() => {
                                                // Support both "Last, First Middle" and "First Middle Last" formats
                                                const raw = selectedStudent.name.trim();
                                                let lastName = '';
                                                let firstMiddle = '';
                                                if (raw.includes(',')) {
                                                  const parts = raw.split(',');
                                                  lastName = parts[0].trim();
                                                  firstMiddle = (parts[1] || '').trim();
                                                } else {
                                                  const nameParts = raw.split(' ');
                                                  lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                                                  firstMiddle = nameParts.slice(0, -1).join(' ');
                                                }

                                                return (
                                                  <>
                                                    <div className="col-span-2 sm:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                      <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        Name
                                                      </p>
                                                      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md items-start">
                                                        <div className="flex-1">
                                                          <div className="flex flex-col sm:flex-row gap-2">
                                                            <Input
                                                              value={editFirstMiddleName !== null ? editFirstMiddleName : firstMiddle}
                                                              onChange={e => setEditFirstMiddleName(e.target.value)}
                                                              className="font-medium w-full sm:w-1/2 text-sm sm:text-base"
                                                              placeholder="First & Middle Name"
                                                              disabled={!editingStudentInfo}
                                                            />
                                                            <Input
                                                              value={editLastName !== null ? editLastName : lastName}
                                                              onChange={e => setEditLastName(e.target.value)}
                                                              placeholder="Last Name"
                                                              className="font-medium w-full sm:w-1/2 text-sm sm:text-base"
                                                              disabled={!editingStudentInfo}
                                                            />
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="col-span-2 sm:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-start justify-start pl-4">
                                                      <div className="flex flex-col items-start ml-2 gap-2 w-full max-w-xs">
                                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Special Education needs</p>
                                                        <p className="text-xs leading-relaxed text-muted-foreground">Does this learner have educational needs?</p>
                                                        <div className="flex items-center gap-2">
                                                          <Switch
                                                            className="data-[state=unchecked]:bg-slate-300 data-[state=unchecked]:border data-[state=unchecked]:border-slate-500 data-[state=checked]:bg-blue-600"
                                                            checked={!!selectedStudent.is_special_case}
                                                            onCheckedChange={(v) => setSelectedStudent({ ...selectedStudent, is_special_case: !!v })}
                                                            disabled={!editingStudentInfo}
                                                          />
                                                          <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </>
                                                );
                                              })()}
                                              <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <Calendar className="w-3 h-3" />
                                                  Birthday
                                                </p>
                                                {editingStudentInfo ? (
                                                  <Input
                                                    type="date"
                                                    value={selectedStudent.birthday || ''}
                                                    onChange={(e) => setSelectedStudent({ ...selectedStudent, birthday: e.target.value })}
                                                    className="font-medium"
                                                    disabled={!editingStudentInfo}
                                                  />
                                                ) : (
                                                  <p className="font-medium">{selectedStudent.birthday}</p>
                                                )}
                                                {shouldShowAge(selectedStudent.level) && (
                                                  <p className="text-sm text-muted-foreground mt-1">
                                                    {calculateAgeWithDecimal(selectedStudent.birthday)} years old
                                                  </p>
                                                )}
                                              </div>
                                              <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <User className="w-3 h-3" />
                                                  Gender
                                                </p>
                                                {editingStudentInfo ? (
                                                  <Select
                                                    value={selectedStudent.gender || ''}
                                                    onValueChange={(value) => setSelectedStudent({ ...selectedStudent, gender: value })}
                                                    disabled={!editingStudentInfo}
                                                  >
                                                    <SelectTrigger className="h-10">
                                                      <SelectValue placeholder="Select Gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="Male">Male</SelectItem>
                                                      <SelectItem value="Female">Female</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                ) : (
                                                  <p className="font-medium">{selectedStudent.gender}</p>
                                                )}
                                              </div>
                                              <div className="col-span-2 md:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col items-start">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <MapPin className="w-3 h-3" />
                                                  Address
                                                </p>
                                                <Input
                                                  value={selectedStudent.address || ''}
                                                  onChange={e => setSelectedStudent({ ...selectedStudent, address: e.target.value })}
                                                  placeholder="No address provided"
                                                  className="font-medium w-full"
                                                  disabled={!editingStudentInfo}
                                                />
                                              </div>
                                              <div className="col-span-2 md:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col items-start">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <QrCode className="w-3 h-3" />
                                                  RFID UID
                                                </p>
                                                <div className="w-full space-y-1.5">
                                                    <div className="flex flex-col gap-1.5 sm:flex-row">
                                                    <Input
                                                      value={selectedStudent.rfid_uid || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, rfid_uid: normalizeRfidUid(e.target.value) })}
                                                      placeholder="e.g. A1B2C3D4"
                                                      className="font-medium w-full text-sm sm:text-base"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                    <Button
                                                      type="button"
                                                      className="w-full sm:w-auto text-xs sm:text-base"
                                                      variant={rfidConnected ? 'outline' : 'default'}
                                                      onClick={() => {
                                                        if (rfidConnected) {
                                                          void disconnectRfidReader();
                                                        } else {
                                                          void connectRfidReader();
                                                        }
                                                      }}
                                                      disabled={!editingStudentInfo || connectingRfid || savingStudentInfo}
                                                      className="sm:w-auto gap-2"
                                                    >
                                                      {rfidConnected ? <Wifi className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
                                                      {connectingRfid ? 'Connecting...' : rfidConnected ? 'Disconnect' : 'Tap RFID'}
                                                    </Button>
                                                  </div>
                                                  <p className="text-xs text-muted-foreground leading-snug">
                                                    {editingStudentInfo
                                                      ? 'Tap an RFID tag to auto-fill the UID field. Only hex characters are saved.'
                                                      : 'Click Edit Info first, then connect the RFID reader to auto-fill the UID.'}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground flex items-center gap-1 leading-snug">
                                                    {rfidConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                                    {rfidConnected ? 'RFID reader connected' : 'RFID reader not connected'}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div className="space-y-1.5 w-full max-w-md">
                                                  <p className="text-xs text-muted-foreground mb-1">Parent/Guardian Information</p>
                                                  <div className="flex items-center gap-2 w-full">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                      value={selectedStudent.parentName || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, parentName: e.target.value })}
                                                      placeholder="Parent/Guardian Name"
                                                      className="text-sm font-medium"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                      value={selectedStudent.parentContact || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, parentContact: e.target.value })}
                                                      placeholder="Parent Contact"
                                                      className="text-sm"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                      value={selectedStudent.parentEmail || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, parentEmail: e.target.value })}
                                                      placeholder="Parent Email"
                                                      className="text-sm"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                  </div>
                                                  <div className="border-t border-gray-200 dark:border-gray-600 mt-3 pt-3">
                                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Additional Parent/Guardian (optional)</p>
                                                    <div className="flex items-center gap-2">
                                                      <User className="w-4 h-4 text-muted-foreground" />
                                                      <Input
                                                        value={selectedStudent.parent2Name || ''}
                                                        onChange={e => setSelectedStudent({ ...selectedStudent, parent2Name: e.target.value })}
                                                        placeholder="Additional Parent/Guardian Name"
                                                        className="text-sm"
                                                        disabled={!editingStudentInfo}
                                                      />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                      <Phone className="w-4 h-4 text-muted-foreground" />
                                                      <Input
                                                        value={selectedStudent.parent2Contact || ''}
                                                        onChange={e => setSelectedStudent({ ...selectedStudent, parent2Contact: e.target.value })}
                                                        placeholder="Additional Parent Contact"
                                                        className="text-sm"
                                                        disabled={!editingStudentInfo}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Edit/Confirm Button */}
                                              <div className="flex flex-wrap gap-2 sm:ml-4 shrink-0">
                                                {isAdmin && (
                                                  <>
                                                    <Button size="sm" variant="outline" className="min-w-[120px] border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 w-full sm:w-auto" onClick={() => setTransferDialogOpen(true)}>
                                                      <ArrowRightLeft className="w-4 h-4" />
                                                      Transfer Student
                                                    </Button>
                                                    <Dialog open={transferDialogOpen} onOpenChange={(open) => {
                                                      setTransferDialogOpen(open);
                                                      if (open) {
                                                        setTransferConfirmEmail('');
                                                        setTransferConfirmPassword('');
                                                        setTransferError('');
                                                        setTransferValidationErrors({});
                                                      }
                                                    }}>
                                                      <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                          <DialogTitle className="text-xl font-bold">Transfer student?</DialogTitle>
                                                          <DialogDescription>
                                                            This will mark the student as transferred and hide them from current students.<br />
                                                            Please enter your account email and password to confirm.
                                                          </DialogDescription>
                                                        </DialogHeader>
                                                        <input type="text" name="fakeusernameremembered_transfer" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
                                                        <Input
                                                          type="email"
                                                          name="confirm_email_transfer"
                                                          value={transferConfirmEmail}
                                                          onChange={e => {
                                                            setTransferConfirmEmail(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setTransferValidationErrors((prev) => ({ ...prev, email: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your email"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={transferringStudent}
                                                        />
                                                        {transferValidationErrors.email && <div className="text-red-600 text-sm mt-2">{transferValidationErrors.email}</div>}
                                                        <Input
                                                          type="password"
                                                          name="confirm_password_transfer"
                                                          value={transferConfirmPassword}
                                                          onChange={e => {
                                                            setTransferConfirmPassword(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setTransferValidationErrors((prev) => ({ ...prev, password: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your password"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={transferringStudent}
                                                        />
                                                        {transferValidationErrors.password && <div className="text-red-600 text-sm mt-2">{transferValidationErrors.password}</div>}
                                                        {transferError && <div className="text-red-600 text-sm mt-2">{transferError}</div>}
                                                        <div className="flex gap-3 justify-end mt-6">
                                                          <Button variant="outline" onClick={() => setTransferDialogOpen(false)} disabled={transferringStudent}>Cancel</Button>
                                                          <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleTransferStudent} disabled={transferringStudent}>
                                                            {transferringStudent ? 'Transferring...' : 'Transfer Student'}
                                                          </Button>
                                                        </div>
                                                      </DialogContent>
                                                    </Dialog>
                                                    <Button size="sm" variant="destructive" className="min-w-[120px] w-full sm:w-auto" onClick={() => setDropDialogOpen(true)}>
                                                      Drop Student
                                                    </Button>
                                                    <Dialog open={dropDialogOpen} onOpenChange={(open) => {
                                                      setDropDialogOpen(open);
                                                      if (open) {
                                                        setDropConfirmEmail('');
                                                        setDropConfirmPassword('');
                                                        setDropError('');
                                                        setDropValidationErrors({});
                                                      }
                                                    }}>
                                                      <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                          <DialogTitle className="text-xl font-bold">Are you sure?</DialogTitle>
                                                          <DialogDescription>
                                                            This will permanently delete this student from the system.<br />
                                                            Please enter your account email and password to confirm.
                                                          </DialogDescription>
                                                        </DialogHeader>
                                                        {/* Hidden dummy input to confuse browser autofill */}
                                                        <input type="text" name="fakeusernameremembered" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
                                                        <Input
                                                          type="email"
                                                          name="confirm_email_123"
                                                          value={dropConfirmEmail}
                                                          onChange={e => {
                                                            setDropConfirmEmail(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setDropValidationErrors((prev) => ({ ...prev, email: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your email"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={droppingStudent}
                                                        />
                                                        {dropValidationErrors.email && <div className="text-red-600 text-sm mt-2">{dropValidationErrors.email}</div>}
                                                        <Input
                                                          type="password"
                                                          name="confirm_password_123"
                                                          value={dropConfirmPassword}
                                                          onChange={e => {
                                                            setDropConfirmPassword(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setDropValidationErrors((prev) => ({ ...prev, password: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your password"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={droppingStudent}
                                                        />
                                                        {dropValidationErrors.password && <div className="text-red-600 text-sm mt-2">{dropValidationErrors.password}</div>}
                                                        {dropError && <div className="text-red-600 text-sm mt-2">{dropError}</div>}
                                                        <div className="flex gap-3 justify-end mt-6">
                                                          <Button variant="outline" onClick={() => setDropDialogOpen(false)} disabled={droppingStudent}>Cancel</Button>
                                                          <Button variant="destructive" onClick={handleDropStudent} disabled={droppingStudent}>
                                                            {droppingStudent ? 'Dropping...' : 'Drop Student'}
                                                          </Button>
                                                        </div>
                                                      </DialogContent>
                                                    </Dialog>
                                                  </>
                                                )}
                                                {isAdmin && !editingStudentInfo ? (
                                                  <Button size="sm" variant="outline" className="min-w-[100px] w-full sm:w-auto" onClick={() => {
                                                    // When entering edit mode, buffer the last name (support comma format)
                                                        const raw = selectedStudent.name.trim();
                                                        let bufLast = '';
                                                        let bufFirstMiddle = '';
                                                        if (raw.includes(',')) {
                                                          const parts = raw.split(',');
                                                          bufLast = parts[0].trim();
                                                          bufFirstMiddle = (parts[1] || '').trim();
                                                        } else {
                                                          const nameParts = raw.split(' ');
                                                          bufLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                                                          bufFirstMiddle = nameParts.slice(0, -1).join(' ');
                                                        }
                                                        setEditFirstMiddleName(bufFirstMiddle);
                                                        setEditLastName(bufLast);
                                                        setEditingStudentInfo(true);
                                                  }}>
                                                    Edit Info
                                                  </Button>
                                                ) : null}
                                                {isAdmin && editingStudentInfo && (
                                                  <Button size="sm" variant="default" className="min-w-[100px] gap-2 w-full sm:w-auto" onClick={handleConfirmStudentInfo} disabled={savingStudentInfo}>
                                                    {savingStudentInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                    {savingStudentInfo ? 'Saving...' : 'Confirm'}
                                                  </Button>
                                                )}
                                              </div>
                                            </div>                                           
                                          </div>
                                          </TabsContent>

                                          <TabsContent value="schedule" className="space-y-4 mt-4">
                                            {loadingSchedule ? (
                                              <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                              </div>
                                            ) : (editingSchedule || (studentSchedules[selectedStudent.lrn] || []).length > 0) ? (
                                              <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                  <p className="text-sm text-muted-foreground">Manage this student's schedule and notify parents when updated.</p>
                                                  {!editingSchedule ? (
                                                    <Button variant="outline" size="sm" onClick={startEditingSchedule}>
                                                      Edit Schedule
                                                    </Button>
                                                  ) : (
                                                    <div className="flex items-center gap-2">
                                                      <Button variant="outline" size="sm" onClick={addScheduleDraftRow}>
                                                        Add Row
                                                      </Button>
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                          setEditingSchedule(false);
                                                          setScheduleDraft((studentSchedules[selectedStudent.lrn] || []).map((row) => ({
                                                            id: row.id,
                                                            day_of_week: row.day_of_week,
                                                            days_of_week: [row.day_of_week],
                                                            day_number: row.day_number,
                                                            subject: row.subject,
                                                            start_time: row.start_time?.slice(0, 5) || '08:00',
                                                            end_time: row.end_time?.slice(0, 5) || '09:00',
                                                            room: row.room || '',
                                                            teacher_name: row.teacher_name || '',
                                                          })));
                                                        }}
                                                      >
                                                        Cancel
                                                      </Button>
                                                      <Button size="sm" onClick={handleSaveScheduleChanges} disabled={savingScheduleChanges}>
                                                        {savingScheduleChanges ? 'Saving...' : 'Save Changes'}
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="space-y-3 rounded-xl border p-3 md:p-4">
                                                  {(editingSchedule ? scheduleDraft : (studentSchedules[selectedStudent.lrn] || [])).map((schedule) => (
                                                    <div
                                                      key={schedule.id}
                                                      className="py-3 first:pt-0 last:pb-0"
                                                    >
                                                      {editingSchedule ? (
                                                        <div className="space-y-3">
                                                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[220px_minmax(0,0.75fr)_minmax(0,1.25fr)]">
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Days</label>
                                                              <div className="flex flex-wrap gap-1.5 rounded-xl border p-1.5">
                                                                {WEEKDAY_OPTIONS.map((day) => {
                                                                  const editableSchedule = schedule as EditableScheduleRow;
                                                                  const selected = getNormalizedDraftDays(editableSchedule).includes(day.label);
                                                                  return (
                                                                    <Button
                                                                      key={day.label}
                                                                      type="button"
                                                                      variant={selected ? 'default' : 'outline'}
                                                                      size="sm"
                                                                      className="h-8 rounded-lg px-2.5"
                                                                      onClick={() => toggleScheduleDraftDay(schedule.id, day.label)}
                                                                    >
                                                                      {day.label.slice(0, 3)}
                                                                    </Button>
                                                                  );
                                                                })}
                                                              </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Subject</label>
                                                              <Input
                                                                value={schedule.subject}
                                                                onChange={(e) => updateScheduleDraftRow(schedule.id, 'subject', e.target.value)}
                                                                className="h-11 rounded-xl max-w-md"
                                                              />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Time</label>
                                                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                                                <TimePickerInput
                                                                  value={schedule.start_time?.slice(0, 5)}
                                                                  onChange={(value) => updateScheduleDraftRow(schedule.id, 'start_time', value)}
                                                                  className="h-11 rounded-xl"
                                                                />
                                                                <span className="text-sm text-muted-foreground">-</span>
                                                                <TimePickerInput
                                                                  value={schedule.end_time?.slice(0, 5)}
                                                                  onChange={(value) => updateScheduleDraftRow(schedule.id, 'end_time', value)}
                                                                  className="h-11 rounded-xl"
                                                                />
                                                              </div>
                                                            </div>
                                                          </div>
                                                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Room</label>
                                                              <Input
                                                                value={schedule.room || ''}
                                                                onChange={(e) => updateScheduleDraftRow(schedule.id, 'room', e.target.value)}
                                                                className="h-11 rounded-xl"
                                                                placeholder="Room"
                                                              />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Teacher</label>
                                                              <Input
                                                                value={schedule.teacher_name || ''}
                                                                onChange={(e) => updateScheduleDraftRow(schedule.id, 'teacher_name', e.target.value)}
                                                                className="h-11 rounded-xl"
                                                                placeholder="Teacher"
                                                              />
                                                            </div>
                                                            <div className="flex items-end">
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeScheduleDraftRow(schedule.id)}
                                                                disabled={scheduleDraft.length <= 1}
                                                                className="h-11 rounded-xl px-4"
                                                              >
                                                                Remove
                                                              </Button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Day</p>
                                                            <p className="mt-1 font-medium">{schedule.day_of_week}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Subject</p>
                                                            <p className="mt-1 font-medium">{schedule.subject}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Time</p>
                                                            <p className="mt-1 font-medium">{`${formatTime12h(schedule.start_time)} - ${formatTime12h(schedule.end_time)}`}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Room</p>
                                                            <p className="mt-1 font-medium">{schedule.room || '—'}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Teacher</p>
                                                            <p className="mt-1 font-medium">{schedule.teacher_name || '—'}</p>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-3 text-center py-8 text-muted-foreground">
                                                <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No schedule available for this student</p>
                                                <div>
                                                  <Button variant="outline" size="sm" onClick={startEditingSchedule}>
                                                    Add Schedule
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </TabsContent>

                                          <TabsContent value="attendance" className="space-y-4 mt-4">
                                            {behavioralData && Array.isArray(behavioralData.attendance) && behavioralData.attendance.length > 0 ? (
                                              <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/50 p-4 bg-white/60 dark:bg-slate-900/30">
                                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                                  <Clock className="w-5 h-5 text-blue-600" />
                                                  Attendance History
                                                </h3>
                                                <div className="overflow-x-auto">
                                                  <table className="w-full text-sm">
                                                    <thead>
                                                      <tr className="text-left text-xs text-muted-foreground">
                                                        <th className="px-3 py-2">Date</th>
                                                        <th className="px-3 py-2">Status</th>
                                                        <th className="px-3 py-2">Check In</th>
                                                        <th className="px-3 py-2">Check Out</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {behavioralData.attendance
                                                        .slice()
                                                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                        .map((entry: any) => {
                                                          const rawStatus = (entry.attendance_status || '').toLowerCase();
                                                          const statusLabel = rawStatus
                                                            ? (rawStatus === 'present' ? 'Present' : rawStatus === 'absent' ? 'Absent' : rawStatus === 'holiday' ? 'Holiday' : rawStatus === 'cancelled_class' ? 'Cancelled' : rawStatus === 'late' ? 'Late' : rawStatus)
                                                            : (entry.is_present ? 'Present' : 'Absent');
                                                          const noClass = isNoClassStatus(entry.attendance_status || entry.attendanceStatus);
                                                          const badgeClass = rawStatus === 'holiday' ? 'bg-sky-100 text-sky-700' : rawStatus === 'cancelled_class' ? 'bg-slate-100 text-slate-700' : rawStatus === 'absent' ? 'bg-rose-100 text-rose-700' : rawStatus === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700';
                                                                                                                    // Determine late status using schedule entry time or level-based threshold
                                                          let isLate = false;
                                                          if (!noClass && entry.check_in_time && entry.is_present !== false) {
                                                            const entryTimeFromSchedule = behavioralData?.entryTime;
                                                            if (entryTimeFromSchedule) {
                                                              isLate = isLateCheckIn(entry.check_in_time, entryTimeFromSchedule);
                                                            } else {
                                                              // Fallback to level-based threshold if schedule entry time not available
                                                              const lateThreshold = getLateThreshold(selectedStudent?.level);
                                                              isLate = isLateCheckIn(entry.check_in_time, lateThreshold);
                                                            }
                                                          }
                                                          return (
                                                            <tr key={`${entry.date}-${entry.student_lrn}`} className="border-t border-slate-100 dark:border-slate-800">
                                                              <td className="px-3 py-2">{new Date(entry.date).toLocaleDateString()}</td>
                                                              <td className="px-3 py-2">
                                                                <div className="flex flex-col gap-1">
                                                                  <Badge className={`${badgeClass} border-0 py-1 px-2`}>{statusLabel}</Badge>
                                                                  {isLate && rawStatus !== 'late' && (
                                                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 py-1 px-2 text-xs w-fit">
                                                                      Late
                                                                    </Badge>
                                                                  )}
                                                                </div>
                                                              </td>
                                                              <td className="px-3 py-2">{noClass ? '--' : (entry.check_in_time ? formatTime12h(entry.check_in_time) : '--')}</td>
                                                              <td className="px-3 py-2">{noClass ? '--' : (entry.check_out_time ? formatTime12h(entry.check_out_time) : '--')}</td>
                                                            </tr>
                                                          );
                                                        })}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="text-center py-8 text-muted-foreground">
                                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No attendance records available</p>
                                              </div>
                                            )}
                                          </TabsContent>

                                          <TabsContent value="excuse-letters" className="space-y-4 mt-4">
                                            {loadingExcuseLetters ? (
                                              <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                              </div>
                                            ) : (excuseLettersByLrn[selectedStudent.lrn] || []).length > 0 ? (
                                              <div className="space-y-3">
                                                {(excuseLettersByLrn[selectedStudent.lrn] || []).map((letter) => {
                                                  const meta = letter.meta || {};
                                                  const excuseType = String(meta.excuse_status || '').toLowerCase();
                                                  const excuseDate = String(meta.excuse_date || '').slice(0, 10);
                                                  const parentName = String(meta.parent_name || letter.created_by || 'Parent');
                                                  const reason = String(meta.excuse_reason || '').trim();
                                                  const isHighlighted = Boolean(highlightExcuseDate) && excuseDate === highlightExcuseDate.slice(0, 10);

                                                  return (
                                                    <div
                                                      key={letter.id}
                                                      className={`rounded-xl border p-4 space-y-2 ${
                                                        isHighlighted
                                                          ? 'border-blue-400 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-950/30'
                                                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40'
                                                      }`}
                                                    >
                                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                          <p className="font-semibold text-slate-900 dark:text-white">{letter.title || 'Parent Excuse Letter'}</p>
                                                          <p className="text-xs text-muted-foreground">
                                                              Submitted by {parentName} on {new Date(letter.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime12h(new Date(letter.created_at))}
                                                          </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <Badge className={excuseType === 'late' ? 'bg-amber-100 text-amber-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                                                            {excuseType === 'late' ? 'Late' : 'Absent'}
                                                          </Badge>
                                                          <Badge variant="outline">{excuseDate || 'No date'}</Badge>
                                                        </div>
                                                      </div>
                                                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                                        {reason || letter.message || 'No explanation provided.'}
                                                      </p>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div className="text-center py-8 text-muted-foreground">
                                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No excuse letters submitted for this student.</p>
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
                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                                                  {/* Total Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Total Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{behavioralData.stats.totalEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">all behavioral events</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <Activity className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
                                                    </Card>
                                                  </div>
                                                  {/* Positive Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Positive Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{behavioralData.stats.positiveEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">reinforcing progress</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <Heart className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                                                    </Card>
                                                  </div>
                                                  {/* Negative Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 dark:bg-rose-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-rose-500/5 dark:bg-rose-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Negative Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">{behavioralData.stats.negativeEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">major/critical incidents</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-rose-500 to-rose-600 text-white items-center justify-center shadow-lg shadow-rose-500/25 dark:shadow-rose-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <AlertOctagon className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-rose-400 to-rose-600 dark:from-rose-500 dark:to-rose-700" />
                                                    </Card>
                                                  </div>
                                                  {/* Minor Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-yellow-50 to-white dark:from-yellow-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 dark:bg-yellow-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-yellow-500/5 dark:bg-yellow-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Minor Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">{behavioralData.stats.minorEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">minor incidents</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-yellow-500 to-yellow-600 text-white items-center justify-center shadow-lg shadow-yellow-500/25 dark:shadow-yellow-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <Minus className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700" />
                                                    </Card>
                                                  </div>
                                                </div>

                                                {/* Recent Events */}
                                                <div>
                                                  <h3 className="font-semibold mb-3 flex items-center gap-2 px-1">
                                                    <Bell className="w-4 h-4" />
                                                    Recent Events
                                                  </h3>
                                                  {behavioralData.events.length === 0 ? (
                                                    <p className="text-center py-4 text-muted-foreground">No recent events</p>
                                                  ) : (
                                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                                      {behavioralData.events.slice(0, 5).map((event: any) => (
                                                        <div
                                                          key={event.id}
                                                          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${getBehaviorEventVisuals(event.severity).card}`}
                                                        >
                                                          <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${getBehaviorEventVisuals(event.severity).iconWrap}`}>
                                                                {(() => {
                                                                  const EventIcon = getBehaviorEventVisuals(event.severity).Icon;
                                                                  return <EventIcon className="h-3.5 w-3.5" />;
                                                                })()}
                                                              </div>
                                                              <div className="min-w-0">
                                                                <p className={`font-semibold leading-tight truncate ${getBehaviorEventVisuals(event.severity).title}`}>
                                                                    {humanizeEventType(event.event_type) || 'Behavior Event'}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                  {new Date(event.event_date).toLocaleDateString(undefined, {
                                                                    weekday: 'short',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                  })}
                                                                  {event.event_time ? ` at ${event.event_time}` : ''}
                                                                </p>
                                                              </div>
                                                            </div>
                                                            <Badge className={`uppercase tracking-wide text-[9px] px-2 py-0.5 font-semibold border shadow-sm ${getBehaviorEventVisuals(event.severity).badge}`}>
                                                              {event.severity || 'event'}
                                                            </Badge>
                                                          </div>

                                                          <p className="mt-3 text-slate-700 dark:text-slate-200 leading-relaxed text-[13px]">
                                                            {event.description || 'No description provided.'}
                                                          </p>

                                                          <div className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] ${getBehaviorEventVisuals(event.severity).meta}`}>
                                                            <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                              <Calendar className="h-3 w-3" />
                                                              <span>{new Date(event.event_date).toLocaleDateString()}</span>
                                                            </div>
                                                            {event.event_categories?.name ? (
                                                              <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                                <FileText className="h-3 w-3" />
                                                                <span>Category: {event.event_categories.name}</span>
                                                              </div>
                                                            ) : null}
                                                            {event.location ? (
                                                              <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                                <MapPin className="h-3 w-3" />
                                                                <span>Location: {event.location}</span>
                                                              </div>
                                                            ) : null}
                                                            {event.reported_by ? (
                                                              <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                                <User className="h-3 w-3" />
                                                                <span>Reported by: {event.reported_by}</span>
                                                              </div>
                                                            ) : null}
                                                          </div>
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
                                                  value={selectedStudent.lrn && selectedStudent.lrn.trim() !== '' ? selectedStudent.lrn : selectedStudent.name}
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
                                    </div>
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
                <div className="flex items-center justify-between p-3">
                  <div className="text-sm text-muted-foreground">
                    Showing {showingFrom}-{showingTo} of {filteredStudents.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="text-sm">
                      Page {currentPage} / {totalPages}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
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

          <TabsContent value="summer" className="space-y-4">
            {/* Summer Students Table */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/30 border-b border-orange-200/60 dark:border-orange-700/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Users className="w-5 h-5 text-orange-500" />
                      Summer Class Students
                    </CardTitle>
                    <CardDescription>
                      Students enrolled in summer class ({Object.keys(summerEnrollments).length} students)
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {Object.keys(summerEnrollments).length === 0 ? (
                  <div className="p-8 text-center">
                    <div className="text-muted-foreground">
                      <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                      <p className="font-medium mb-1">No Summer Class Students</p>
                      <p className="text-sm">Students enrolled in summer class will appear here.</p>
                    </div>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table className="min-w-230">
                      <TableHeader className="bg-orange-50/50 dark:bg-orange-900/50">
                        <TableRow>
                          <TableHead className="whitespace-nowrap">LRN</TableHead>
                          <TableHead className="whitespace-nowrap">Name</TableHead>
                          <TableHead className="whitespace-nowrap">Level</TableHead>
                          <TableHead className="whitespace-nowrap">Summer Period</TableHead>
                          <TableHead className="hidden lg:table-cell whitespace-nowrap">Status</TableHead>
                          <TableHead className="whitespace-nowrap text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paginatedSummerStudents.map(({ student, enrollment }, index) => {
                          const isCompleted = isCompletedSummerStudent(enrollment);
                          return (
                            <motion.tr
                              key={student.lrn}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: index * 0.03 }}
                              className="border-b border-orange-200/50 dark:border-orange-700/30 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-colors"
                            >
                              <TableCell className="font-mono text-sm font-medium whitespace-nowrap">{student.lrn}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2 min-w-45 cursor-pointer" onClick={() => openStudentDetails(student)}>
                                  <Avatar className="h-8 w-8">
                                    <AvatarFallback className="bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 text-xs">
                                      {student.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex items-center gap-1">
                                    <span className="font-medium leading-tight truncate max-w-44 sm:max-w-60 md:max-w-80" title={student.name}>
                                      {student.name}
                                    </span>
                                    {isCompleted && (
                                      <Award className="w-4 h-4 text-yellow-500 dark:text-yellow-400 flex-shrink-0" title="Completed Summer Class" />
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="whitespace-nowrap">
                                <Badge
                                  variant="outline"
                                  className={`font-semibold shadow-none hover:shadow-none ${LEVEL_BADGE_STYLES[student.level] || 'bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-700'}`}
                                >
                                  {student.level}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-sm whitespace-nowrap">
                                <div className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {enrollment.start_date} → {enrollment.end_date}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="hidden lg:table-cell whitespace-nowrap">
                                {isCompleted ? (
                                  <Badge className="bg-yellow-100 text-yellow-800 border-0 gap-1 flex w-fit">
                                    <Award className="w-3 h-3" />
                                    Completed
                                  </Badge>
                                ) : (
                                  <Badge className="bg-orange-100 text-orange-800 border-0 gap-1 flex w-fit">
                                    <Clock className="w-3 h-3" />
                                    Active
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <Dialog
                                  open={selectedStudent?.id === student.id && detailsOpen}
                                  onOpenChange={(open) => {
                                    if (!open) {
                                      setSelectedStudent(null);
                                      setDetailsOpen(false);
                                      setEditingSchedule(false);
                                      setScheduleDraft([]);
                                      setDetailsTab('overview');
                                      setHighlightExcuseDate('');
                                      setPendingLrn('');
                                      setEditingStudentInfo(false);
                                    }
                                  }}
                                >
                                  <DialogTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        openStudentDetails(student, { tab: 'overview' });
                                      }}
                                      className="gap-1.5 hover:bg-primary/10 hover:text-primary whitespace-nowrap"
                                    >
                                      <Eye size={14} />
                                      <span className="hidden sm:inline">View</span>
                                    </Button>
                                  </DialogTrigger>
                                  <DialogContent
                                    className="w-full max-w-5xl lg:max-w-5xl p-0 flex flex-col sm:w-[96vw]"
                                  >
                                    <div className="relative h-full p-2 sm:p-6 md:p-8 max-h-[90vh] overflow-y-auto">
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
                                              <DialogTitle className="text-2xl">
                                                {selectedStudent.name}
                                                {selectedStudent.is_special_case && (
                                                  <img src="/Helping-Hand.png" alt="Special Case" className="w-5 h-5 inline-block ml-3" />
                                                )}
                                              </DialogTitle>
                                              <DialogDescription>
                                                <span className="flex items-center gap-2">
                                                  <Input
                                                    value={pendingLrn}
                                                    onChange={e => setPendingLrn(e.target.value)}
                                                    placeholder="Enter LRN"
                                                    className="capitalize w-48"
                                                    disabled={!editingStudentInfo}
                                                  />
                                                  {selectedStudent.lrn && selectedStudent.lrn.startsWith('TEMP-') && (
                                                    <span className="text-xs text-yellow-600 dark:text-yellow-400 ml-2">Temporary LRN</span>
                                                  )}
                                                </span>
                                                <span className="ml-2">• {selectedStudent.level}</span>
                                              </DialogDescription>
                                            </div>
                                          </div>
                                        </DialogHeader>

                                        <Tabs defaultValue="overview" className="mt-6 space-y-4">
                                          <TabsList
                                            className="
                                              grid grid-cols-2 grid-rows-3 gap-1 w-full p-1
                                              sm:flex sm:flex-row sm:overflow-x-auto sm:whitespace-nowrap sm:text-base
                                              text-xs
                                              relative z-10 bg-white/90 dark:bg-slate-900/80
                                              mb-3 sm:mb-4
                                            "
                                            style={{ boxShadow: '0 2px 8px 0 rgba(0,0,0,0.03)' }}
                                          >
                                            <TabsTrigger value="overview" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Overview</TabsTrigger>
                                            <TabsTrigger value="attendance" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Attendance</TabsTrigger>
                                            <TabsTrigger value="excuse-letters" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Excuse Letters</TabsTrigger>
                                            <TabsTrigger value="schedule" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Schedule</TabsTrigger>
                                            <TabsTrigger value="behavioral" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">Behavioral</TabsTrigger>
                                            <TabsTrigger value="qr" className="px-2 py-1 sm:px-4 sm:py-2 rounded-lg focus-visible:ring-2 focus-visible:ring-blue-400 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700 dark:data-[state=active]:bg-blue-900/40 dark:data-[state=active]:text-blue-200 transition-all text-xs sm:text-base min-w-[90px]">QR Code</TabsTrigger>
                                          </TabsList>

                                          {savingStudentInfo && (
                                            <div className="absolute inset-0 z-20 rounded-2xl bg-white/85 dark:bg-slate-950/85 backdrop-blur-sm border border-slate-200/70 dark:border-slate-800/70 flex items-center justify-center px-6">
                                              <div className="w-full max-w-2xl space-y-4 animate-pulse">
                                                <div className="h-6 w-40 rounded bg-slate-200 dark:bg-slate-700" />
                                                <div className="grid grid-cols-2 gap-4">
                                                  <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
                                                  <div className="h-24 rounded-xl bg-slate-200 dark:bg-slate-700" />
                                                  <div className="col-span-2 h-32 rounded-xl bg-slate-200 dark:bg-slate-700" />
                                                </div>
                                                <div className="h-10 w-full rounded-xl bg-slate-200 dark:bg-slate-700" />
                                              </div>
                                            </div>
                                          )}

                                          <TabsContent value="overview" className="space-y-4 mt-4">

                                            {/* Student Info Grid */}
                                            <div className="grid grid-cols-1 gap-3 relative sm:grid-cols-2">
                                              {/* Name Section - Only Last Name Editable */}
                                              {(() => {
                                                // Support both "Last, First Middle" and "First Middle Last" formats
                                                const raw = selectedStudent.name.trim();
                                                let lastName = '';
                                                let firstMiddle = '';
                                                if (raw.includes(',')) {
                                                  const parts = raw.split(',');
                                                  lastName = parts[0].trim();
                                                  firstMiddle = (parts[1] || '').trim();
                                                } else {
                                                  const nameParts = raw.split(' ');
                                                  lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                                                  firstMiddle = nameParts.slice(0, -1).join(' ');
                                                }

                                                return (
                                                  <>
                                                    <div className="col-span-2 sm:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                      <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        Name
                                                      </p>
                                                      <div className="flex flex-col sm:flex-row gap-2 w-full max-w-md items-start">
                                                        <div className="flex-1">
                                                          <div className="flex flex-col sm:flex-row gap-2">
                                                            <Input
                                                              value={editFirstMiddleName !== null ? editFirstMiddleName : firstMiddle}
                                                              onChange={e => setEditFirstMiddleName(e.target.value)}
                                                              className="font-medium w-full sm:w-1/2 text-sm sm:text-base"
                                                              placeholder="First & Middle Name"
                                                              disabled={!editingStudentInfo}
                                                            />
                                                            <Input
                                                              value={editLastName !== null ? editLastName : lastName}
                                                              onChange={e => setEditLastName(e.target.value)}
                                                              placeholder="Last Name"
                                                              className="font-medium w-full sm:w-1/2 text-sm sm:text-base"
                                                              disabled={!editingStudentInfo}
                                                            />
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </div>
                                                    <div className="col-span-2 sm:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex items-start justify-start pl-4">
                                                      <div className="flex flex-col items-start ml-2 gap-2 w-full max-w-xs">
                                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">Special Education needs</p>
                                                        <p className="text-xs leading-relaxed text-muted-foreground">Does this learner have educational needs?</p>
                                                        <div className="flex items-center gap-2">
                                                          <Switch
                                                            className="data-[state=unchecked]:bg-slate-300 data-[state=unchecked]:border data-[state=unchecked]:border-slate-500 data-[state=checked]:bg-blue-600"
                                                            checked={!!selectedStudent.is_special_case}
                                                            onCheckedChange={(v) => setSelectedStudent({ ...selectedStudent, is_special_case: !!v })}
                                                            disabled={!editingStudentInfo}
                                                          />
                                                          <span className="text-sm text-slate-700 dark:text-slate-300">Yes</span>
                                                        </div>
                                                      </div>
                                                    </div>
                                                  </>
                                                );
                                              })()}
                                              <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <Calendar className="w-3 h-3" />
                                                  Birthday
                                                </p>
                                                {editingStudentInfo ? (
                                                  <Input
                                                    type="date"
                                                    value={selectedStudent.birthday || ''}
                                                    onChange={(e) => setSelectedStudent({ ...selectedStudent, birthday: e.target.value })}
                                                    className="font-medium"
                                                    disabled={!editingStudentInfo}
                                                  />
                                                ) : (
                                                  <p className="font-medium">{selectedStudent.birthday}</p>
                                                )}
                                                {shouldShowAge(selectedStudent.level) && (
                                                  <p className="text-sm text-muted-foreground mt-1">
                                                    {calculateAgeWithDecimal(selectedStudent.birthday)} years old
                                                  </p>
                                                )}
                                              </div>
                                              <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <User className="w-3 h-3" />
                                                  Gender
                                                </p>
                                                {editingStudentInfo ? (
                                                  <Select
                                                    value={selectedStudent.gender || ''}
                                                    onValueChange={(value) => setSelectedStudent({ ...selectedStudent, gender: value })}
                                                    disabled={!editingStudentInfo}
                                                  >
                                                    <SelectTrigger className="h-10">
                                                      <SelectValue placeholder="Select Gender" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                      <SelectItem value="Male">Male</SelectItem>
                                                      <SelectItem value="Female">Female</SelectItem>
                                                    </SelectContent>
                                                  </Select>
                                                ) : (
                                                  <p className="font-medium">{selectedStudent.gender}</p>
                                                )}
                                              </div>
                                              <div className="col-span-2 md:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col items-start">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <MapPin className="w-3 h-3" />
                                                  Address
                                                </p>
                                                <Input
                                                  value={selectedStudent.address || ''}
                                                  onChange={e => setSelectedStudent({ ...selectedStudent, address: e.target.value })}
                                                  placeholder="No address provided"
                                                  className="font-medium w-full"
                                                  disabled={!editingStudentInfo}
                                                />
                                              </div>
                                              <div className="col-span-2 md:col-span-1 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col items-start">
                                                <p className="text-xs text-muted-foreground mb-0.5 flex items-center gap-1">
                                                  <QrCode className="w-3 h-3" />
                                                  RFID UID
                                                </p>
                                                <div className="w-full space-y-1.5">
                                                    <div className="flex flex-col gap-1.5 sm:flex-row">
                                                    <Input
                                                      value={selectedStudent.rfid_uid || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, rfid_uid: normalizeRfidUid(e.target.value) })}
                                                      placeholder="e.g. A1B2C3D4"
                                                      className="font-medium w-full text-sm sm:text-base"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                    <Button
                                                      type="button"
                                                      className="w-full sm:w-auto text-xs sm:text-base"
                                                      variant={rfidConnected ? 'outline' : 'default'}
                                                      onClick={() => {
                                                        if (rfidConnected) {
                                                          void disconnectRfidReader();
                                                        } else {
                                                          void connectRfidReader();
                                                        }
                                                      }}
                                                      disabled={!editingStudentInfo || connectingRfid || savingStudentInfo}
                                                      className="sm:w-auto gap-2"
                                                    >
                                                      {rfidConnected ? <Wifi className="w-4 h-4" /> : <CloudUpload className="w-4 h-4" />}
                                                      {connectingRfid ? 'Connecting...' : rfidConnected ? 'Disconnect' : 'Tap RFID'}
                                                    </Button>
                                                  </div>
                                                  <p className="text-xs text-muted-foreground leading-snug">
                                                    {editingStudentInfo
                                                      ? 'Tap an RFID tag to auto-fill the UID field. Only hex characters are saved.'
                                                      : 'Click Edit Info first, then connect the RFID reader to auto-fill the UID.'}
                                                  </p>
                                                  <p className="text-xs text-muted-foreground flex items-center gap-1 leading-snug">
                                                    {rfidConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                                                    {rfidConnected ? 'RFID reader connected' : 'RFID reader not connected'}
                                                  </p>
                                                </div>
                                              </div>
                                              <div className="col-span-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg flex flex-col sm:flex-row justify-between items-start gap-4">
                                                <div className="space-y-1.5 w-full max-w-md">
                                                  <p className="text-xs text-muted-foreground mb-1">Parent/Guardian Information</p>
                                                  <div className="flex items-center gap-2 w-full">
                                                    <User className="w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                      value={selectedStudent.parentName || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, parentName: e.target.value })}
                                                      placeholder="Parent/Guardian Name"
                                                      className="text-sm font-medium"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                      value={selectedStudent.parentContact || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, parentContact: e.target.value })}
                                                      placeholder="Parent Contact"
                                                      className="text-sm"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                  </div>
                                                  <div className="flex items-center gap-1.5">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                    <Input
                                                      value={selectedStudent.parentEmail || ''}
                                                      onChange={e => setSelectedStudent({ ...selectedStudent, parentEmail: e.target.value })}
                                                      placeholder="Parent Email"
                                                      className="text-sm"
                                                      disabled={!editingStudentInfo}
                                                    />
                                                  </div>
                                                  <div className="border-t border-gray-200 dark:border-gray-600 mt-3 pt-3">
                                                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Additional Parent/Guardian (optional)</p>
                                                    <div className="flex items-center gap-2">
                                                      <User className="w-4 h-4 text-muted-foreground" />
                                                      <Input
                                                        value={selectedStudent.parent2Name || ''}
                                                        onChange={e => setSelectedStudent({ ...selectedStudent, parent2Name: e.target.value })}
                                                        placeholder="Additional Parent/Guardian Name"
                                                        className="text-sm"
                                                        disabled={!editingStudentInfo}
                                                      />
                                                    </div>
                                                    <div className="flex items-center gap-1.5 mt-2">
                                                      <Phone className="w-4 h-4 text-muted-foreground" />
                                                      <Input
                                                        value={selectedStudent.parent2Contact || ''}
                                                        onChange={e => setSelectedStudent({ ...selectedStudent, parent2Contact: e.target.value })}
                                                        placeholder="Additional Parent Contact"
                                                        className="text-sm"
                                                        disabled={!editingStudentInfo}
                                                      />
                                                    </div>
                                                  </div>
                                                </div>

                                                {/* Edit/Confirm Button */}
                                              <div className="flex flex-wrap gap-2 sm:ml-4 shrink-0">
                                                {isAdmin && (
                                                  <>
                                                    <Button size="sm" variant="outline" className="min-w-[120px] border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 w-full sm:w-auto" onClick={() => setTransferDialogOpen(true)}>
                                                      <ArrowRightLeft className="w-4 h-4" />
                                                      Transfer Student
                                                    </Button>
                                                    <Dialog open={transferDialogOpen} onOpenChange={(open) => {
                                                      setTransferDialogOpen(open);
                                                      if (open) {
                                                        setTransferConfirmEmail('');
                                                        setTransferConfirmPassword('');
                                                        setTransferError('');
                                                        setTransferValidationErrors({});
                                                      }
                                                    }}>
                                                      <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                          <DialogTitle className="text-xl font-bold">Transfer student?</DialogTitle>
                                                          <DialogDescription>
                                                            This will mark the student as transferred and hide them from current students.<br />
                                                            Please enter your account email and password to confirm.
                                                          </DialogDescription>
                                                        </DialogHeader>
                                                        <input type="text" name="fakeusernameremembered_transfer" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
                                                        <Input
                                                          type="email"
                                                          name="confirm_email_transfer"
                                                          value={transferConfirmEmail}
                                                          onChange={e => {
                                                            setTransferConfirmEmail(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setTransferValidationErrors((prev) => ({ ...prev, email: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your email"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={transferringStudent}
                                                        />
                                                        {transferValidationErrors.email && <div className="text-red-600 text-sm mt-2">{transferValidationErrors.email}</div>}
                                                        <Input
                                                          type="password"
                                                          name="confirm_password_transfer"
                                                          value={transferConfirmPassword}
                                                          onChange={e => {
                                                            setTransferConfirmPassword(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setTransferValidationErrors((prev) => ({ ...prev, password: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your password"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={transferringStudent}
                                                        />
                                                        {transferValidationErrors.password && <div className="text-red-600 text-sm mt-2">{transferValidationErrors.password}</div>}
                                                        {transferError && <div className="text-red-600 text-sm mt-2">{transferError}</div>}
                                                        <div className="flex gap-3 justify-end mt-6">
                                                          <Button variant="outline" onClick={() => setTransferDialogOpen(false)} disabled={transferringStudent}>Cancel</Button>
                                                          <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleTransferStudent} disabled={transferringStudent}>
                                                            {transferringStudent ? 'Transferring...' : 'Transfer Student'}
                                                          </Button>
                                                        </div>
                                                      </DialogContent>
                                                    </Dialog>
                                                    <Button size="sm" variant="destructive" className="min-w-[120px] w-full sm:w-auto" onClick={() => setDropDialogOpen(true)}>
                                                      Drop Student
                                                    </Button>
                                                    <Dialog open={dropDialogOpen} onOpenChange={(open) => {
                                                      setDropDialogOpen(open);
                                                      if (open) {
                                                        setDropConfirmEmail('');
                                                        setDropConfirmPassword('');
                                                        setDropError('');
                                                        setDropValidationErrors({});
                                                      }
                                                    }}>
                                                      <DialogContent className="max-w-md">
                                                        <DialogHeader>
                                                          <DialogTitle className="text-xl font-bold">Are you sure?</DialogTitle>
                                                          <DialogDescription>
                                                            This will permanently delete this student from the system.<br />
                                                            Please enter your account email and password to confirm.
                                                          </DialogDescription>
                                                        </DialogHeader>
                                                        {/* Hidden dummy input to confuse browser autofill */}
                                                        <input type="text" name="fakeusernameremembered" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
                                                        <Input
                                                          type="email"
                                                          name="confirm_email_123"
                                                          value={dropConfirmEmail}
                                                          onChange={e => {
                                                            setDropConfirmEmail(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setDropValidationErrors((prev) => ({ ...prev, email: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your email"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={droppingStudent}
                                                        />
                                                        {dropValidationErrors.email && <div className="text-red-600 text-sm mt-2">{dropValidationErrors.email}</div>}
                                                        <Input
                                                          type="password"
                                                          name="confirm_password_123"
                                                          value={dropConfirmPassword}
                                                          onChange={e => {
                                                            setDropConfirmPassword(e.target.value);
                                                            if (e.target.value.trim()) {
                                                              setDropValidationErrors((prev) => ({ ...prev, password: undefined }));
                                                            }
                                                          }}
                                                          placeholder="Enter your password"
                                                          className="mt-2"
                                                          autoComplete="new-password"
                                                          disabled={droppingStudent}
                                                        />
                                                        {dropValidationErrors.password && <div className="text-red-600 text-sm mt-2">{dropValidationErrors.password}</div>}
                                                        {dropError && <div className="text-red-600 text-sm mt-2">{dropError}</div>}
                                                        <div className="flex gap-3 justify-end mt-6">
                                                          <Button variant="outline" onClick={() => setDropDialogOpen(false)} disabled={droppingStudent}>Cancel</Button>
                                                          <Button variant="destructive" onClick={handleDropStudent} disabled={droppingStudent}>
                                                            {droppingStudent ? 'Dropping...' : 'Drop Student'}
                                                          </Button>
                                                        </div>
                                                      </DialogContent>
                                                    </Dialog>
                                                  </>
                                                )}
                                                {isAdmin && !editingStudentInfo ? (
                                                  <Button size="sm" variant="outline" className="min-w-[100px] w-full sm:w-auto" onClick={() => {
                                                    // When entering edit mode, buffer the last name (support comma format)
                                                        const raw = selectedStudent.name.trim();
                                                        let bufLast = '';
                                                        let bufFirstMiddle = '';
                                                        if (raw.includes(',')) {
                                                          const parts = raw.split(',');
                                                          bufLast = parts[0].trim();
                                                          bufFirstMiddle = (parts[1] || '').trim();
                                                        } else {
                                                          const nameParts = raw.split(' ');
                                                          bufLast = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';
                                                          bufFirstMiddle = nameParts.slice(0, -1).join(' ');
                                                        }
                                                        setEditFirstMiddleName(bufFirstMiddle);
                                                        setEditLastName(bufLast);
                                                        setEditingStudentInfo(true);
                                                  }}>
                                                    Edit Info
                                                  </Button>
                                                ) : null}
                                                {isAdmin && editingStudentInfo && (
                                                  <Button size="sm" variant="default" className="min-w-[100px] gap-2 w-full sm:w-auto" onClick={handleConfirmStudentInfo} disabled={savingStudentInfo}>
                                                    {savingStudentInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                                    {savingStudentInfo ? 'Saving...' : 'Confirm'}
                                                  </Button>
                                                )}
                                              </div>
                                            </div>                                           
                                          </div>
                                          </TabsContent>

                                          <TabsContent value="schedule" className="space-y-4 mt-4">
                                            {loadingSchedule ? (
                                              <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                              </div>
                                            ) : (editingSchedule || (studentSchedules[selectedStudent.lrn] || []).length > 0) ? (
                                              <div className="space-y-3">
                                                <div className="flex items-center justify-between">
                                                  <p className="text-sm text-muted-foreground">Manage this student's schedule and notify parents when updated.</p>
                                                  {!editingSchedule ? (
                                                    <Button variant="outline" size="sm" onClick={startEditingSchedule}>
                                                      Edit Schedule
                                                    </Button>
                                                  ) : (
                                                    <div className="flex items-center gap-2">
                                                      <Button variant="outline" size="sm" onClick={addScheduleDraftRow}>
                                                        Add Row
                                                      </Button>
                                                      <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => {
                                                          setEditingSchedule(false);
                                                          setScheduleDraft((studentSchedules[selectedStudent.lrn] || []).map((row) => ({
                                                            id: row.id,
                                                            day_of_week: row.day_of_week,
                                                            days_of_week: [row.day_of_week],
                                                            day_number: row.day_number,
                                                            subject: row.subject,
                                                            start_time: row.start_time?.slice(0, 5) || '08:00',
                                                            end_time: row.end_time?.slice(0, 5) || '09:00',
                                                            room: row.room || '',
                                                            teacher_name: row.teacher_name || '',
                                                          })));
                                                        }}
                                                      >
                                                        Cancel
                                                      </Button>
                                                      <Button size="sm" onClick={handleSaveScheduleChanges} disabled={savingScheduleChanges}>
                                                        {savingScheduleChanges ? 'Saving...' : 'Save Changes'}
                                                      </Button>
                                                    </div>
                                                  )}
                                                </div>

                                                <div className="space-y-3 rounded-xl border p-3 md:p-4">
                                                  {(editingSchedule ? scheduleDraft : (studentSchedules[selectedStudent.lrn] || [])).map((schedule) => (
                                                    <div
                                                      key={schedule.id}
                                                      className="rounded-2xl border bg-background/80 p-3 shadow-sm"
                                                    >
                                                      {editingSchedule ? (
                                                        <div className="space-y-3">
                                                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[220px_minmax(0,1.2fr)_minmax(0,1fr)]">
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Days</label>
                                                              <div className="flex flex-wrap gap-1.5 rounded-xl border p-1.5">
                                                                {WEEKDAY_OPTIONS.map((day) => {
                                                                  const editableSchedule = schedule as EditableScheduleRow;
                                                                  const selected = getNormalizedDraftDays(editableSchedule).includes(day.label);
                                                                  return (
                                                                    <Button
                                                                      key={day.label}
                                                                      type="button"
                                                                      variant={selected ? 'default' : 'outline'}
                                                                      size="sm"
                                                                      className="h-8 rounded-lg px-2.5"
                                                                      onClick={() => toggleScheduleDraftDay(schedule.id, day.label)}
                                                                    >
                                                                      {day.label.slice(0, 3)}
                                                                    </Button>
                                                                  );
                                                                })}
                                                              </div>
                                                            </div>
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Subject</label>
                                                              <Input
                                                                value={schedule.subject}
                                                                onChange={(e) => updateScheduleDraftRow(schedule.id, 'subject', e.target.value)}
                                                                className="h-11 rounded-xl"
                                                              />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Time</label>
                                                              <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2">
                                                                  <TimePickerInput
                                                                  value={schedule.start_time?.slice(0, 5)}
                                                                    onChange={(value) => updateScheduleDraftRow(schedule.id, 'start_time', value)}
                                                                  className="h-11 rounded-xl"
                                                                />
                                                                <span className="text-sm text-muted-foreground">-</span>
                                                                  <TimePickerInput
                                                                  value={schedule.end_time?.slice(0, 5)}
                                                                    onChange={(value) => updateScheduleDraftRow(schedule.id, 'end_time', value)}
                                                                  className="h-11 rounded-xl"
                                                                />
                                                              </div>
                                                            </div>
                                                          </div>
                                                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Room</label>
                                                              <Input
                                                                value={schedule.room || ''}
                                                                onChange={(e) => updateScheduleDraftRow(schedule.id, 'room', e.target.value)}
                                                                className="h-11 rounded-xl"
                                                                placeholder="Room"
                                                              />
                                                            </div>
                                                            <div className="space-y-1.5">
                                                              <label className="text-xs font-medium text-muted-foreground">Teacher</label>
                                                              <Input
                                                                value={schedule.teacher_name || ''}
                                                                onChange={(e) => updateScheduleDraftRow(schedule.id, 'teacher_name', e.target.value)}
                                                                className="h-11 rounded-xl"
                                                                placeholder="Teacher"
                                                              />
                                                            </div>
                                                            <div className="flex items-end">
                                                              <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => removeScheduleDraftRow(schedule.id)}
                                                                disabled={scheduleDraft.length <= 1}
                                                                className="h-11 rounded-xl px-4"
                                                              >
                                                                Remove
                                                              </Button>
                                                            </div>
                                                          </div>
                                                        </div>
                                                      ) : (
                                                        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Day</p>
                                                            <p className="mt-1 font-medium">{schedule.day_of_week}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Subject</p>
                                                            <p className="mt-1 font-medium">{schedule.subject}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Time</p>
                                                            <p className="mt-1 font-medium">{`${formatTime12h(schedule.start_time)} - ${formatTime12h(schedule.end_time)}`}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Room</p>
                                                            <p className="mt-1 font-medium">{schedule.room || '—'}</p>
                                                          </div>
                                                          <div>
                                                            <p className="text-xs font-medium text-muted-foreground">Teacher</p>
                                                            <p className="mt-1 font-medium">{schedule.teacher_name || '—'}</p>
                                                          </div>
                                                        </div>
                                                      )}
                                                    </div>
                                                  ))}
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-3 text-center py-8 text-muted-foreground">
                                                <CalendarDays className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No schedule available for this student</p>
                                                <div>
                                                  <Button variant="outline" size="sm" onClick={startEditingSchedule}>
                                                    Add Schedule
                                                  </Button>
                                                </div>
                                              </div>
                                            )}
                                          </TabsContent>

                                          <TabsContent value="attendance" className="space-y-4 mt-4">
                                            {behavioralData && Array.isArray(behavioralData.attendance) && behavioralData.attendance.length > 0 ? (
                                              <div className="rounded-lg border border-slate-200/60 dark:border-slate-800/50 p-4 bg-white/60 dark:bg-slate-900/30">
                                                <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                                                  <Clock className="w-5 h-5 text-blue-600" />
                                                  Attendance History
                                                </h3>
                                                <div className="overflow-x-auto">
                                                  <table className="w-full text-sm">
                                                    <thead>
                                                      <tr className="text-left text-xs text-muted-foreground">
                                                        <th className="px-3 py-2">Date</th>
                                                        <th className="px-3 py-2">Status</th>
                                                        <th className="px-3 py-2">Check In</th>
                                                        <th className="px-3 py-2">Check Out</th>
                                                      </tr>
                                                    </thead>
                                                    <tbody>
                                                      {behavioralData.attendance
                                                        .slice()
                                                        .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                                        .map((entry: any) => {
                                                          const rawStatus = (entry.attendance_status || '').toLowerCase();
                                                          const statusLabel = rawStatus
                                                            ? (rawStatus === 'present' ? 'Present' : rawStatus === 'absent' ? 'Absent' : rawStatus === 'holiday' ? 'Holiday' : rawStatus === 'cancelled_class' ? 'Cancelled' : rawStatus === 'late' ? 'Late' : rawStatus)
                                                            : (entry.is_present ? 'Present' : 'Absent');
                                                          const noClass = isNoClassStatus(entry.attendance_status || entry.attendanceStatus);
                                                          const badgeClass = rawStatus === 'holiday' ? 'bg-sky-100 text-sky-700' : rawStatus === 'cancelled_class' ? 'bg-slate-100 text-slate-700' : rawStatus === 'absent' ? 'bg-rose-100 text-rose-700' : rawStatus === 'late' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' : 'bg-emerald-100 text-emerald-700';
                                                                                                                    // Determine late status using schedule entry time or level-based threshold
                                                          let isLate = false;
                                                          if (!noClass && entry.check_in_time && entry.is_present !== false) {
                                                            const entryTimeFromSchedule = behavioralData?.entryTime;
                                                            if (entryTimeFromSchedule) {
                                                              isLate = isLateCheckIn(entry.check_in_time, entryTimeFromSchedule);
                                                            } else {
                                                              // Fallback to level-based threshold if schedule entry time not available
                                                              const lateThreshold = getLateThreshold(selectedStudent?.level);
                                                              isLate = isLateCheckIn(entry.check_in_time, lateThreshold);
                                                            }
                                                          }
                                                          return (
                                                            <tr key={`${entry.date}-${entry.student_lrn}`} className="border-t border-slate-100 dark:border-slate-800">
                                                              <td className="px-3 py-2">{new Date(entry.date).toLocaleDateString()}</td>
                                                              <td className="px-3 py-2">
                                                                <div className="flex flex-col gap-1">
                                                                  <Badge className={`${badgeClass} border-0 py-1 px-2`}>{statusLabel}</Badge>
                                                                  {isLate && rawStatus !== 'late' && (
                                                                    <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 py-1 px-2 text-xs w-fit">
                                                                      Late
                                                                    </Badge>
                                                                  )}
                                                                </div>
                                                              </td>
                                                              <td className="px-3 py-2">{noClass ? '--' : (entry.check_in_time ? formatTime12h(entry.check_in_time) : '--')}</td>
                                                              <td className="px-3 py-2">{noClass ? '--' : (entry.check_out_time ? formatTime12h(entry.check_out_time) : '--')}</td>
                                                            </tr>
                                                          );
                                                        })}
                                                    </tbody>
                                                  </table>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="text-center py-8 text-muted-foreground">
                                                <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No attendance records available</p>
                                              </div>
                                            )}
                                          </TabsContent>

                                          <TabsContent value="excuse-letters" className="space-y-4 mt-4">
                                            {loadingExcuseLetters ? (
                                              <div className="flex justify-center py-8">
                                                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                                              </div>
                                            ) : (excuseLettersByLrn[selectedStudent.lrn] || []).length > 0 ? (
                                              <div className="space-y-3">
                                                {(excuseLettersByLrn[selectedStudent.lrn] || []).map((letter) => {
                                                  const meta = letter.meta || {};
                                                  const excuseType = String(meta.excuse_status || '').toLowerCase();
                                                  const excuseDate = String(meta.excuse_date || '').slice(0, 10);
                                                  const parentName = String(meta.parent_name || letter.created_by || 'Parent');
                                                  const reason = String(meta.excuse_reason || '').trim();
                                                  const isHighlighted = Boolean(highlightExcuseDate) && excuseDate === highlightExcuseDate.slice(0, 10);

                                                  return (
                                                    <div
                                                      key={letter.id}
                                                      className={`rounded-xl border p-4 space-y-2 ${
                                                        isHighlighted
                                                          ? 'border-blue-400 bg-blue-50/80 dark:border-blue-500 dark:bg-blue-950/30'
                                                          : 'border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-900/40'
                                                      }`}
                                                    >
                                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                                        <div>
                                                          <p className="font-semibold text-slate-900 dark:text-white">{letter.title || 'Parent Excuse Letter'}</p>
                                                          <p className="text-xs text-muted-foreground">
                                                              Submitted by {parentName} on {new Date(letter.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at {formatTime12h(new Date(letter.created_at))}
                                                          </p>
                                                        </div>
                                                        <div className="flex items-center gap-2">
                                                          <Badge className={excuseType === 'late' ? 'bg-amber-100 text-amber-700 border-0' : 'bg-red-100 text-red-700 border-0'}>
                                                            {excuseType === 'late' ? 'Late' : 'Absent'}
                                                          </Badge>
                                                          <Badge variant="outline">{excuseDate || 'No date'}</Badge>
                                                        </div>
                                                      </div>
                                                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-wrap">
                                                        {reason || letter.message || 'No explanation provided.'}
                                                      </p>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            ) : (
                                              <div className="text-center py-8 text-muted-foreground">
                                                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                                <p>No excuse letters submitted for this student.</p>
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
                                                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
                                                  {/* Total Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Total Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-blue-600 dark:text-blue-400">{behavioralData.stats.totalEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">all behavioral events</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <Activity className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
                                                    </Card>
                                                  </div>
                                                  {/* Positive Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Positive Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-emerald-600 dark:text-emerald-400">{behavioralData.stats.positiveEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">reinforcing progress</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <Heart className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
                                                    </Card>
                                                  </div>
                                                  {/* Negative Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-rose-500/10 dark:bg-rose-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-rose-500/5 dark:bg-rose-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Negative Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-rose-600 dark:text-rose-400">{behavioralData.stats.negativeEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">major/critical incidents</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-rose-500 to-rose-600 text-white items-center justify-center shadow-lg shadow-rose-500/25 dark:shadow-rose-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <AlertOctagon className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-rose-400 to-rose-600 dark:from-rose-500 dark:to-rose-700" />
                                                    </Card>
                                                  </div>
                                                  {/* Minor Events Card */}
                                                  <div>
                                                    <Card className="border-0 bg-linear-to-br from-yellow-50 to-white dark:from-yellow-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
                                                      <div className="absolute top-0 right-0 w-16 h-16 bg-yellow-500/10 dark:bg-yellow-400/5 rounded-full -mr-6 -mt-6 group-hover:scale-150 transition-transform duration-500" />
                                                      <div className="absolute bottom-0 left-0 w-10 h-10 bg-yellow-500/5 dark:bg-yellow-400/5 rounded-full -ml-4 -mb-4 group-hover:scale-150 transition-transform duration-500" />
                                                      <CardContent className="p-3 sm:p-4 flex items-center justify-between relative z-10">
                                                        <div>
                                                          <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 font-semibold mb-1 uppercase tracking-wider leading-tight">Minor Events</p>
                                                          <div className="text-lg sm:text-xl font-bold text-yellow-600 dark:text-yellow-400">{behavioralData.stats.minorEvents}</div>
                                                          <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 leading-tight">minor incidents</p>
                                                        </div>
                                                        <div className="hidden sm:flex w-8 h-8 rounded-xl bg-linear-to-br from-yellow-500 to-yellow-600 text-white items-center justify-center shadow-lg shadow-yellow-500/25 dark:shadow-yellow-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                                                          <Minus className="w-5 h-5" />
                                                        </div>
                                                      </CardContent>
                                                      <div className="h-1 w-full bg-linear-to-r from-yellow-400 to-yellow-600 dark:from-yellow-500 dark:to-yellow-700" />
                                                    </Card>
                                                  </div>
                                                </div>

                                                {/* Recent Events */}
                                                <div>
                                                  <h3 className="font-semibold mb-3 flex items-center gap-2 px-1">
                                                    <Bell className="w-4 h-4" />
                                                    Recent Events
                                                  </h3>
                                                  {behavioralData.events.length === 0 ? (
                                                    <p className="text-center py-4 text-muted-foreground">No recent events</p>
                                                  ) : (
                                                    <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                                                      {behavioralData.events.slice(0, 5).map((event: any) => (
                                                        <div
                                                          key={event.id}
                                                          className={`rounded-xl border px-4 py-3 text-sm shadow-sm ${getBehaviorEventVisuals(event.severity).card}`}
                                                        >
                                                          <div className="flex items-center justify-between gap-4">
                                                            <div className="flex items-center gap-2 min-w-0">
                                                              <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${getBehaviorEventVisuals(event.severity).iconWrap}`}>
                                                                {(() => {
                                                                  const EventIcon = getBehaviorEventVisuals(event.severity).Icon;
                                                                  return <EventIcon className="h-3.5 w-3.5" />;
                                                                })()}
                                                              </div>
                                                              <div className="min-w-0">
                                                                <p className={`font-semibold leading-tight truncate ${getBehaviorEventVisuals(event.severity).title}`}>
                                                                  {humanizeEventType(event.event_type) || 'Behavior Event'}
                                                                </p>
                                                                <p className="text-[11px] text-muted-foreground">
                                                                  {new Date(event.event_date).toLocaleDateString(undefined, {
                                                                    weekday: 'short',
                                                                    month: 'short',
                                                                    day: 'numeric',
                                                                    year: 'numeric',
                                                                  })}
                                                                  {event.event_time ? ` at ${event.event_time}` : ''}
                                                                </p>
                                                              </div>
                                                            </div>
                                                            <Badge className={`uppercase tracking-wide text-[9px] px-2 py-0.5 font-semibold border shadow-sm ${getBehaviorEventVisuals(event.severity).badge}`}>
                                                              {event.severity || 'event'}
                                                            </Badge>
                                                          </div>

                                                          <p className="mt-3 text-slate-700 dark:text-slate-200 leading-relaxed text-[13px]">
                                                            {event.description || 'No description provided.'}
                                                          </p>

                                                          <div className={`mt-3 flex flex-wrap items-center gap-2 text-[11px] ${getBehaviorEventVisuals(event.severity).meta}`}>
                                                            <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                              <Calendar className="h-3 w-3" />
                                                              <span>{new Date(event.event_date).toLocaleDateString()}</span>
                                                            </div>
                                                            {event.event_categories?.name ? (
                                                              <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                                <FileText className="h-3 w-3" />
                                                                <span>Category: {event.event_categories.name}</span>
                                                              </div>
                                                            ) : null}
                                                            {event.location ? (
                                                              <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                                <MapPin className="h-3 w-3" />
                                                                <span>Location: {event.location}</span>
                                                              </div>
                                                            ) : null}
                                                            {event.reported_by ? (
                                                              <div className="flex items-center gap-1.5 rounded-md border border-current/20 bg-white/50 dark:bg-slate-900/20 px-2 py-1">
                                                                <User className="h-3 w-3" />
                                                                <span>Reported by: {event.reported_by}</span>
                                                              </div>
                                                            ) : null}
                                                          </div>
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
                                                  value={selectedStudent.lrn && selectedStudent.lrn.trim() !== '' ? selectedStudent.lrn : selectedStudent.name}
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
                                    </div>
                                  </DialogContent>
                                </Dialog>
                              </TableCell>
                            </motion.tr>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {summerStudents.length > 0 && (
                  <div className="flex items-center justify-between p-3 border-t border-orange-200/60 dark:border-orange-700/30">
                    <div className="text-sm text-muted-foreground">
                      Showing {summerShowingFrom}-{summerShowingTo} of {summerStudents.length}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSummerCurrentPage((p) => Math.max(1, p - 1))}
                        disabled={summerCurrentPage === 1}
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <div className="text-sm">
                        Page {summerCurrentPage} / {totalSummerPages}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSummerCurrentPage((p) => Math.min(totalSummerPages, p + 1))}
                        disabled={summerCurrentPage === totalSummerPages}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </DashboardLayout>
  );
}
