'use client';

import { Suspense, useState, useEffect, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { DashboardLayout } from '@/components/dashboard-layout';
import { useHeatmapZones } from '@/lib/heatmap-zones-context';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  AlertTriangle, 
  CheckCircle, 
  Info, 
  XCircle, 
  Plus, 
  Search, 
  Filter,
  Calendar,
  User,
  FileText,
  ImagePlus,
  Download,
  Eye,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Bell,
  Clock,
  MapPin,
  Users,
  Award,
  AlertOctagon,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Phone,
  Mail,
  BookOpen,
  Heart,
  Star,
  Zap,
  Activity,
  PieChart,
  BarChart3,
  ArrowUpDown,
  Wifi,
  WifiOff,
  CloudUpload
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { createRoleNotification } from '@/lib/role-notifications';
import { buildEarlyPreventionNote } from '@/lib/prevention-notes';
import { MLDashboard } from '@/components/ml-dashboard';
import BehavioralEventsSkeleton from '@/components/behavioral-events-skeleton';
import { getOfflineQueueCount } from '@/lib/offline-secure-queue';
import { queueBehaviorEvent, syncOfflineQueue } from '@/lib/offline-sync';
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
  ResponsiveContainer 
} from 'recharts';

type GuidanceStatus = 'pending_guidance' | 'approved_for_ml' | 'denied_by_guidance';

interface BehavioralEvent {
  id: number;
  student_lrn: string;
  event_type: string;
  severity: string;
  description: string;
  location: string;
  reported_by: string;
  event_date: string;
  event_time: string;
  parent_notified: boolean;
  follow_up_required: boolean;
  guidance_status?: GuidanceStatus;
  guidance_reviewed_by?: string | null;
  guidance_reviewed_at?: string | null;
  guidance_intervention_notes?: string | null;
  proof_image_url?: string | null;
  action_taken?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
  students?: {
    name: string;
    level: string;
  };
  event_categories?: {
    name: string;
    category_type: string;
    color_code: string;
  };
  report_group_id?: string | null;
  report_student_count?: number;
  report_student_names?: string[];
}

interface EventCategory {
  id: number;
  name: string;
  category_type: string;
  severity_level: string;
  color_code: string;
  notify_parent: boolean;
}

interface StudentRecord {
  id: number;
  lrn: string;
  name: string;
  level: string;
  status: string;
  parent_name: string | null;
  parent_contact: string | null;
  parent_email: string | null;
}

interface AchievementRecord {
  id: number;
  student_lrn: string;
  achievement_type: string;
  category_type?: string;
  description: string;
  notes?: string | null;
  reported_by: string;
  achievement_date: string;
  achievement_time: string;
  created_at?: string;
  updated_at?: string;
  students?: {
    name: string;
    level: string;
  };
}

interface TeacherOption {
  id: string;
  name: string;
  email: string;
}

interface CategoryTemplate {
  id: string;
  name: string;
  categoryType: string;
  severity: 'positive' | 'neutral' | 'minor' | 'major' | 'critical';
  levelScopes?: Array<'early' | 'grade' | 'all'>;
}

const REPORT_GROUP_ID_PREFIX = '[GROUP_REPORT_ID:';
const REPORT_GROUP_COUNT_PREFIX = '[GROUP_REPORT_COUNT:';
const EARLY_LEVEL_KEYWORDS = ['kinder', 'pre-k', 'prek', 'nursery', 'toddler'];
const SYSTEM_GRADE_LEVELS = [
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

const getStudentLevelScope = (level?: string | null): 'early' | 'grade' => {
  const normalized = (level || '').toLowerCase();
  return EARLY_LEVEL_KEYWORDS.some((keyword) => normalized.includes(keyword)) ? 'early' : 'grade';
};

const getStudentSelectorValue = (student: Pick<StudentRecord, 'id' | 'lrn'>): string => {
  const lrn = (student.lrn || '').trim();
  return lrn || `id:${student.id}`;
};

const toDisplayLrn = (lrn?: string | null): string => {
  const value = (lrn || '').trim();
  return /^temp-\d+$/i.test(value) ? '' : value;
};

const extractReportGroupId = (notes?: string | null): string | null => {
  if (!notes) return null;
  const match = notes.match(/\[GROUP_REPORT_ID:([^\]]+)\]/i);
  return match?.[1]?.trim() || null;
};

const removeReportMetadataFromNotes = (notes?: string | null): string => {
  if (!notes) return '';
  return notes
    .split('\n')
    .filter(
      (line) =>
        !line.trim().toUpperCase().startsWith(REPORT_GROUP_ID_PREFIX) &&
        !line.trim().toUpperCase().startsWith(REPORT_GROUP_COUNT_PREFIX)
    )
    .join('\n')
    .trim();
};

const SEVERITY_COLORS = {
  positive: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-700', icon: CheckCircle, gradient: 'from-emerald-500 to-emerald-400' },
  neutral: { bg: 'bg-gray-100 dark:bg-gray-700/50', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-600', icon: Minus, gradient: 'from-gray-500 to-gray-400' },
  minor: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-400', border: 'border-yellow-200 dark:border-yellow-700', icon: Info, gradient: 'from-yellow-500 to-yellow-400' },
  major: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-700', icon: AlertTriangle, gradient: 'from-orange-500 to-orange-400' },
  critical: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', border: 'border-red-200 dark:border-red-700', icon: XCircle, gradient: 'from-red-500 to-red-400' }
};

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const LOCATION_OPTIONS = [
  'Kinder Room',
  'Grade 1 Room',
  'Grade 2 Room',
  'Grade 3 Room',
  'Grade 4 Room',
  'Grade 5 Room',
  'Grade 6 Room',
  'Grade 7 Room',
  'Grade 8 Room',
  'Gym Area',
  'Cafeteria',
  'Sensory Room',
  'Dance Room',
  'Library',
  'Science Laboratory',
  'Music Room',
  'Entrance / Gate',
];

const EXTENDED_ACHIEVEMENT_TYPES: Array<{ id: string; name: string; categoryType: string }> = [
  { id: 'perfect-attendance', name: 'Perfect Attendance', categoryType: 'Attendance' },
  { id: 'most-improved-student', name: 'Most Improved Student', categoryType: 'Academic' },
  { id: 'reading-milestone', name: 'Reading Milestone', categoryType: 'Academic' },
  { id: 'math-mastery', name: 'Math Mastery', categoryType: 'Academic' },
  { id: 'science-excellence', name: 'Science Excellence', categoryType: 'Academic' },
  { id: 'leadership-award', name: 'Leadership Award', categoryType: 'Leadership' },
  { id: 'peer-support', name: 'Peer Support Recognition', categoryType: 'Social' },
  { id: 'kindness-award', name: 'Kindness Award', categoryType: 'Values' },
  { id: 'respect-award', name: 'Respect Award', categoryType: 'Values' },
  { id: 'teamwork-award', name: 'Teamwork Award', categoryType: 'Values' },
  { id: 'good-conduct', name: 'Good Conduct', categoryType: 'Behavior' },
  { id: 'class-participation', name: 'Outstanding Class Participation', categoryType: 'Behavior' },
  { id: 'homework-consistency', name: 'Homework Consistency', categoryType: 'Academic' },
  { id: 'creative-project', name: 'Creative Project Recognition', categoryType: 'Creativity' },
  { id: 'sportsmanship', name: 'Sportsmanship Award', categoryType: 'Sports' },
  { id: 'community-service', name: 'Community Service Recognition', categoryType: 'Service' },
  { id: 'digital-literacy', name: 'Digital Literacy Achievement', categoryType: 'Academic' },
  { id: 'cleanliness-award', name: 'Cleanliness and Discipline Award', categoryType: 'Values' },
  { id: 'best-in-communication', name: 'Best in Communication', categoryType: 'Leadership' },
  { id: 'special-recognition', name: 'Special Recognition', categoryType: 'General' },
];

const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  // =========================
  // GRADE SCHOOL (CORE)
  // =========================
  { id: 'classroom-disruption', name: 'Classroom Disruption', categoryType: 'Behavior', severity: 'major', levelScopes: ['grade'] },
  { id: 'off-task-behavior', name: 'Off-Task Behavior', categoryType: 'Behavior', severity: 'minor', levelScopes: ['grade'] },
  { id: 'insubordination', name: 'Insubordination', categoryType: 'Discipline', severity: 'major', levelScopes: ['grade'] },
  { id: 'unauthorized-leaving', name: 'Leaving Class Without Permission', categoryType: 'Discipline', severity: 'major', levelScopes: ['grade'] },

  // =========================
  // ACADEMIC
  // =========================
  { id: 'academic-dishonesty', name: 'Academic Dishonesty', categoryType: 'Academic', severity: 'major', levelScopes: ['grade'] },
  { id: 'plagiarism', name: 'Plagiarism', categoryType: 'Academic', severity: 'major', levelScopes: ['grade'] },
  { id: 'cheating-exam', name: 'Cheating During Exam', categoryType: 'Academic', severity: 'major', levelScopes: ['grade'] },
  { id: 'incomplete-homework', name: 'Incomplete Homework', categoryType: 'Academic', severity: 'minor', levelScopes: ['grade'] },
  { id: 'late-submission', name: 'Late Submission', categoryType: 'Academic', severity: 'minor', levelScopes: ['grade'] },
  { id: 'lack-of-participation', name: 'Lack of Participation', categoryType: 'Academic', severity: 'minor', levelScopes: ['grade'] },

  // =========================
  // SOCIAL / PEER
  // =========================
  { id: 'peer-conflict', name: 'Peer Conflict', categoryType: 'Social', severity: 'minor', levelScopes: ['all'] },
  { id: 'bullying-report', name: 'Bullying Report', categoryType: 'Safety', severity: 'critical', levelScopes: ['grade'] },
  { id: 'cyberbullying', name: 'Cyberbullying', categoryType: 'Safety', severity: 'critical', levelScopes: ['grade'] },
  { id: 'verbal-abuse', name: 'Verbal Abuse', categoryType: 'Safety', severity: 'major', levelScopes: ['grade'] },
  { id: 'physical-aggression', name: 'Physical Aggression', categoryType: 'Safety', severity: 'critical', levelScopes: ['grade'] },
  { id: 'exclusion-behavior', name: 'Exclusion / Social Isolation Behavior', categoryType: 'Social', severity: 'minor', levelScopes: ['grade'] },

  // =========================
  // DISCIPLINE / RULES
  // =========================
  { id: 'uniform-violation', name: 'Uniform Violation', categoryType: 'Discipline', severity: 'minor', levelScopes: ['grade'] },
  { id: 'tardiness', name: 'Tardiness', categoryType: 'Discipline', severity: 'minor', levelScopes: ['all'] },
  { id: 'unauthorized-absence', name: 'Unauthorized Absence', categoryType: 'Discipline', severity: 'major', levelScopes: ['all'] },
  { id: 'device-misuse', name: 'Improper Use of Device', categoryType: 'Discipline', severity: 'minor', levelScopes: ['grade'] },
  { id: 'property-damage', name: 'Property Damage', categoryType: 'Discipline', severity: 'major', levelScopes: ['all'] },
  { id: 'theft', name: 'Theft', categoryType: 'Discipline', severity: 'critical', levelScopes: ['all'] },

  // =========================
  // SAFETY / CRITICAL
  // =========================
  { id: 'substance-use', name: 'Substance Use', categoryType: 'Safety', severity: 'critical', levelScopes: ['grade'] },
  { id: 'weapon-possession', name: 'Weapon Possession', categoryType: 'Safety', severity: 'critical', levelScopes: ['grade'] },

  // =========================
  // POSITIVE BEHAVIOR
  // =========================
  { id: 'respectful-conduct', name: 'Respectful Conduct', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['all'] },
  { id: 'leadership-initiative', name: 'Leadership Initiative', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['grade'] },
  { id: 'teamwork-excellence', name: 'Teamwork Excellence', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['grade'] },
  { id: 'helping-others', name: 'Helping Others', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['all'] },
  { id: 'active-participation', name: 'Active Participation', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['grade'] },
  { id: 'responsibility', name: 'Responsibility and Accountability', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['all'] },
  { id: 'kindness', name: 'Kindness / Empathy', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['all'] },

  // =========================
  // INTERVENTION / SUPPORT
  // =========================
  { id: 'counseling-referral', name: 'Counseling Referral', categoryType: 'Intervention', severity: 'minor', levelScopes: ['all'] },
  { id: 'parent-conference', name: 'Parent Conference Required', categoryType: 'Intervention', severity: 'minor', levelScopes: ['all'] },
  { id: 'behavioral-contract', name: 'Behavioral Contract', categoryType: 'Intervention', severity: 'minor', levelScopes: ['grade'] },
  { id: 'guidance-session', name: 'Guidance Session', categoryType: 'Intervention', severity: 'minor', levelScopes: ['all'] },

  // =========================
  // EARLY LEARNERS
  // =========================
  { id: 'playground-redirection', name: 'Playground Redirection', categoryType: 'Behavior', severity: 'minor', levelScopes: ['early'] },
  { id: 'tantrum-episode', name: 'Tantrum Episode', categoryType: 'Behavior', severity: 'major', levelScopes: ['early'] },
  { id: 'sharing-difficulty', name: 'Sharing Difficulty', categoryType: 'Social', severity: 'minor', levelScopes: ['early'] },
  { id: 'separation-anxiety', name: 'Separation Anxiety', categoryType: 'Behavior', severity: 'minor', levelScopes: ['early'] },
  { id: 'attention-difficulty', name: 'Attention Difficulty', categoryType: 'Behavior', severity: 'minor', levelScopes: ['early'] },
  { id: 'sensory-overload', name: 'Sensory Overload', categoryType: 'Behavior', severity: 'minor', levelScopes: ['early'] },
  { id: 'transition-support', name: 'Transition Support Needed', categoryType: 'Intervention', severity: 'minor', levelScopes: ['early'] },
  { id: 'toilet-training-support', name: 'Toilet Training Support Needed', categoryType: 'Intervention', severity: 'minor', levelScopes: ['early'] },

  // Positive (Early)
  { id: 'routine-following', name: 'Routine Following', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['early'] },
  { id: 'circle-time-participation', name: 'Circle Time Participation', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['early'] },
  { id: 'positive-sharing', name: 'Positive Sharing', categoryType: 'Positive Behavior', severity: 'positive', levelScopes: ['early'] },

  // =========================
  // GENERAL / OTHER
  // =========================
  { id: 'health-concern', name: 'Health Concern Observed', categoryType: 'Other', severity: 'minor', levelScopes: ['all'] },
  { id: 'transportation-delay', name: 'Transportation Delay Incident', categoryType: 'Other', severity: 'neutral', levelScopes: ['all'] },
  { id: 'visitor-related-incident', name: 'Visitor Related Incident', categoryType: 'Other', severity: 'minor', levelScopes: ['all'] },
  { id: 'unclassified-incident', name: 'Unclassified / Other Incident', categoryType: 'Other', severity: 'minor', levelScopes: ['all'] },
];

// Enforce consistent layout structure for behavioral events
import { HeatmapZonesProvider } from '@/lib/heatmap-zones-context';

export default function BehavioralEventsPage() {
  const [zones, setZones] = useState([]);
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('sgcdc-school-heatmap-zones-v3');
      try {
        setZones(stored ? JSON.parse(stored) : []);
      } catch {
        setZones([]);
      }
    }
  }, []);
  return (
    <HeatmapZonesProvider initialZones={zones}>
      <Suspense fallback={<BehavioralEventsSkeleton />}>
        <BehavioralEventsPageContent />
      </Suspense>
    </HeatmapZonesProvider>
  );
}

function BehavioralEventsPageContent() {
  const isMobile = useIsMobile();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<BehavioralEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<BehavioralEvent[]>([]);
  const [achievements, setAchievements] = useState<AchievementRecord[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [eventCategoryFilter, setEventCategoryFilter] = useState('all');

  // When eventCategoryFilter changes, clear event_type if it is not valid for the new category
  useEffect(() => {
    if (eventCategoryFilter === 'all') return;
    // Find the current selected event_type option
    const valid = eventTypeOptions.some(opt => opt.name === formData.event_type);
    if (!valid && formData.event_type) {
      setFormData(prev => ({ ...prev, event_type: '' }));
    }
  }, [eventCategoryFilter]);
  const [studentLevelFilter, setStudentLevelFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<BehavioralEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isAchievementDialogOpen, setIsAchievementDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'created_at', direction: 'desc' });
  const [showEventLog, setShowEventLog] = useState(false);
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [guidanceReviewNote, setGuidanceReviewNote] = useState('');
  const [guidanceSubmitting, setGuidanceSubmitting] = useState(false);
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [studentPickerOpen, setStudentPickerOpen] = useState(false);
  const [eventTypePickerOpen, setEventTypePickerOpen] = useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const [achievementSubmitting, setAchievementSubmitting] = useState(false);
  const [achievementStudentPickerOpen, setAchievementStudentPickerOpen] = useState(false);
  const [achievementStudentSearchQuery, setAchievementStudentSearchQuery] = useState('');
  const [achievementValidationErrors, setAchievementValidationErrors] = useState<{
    student?: string;
    achievement_type?: string;
    description?: string;
  }>({});

  // Form state for adding new event
  const [formData, setFormData] = useState({
    report_mode: 'single' as 'single' | 'group' | 'grade',
    student_lrn: '',
    student_lrns: [] as string[],
    selected_grade: '',
    category_id: '',
    event_type: '',
    severity: 'all',
    description: '',
    location: '',
    witness_names: '',
    action_taken: '',
    follow_up_required: true,
    notes: '',
    proof_image_url: ''
  });
  const [addEventValidationErrors, setAddEventValidationErrors] = useState<{
    student?: string;
    event_type?: string;
    description?: string;
  }>({});

  const [achievementFormData, setAchievementFormData] = useState({
    student_lrn: '',
    achievement_type: '',
    achievement_level: 'classroom',
    recognition_channel: '',
    impact_summary: '',
    evidence: '',
    score_points: '',
    skill_tags: '',
    description: '',
    notes: '',
  });

  // Get live zone names for location select
  const { zones, loading: zonesLoading, loadZones } = useHeatmapZones();
  const zoneNames: string[] = Array.isArray(zones) ? zones.map((z: { name: string }) => z.name) : [];

  // Always refresh zones before opening the add event dialog
  useEffect(() => {
    if (isAddDialogOpen) {
      loadZones();
    }
  }, [isAddDialogOpen, loadZones]);

  useEffect(() => {
    if (isAchievementDialogOpen) {
      loadZones();
    }
  }, [isAchievementDialogOpen, loadZones]);

  useEffect(() => {
    const user = localStorage.getItem('safegate_user');
    if (!user) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(user);
    setCurrentUser(userData);
    // Artificial delay for loader demo
    setTimeout(() => {
      setAuthLoading(false);
    }, 1500);
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

  useEffect(() => {
    const studentLrn = searchParams.get('studentLrn');
    if (studentLrn) {
      setSearchQuery(studentLrn);
      setActiveTab('list');
    }
  }, [searchParams]);

  useEffect(() => {
    void refreshPendingSyncCount();

    const handleOnline = () => {
      setIsOnline(true);
      void syncQueuedRecords(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_SYNC_REQUEST') {
        void syncQueuedRecords(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    if (navigator.onLine) {
      void syncQueuedRecords(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    filterEvents();
  }, [events, searchQuery, severityFilter, categoryFilter, dateFilter, sortConfig]);

  const selectedStudent = useMemo(() => {
    const selectedValue = (formData.student_lrn || '').trim();
    if (!selectedValue) return null;
    return students.find((student) => getStudentSelectorValue(student) === selectedValue) || null;
  }, [students, formData.student_lrn]);

  const selectedStudents = useMemo(
    () => students.filter((student) => formData.student_lrns.includes(getStudentSelectorValue(student))),
    [students, formData.student_lrns]
  );

  const gradeModeLevelOptions = useMemo(() => SYSTEM_GRADE_LEVELS, []);

  const normalizedRole = (currentUser?.role || '').toString().toLowerCase();
  const isGuidanceUser = normalizedRole === 'guidance' || normalizedRole === 'admin';

  const dbCategoryTemplates = useMemo<CategoryTemplate[]>(
    () =>
      categories.map((category) => ({
        id: `db-${category.id}`,
        name: category.name,
        categoryType: category.category_type,
        severity: (category.severity_level || 'minor') as CategoryTemplate['severity'],
        levelScopes: ['all'],
      })),
    [categories]
  );

  const availableCategoryTemplates = useMemo(() => {
    const seen = new Set(dbCategoryTemplates.map((template) => template.name.toLowerCase()));
    const extras = CATEGORY_TEMPLATES.filter((template) => !seen.has(template.name.toLowerCase()));
    return [...dbCategoryTemplates, ...extras];
  }, [dbCategoryTemplates]);

  const achievementTypeOptions = useMemo(() => {
    const positiveTemplateOptions = availableCategoryTemplates
      .filter((template) => template.severity === 'positive')
      .map((template) => ({
        id: template.id,
        name: template.name,
        categoryType: template.categoryType,
      }));

    const deduped = [...positiveTemplateOptions, ...EXTENDED_ACHIEVEMENT_TYPES].reduce(
      (acc, option) => {
        const normalized = option.name.toLowerCase().trim();
        if (!acc.some((item) => item.name.toLowerCase().trim() === normalized)) {
          acc.push(option);
        }
        return acc;
      },
      [] as Array<{ id: string; name: string; categoryType: string }>
    );

    return deduped.sort((a, b) => a.name.localeCompare(b.name));
  }, [availableCategoryTemplates]);

  // Filter event types by selected event category
  const eventTypeOptions = useMemo(() => {
    const severityOrder: Record<string, number> = {
      positive: 0,
      neutral: 1,
      minor: 2,
      major: 3,
      critical: 4,
    };
    let filtered = [...availableCategoryTemplates];
    if (eventCategoryFilter !== 'all') {
      filtered = filtered.filter(opt => opt.categoryType === eventCategoryFilter);
    }
    return filtered.sort((a, b) => {
      const aRank = severityOrder[a.severity] ?? 99;
      const bRank = severityOrder[b.severity] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
  }, [availableCategoryTemplates, eventCategoryFilter]);

  const activeStudentLevelScopes = useMemo<Array<'early' | 'grade'>>(() => {
    if (formData.report_mode === 'group' || formData.report_mode === 'grade') {
      return Array.from(new Set(selectedStudents.map((student) => getStudentLevelScope(student.level))));
    }

    if (!selectedStudent) {
      return [];
    }

    return [getStudentLevelScope(selectedStudent.level)];
  }, [formData.report_mode, selectedStudents, selectedStudent]);

  const suggestedStudentLevels = useMemo(() => {
    if (formData.report_mode === 'group' || formData.report_mode === 'grade') {
      return Array.from(new Set(selectedStudents.map((student) => student.level))).sort((a, b) =>
        a.localeCompare(b)
      );
    }

    if (!selectedStudent?.level) {
      return [];
    }

    return [selectedStudent.level];
  }, [formData.report_mode, selectedStudents, selectedStudent]);

  const levelSuggestionText = useMemo(() => {
    if (suggestedStudentLevels.length === 0) {
      return 'Select student(s) first to get level suggestions.';
    }

    if (suggestedStudentLevels.length === 1) {
      return `Suggested level: ${suggestedStudentLevels[0]}`;
    }

    return `Suggested levels: ${suggestedStudentLevels.join(', ')}`;
  }, [suggestedStudentLevels]);

  // Filter event types by student level AND selected severity
  const levelAwareEventTypeOptions = useMemo(() => {
    let filtered = eventTypeOptions;
    if (activeStudentLevelScopes.length > 0) {
      filtered = filtered.filter((option) => {
        const scopes = option.levelScopes?.length ? option.levelScopes : ['all'];
        if (scopes.includes('all')) {
          return true;
        }
        return activeStudentLevelScopes.some((scope) => scopes.includes(scope));
      });
    }
    // Filter by selected severity in the add event dialog, unless 'all' is selected
    if (formData.severity && formData.severity !== 'all') {
      filtered = filtered.filter((option) => option.severity === formData.severity);
    }
    return filtered;
  }, [activeStudentLevelScopes, eventTypeOptions, formData.severity]);

  const groupedEventTypeOptions = useMemo(() => {
    if (suggestedStudentLevels.length === 0) {
      const earlyLearner = levelAwareEventTypeOptions.filter((option) => {
        const scopes = option.levelScopes?.length ? option.levelScopes : ['all'];
        return scopes.includes('early') && !scopes.includes('all') && option.categoryType.toLowerCase() !== 'other';
      });
      const gradeSchool = levelAwareEventTypeOptions.filter((option) => {
        const scopes = option.levelScopes?.length ? option.levelScopes : ['all'];
        return scopes.includes('grade') && !scopes.includes('all') && option.categoryType.toLowerCase() !== 'other';
      });
      const otherGeneral = levelAwareEventTypeOptions.filter((option) => {
        const scopes = option.levelScopes?.length ? option.levelScopes : ['all'];
        return scopes.includes('all') || option.categoryType.toLowerCase() === 'other';
      });

      return [
        { key: 'early', label: 'Early Learners', options: earlyLearner },
        { key: 'grade', label: 'Grade School', options: gradeSchool },
        { key: 'other', label: 'Other / General', options: otherGeneral },
      ].filter((group) => group.options.length > 0);
    }

    const levelSpecificGroups = suggestedStudentLevels.map((level) => {
      const levelScope = getStudentLevelScope(level);
      const options = levelAwareEventTypeOptions.filter((option) => {
        const scopes = option.levelScopes?.length ? option.levelScopes : ['all'];
        const isOtherCategory = option.categoryType.toLowerCase() === 'other';
        return scopes.includes(levelScope) && !scopes.includes('all') && !isOtherCategory;
      });

      return {
        key: `level-${level.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
        label: level,
        options,
      };
    }).filter((group) => group.options.length > 0);

    const sharedOtherGeneral = levelAwareEventTypeOptions.filter((option) => {
      const scopes = option.levelScopes?.length ? option.levelScopes : ['all'];
      return scopes.includes('all') || option.categoryType.toLowerCase() === 'other';
    });

    return [
      ...levelSpecificGroups,
      { key: 'other', label: 'Other / General', options: sharedOtherGeneral },
    ].filter((group) => group.options.length > 0);
  }, [levelAwareEventTypeOptions, suggestedStudentLevels]);

  const groupedLogEvents = useMemo(() => {
    const groupedByReport = new Map<string, BehavioralEvent[]>();
    const standaloneEvents: BehavioralEvent[] = [];

    filteredEvents.forEach((event) => {
      const groupId = extractReportGroupId(event.notes);
      if (groupId) {
        if (!groupedByReport.has(groupId)) {
          groupedByReport.set(groupId, []);
        }
        groupedByReport.get(groupId)?.push(event);
      } else {
        standaloneEvents.push(event);
      }
    });

    const groupedReports: BehavioralEvent[] = [];
    groupedByReport.forEach((eventsInGroup, groupId) => {
      const sorted = [...eventsInGroup].sort((a, b) => {
        const aDate = new Date(a.created_at || `${a.event_date}T${a.event_time}`).getTime();
        const bDate = new Date(b.created_at || `${b.event_date}T${b.event_time}`).getTime();
        return bDate - aDate;
      });
      const primaryEvent = sorted[0];
      const studentNames = Array.from(
        new Set(sorted.map((event) => event.students?.name || event.student_lrn).filter(Boolean))
      );

      groupedReports.push({
        ...primaryEvent,
        report_group_id: groupId,
        report_student_count: sorted.length,
        report_student_names: studentNames,
      });
    });

    return [...standaloneEvents, ...groupedReports].sort((a, b) => {
      const aDate = new Date(a.created_at || `${a.event_date}T${a.event_time}`).getTime();
      const bDate = new Date(b.created_at || `${b.event_date}T${b.event_time}`).getTime();
      return bDate - aDate;
    });
  }, [filteredEvents]);

  // Filter students by grade/level and search
  const filteredStudentOptions = useMemo(() => {
    let filtered = students;
    if (studentLevelFilter !== 'all') {
      filtered = filtered.filter(student => student.level === studentLevelFilter);
    }
    const query = studentSearchQuery.trim().toLowerCase();
    if (query) {
      filtered = filtered.filter((student) => {
        return (
          (student.name && student.name.toLowerCase().includes(query)) ||
          (student.lrn && student.lrn.toLowerCase().includes(query)) ||
          (student.level && student.level.toLowerCase().includes(query))
        );
      });
    }
    return filtered;
  }, [students, studentSearchQuery, studentLevelFilter]);

  const reportStudentOptions = useMemo(() => {
    if (formData.report_mode !== 'grade' || !formData.selected_grade) {
      return filteredStudentOptions;
    }
    return filteredStudentOptions.filter((student) => student.level === formData.selected_grade);
  }, [filteredStudentOptions, formData.report_mode, formData.selected_grade]);

  const achievementStudentOptions = useMemo(() => {
    const query = achievementStudentSearchQuery.trim().toLowerCase();
    if (!query) {
      return students;
    }

    return students.filter((student) => {
      return (
        student.name.toLowerCase().includes(query) ||
        student.lrn.toLowerCase().includes(query) ||
        student.level.toLowerCase().includes(query)
      );
    });
  }, [students, achievementStudentSearchQuery]);

  const selectedAchievementStudent = useMemo(
    () => students.find((student) => student.lrn === achievementFormData.student_lrn) || null,
    [students, achievementFormData.student_lrn]
  );

  const resetAchievementForm = () => {
    setAchievementFormData({
      student_lrn: '',
      achievement_type: '',
      achievement_level: 'classroom',
      recognition_channel: '',
      impact_summary: '',
      evidence: '',
      score_points: '',
      skill_tags: '',
      description: '',
      notes: '',
    });
    setAchievementStudentPickerOpen(false);
    setAchievementStudentSearchQuery('');
    setAchievementValidationErrors({});
  };

  useEffect(() => {
    if (!formData.event_type) {
      return;
    }

    const stillValid = levelAwareEventTypeOptions.some((option) => option.name === formData.event_type);
    if (!stillValid) {
      setFormData((prev) => ({ ...prev, event_type: '', category_id: '' }));
    }
  }, [formData.event_type, levelAwareEventTypeOptions]);

  const fetchTeacherAccounts = async () => {
    try {
      setLoadingTeachers(true);
      const response = await fetch('/api/auth/teachers');
      const payload = await response.json().catch(() => null);

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.error || 'Failed to load teacher accounts');
      }

      setTeachers(payload.data || []);
    } catch (error) {
      console.error('Error fetching teacher accounts:', error);
      setTeachers([]);
    } finally {
      setLoadingTeachers(false);
    }
  };

  const fetchData = async () => {
    if (!supabase) {
      console.warn('Supabase client not initialized');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      // Fetch behavioral events with student and category data
      const { data: eventsData, error: eventsError } = await supabase
        .from('behavioral_events')
        .select(`
          id,
          student_lrn,
          category_id,
          event_type,
          severity,
          description,
          location,
          reported_by,
          event_date,
          event_time,
          parent_notified,
          follow_up_required,
          guidance_status,
          guidance_reviewed_by,
          guidance_reviewed_at,
          guidance_intervention_notes,
          proof_image_url,
          action_taken,
          notes,
          created_at,
          updated_at,
          students(name, level),
          event_categories(name, category_type, color_code)
        `)
        .order('created_at', { ascending: false });

      if (eventsError) {
        console.error('Events error:', eventsError);
        toast({
          title: 'Failed to fetch events',
          description: eventsError.message || String(eventsError),
          variant: 'destructive',
        });
        throw new Error(eventsError.message || 'Failed to fetch events');
      }
      const normalizedEvents: BehavioralEvent[] = (eventsData || []).map((event: any) => ({
        ...event,
        students: Array.isArray(event.students) ? event.students[0] : event.students,
        event_categories: Array.isArray(event.event_categories)
          ? event.event_categories[0]
          : event.event_categories,
      }));

      setEvents(normalizedEvents);

      const { data: achievementsData, error: achievementsError } = await supabase
        .from('achievements')
        .select(`
          id,
          student_lrn,
          achievement_type,
          category_type,
          description,
          notes,
          reported_by,
          achievement_date,
          achievement_time,
          created_at,
          updated_at,
          students(name, level)
        `)
        .order('created_at', { ascending: false });

      if (achievementsError) {
        console.error('Achievements error:', achievementsError);
        toast({
          title: 'Failed to fetch achievements',
          description: achievementsError.message || String(achievementsError),
          variant: 'destructive',
        });
        setAchievements([]);
      } else {
        const normalizedAchievements: AchievementRecord[] = (achievementsData || []).map((achievement: any) => ({
          ...achievement,
          students: Array.isArray(achievement.students) ? achievement.students[0] : achievement.students,
        }));

        setAchievements(normalizedAchievements);
      }

      // Fetch categories
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('event_categories')
        .select('id, name, category_type, severity_level, color_code, notify_parent')
        .order('category_type')
        .order('name');

      if (categoriesError) {
        console.error('Categories error:', categoriesError);
        toast({
          title: 'Failed to fetch categories',
          description: categoriesError.message || String(categoriesError),
          variant: 'destructive',
        });
        throw new Error(categoriesError.message || 'Failed to fetch categories');
      }
      setCategories(categoriesData || []);

      // Fetch students for dropdown
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('id, lrn, name, level, status, parent_name, parent_contact, parent_email')
        .eq('status', 'active')
        .order('name');

      if (studentsError) {
        console.error('Students error:', studentsError);
        toast({
          title: 'Failed to fetch students',
          description: studentsError.message || String(studentsError),
          variant: 'destructive',
        });
        throw new Error(studentsError.message || 'Failed to fetch students');
      }
      const normalizedStudents = (studentsData || []).map((student) => ({
        ...student,
        lrn: toDisplayLrn(student.lrn),
      }));
      setStudents(normalizedStudents);

      await fetchTeacherAccounts();

    } catch (error: any) {
      console.error('Error fetching data:', error?.message || error);
      toast({
        title: "Error",
        description: error?.message || "Failed to load behavioral events",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const filterEvents = () => {
    let filtered = [...events];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(event =>
        event.students?.name.toLowerCase().includes(query) ||
        event.event_type.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.student_lrn.toLowerCase().includes(query) ||
        event.location?.toLowerCase().includes(query)
      );
    }

    // Severity filter
    if (severityFilter !== 'all') {
      filtered = filtered.filter(event => event.severity === severityFilter);
    }

    // Category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(event => event.event_categories?.category_type === categoryFilter);
    }

    // Event type category filter (for event type selection UI)
    if (eventCategoryFilter !== 'all') {
      filtered = filtered.filter(event => event.event_categories?.category_type === eventCategoryFilter);
    }

    // Date filter
    if (dateFilter !== 'all') {
      const today = new Date();
      const filterDate = new Date();

      if (dateFilter === 'today') {
        filterDate.setHours(0, 0, 0, 0);
        filtered = filtered.filter(event => new Date(event.event_date) >= filterDate);
      } else if (dateFilter === 'week') {
        filterDate.setDate(today.getDate() - 7);
        filtered = filtered.filter(event => new Date(event.event_date) >= filterDate);
      } else if (dateFilter === 'month') {
        filterDate.setMonth(today.getMonth() - 1);
        filtered = filtered.filter(event => new Date(event.event_date) >= filterDate);
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal = a[sortConfig.key as keyof BehavioralEvent];
      let bVal = b[sortConfig.key as keyof BehavioralEvent];

      // Handle nested properties
      if (sortConfig.key === 'student_name') {
        aVal = a.students?.name || '';
        bVal = b.students?.name || '';
      } else if (sortConfig.key === 'level') {
        aVal = a.students?.level || '';
        bVal = b.students?.level || '';
      }

      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortConfig.direction === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      }
      
      if (aVal instanceof Date && bVal instanceof Date) {
        return sortConfig.direction === 'asc' 
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }

      return 0;
    });

    setFilteredEvents(filtered);
  };

  const handleSort = (key: string) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'desc' ? 'asc' : 'desc'
    }));
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

  const triggerAchievementParentAutomation = async (params: {
    achievementId: number;
    studentLrn: string;
  }) => {
    const response = await fetch('/api/automation/achievement-report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params),
    });

    const payload = await response.json();
    if (!response.ok || !payload.success) {
      throw new Error(payload.detail || payload.error || 'Failed to send achievement parent email');
    }

    return payload;
  };

  const refreshPendingSyncCount = async () => {
    try {
      const count = await getOfflineQueueCount();
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Failed to read offline queue count:', error);
    }
  };

  const syncQueuedRecords = async (showToastFeedback = false) => {
    if (!supabase || !navigator.onLine || syncing) {
      return;
    }

    const client = supabase;

    setSyncing(true);
    try {
      const result = await syncOfflineQueue(client, {
        onBehaviorEventInserted: async (record) => {
          const studentName =
            students.find((student) => student.lrn === record.student_lrn)?.name ||
            record.student_lrn;

          await createRoleNotification({
            title: 'New Log For Guidance Review',
            message: `${studentName} has a new behavioral log pending review.`,
            targetRoles: ['guidance'],
            relatedEventId: record.id,
            meta: {
              href: '/guidance-review',
              student_lrn: record.student_lrn,
              source: 'offline-sync',
              prevention_note: buildEarlyPreventionNote({
                guidanceStatus: 'pending_guidance',
              }),
            },
          });
        },
      });

      await refreshPendingSyncCount();

      if (showToastFeedback && result.synced > 0) {
        toast({
          title: 'Offline Records Synced',
          description: `${result.synced} queued record(s) uploaded successfully.`,
          variant: 'default',
        });
      }

      if (showToastFeedback && result.failed > 0) {
        toast({
          title: 'Some Records Still Pending',
          description: `${result.failed} record(s) could not sync yet.`,
          variant: 'destructive',
        });
      }

      if (result.synced > 0) {
        await fetchData();
      }
    } catch (error) {
      console.error('Failed syncing offline records:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleAddEvent = async () => {
    if (reportSubmitting) {
      toast({
        title: 'Please wait',
        description: 'Your report is already being submitted.',
      });
      return;
    }

    const targetStudentSelectors =
      formData.report_mode === 'group' || formData.report_mode === 'grade'
        ? Array.from(new Set(formData.student_lrns))
        : formData.student_lrn
        ? [formData.student_lrn]
        : [];
    const trimmedDescription = formData.description.trim();
    const missingInputs: string[] = [];
    const validationErrors: {
      student?: string;
      event_type?: string;
      severity?: string;
      description?: string;
    } = {};

    if (formData.report_mode === 'group' && targetStudentSelectors.length < 2) {
      missingInputs.push('At least 2 students for General Report');
      validationErrors.student = 'Please select at least 2 students for General Report.';
    } else if (formData.report_mode === 'grade' && !formData.selected_grade) {
      missingInputs.push('Grade Level');
      validationErrors.student = 'Please select a grade level.';
    } else if (formData.report_mode === 'grade' && targetStudentSelectors.length < 1) {
      missingInputs.push('Students from selected grade');
      validationErrors.student = 'Please select at least one student from the selected grade.';
    } else if (formData.report_mode === 'single' && targetStudentSelectors.length < 1) {
      missingInputs.push('Student');
      validationErrors.student = 'Please select a student.';
    }

    if (!formData.event_type) {
      missingInputs.push('Event Type');
      validationErrors.event_type = 'Please select an event type.';
    }

    if (!formData.severity || formData.severity === 'all') {
      missingInputs.push('Severity');
      validationErrors.severity = 'Please select a severity.';
    }

    if (!trimmedDescription) {
      missingInputs.push('Incident Description');
      validationErrors.description = 'Please provide incident description.';
    }

    if (missingInputs.length > 0) {
      setAddEventValidationErrors(validationErrors);
      toast({
        title: 'Required Inputs Missing',
        description: `Please complete: ${missingInputs.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    setAddEventValidationErrors({});

    if (!levelAwareEventTypeOptions.some((option) => option.name === formData.event_type)) {
      toast({
        title: 'Event Type Mismatch',
        description: 'The selected event type does not match the selected student level(s). Please reselect event type.',
        variant: 'destructive',
      });
      return;
    }

    const targetStudents = students.filter((student) =>
      targetStudentSelectors.includes(getStudentSelectorValue(student))
    );
    if (targetStudents.length !== targetStudentSelectors.length) {
      toast({
        title: 'Student Not Found',
        description: 'Please select valid students from records.',
        variant: 'destructive',
      });
      return;
    }

    setReportSubmitting(true);
    try {
      const ensuredStudentLrnMap = new Map<number, string>();
      for (const student of targetStudents) {
        const existingLrn = (student.lrn || '').trim();
        if (existingLrn) {
          ensuredStudentLrnMap.set(student.id, existingLrn);
          continue;
        }

        const provisionalLrn = `TEMP-${student.id}`;
        const { error: lrnUpdateError } = await supabase
          .from('students')
          .update({ lrn: provisionalLrn, updated_at: new Date().toISOString() })
          .eq('id', student.id);

        if (lrnUpdateError) {
          throw new Error(`Failed to assign temporary LRN for ${student.name}: ${lrnUpdateError.message}`);
        }

        ensuredStudentLrnMap.set(student.id, provisionalLrn);
      }

      const today = new Date();
      const eventDate = today.toISOString().split('T')[0];
      const eventTime = today.toTimeString().split(' ')[0];
      const groupReportId = (formData.report_mode === 'group' || formData.report_mode === 'grade') && targetStudentSelectors.length > 1
        ? `report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
        : null;

      const notesLines: string[] = [];
      if (groupReportId) {
        notesLines.push(`${REPORT_GROUP_ID_PREFIX}${groupReportId}]`);
        notesLines.push(`${REPORT_GROUP_COUNT_PREFIX}${targetStudentSelectors.length}]`);
      }
      if (formData.witness_names.trim()) {
        notesLines.push(`Witnesses: ${formData.witness_names.trim()}`);
      }
      if (formData.notes?.trim()) {
        notesLines.push(formData.notes.trim());
      }
      const notesWithWitnesses = notesLines.join('\n\n') || null;

      const matchedCategory = categories.find(
        (category) => category.name.toLowerCase() === formData.event_type.toLowerCase()
      );

      const reporterName =
        currentUser?.display_name ||
        currentUser?.full_name ||
        currentUser?.name ||
        currentUser?.username ||
        'Admin';

      const insertPayloads = targetStudents.map((student) => ({
        student_lrn: ensuredStudentLrnMap.get(student.id) || (student.lrn || '').trim(),
        category_id: matchedCategory ? Number(matchedCategory.id) : null,
        event_type: formData.event_type,
        severity: formData.severity,
        description: trimmedDescription,
        location: formData.location || null,
        action_taken: formData.action_taken || null,
        follow_up_required: formData.follow_up_required,
        parent_notified: false,
        guidance_status: 'pending_guidance',
        guidance_reviewed_by: null,
        guidance_reviewed_at: null,
        guidance_intervention_notes: null,
        proof_image_url: formData.proof_image_url || null,
        notes: notesWithWitnesses,
        event_date: eventDate,
        event_time: eventTime,
        reported_by: reporterName,
      }));

      if (!navigator.onLine) {
        for (const payload of insertPayloads) {
          await queueBehaviorEvent(payload);
        }
        await refreshPendingSyncCount();

        toast({
          title: 'Saved Offline',
          description:
            targetStudents.length > 1
              ? `General report saved offline for ${targetStudents.length} students and queued for sync.`
              : `Behavioral event for ${targetStudents[0].name} was encrypted locally and queued for sync.`,
          variant: 'default',
        });

        setIsAddDialogOpen(false);
        resetForm();
        return;
      }

      if (!supabase) {
        throw new Error('Supabase is not configured in this environment.');
      }

      const { data: insertedRows, error } = await supabase
        .from('behavioral_events')
        .insert(insertPayloads)
        .select('id, student_lrn');

      if (error) throw error;

      const eventIdByStudentLrn = new Map(
        (insertedRows || []).map((row: { id: number; student_lrn: string }) => [row.student_lrn, Number(row.id)])
      );

      // Create heatmap data points for each behavioral event
      await Promise.all(
        targetStudents.map(async (student) => {
          const studentLrn = ensuredStudentLrnMap.get(student.id) || (student.lrn || '').trim();
          const eventId = eventIdByStudentLrn.get(studentLrn);
          if (eventId && formData.location) {
            try {
              // Find matching zone by name
              const matchingZone = zones.find(zone => zone.name === formData.location);
              if (matchingZone) {
                await addDataPoint({
                  zone_id: matchingZone.id,
                  event_type: 'behavioral',
                  event_id: eventId,
                  student_lrn: studentLrn,
                  intensity_value: formData.severity === 'critical' ? 3.0 : formData.severity === 'major' ? 2.5 : formData.severity === 'minor' ? 1.5 : 1.0,
                  metadata: {
                    event_type: formData.event_type,
                    severity: formData.severity,
                    description: trimmedDescription,
                    reported_by: reporterName
                  },
                  severity: formData.severity
                });
              }
            } catch (heatmapError) {
              console.error('Failed to create heatmap data point:', heatmapError);
              // Don't fail the whole operation if heatmap creation fails
            }
          }
        })
      );

      await Promise.all(
        targetStudents.map(async (student) => {
          const studentLrn = ensuredStudentLrnMap.get(student.id) || (student.lrn || '').trim();
          const eventId = eventIdByStudentLrn.get(studentLrn);
          if (eventId) {
            await createRoleNotification({
              title: 'New Log For Guidance Review',
              message: `${student.name} has a new behavioral log pending review.`,
              targetRoles: ['guidance'],
              createdBy: reporterName,
              relatedEventId: eventId,
              meta: {
                href: '/guidance-review',
                student_lrn: studentLrn,
                event_type: formData.event_type,
                report_group_id: groupReportId,
                prevention_note: buildEarlyPreventionNote({
                  eventType: formData.event_type,
                  severity: formData.severity,
                  guidanceStatus: 'pending_guidance',
                }),
              },
            });
          }
        })
      );

      toast({
        title: "Success",
        description:
          targetStudents.length > 1
            ? `General report logged for ${targetStudents.length} students. Recorded individually and sent to Guidance.`
            : `Behavioral event logged for ${targetStudents[0].name}. Sent to Guidance for intervention and review.`
      });

      // Broadcast ML refresh so dashboards update instantly without page refresh.
      if (typeof window !== 'undefined') {
        targetStudents.forEach((student) => {
          const studentLrn = ensuredStudentLrnMap.get(student.id) || (student.lrn || '').trim();
          window.dispatchEvent(
            new CustomEvent('ml-risk-refresh', {
              detail: { studentLrn, source: 'behavioral-events-log' },
            })
          );
          localStorage.setItem(
            'ml-risk-refresh',
            JSON.stringify({ studentLrn, ts: Date.now(), source: 'behavioral-events-log' })
          );
        });
      }

      setIsAddDialogOpen(false);
      resetForm();
      await fetchData();

    } catch (error: any) {
      console.error('Error adding event:', error);

      try {
        const today = new Date();
        const fallbackTargetStudentLrns = targetStudents.map(
          (student) => (student.lrn || '').trim() || `TEMP-${student.id}`
        );
        const fallbackGroupReportId = (formData.report_mode === 'group' || formData.report_mode === 'grade') && fallbackTargetStudentLrns.length > 1
          ? `report-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
          : null;
        const fallbackNotesLines: string[] = [];
        if (fallbackGroupReportId) {
          fallbackNotesLines.push(`${REPORT_GROUP_ID_PREFIX}${fallbackGroupReportId}]`);
          fallbackNotesLines.push(`${REPORT_GROUP_COUNT_PREFIX}${fallbackTargetStudentLrns.length}]`);
        }
        if (formData.witness_names.trim()) {
          fallbackNotesLines.push(`Witnesses: ${formData.witness_names.trim()}`);
        }
        if (formData.notes?.trim()) {
          fallbackNotesLines.push(formData.notes.trim());
        }
        const fallbackCategory = categories.find(
          (category) => category.name.toLowerCase() === formData.event_type.toLowerCase()
        );
        const fallbackPayloads = fallbackTargetStudentLrns.map((studentLrn) => ({
          student_lrn: studentLrn,
          category_id: fallbackCategory ? Number(fallbackCategory.id) : null,
          event_type: formData.event_type,
          severity: formData.severity,
          description: trimmedDescription,
          location: formData.location || null,
          action_taken: formData.action_taken || null,
          follow_up_required: formData.follow_up_required,
          parent_notified: false,
          guidance_status: 'pending_guidance',
          guidance_reviewed_by: null,
          guidance_reviewed_at: null,
          guidance_intervention_notes: null,
          proof_image_url: formData.proof_image_url || null,
          notes: fallbackNotesLines.join('\n\n') || null,
          event_date: today.toISOString().split('T')[0],
          event_time: today.toTimeString().split(' ')[0],
          reported_by:
            currentUser?.display_name ||
            currentUser?.full_name ||
            currentUser?.name ||
            currentUser?.username ||
            'Admin',
        }));

        for (const payload of fallbackPayloads) {
          await queueBehaviorEvent(payload);
        }
        await refreshPendingSyncCount();

        toast({
          title: 'Queued Offline',
          description: 'Network issue detected. Event saved securely and queued for sync.',
          variant: 'default',
        });

        setIsAddDialogOpen(false);
        resetForm();
      } catch {
        toast({
          title: "Error",
          description: error?.message || 'Failed to log behavioral event',
          variant: "destructive"
        });
      }
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleAddAchievement = async () => {
    if (achievementSubmitting) {
      toast({
        title: 'Please wait',
        description: 'Your achievement is already being submitted.',
      });
      return;
    }

    const missingInputs: string[] = [];
    const validationErrors: {
      student?: string;
      achievement_type?: string;
      description?: string;
    } = {};

    if (!achievementFormData.student_lrn) {
      missingInputs.push('Student');
      validationErrors.student = 'Please select a student.';
    }

    if (!achievementFormData.achievement_type) {
      missingInputs.push('Achievement Type');
      validationErrors.achievement_type = 'Please select an achievement type.';
    }

    if (!achievementFormData.description.trim()) {
      missingInputs.push('Achievement Description');
      validationErrors.description = 'Please provide achievement details.';
    }

    if (missingInputs.length > 0) {
      setAchievementValidationErrors(validationErrors);
      toast({
        title: 'Required Inputs Missing',
        description: `Please complete: ${missingInputs.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (!supabase) {
      toast({
        title: 'Connection Missing',
        description: 'Supabase is not configured in this environment.',
        variant: 'destructive',
      });
      return;
    }

    const selectedStudent = students.find((student) => student.lrn === achievementFormData.student_lrn);
    if (!selectedStudent) {
      toast({
        title: 'Student Not Found',
        description: 'Please select a valid student from records.',
        variant: 'destructive',
      });
      return;
    }

    setAchievementSubmitting(true);
    try {
      const now = new Date();
      const metadataLines = [
        `Achievement Level: ${achievementFormData.achievement_level || 'classroom'}`,
        achievementFormData.recognition_channel ? `Recognition Channel: ${achievementFormData.recognition_channel}` : '',
        achievementFormData.skill_tags.trim() ? `Skill Tags: ${achievementFormData.skill_tags.trim()}` : '',
        achievementFormData.score_points.trim() ? `Score/Points: ${achievementFormData.score_points.trim()}` : '',
        achievementFormData.impact_summary.trim() ? `Impact Summary: ${achievementFormData.impact_summary.trim()}` : '',
        achievementFormData.evidence.trim() ? `Evidence/Reference: ${achievementFormData.evidence.trim()}` : '',
      ].filter(Boolean);

      const combinedNotes = [achievementFormData.notes.trim(), ...metadataLines]
        .filter(Boolean)
        .join('\n');

      const achievementPayload = {
        student_lrn: selectedStudent.lrn,
        category_type: 'Achievements',
        achievement_type: achievementFormData.achievement_type,
        description: achievementFormData.description.trim(),
        notes: combinedNotes || null,
        reported_by:
          currentUser?.display_name ||
          currentUser?.full_name ||
          currentUser?.name ||
          currentUser?.username ||
          'Admin',
        achievement_date: now.toISOString().split('T')[0],
        achievement_time: now.toTimeString().split(' ')[0],
      };

      const { data: insertedAchievement, error } = await supabase
        .from('achievements')
        .insert(achievementPayload)
        .select('id')
        .single();
      if (error) throw error;

      let emailNotice = ' Parent email was sent automatically.';
      try {
        if (insertedAchievement?.id) {
          const automationResult = await triggerAchievementParentAutomation({
            achievementId: insertedAchievement.id,
            studentLrn: selectedStudent.lrn,
          });

          if (!automationResult?.queued) {
            emailNotice = ' Achievement saved, but no parent email was sent (no parent email on file).';
          }
        }
      } catch (automationError: any) {
        console.error('Achievement parent automation error:', automationError);
        emailNotice = ' Achievement saved, but parent email sending failed.';
      }

      toast({
        title: 'Success',
        description: `Achievement logged for ${selectedStudent.name} and saved successfully.${emailNotice}`,
      });

      setIsAchievementDialogOpen(false);
      resetAchievementForm();
      await fetchData();
    } catch (error: any) {
      console.error('Error adding achievement:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to log achievement',
        variant: 'destructive',
      });
    } finally {
      setAchievementSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormData({
      report_mode: 'single',
      student_lrn: '',
      student_lrns: [],
      selected_grade: '',
      category_id: '',
      event_type: '',
      severity: 'minor',
      description: '',
      location: '',
      witness_names: '',
      action_taken: '',
      follow_up_required: true,
      notes: '',
      proof_image_url: ''
    });
    setEventTypePickerOpen(false);
    setStudentSearchQuery('');
    setAddEventValidationErrors({});
  };

  const handleFollowUp = async (event: BehavioralEvent) => {
    try {
      if (!supabase) {
        throw new Error('Supabase is not configured in this environment.');
      }

      const { error } = await supabase
        .from('behavioral_events')
        .update({ follow_up_required: false })
        .eq('id', event.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Follow-up marked as completed"
      });

      fetchData();

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update follow-up status",
        variant: "destructive"
      });
    }
  };

  const getGuidanceStatusBadge = (status?: GuidanceStatus) => {
    const normalized = status || 'pending_guidance';
    if (normalized === 'approved_for_ml') {
      return (
        <Badge variant="outline" className="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-700 text-xs">
          <CheckCircle className="w-3 h-3 mr-1" />
          Guidance Approved
        </Badge>
      );
    }
    if (normalized === 'denied_by_guidance') {
      return (
        <Badge variant="outline" className="bg-rose-50 dark:bg-rose-900/20 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-700 text-xs">
          <XCircle className="w-3 h-3 mr-1" />
          Guidance Denied
        </Badge>
      );
    }

    return (
      <Badge variant="outline" className="bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-700 text-xs">
        <Clock className="w-3 h-3 mr-1" />
        Pending Guidance Review
      </Badge>
    );
  };

  const handleGuidanceDecision = async (decision: 'approved_for_ml' | 'denied_by_guidance') => {
    if (!selectedEvent || !supabase || !isGuidanceUser || guidanceSubmitting) {
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
      const { error: updateError } = await supabase
        .from('behavioral_events')
        .update({
          guidance_status: decision,
          guidance_reviewed_by: reviewerName,
          guidance_reviewed_at: new Date().toISOString(),
          guidance_intervention_notes: guidanceReviewNote.trim() || null,
        })
        .eq('id', selectedEvent.id);

      if (updateError) {
        throw updateError;
      }

      if (decision === 'approved_for_ml') {
        const automationResult = await triggerParentAutomation({
          eventId: selectedEvent.id,
          studentLrn: selectedEvent.student_lrn,
          triggerSource: 'guidance_approved',
        });

        if (automationResult?.queued) {
          const { error: notifyUpdateError } = await supabase
            .from('behavioral_events')
            .update({ parent_notified: true })
            .eq('id', selectedEvent.id);

          if (notifyUpdateError) {
            console.error('Unable to set parent_notified flag:', notifyUpdateError);
          }
        }

        toast({
          title: 'Guidance Approved',
          description: automationResult?.queued
            ? 'Guidance approved. ML scoring completed and parent email was sent.'
            : 'Guidance approved. ML scoring completed with no parent email required.',
        });

        // Always include parent in targetRoles and fetch parent info if missing
        let parentEmail = selectedEvent.students?.parent_email || null;
        let parentName = selectedEvent.students?.parent_name || null;
        if (!parentEmail || !parentName) {
          const { data: studentData } = await supabase
            .from('students')
            .select('parent_email, parent_name')
            .eq('lrn', selectedEvent.student_lrn)
            .single();
          if (studentData) {
            parentEmail = studentData.parent_email;
            parentName = studentData.parent_name;
          }
        }

        await createRoleNotification({
          title: 'Log Reviewed By Guidance',
          message: `${selectedEvent.students?.name || selectedEvent.student_lrn} (${selectedEvent.event_type}) was approved by guidance.`,
          targetRoles: [
            'teacher',
            'admin',
            'parent',
            parentEmail ? `parent:${parentEmail}` : null
          ].filter(Boolean),
          createdBy: reviewerName,
          relatedEventId: selectedEvent.id,
          meta: {
            href: '/parent-behavior',
            student_lrn: selectedEvent.student_lrn,
            guidance_status: 'approved_for_ml',
            report_owner_name: selectedEvent.reported_by || null,
            report_owner_username: selectedEvent.reported_by || null,
            parent_email: parentEmail,
            parent_name: parentName,
            parent_identity: parentEmail,
            prevention_note: buildEarlyPreventionNote({
              eventType: selectedEvent.event_type,
              severity: selectedEvent.severity,
              guidanceStatus: 'approved_for_ml',
            }),
          },
        });
      } else {
        toast({
          title: 'Guidance Denied',
          description: 'Guidance intervention recorded. Parent notification was stopped.',
        });

        await createRoleNotification({
          title: 'Log Reviewed By Guidance',
          message: `${selectedEvent.students?.name || selectedEvent.student_lrn} (${selectedEvent.event_type}) was denied by guidance.`,
          targetRoles: ['teacher', 'admin'],
          createdBy: reviewerName,
          relatedEventId: selectedEvent.id,
          meta: {
            href: '/behavioral-events',
            student_lrn: selectedEvent.student_lrn,
            guidance_status: 'denied_by_guidance',
            report_owner_name: selectedEvent.reported_by || null,
            report_owner_username: selectedEvent.reported_by || null,
            prevention_note: buildEarlyPreventionNote({
              eventType: selectedEvent.event_type,
              severity: selectedEvent.severity,
              guidanceStatus: 'denied_by_guidance',
            }),
          },
        });
      }

      setGuidanceReviewNote('');
      setIsDialogOpen(false);
      await fetchData();
    } catch (error: any) {
      console.error('Guidance review workflow failed:', error);
      toast({
        title: 'Guidance Review Failed',
        description: error?.message || 'Unable to complete guidance review action.',
        variant: 'destructive',
      });
    } finally {
      setGuidanceSubmitting(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    const Icon = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]?.icon || Info;
    const color = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]?.text || 'text-gray-500';
    return <Icon className={`w-4 h-4 ${color}`} />;
  };

  const getSeverityBadge = (severity: string) => {
    const colors = SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS];
    return (
      <Badge className={`${colors.bg} ${colors.text} border-0`}>
        {severity.charAt(0).toUpperCase() + severity.slice(1)}
      </Badge>
    );
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Student(s)', 'Level', 'Event Type', 'Severity', 'Description', 'Location', 'Reported By', 'Parent Notified', 'Follow-up Required', 'Report Mode'];
    const csvData = groupedLogEvents.map(event => [
      event.event_date,
      event.event_time,
      event.report_student_names?.join('; ') || event.students?.name || event.student_lrn,
      event.students?.level || '',
      event.event_type,
      event.severity,
      event.description.replace(/,/g, ';'), // Replace commas to avoid CSV issues
      event.location || '',
      event.reported_by,
      event.parent_notified ? 'Yes' : 'No',
      event.follow_up_required ? 'Yes' : 'No',
      event.report_group_id ? `General (${event.report_student_count || 1} students)` : 'Single'
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `behavioral-events-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Analytics calculations
  const stats = useMemo(() => {
    const total = filteredEvents.length;
    const positive = filteredEvents.filter(e => e.severity === 'positive').length;
    const negative = filteredEvents.filter(e => ['major', 'critical'].includes(e.severity)).length;
    const neutral = filteredEvents.filter(e => e.severity === 'neutral' || e.severity === 'minor').length;
    const needsFollowUp = filteredEvents.filter(e => e.follow_up_required).length;
    const parentNotified = filteredEvents.filter(e => e.parent_notified).length;
    const achievementsCount = achievements.length;

    // Severity distribution for chart
    const severityDistribution = Object.keys(SEVERITY_COLORS).map(severity => ({
      name: severity.charAt(0).toUpperCase() + severity.slice(1),
      value: filteredEvents.filter(e => e.severity === severity).length,
      color: SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS]?.gradient.split(' ')[0].replace('from-', '') || '#6b7280'
    })).filter(item => item.value > 0);

    // Category distribution
    const categoryMap = new Map();
    filteredEvents.forEach(event => {
      const category = event.event_categories?.category_type || 'Other';
      categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
    });
    const categoryDistribution = Array.from(categoryMap.entries()).map(([name, value]) => ({ name, value }));

    // Daily trend (last 7 days)
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return date.toISOString().split('T')[0];
    }).reverse();

    const dailyTrend = last7Days.map(date => ({
      date: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
      positive: filteredEvents.filter(e => e.event_date === date && e.severity === 'positive').length,
      negative: filteredEvents.filter(e => e.event_date === date && ['major', 'critical'].includes(e.severity)).length,
      total: filteredEvents.filter(e => e.event_date === date).length
    }));

    return {
      total,
      positive,
      negative,
      neutral,
      needsFollowUp,
      parentNotified,
      achievementsCount,
      severityDistribution,
      categoryDistribution,
      dailyTrend
    };
  }, [filteredEvents, achievements]);

  if (authLoading) {
    return <BehavioralEventsSkeleton />;
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
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Behavioral Events
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              Track and analyze student behavioral patterns and achievements
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Badge className={isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
              {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              <CloudUpload className="w-3 h-3 mr-1" />
              Pending Sync: {pendingSyncCount}
            </Badge>
            {syncing && <Badge className="bg-indigo-100 text-indigo-700">Syncing...</Badge>}
            <Button
              variant="outline"
              size="sm"
              onClick={exportToCSV}
              className="gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </Button>
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                  <Plus className="w-4 h-4" />
                  Log Event
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] sm:w-[92vw] max-w-5xl lg:max-w-4xl h-auto sm:h-[86vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/40">
                  <DialogTitle className="text-3xl leading-tight">Log Student Behavior Incident</DialogTitle>
                  <DialogDescription>
                    Use accurate details for compliance and parent-notification scoring. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5 px-6 py-5 overflow-y-auto flex-1"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="report_mode" className="flex items-center gap-1">
                        Report Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.report_mode}
                        onValueChange={(value) => {
                          const mode = value === 'group' ? 'group' : value === 'grade' ? 'grade' : 'single';
                          setFormData((current) => ({
                            ...current,
                            report_mode: mode,
                            student_lrn: mode === 'single' ? current.student_lrn : '',
                            student_lrns: mode === 'single' ? [] : current.student_lrns,
                            selected_grade: mode === 'grade' ? current.selected_grade : '',
                          }));
                          setStudentSearchQuery('');
                          setAddEventValidationErrors((prev) => ({ ...prev, student: undefined }));
                        }}
                      >
                        <SelectTrigger id="report_mode" className="w-full">
                          <SelectValue placeholder="Select report mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="single">Single Student Report</SelectItem>
                          <SelectItem value="group">General Report (Multiple Students)</SelectItem>
                          <SelectItem value="grade">Grade Report</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {formData.report_mode === 'group'
                          ? 'One report appears in logs while still recording separate entries per student for scoring.'
                          : formData.report_mode === 'grade'
                          ? 'Pick a grade level, then select student(s) only from that grade.'
                          : 'Use single-student mode for individual incidents.'}
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="student_picker" className="flex items-center gap-1">
                        {formData.report_mode === 'single' ? 'Student' : 'Students'} <span className="text-red-500">*</span>
                      </Label>
                      {formData.report_mode === 'grade' && (
                        <Select
                          value={formData.selected_grade || '__none__'}
                          onValueChange={(value) => {
                            const selectedGrade = value === '__none__' ? '' : value;
                            setFormData((current) => ({
                              ...current,
                              selected_grade: selectedGrade,
                              student_lrns: selectedGrade
                                ? current.student_lrns.filter((selector) => {
                                    const student = students.find((s) => getStudentSelectorValue(s) === selector);
                                    return student?.level === selectedGrade;
                                  })
                                : [],
                            }));
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue placeholder="Select grade level" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">Select grade level</SelectItem>
                            {gradeModeLevelOptions.map((level) => (
                              <SelectItem key={level} value={level}>
                                {level}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                      <Popover open={studentPickerOpen} onOpenChange={setStudentPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="student_picker"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {formData.report_mode === 'single'
                              ? selectedStudent
                                ? `${selectedStudent.name} (${selectedStudent.level})`
                                : 'Search student by name or LRN'
                              : formData.student_lrns.length > 0
                                ? `${formData.student_lrns.length} student${formData.student_lrns.length > 1 ? 's' : ''} selected`
                                : formData.report_mode === 'grade' && formData.selected_grade
                                  ? `Select students from ${formData.selected_grade}`
                                  : 'Search and select students'}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Type student name, LRN, or level"
                              value={studentSearchQuery}
                              onValueChange={setStudentSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No student found. Try another name.</CommandEmpty>
                              <CommandGroup>
                                {reportStudentOptions.map((student, index) => {
                                  const studentLrn = (student.lrn || '').trim();
                                  const studentSelectorValue = getStudentSelectorValue(student);
                                  const isSelected =
                                    formData.report_mode !== 'single'
                                      ? formData.student_lrns.includes(studentSelectorValue)
                                      : formData.student_lrn === studentSelectorValue;
                                  return (
                                    <CommandItem
                                      key={`${studentSelectorValue}-${student.name}-${index}`}
                                      value={`${student.name} ${studentLrn} ${student.level}`}
                                      onSelect={() => {
                                        if (formData.report_mode !== 'single') {
                                          setFormData((current) => {
                                            const alreadySelected = current.student_lrns.includes(studentSelectorValue);
                                            return {
                                              ...current,
                                              student_lrns: alreadySelected
                                                ? current.student_lrns.filter((lrn) => lrn !== studentSelectorValue)
                                                : [...current.student_lrns, studentSelectorValue],
                                            };
                                          });
                                          return;
                                        }
                                        // Single mode: deselect if already selected
                                        setFormData((current) => ({
                                          ...current,
                                          student_lrn: current.student_lrn === studentSelectorValue ? '' : studentSelectorValue,
                                        }));
                                        setAddEventValidationErrors((prev) => ({ ...prev, student: undefined }));
                                        setStudentPickerOpen(false);
                                      }}
                                    >
                                      <Checkbox checked={isSelected} className="pointer-events-none" />
                                      <div className="flex flex-col">
                                        <span className="font-medium">{student.name}</span>
                                        <span className="text-xs text-muted-foreground">
                                          {studentLrn || 'No LRN assigned'} • {student.level}
                                        </span>
                                      </div>
                                    </CommandItem>
                                  );
                                })}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {formData.report_mode !== 'single' && selectedStudents.length > 0 && (
                        <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-2">
                          {selectedStudents.map((student) => (
                            <Badge key={student.lrn} variant="secondary" className="gap-1 pr-1">
                              {student.name}
                              <button
                                type="button"
                                className="text-xs opacity-70 hover:opacity-100"
                                onClick={() =>
                                  setFormData((current) => ({
                                    ...current,
                                    student_lrns: current.student_lrns.filter(
                                      (lrn) => lrn !== getStudentSelectorValue(student)
                                    ),
                                  }))
                                }
                              >
                                ×
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                      {formData.report_mode === 'single' && selectedStudent && (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-900/40 p-3 text-xs space-y-1">
                          <p className="font-medium text-slate-700 dark:text-slate-200">
                            Parent: {selectedStudent.parent_name || 'Not set'}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            Contact: {selectedStudent.parent_contact || 'Not set'}
                          </p>
                          <p className="text-slate-600 dark:text-slate-300">
                            Email: {selectedStudent.parent_email || 'Not set'}
                          </p>
                        </div>
                      )}
                      <div className="rounded-md border border-emerald-200 dark:border-emerald-800 bg-emerald-50/70 dark:bg-emerald-950/30 px-3 py-2">
                        <p className="text-xs font-medium text-emerald-800 dark:text-emerald-200">Level Suggestion</p>
                        <p className="text-xs text-emerald-700 dark:text-emerald-300 mt-1">{levelSuggestionText}</p>
                        {suggestedStudentLevels.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {suggestedStudentLevels.map((level) => (
                              <Badge key={level} variant="outline" className="text-[11px] border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300">
                                {level}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                      {addEventValidationErrors.student && (
                        <p className="text-sm text-red-600 dark:text-red-400">{addEventValidationErrors.student}</p>
                      )}
                    </div>

                    <div className="space-y-2 md:col-span-1">
                      <Label htmlFor="event_type" className="flex items-center gap-1">
                        Event Type <span className="text-red-500">*</span>
                      </Label>
                      <Popover open={eventTypePickerOpen} onOpenChange={setEventTypePickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="event_type"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {formData.event_type ? (
                              <span className="truncate text-left">{formData.event_type}</span>
                            ) : (
                              <span className="truncate text-left text-muted-foreground">
                                Select event type based on selected level
                              </span>
                            )}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                          <Command>
                            <CommandInput placeholder="Search event type, category, or severity..." />
                            <CommandList>
                              <CommandEmpty>No event type found.</CommandEmpty>
                              {groupedEventTypeOptions.map((group) => (
                                <CommandGroup key={group.key} heading={group.label}>
                                  {group.options.map((option) => (
                                    <CommandItem
                                      key={option.id}
                                      value={`${option.name} ${option.categoryType} ${option.severity}`}
                                      onSelect={() => {
                                        setFormData((current) => ({
                                          ...current,
                                          event_type: option.name,
                                          severity: option.severity,
                                        }));
                                        setAddEventValidationErrors((prev) => ({ ...prev, event_type: undefined }));
                                        setEventTypePickerOpen(false);
                                      }}
                                    >
                                      <div className="flex min-w-0 items-center gap-2">
                                        {getSeverityIcon(option.severity)}
                                        <span className="truncate">{option.name}</span>
                                        <span className="whitespace-nowrap text-xs text-muted-foreground">({option.categoryType})</span>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              ))}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {activeStudentLevelScopes.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Showing events for level group:
                          {' '}
                          {activeStudentLevelScopes.includes('early') && activeStudentLevelScopes.includes('grade')
                            ? 'Early Learners + Grade School'
                            : activeStudentLevelScopes.includes('early')
                            ? 'Early Learners'
                            : 'Grade School'}
                        </p>
                      )}
                      {suggestedStudentLevels.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Suggested by selected student level{suggestedStudentLevels.length > 1 ? 's' : ''}: {suggestedStudentLevels.join(', ')}
                        </p>
                      )}
                      {addEventValidationErrors.event_type && (
                        <p className="text-sm text-red-600 dark:text-red-400">{addEventValidationErrors.event_type}</p>
                      )}
                    </div>
                    <div className="space-y-2 md:max-w-xs">
                      <Label htmlFor="severity" className="flex items-center gap-1">
                        Severity <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
                        <SelectTrigger id="severity" className="w-full">
                          <SelectValue placeholder="All Severities" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Severities</SelectItem>
                          {Object.keys(SEVERITY_COLORS).map(severity => (
                            <SelectItem key={severity} value={severity}>
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(severity)}
                                <span>{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {addEventValidationErrors.severity && (
                        <p className="text-sm text-red-600 dark:text-red-400">{addEventValidationErrors.severity}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-1">
                      Incident Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => {
                        setFormData({...formData, description: e.target.value});
                        if (e.target.value.trim()) {
                          setAddEventValidationErrors((prev) => ({ ...prev, description: undefined }));
                        }
                      }}
                      placeholder="State what happened, who was involved, and immediate context."
                      rows={3}
                      className="resize-none"
                    />
                    {addEventValidationErrors.description && (
                      <p className="text-sm text-red-600 dark:text-red-400">{addEventValidationErrors.description}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="proof_image_url">Proof Image (Optional)</Label>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                      <Button
                        type="button"
                        variant="outline"
                        className="gap-2 sm:w-auto"
                        onClick={() => document.getElementById('behavior-proof-image-input')?.click()}
                      >
                        <ImagePlus className="w-4 h-4" />
                        Upload Image
                      </Button>
                      <Input
                        id="proof_image_url"
                        placeholder="or paste image URL"
                        value={formData.proof_image_url.startsWith('data:') ? '' : formData.proof_image_url}
                        onChange={(e) => setFormData({ ...formData, proof_image_url: e.target.value })}
                      />
                    </div>
                    <input
                      id="behavior-proof-image-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          const value = typeof reader.result === 'string' ? reader.result : '';
                          setFormData((prev) => ({ ...prev, proof_image_url: value }));
                        };
                        reader.readAsDataURL(file);
                        e.currentTarget.value = '';
                      }}
                    />
                    {formData.proof_image_url && (
                      <div className="rounded-md border border-slate-200 dark:border-slate-700 p-2 bg-slate-50/70 dark:bg-slate-900/30">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formData.proof_image_url} alt="Behavior proof preview" className="max-h-40 w-auto rounded-md object-contain" />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <Select
                        value={formData.location || '__none__'}
                        onValueChange={(value) => setFormData({ ...formData, location: value === '__none__' ? '' : value })}
                      >
                        <SelectTrigger id="location" className="w-full">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-muted-foreground" />
                            <SelectValue placeholder="Select room or area" />
                          </div>
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No location selected</SelectItem>
                          {zoneNames.map((location) => (
                            <SelectItem key={location} value={location}>
                              {location}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Select the exact year-level room (Kinder, Grade 1, Grade 2, and so on) for cleaner heatmap tracking.
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="witness_names">Witness (Teacher Account)</Label>
                      <Select
                        value={formData.witness_names || '__none__'}
                        onValueChange={(value) =>
                          setFormData({ ...formData, witness_names: value === '__none__' ? '' : value })
                        }
                      >
                        <SelectTrigger id="witness_names" className="w-full">
                          <SelectValue placeholder={loadingTeachers ? 'Loading teacher accounts...' : 'Select teacher witness'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">No witness selected</SelectItem>
                          {teachers.map((teacher) => (
                            <SelectItem key={teacher.id} value={`${teacher.name}${teacher.email ? ` (${teacher.email})` : ''}`}>
                              <div className="flex items-center gap-2">
                                <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                <span>{teacher.name}</span>
                                {teacher.email && (
                                  <span className="text-xs text-muted-foreground">({teacher.email})</span>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {!loadingTeachers && teachers.length === 0 && (
                        <p className="text-xs text-amber-600">No teacher accounts found in auth users with role=teacher.</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="action_taken">Action Taken</Label>
                    <Textarea
                      id="action_taken"
                      value={formData.action_taken}
                      onChange={(e) => setFormData({...formData, action_taken: e.target.value})}
                      placeholder="What action was taken..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                  <div className="rounded-md border border-blue-200 bg-blue-50/70 px-3 py-2 text-sm text-blue-800 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-200 space-y-1">
                    <p>Follow-up is automatically enabled for behavior entries to support timely intervention and parent communication.</p>
                    <p>Workflow: Logs -&gt; Guidance review and intervention -&gt; ML scoring -&gt; parent email (only when approved and needed).</p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({...formData, notes: e.target.value})}
                      placeholder="Any additional notes..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>

                </motion.div>

                <div className="border-t bg-white dark:bg-slate-950 px-6 py-4 flex justify-end gap-2">
                  <Button variant="outline" onClick={() => {
                    setIsAddDialogOpen(false);
                    resetForm();
                  }} disabled={reportSubmitting}>
                    {reportSubmitting ? 'Saving...' : 'Cancel'}
                  </Button>
                  <Button variant="default" onClick={handleAddEvent} className="gap-2" disabled={reportSubmitting}>
                    {reportSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {reportSubmitting ? 'Submitting Report...' : 'Log Event'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isAchievementDialogOpen} onOpenChange={setIsAchievementDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2 bg-linear-to-r from-[#ff8a00] to-[#fb923c] hover:from-[#e67e00] hover:to-[#f97316] text-white shadow-lg hover:shadow-xl transition-all duration-200">
                  <Award className="w-4 h-4" />
                  Achievements
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] sm:w-[92vw] max-w-5xl lg:max-w-4xl h-auto sm:h-[86vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
                <DialogHeader className="px-6 pt-6 pb-4 border-b bg-slate-50/70 dark:bg-slate-900/40">
                  <DialogTitle className="text-3xl leading-tight">Log Achievement</DialogTitle>
                  <DialogDescription>
                    Record a positive achievement, recognition, or accomplishment. Fields marked with * are required.
                  </DialogDescription>
                </DialogHeader>

                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-5 px-6 py-5 overflow-y-auto flex-1"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="achievement_student" className="flex items-center gap-1">
                        Student <span className="text-red-500">*</span>
                      </Label>
                      <Popover open={achievementStudentPickerOpen} onOpenChange={setAchievementStudentPickerOpen}>
                        <PopoverTrigger asChild>
                          <Button
                            id="achievement_student"
                            variant="outline"
                            role="combobox"
                            className="w-full justify-between font-normal"
                          >
                            {selectedAchievementStudent
                              ? `${selectedAchievementStudent.name} (${selectedAchievementStudent.level})`
                              : 'Search student by name or LRN'}
                            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent align="start" className="w-(--radix-popover-trigger-width) p-0">
                          <Command shouldFilter={false}>
                            <CommandInput
                              placeholder="Type student name, LRN, or level"
                              value={achievementStudentSearchQuery}
                              onValueChange={setAchievementStudentSearchQuery}
                            />
                            <CommandList>
                              <CommandEmpty>No student found. Try another name.</CommandEmpty>
                              <CommandGroup>
                                {achievementStudentOptions.map((student) => (
                                  <CommandItem
                                    key={student.lrn}
                                    value={`${student.name} ${student.lrn} ${student.level}`}
                                    onSelect={() => {
                                      setAchievementFormData((current) => ({
                                        ...current,
                                        student_lrn: student.lrn,
                                      }));
                                      setAchievementValidationErrors((prev) => ({ ...prev, student: undefined }));
                                      setAchievementStudentPickerOpen(false);
                                    }}
                                  >
                                    <div className="flex min-w-0 items-center gap-2">
                                      <span className="truncate">{student.name}</span>
                                      <span className="whitespace-nowrap text-xs text-muted-foreground">({student.level})</span>
                                    </div>
                                  </CommandItem>
                                ))}
                              </CommandGroup>
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      {achievementValidationErrors.student && (
                        <p className="text-sm text-red-600 dark:text-red-400">{achievementValidationErrors.student}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="achievement_type" className="flex items-center gap-1">
                        Achievement Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={achievementFormData.achievement_type}
                        onValueChange={(value) => {
                          setAchievementFormData((current) => ({ ...current, achievement_type: value }));
                          setAchievementValidationErrors((prev) => ({ ...prev, achievement_type: undefined }));
                        }}
                      >
                        <SelectTrigger id="achievement_type" className="w-full">
                          <SelectValue placeholder="Select positive achievement type" />
                        </SelectTrigger>
                        <SelectContent>
                          {achievementTypeOptions.map((option) => (
                            <SelectItem key={option.id} value={option.name}>
                              <div className="flex items-center gap-2">
                                <Heart className="w-4 h-4 text-emerald-500" />
                                <span>{option.name}</span>
                                <span className="text-xs text-muted-foreground">({option.categoryType})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {achievementValidationErrors.achievement_type && (
                        <p className="text-sm text-red-600 dark:text-red-400">{achievementValidationErrors.achievement_type}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="achievement_level">Achievement Level</Label>
                      <Select
                        value={achievementFormData.achievement_level}
                        onValueChange={(value) => {
                          setAchievementFormData((current) => ({ ...current, achievement_level: value }));
                        }}
                      >
                        <SelectTrigger id="achievement_level" className="w-full">
                          <SelectValue placeholder="Select level" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="classroom">Classroom</SelectItem>
                          <SelectItem value="grade-level">Grade Level</SelectItem>
                          <SelectItem value="school-wide">School-Wide</SelectItem>
                          <SelectItem value="external">External / Competition</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="recognition_channel">Recognition Channel</Label>
                      <Select
                        value={achievementFormData.recognition_channel}
                        onValueChange={(value) => {
                          setAchievementFormData((current) => ({ ...current, recognition_channel: value }));
                        }}
                      >
                        <SelectTrigger id="recognition_channel" className="w-full">
                          <SelectValue placeholder="Select channel" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="class-announcement">Class Announcement</SelectItem>
                          <SelectItem value="assembly">School Assembly</SelectItem>
                          <SelectItem value="certificate">Certificate</SelectItem>
                          <SelectItem value="digital-board">Digital Board / Portal</SelectItem>
                          <SelectItem value="teacher-note">Teacher Note</SelectItem>
                          <SelectItem value="parent-message">Parent Message</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="score_points">Score / Points (Optional)</Label>
                      <Input
                        id="score_points"
                        value={achievementFormData.score_points}
                        onChange={(e) => setAchievementFormData((current) => ({ ...current, score_points: e.target.value }))}
                        placeholder="e.g., 95, 10 points"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="achievement_description" className="flex items-center gap-1">
                      Achievement Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="achievement_description"
                      value={achievementFormData.description}
                      onChange={(e) => {
                        setAchievementFormData((current) => ({ ...current, description: e.target.value }));
                        if (e.target.value.trim()) {
                          setAchievementValidationErrors((prev) => ({ ...prev, description: undefined }));
                        }
                      }}
                      placeholder="Describe the positive action, recognition, or accomplishment."
                      rows={3}
                      className="resize-none"
                    />
                    {achievementValidationErrors.description && (
                      <p className="text-sm text-red-600 dark:text-red-400">{achievementValidationErrors.description}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="impact_summary">Positive Impact Summary</Label>
                      <Textarea
                        id="impact_summary"
                        value={achievementFormData.impact_summary}
                        onChange={(e) => setAchievementFormData((current) => ({ ...current, impact_summary: e.target.value }))}
                        placeholder="How did this achievement help the class, peers, or the student?"
                        rows={2}
                        className="resize-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="skill_tags">Skills / Values Demonstrated</Label>
                      <Input
                        id="skill_tags"
                        value={achievementFormData.skill_tags}
                        onChange={(e) => setAchievementFormData((current) => ({ ...current, skill_tags: e.target.value }))}
                        placeholder="e.g., Leadership, Teamwork, Creativity"
                      />
                      <p className="text-xs text-muted-foreground">Separate multiple tags with commas.</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="evidence">Evidence / Reference (Optional)</Label>
                    <Input
                      id="evidence"
                      value={achievementFormData.evidence}
                      onChange={(e) => setAchievementFormData((current) => ({ ...current, evidence: e.target.value }))}
                      placeholder="Certificate ID, document link, event name, or reference note"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="achievement_notes">Optional Notes</Label>
                    <Textarea
                      id="achievement_notes"
                      value={achievementFormData.notes}
                      onChange={(e) => setAchievementFormData((current) => ({ ...current, notes: e.target.value }))}
                      placeholder="Add any extra recognition details, context, or celebration notes..."
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                </motion.div>

                <div className="border-t bg-white dark:bg-slate-950 px-6 py-4 flex justify-end gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsAchievementDialogOpen(false);
                      resetAchievementForm();
                    }}
                    disabled={achievementSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="default"
                    onClick={handleAddAchievement}
                    className="gap-2 bg-linear-to-r from-[#ff8a00] to-[#fb923c] hover:from-[#e67e00] hover:to-[#f97316] text-white shadow-lg hover:shadow-xl transition-all duration-200"
                    disabled={achievementSubmitting}
                  >
                    {achievementSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
                    {achievementSubmitting ? 'Submitting...' : 'Log Achievement'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          {/* Total Events Card */}
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
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Events</p>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">all behavioral events</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Activity className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
            </Card>
          </motion.div>

          {/* Positive Events Card */}
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
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Positive Events</p>
                  <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.positive}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">reinforcing progress</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Heart className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
            </Card>
          </motion.div>

          {/* Negative Events Card */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <Card className="border-0 bg-linear-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/10 dark:bg-rose-400/5 rounded-full -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-16 h-16 bg-rose-500/5 dark:bg-rose-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-rose-600 dark:text-rose-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Negative Events</p>
                  <div className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.negative}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">major/critical incidents</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-rose-500 to-rose-600 text-white items-center justify-center shadow-lg shadow-rose-500/25 dark:shadow-rose-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <AlertOctagon className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-rose-400 to-rose-600 dark:from-rose-500 dark:to-rose-700" />
            </Card>
          </motion.div>

          {/* Achievements Card */}
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
                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Achievements</p>
                  <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.achievementsCount}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">positive recognitions</p>
                </div>
                <div className="hidden sm:flex w-12 h-12 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Award className="w-7 h-7" />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
            </Card>
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Filter className="w-5 h-5 text-blue-500" />
              Filters
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search events..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="severity-filter">Severity</Label>
                <Select value={severityFilter} onValueChange={setSeverityFilter}>
                  <SelectTrigger id="severity-filter">
                    <SelectValue placeholder="All Severities" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    {Object.keys(SEVERITY_COLORS).map(severity => (
                      <SelectItem key={severity} value={severity}>
                        <div className="flex items-center gap-2">
                          {getSeverityIcon(severity)}
                          <span>{severity.charAt(0).toUpperCase() + severity.slice(1)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="category-filter">Category</Label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger id="category-filter">
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {Array.from(new Set(categories.map((category) => category.category_type))).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="event-type-category-filter">Event Type Category</Label>
                <Select value={eventCategoryFilter} onValueChange={setEventCategoryFilter}>
                  <SelectTrigger id="event-type-category-filter">
                    <SelectValue placeholder="All Event Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Event Categories</SelectItem>
                    {Array.from(new Set(availableCategoryTemplates.map((template) => template.categoryType))).map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-level-filter">Student Level</Label>
                <Select value={studentLevelFilter} onValueChange={setStudentLevelFilter}>
                  <SelectTrigger id="student-level-filter">
                    <SelectValue placeholder="All Levels" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    {Array.from(new Set(students.map((student) => student.level))).sort().map((level) => (
                      <SelectItem key={level} value={level}>
                        {level}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="date-filter">Date Range</Label>
                <Select value={dateFilter} onValueChange={setDateFilter}>
                  <SelectTrigger id="date-filter">
                    <SelectValue placeholder="All Time" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Time</SelectItem>
                    <SelectItem value="today">Today</SelectItem>
                    <SelectItem value="week">Past Week</SelectItem>
                    <SelectItem value="month">Past Month</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs for List and Analytics */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="grid w-full max-w-md grid-cols-2">
            <TabsTrigger value="list" className="gap-2">
              <FileText className="w-4 h-4" />
              Events List
            </TabsTrigger>
            <TabsTrigger value="analytics" className="gap-2">
              <PieChart className="w-4 h-4" />
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="space-y-4">
            {/* Events List */}
            <Card className="border-0 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Events Log
                    </CardTitle>
                    <CardDescription>
                      Showing {groupedLogEvents.length} report entries from {filteredEvents.length} student records
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-slate-800 self-start sm:self-auto text-xs whitespace-nowrap">
                      {{
                       created_at: 'Logged Time',
                       event_date: 'Date',
                       event_time: 'Time',
                       severity: 'Severity',
                       event_type: 'Event Type',
                       student_name: 'Student',
                       level: 'Grade Level',
                      }[sortConfig.key] ?? sortConfig.key}
                      {' \u2014 '}
                      {sortConfig.direction === 'asc' ? 'Oldest First' : 'Newest First'}
                  </Badge>
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    variant={showEventLog ? 'outline' : 'default'}
                    onClick={() => setShowEventLog(current => !current)}
                    className="gap-2"
                  >
                    {showEventLog ? (
                      <>
                        <Eye className="w-4 h-4" />
                        Hide Event Log
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4" />
                        Show Event Log
                      </>
                    )}
                  </Button>
                  {showEventLog && (
                    <Button size="sm" variant="ghost" onClick={() => setShowEventLog(false)}>
                      Close Log
                    </Button>
                  )}
                </div>
              </CardHeader>
              {showEventLog && (
                <CardContent className="p-0">
                {loading ? (
                  <div className="p-6 space-y-3">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="border rounded-lg p-4 space-y-2 animate-pulse">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4"></div>
                            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2"></div>
                          </div>
                          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-16"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : groupedLogEvents.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 rounded-full bg-slate-100 dark:bg-slate-800">
                        <FileText className="w-8 h-8 text-slate-400" />
                      </div>
                      <h3 className="font-semibold text-lg">No events found</h3>
                      <p className="text-sm text-muted-foreground">
                        Try adjusting your filters or log a new event
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setSearchQuery('');
                          setSeverityFilter('all');
                          setCategoryFilter('all');
                          setDateFilter('all');
                        }}
                      >
                        Clear filters
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-200 dark:divide-slate-700">
                    {groupedLogEvents.map((event, index) => (
                      <motion.div
                        key={event.report_group_id ? `group-${event.report_group_id}` : event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedEvent(event);
                          setGuidanceReviewNote(event.guidance_intervention_notes || '');
                          setIsDialogOpen(true);
                        }}
                      >
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getSeverityIcon(event.severity)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {event.report_group_id
                                    ? `General Report • ${event.report_student_count || 1} students`
                                    : event.students?.name || event.student_lrn}
                                </h3>
                                <Badge variant="outline" className="border-slate-200 dark:border-slate-700">
                                  {event.report_group_id
                                    ? 'Multiple Levels'
                                    : event.students?.level}
                                </Badge>
                                {getSeverityBadge(event.severity)}
                                {event.event_categories && (
                                  <Badge 
                                    variant="outline" 
                                    style={{ 
                                      borderColor: event.event_categories.color_code,
                                      color: event.event_categories.color_code
                                    }}
                                  >
                                    {event.event_categories.category_type}
                                  </Badge>
                                )}
                              </div>

                              {event.report_group_id && event.report_student_names && (
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                  Students: {event.report_student_names.join(', ')}
                                </p>
                              )}
                              
                              <p className="font-medium text-sm mt-1 text-slate-800 dark:text-slate-200">
                                {event.event_type === 'parent_report' ? 'Parent Report' : event.event_type}
                              </p>
                              
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                {event.description}
                              </p>
                              {event.proof_image_url && (
                                <div className="mt-2 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden max-w-xs">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={event.proof_image_url} alt="Event proof" className="h-24 w-full object-cover" />
                                </div>
                              )}
                              
                              <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-slate-500 dark:text-slate-500">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {new Date(event.event_date).toLocaleDateString()} at {event.event_time}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="w-3 h-3" />
                                    {event.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <User className="w-3 h-3" />
                                  {event.reported_by}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap items-center gap-2 mt-2">
                                {getGuidanceStatusBadge(event.guidance_status)}
                                {event.parent_notified && (
                                  <Badge variant="outline" className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-700 text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Parent Notified
                                  </Badge>
                                )}
                                {event.follow_up_required && (
                                  <Badge variant="outline" className="bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-700 text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Follow-up Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="self-end sm:self-auto shrink-0">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
                </CardContent>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            {/* Analytics Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Severity Distribution */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <PieChart className="w-5 h-5 text-purple-500" />
                    Severity Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 sm:h-75 lg:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <RePieChart>
                        <Pie
                          data={stats.severityDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {stats.severityDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </RePieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Distribution */}
              <Card className="border-0 shadow-lg overflow-hidden">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <BarChart3 className="w-5 h-5 text-blue-500" />
                    Category Distribution
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 sm:h-75 lg:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.categoryDistribution}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="name" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <Tooltip />
                        <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Daily Trend */}
              <Card className="border-0 shadow-lg overflow-hidden lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    Daily Event Trend (Last 7 Days)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-60 sm:h-75 lg:h-96">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={stats.dailyTrend}>
                        <defs>
                          <linearGradient id="positiveGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                          </linearGradient>
                          <linearGradient id="negativeGradient" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.1} />
                        <XAxis dataKey="date" stroke="#6B7280" />
                        <YAxis stroke="#6B7280" />
                        <Tooltip />
                        <Legend />
                        <Area
                          type="monotone"
                          dataKey="positive"
                          stackId="1"
                          stroke="#10b981"
                          fill="url(#positiveGradient)"
                        />
                        <Area
                          type="monotone"
                          dataKey="negative"
                          stackId="1"
                          stroke="#ef4444"
                          fill="url(#negativeGradient)"
                        />
                      </AreaChart>
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
                  <div className="p-4 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Heart className="w-4 h-4 text-emerald-600" />
                      <span className="font-semibold text-emerald-700 dark:text-emerald-300">Positive Ratio</span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                      {stats.total > 0 ? ((stats.positive / stats.total) * 100).toFixed(1) : '0'}%
                    </p>
                    <p className="text-xs text-emerald-600/70 mt-1">
                      {stats.positive} positive out of {stats.total} total events
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/30 dark:to-orange-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <Bell className="w-4 h-4 text-orange-600" />
                      <span className="font-semibold text-orange-700 dark:text-orange-300">Follow-up Rate</span>
                    </div>
                    <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                      {stats.total > 0 ? ((stats.needsFollowUp / stats.total) * 100).toFixed(1) : '0'}%
                    </p>
                    <p className="text-xs text-orange-600/70 mt-1">
                      {stats.needsFollowUp} events require follow-up
                    </p>
                  </div>

                  <div className="p-4 rounded-lg bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/30 dark:to-blue-900/20">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-4 h-4 text-blue-600" />
                      <span className="font-semibold text-blue-700 dark:text-blue-300">Parent Notification</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.total > 0 ? ((stats.parentNotified / stats.total) * 100).toFixed(1) : '0'}%
                    </p>
                    <p className="text-xs text-blue-600/70 mt-1">
                      {stats.parentNotified} parents notified
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Event Details Dialog */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="w-[96vw] sm:w-[92vw] max-w-2xl">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(selectedEvent.severity)}
                    <DialogTitle className="text-xl">{selectedEvent.event_type}</DialogTitle>
                  </div>
                  <DialogDescription>
                    {selectedEvent.report_group_id
                      ? `General report details for ${selectedEvent.report_student_count || 1} students`
                      : `Event details for ${selectedEvent.students?.name || selectedEvent.student_lrn}`}
                  </DialogDescription>
                </DialogHeader>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">
                        {selectedEvent.report_group_id ? 'Students Included' : 'Student'}
                      </Label>
                      {selectedEvent.report_group_id ? (
                        <p className="font-medium text-sm mt-1">
                          {selectedEvent.report_student_names?.join(', ') || selectedEvent.students?.name || selectedEvent.student_lrn}
                        </p>
                      ) : (
                        <>
                          <p className="font-medium text-lg">{selectedEvent.students?.name}</p>
                          <p className="text-sm text-muted-foreground">{selectedEvent.student_lrn}</p>
                        </>
                      )}
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Level</Label>
                      <p className="font-medium">{selectedEvent.report_group_id ? 'Multiple Levels' : selectedEvent.students?.level}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label className="text-xs text-muted-foreground">Date & Time</Label>
                      <p className="font-medium">
                        {new Date(selectedEvent.event_date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">{selectedEvent.event_time}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Severity</Label>
                      <div className="mt-1">{getSeverityBadge(selectedEvent.severity)}</div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Description</Label>
                    <p className="mt-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                      {selectedEvent.description}
                    </p>
                  </div>
                  {selectedEvent.proof_image_url && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Proof Image</Label>
                      <div className="mt-2 rounded-md border border-slate-200 dark:border-slate-700 overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={selectedEvent.proof_image_url} alt="Behavior proof" className="max-h-64 w-full object-contain bg-slate-50 dark:bg-slate-900/40" />
                      </div>
                    </div>
                  )}

                  {selectedEvent.location && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Location</Label>
                      <p className="mt-1 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-muted-foreground" />
                        {selectedEvent.location}
                      </p>
                    </div>
                  )}

                  {selectedEvent.action_taken && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Action Taken</Label>
                      <p className="mt-1 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                        {selectedEvent.action_taken}
                      </p>
                    </div>
                  )}

                  {removeReportMetadataFromNotes(selectedEvent.notes) && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                      <p className="mt-1 text-sm whitespace-pre-wrap">{removeReportMetadataFromNotes(selectedEvent.notes)}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">Reported By</Label>
                    <p className="mt-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {selectedEvent.reported_by}
                    </p>
                  </div>

                  <div className="space-y-3 pt-2">
                    {isGuidanceUser && (
                      <div className="space-y-2">
                        <Label htmlFor="guidance-note" className="text-xs text-muted-foreground">
                          Guidance Intervention Notes
                        </Label>
                        <Textarea
                          id="guidance-note"
                          value={guidanceReviewNote}
                          onChange={(e) => setGuidanceReviewNote(e.target.value)}
                          placeholder="Record intervention details, counseling notes, and recommendation."
                          rows={3}
                          className="resize-none"
                        />
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {selectedEvent.follow_up_required && (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleFollowUp(selectedEvent)}
                          className="gap-2 bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100"
                        >
                          <CheckCircle className="w-4 h-4" />
                          Mark Follow-up Complete
                        </Button>
                      )}

                      {isGuidanceUser && selectedEvent.guidance_status !== 'approved_for_ml' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={guidanceSubmitting}
                          onClick={() => void handleGuidanceDecision('approved_for_ml')}
                          className="gap-2 bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        >
                          <CheckCircle className="w-4 h-4" />
                          {guidanceSubmitting ? 'Submitting...' : 'Approve and Run ML'}
                        </Button>
                      )}

                      {isGuidanceUser && selectedEvent.guidance_status !== 'denied_by_guidance' && (
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={guidanceSubmitting}
                          onClick={() => void handleGuidanceDecision('denied_by_guidance')}
                          className="gap-2 bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100"
                        >
                          <XCircle className="w-4 h-4" />
                          {guidanceSubmitting ? 'Submitting...' : 'Deny Escalation'}
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {getGuidanceStatusBadge(selectedEvent.guidance_status)}
                    {selectedEvent.parent_notified && (
                      <Badge className="bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 border-0 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Parent Notified
                      </Badge>
                    )}
                    {selectedEvent.follow_up_required && (
                      <Badge className="bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400 border-0 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Follow-up Required
                      </Badge>
                    )}
                    {selectedEvent.guidance_reviewed_by && (
                      <Badge className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-0 gap-1">
                        <User className="w-3 h-3" />
                        Reviewed by {selectedEvent.guidance_reviewed_by}
                      </Badge>
                    )}
                  </div>
                </motion.div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* ML Dashboard */}
        <div className="mt-8">
          <MLDashboard />
        </div>
      </motion.div>
    </DashboardLayout>
  );
}