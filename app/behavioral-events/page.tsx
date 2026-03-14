'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useIsMobile } from '@/hooks/use-mobile';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
import { toast } from '@/components/ui/use-toast';
import { MLDashboard } from '@/components/ml-dashboard';
import { TablePageSkeleton } from '@/components/loading-skeletons';
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
  action_taken?: string;
  notes?: string;
  students?: {
    name: string;
    level: string;
  };
  event_categories?: {
    name: string;
    category_type: string;
    color_code: string;
  };
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
  lrn: string;
  name: string;
  level: string;
  status: string;
  parent_name: string | null;
  parent_contact: string | null;
  parent_email: string | null;
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
}

const SEVERITY_COLORS = {
  positive: { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-200', icon: CheckCircle, gradient: 'from-emerald-500 to-emerald-400' },
  neutral: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', icon: Minus, gradient: 'from-gray-500 to-gray-400' },
  minor: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', icon: Info, gradient: 'from-yellow-500 to-yellow-400' },
  major: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', icon: AlertTriangle, gradient: 'from-orange-500 to-orange-400' },
  critical: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', icon: XCircle, gradient: 'from-red-500 to-red-400' }
};

const CHART_COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6', '#ec4899'];

const CATEGORY_TEMPLATES: CategoryTemplate[] = [
  { id: 'classroom-disruption', name: 'Classroom Disruption', categoryType: 'Behavior', severity: 'major' },
  { id: 'academic-dishonesty', name: 'Academic Dishonesty', categoryType: 'Academic', severity: 'major' },
  { id: 'peer-conflict', name: 'Peer Conflict', categoryType: 'Social', severity: 'minor' },
  { id: 'bullying-report', name: 'Bullying Report', categoryType: 'Safety', severity: 'critical' },
  { id: 'property-damage', name: 'Property Damage', categoryType: 'Discipline', severity: 'major' },
  { id: 'respectful-conduct', name: 'Respectful Conduct', categoryType: 'Positive Behavior', severity: 'positive' },
  { id: 'leadership-initiative', name: 'Leadership Initiative', categoryType: 'Positive Behavior', severity: 'positive' },
  { id: 'counseling-referral', name: 'Counseling Referral', categoryType: 'Intervention', severity: 'minor' },
];

// Enforce consistent layout structure for behavioral events
export default function BehavioralEventsPage() {
    const isMobile = useIsMobile();
  const router = useRouter();
  const [authLoading, setAuthLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [events, setEvents] = useState<BehavioralEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<BehavioralEvent[]>([]);
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [students, setStudents] = useState<StudentRecord[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [selectedEvent, setSelectedEvent] = useState<BehavioralEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('list');
  const [showFilters, setShowFilters] = useState(true);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'event_date', direction: 'desc' });
  const [isOnline, setIsOnline] = useState<boolean>(typeof navigator === 'undefined' ? true : navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  useEffect(() => {
    if (isMobile) {
      setShowFilters(false);
    }
  }, [isMobile]);

  // Form state for adding new event
  const [formData, setFormData] = useState({
    student_lrn: '',
    category_id: '',
    event_type: '',
    severity: 'minor',
    description: '',
    location: '',
    witness_names: '',
    action_taken: '',
    follow_up_required: true,
    notes: ''
  });

  useEffect(() => {
    const user = localStorage.getItem('safegate_user');
    if (!user) {
      router.push('/login');
      return;
    }
    const userData = JSON.parse(user);
    setCurrentUser(userData);
    setAuthLoading(false);
  }, [router]);

  useEffect(() => {
    if (!authLoading) {
      fetchData();
    }
  }, [authLoading]);

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

  const selectedStudent = useMemo(
    () => students.find((student) => student.lrn === formData.student_lrn) || null,
    [students, formData.student_lrn]
  );

  const dbCategoryTemplates = useMemo<CategoryTemplate[]>(
    () =>
      categories.map((category) => ({
        id: `db-${category.id}`,
        name: category.name,
        categoryType: category.category_type,
        severity: (category.severity_level || 'minor') as CategoryTemplate['severity'],
      })),
    [categories]
  );

  const availableCategoryTemplates = useMemo(() => {
    const seen = new Set(dbCategoryTemplates.map((template) => template.name.toLowerCase()));
    const extras = CATEGORY_TEMPLATES.filter((template) => !seen.has(template.name.toLowerCase()));
    return [...dbCategoryTemplates, ...extras];
  }, [dbCategoryTemplates]);

  const eventTypeOptions = useMemo(() => {
    const severityOrder: Record<string, number> = {
      positive: 0,
      neutral: 1,
      minor: 2,
      major: 3,
      critical: 4,
    };

    return [...availableCategoryTemplates].sort((a, b) => {
      const aRank = severityOrder[a.severity] ?? 99;
      const bRank = severityOrder[b.severity] ?? 99;
      if (aRank !== bRank) return aRank - bRank;
      return a.name.localeCompare(b.name);
    });
  }, [availableCategoryTemplates]);

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
          action_taken,
          notes,
          created_at,
          updated_at,
          students(name, level),
          event_categories(name, category_type, color_code)
        `)
        .order('event_date', { ascending: false });

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
        .select('lrn, name, level, status, parent_name, parent_contact, parent_email')
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
      setStudents(studentsData || []);

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
    triggerSource: 'behavior_event_logged' | 'manual_recheck';
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
          try {
            const automationResult = await triggerParentAutomation({
              eventId: record.id,
              studentLrn: record.student_lrn,
              triggerSource: 'behavior_event_logged',
            });

            if (automationResult?.queued) {
              const { error: notifyUpdateError } = await client
                .from('behavioral_events')
                .update({ parent_notified: true })
                .eq('id', record.id);

              if (notifyUpdateError) {
                console.error('Unable to set parent_notified flag:', notifyUpdateError);
              }
            }
          } catch (error) {
            console.error('Parent automation after sync failed:', error);
          }
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
    if (!formData.student_lrn || !formData.event_type || !formData.description) {
      toast({
        title: "Validation Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    if (!selectedStudent) {
      toast({
        title: 'Student Not Found',
        description: 'Please select a valid student from records.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const today = new Date();
      const eventDate = today.toISOString().split('T')[0];
      const eventTime = today.toTimeString().split(' ')[0];

      const notesWithWitnesses = formData.witness_names.trim()
        ? `${formData.notes?.trim() ? `${formData.notes.trim()}\n\n` : ''}Witnesses: ${formData.witness_names.trim()}`
        : formData.notes;

      const matchedCategory = categories.find(
        (category) => category.name.toLowerCase() === formData.event_type.toLowerCase()
      );

      const insertPayload = {
        student_lrn: formData.student_lrn,
        category_id: matchedCategory ? Number(matchedCategory.id) : null,
        event_type: formData.event_type,
        severity: formData.severity,
        description: formData.description,
        location: formData.location || null,
        action_taken: formData.action_taken || null,
        follow_up_required: formData.follow_up_required,
        parent_notified: false,
        notes: notesWithWitnesses || null,
        event_date: eventDate,
        event_time: eventTime,
        reported_by: currentUser?.full_name || currentUser?.username || 'Admin',
      };

      if (!navigator.onLine) {
        await queueBehaviorEvent(insertPayload);
        await refreshPendingSyncCount();

        toast({
          title: 'Saved Offline',
          description: `Behavioral event for ${selectedStudent.name} was encrypted locally and queued for sync.`,
          variant: 'default',
        });

        setIsAddDialogOpen(false);
        resetForm();
        return;
      }

      if (!supabase) {
        throw new Error('Supabase is not configured in this environment.');
      }

      const { data, error } = await supabase
        .from('behavioral_events')
        .insert([insertPayload])
        .select('id')
        .single();

      if (error) throw error;

      let notificationMessage = ' ML evaluation complete. No parent email required.';

      if (data?.id) {
        try {
          const automationResult = await triggerParentAutomation({
            eventId: data.id,
            studentLrn: formData.student_lrn,
            triggerSource: 'behavior_event_logged',
          });

          if (automationResult?.queued) {
            const { error: notifyUpdateError } = await supabase
              .from('behavioral_events')
              .update({ parent_notified: true })
              .eq('id', data.id);

            if (notifyUpdateError) {
              console.error('Unable to set parent_notified flag:', notifyUpdateError);
            }

            notificationMessage = ` ML triggered parent email: ${automationResult?.decision?.reason || 'risk threshold reached'}.`;
          } else {
            notificationMessage = ` ML evaluated event: ${automationResult?.decision?.reason || 'no email needed at this time'}.`;
          }
        } catch (notifyError: any) {
          console.error('Parent automation error:', notifyError);
          notificationMessage = ' Event logged, but ML notification evaluation failed.';
        }
      }

      toast({
        title: "Success",
        description: `Behavioral event logged for ${selectedStudent.name}.${notificationMessage}`
      });

      setIsAddDialogOpen(false);
      resetForm();
      await fetchData();

    } catch (error: any) {
      console.error('Error adding event:', error);

      try {
        const today = new Date();
        const fallbackNotes = formData.witness_names.trim()
          ? `${formData.notes?.trim() ? `${formData.notes.trim()}\n\n` : ''}Witnesses: ${formData.witness_names.trim()}`
          : formData.notes;
        const fallbackCategory = categories.find(
          (category) => category.name.toLowerCase() === formData.event_type.toLowerCase()
        );
        const fallbackPayload = {
          student_lrn: formData.student_lrn,
          category_id: fallbackCategory ? Number(fallbackCategory.id) : null,
          event_type: formData.event_type,
          severity: formData.severity,
          description: formData.description,
          location: formData.location || null,
          action_taken: formData.action_taken || null,
          follow_up_required: formData.follow_up_required,
          parent_notified: false,
          notes: fallbackNotes || null,
          event_date: today.toISOString().split('T')[0],
          event_time: today.toTimeString().split(' ')[0],
          reported_by: currentUser?.full_name || currentUser?.username || 'Admin',
        };

        await queueBehaviorEvent(fallbackPayload);
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
    }
  };

  const resetForm = () => {
    setFormData({
      student_lrn: '',
      category_id: '',
      event_type: '',
      severity: 'minor',
      description: '',
      location: '',
      witness_names: '',
      action_taken: '',
      follow_up_required: true,
      notes: ''
    });
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
    const headers = ['Date', 'Time', 'Student', 'Level', 'Event Type', 'Severity', 'Description', 'Location', 'Reported By', 'Parent Notified', 'Follow-up Required'];
    const csvData = filteredEvents.map(event => [
      event.event_date,
      event.event_time,
      event.students?.name || event.student_lrn,
      event.students?.level || '',
      event.event_type,
      event.severity,
      event.description.replace(/,/g, ';'), // Replace commas to avoid CSV issues
      event.location || '',
      event.reported_by,
      event.parent_notified ? 'Yes' : 'No',
      event.follow_up_required ? 'Yes' : 'No'
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
      severityDistribution,
      categoryDistribution,
      dailyTrend
    };
  }, [filteredEvents]);

  if (authLoading) {
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
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="default" className="gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600">
                  <Plus className="w-4 h-4" />
                  Log Event
                </Button>
              </DialogTrigger>
              <DialogContent className="w-[96vw] max-w-5xl lg:max-w-3xl h-[80vh] max-h-[92vh] overflow-hidden p-0 flex flex-col">
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
                      <Label htmlFor="student" className="flex items-center gap-1">
                        Student <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.student_lrn} onValueChange={(value) => setFormData({...formData, student_lrn: value})}>
                        <SelectTrigger id="student" className="w-full">
                          <SelectValue placeholder="Select student" />
                        </SelectTrigger>
                        <SelectContent>
                          {students.map(student => (
                            <SelectItem key={student.lrn} value={student.lrn}>
                              {student.name} ({student.level})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {selectedStudent && (
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
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event_type" className="flex items-center gap-1">
                        Event Type <span className="text-red-500">*</span>
                      </Label>
                      <Select
                        value={formData.event_type}
                        onValueChange={(value) => {
                          const selected = eventTypeOptions.find((option) => option.name === value);
                          setFormData({
                            ...formData,
                            event_type: value,
                            severity: selected?.severity || formData.severity,
                          });
                        }}
                      >
                        <SelectTrigger id="event_type">
                          <SelectValue placeholder="Select event type (positive to critical)" />
                        </SelectTrigger>
                        <SelectContent>
                          {eventTypeOptions.map((option) => (
                            <SelectItem key={option.id} value={option.name}>
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(option.severity)}
                                <span>{option.name}</span>
                                <span className="text-xs text-muted-foreground">({option.categoryType})</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="severity" className="flex items-center gap-1">
                        Severity <span className="text-red-500">*</span>
                      </Label>
                      <Select value={formData.severity} onValueChange={(value) => setFormData({...formData, severity: value})}>
                        <SelectTrigger id="severity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
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
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description" className="flex items-center gap-1">
                      Incident Description <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      placeholder="State what happened, who was involved, and immediate context."
                      rows={3}
                      className="resize-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="location">Location</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="location"
                          value={formData.location}
                          onChange={(e) => setFormData({...formData, location: e.target.value})}
                          placeholder="e.g., Classroom 101"
                          className="pl-9"
                        />
                      </div>
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
                    <p>Parent email is ML-driven. The system compiles attendance + behavior + risk data first, then decides automatically.</p>
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
                  }}>
                    Cancel
                  </Button>
                  <Button variant="default" onClick={handleAddEvent} className="gap-2">
                    <Plus className="w-4 h-4" />
                    Log Event
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 dark:from-blue-950/40 dark:to-blue-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 text-white">
                    <Activity className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300 font-medium leading-tight">Total Events</p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</p>
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
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 text-white">
                    <Heart className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-emerald-700 dark:text-emerald-300 font-medium leading-tight">Positive Events</p>
                    <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.positive}</p>
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
            <Card className="border-0 bg-gradient-to-br from-rose-50 to-rose-100/50 dark:from-rose-950/40 dark:to-rose-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-rose-400 to-rose-600 text-white">
                    <AlertOctagon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-rose-700 dark:text-rose-300 font-medium leading-tight">Negative Events</p>
                    <p className="text-xl sm:text-2xl font-bold text-rose-600 dark:text-rose-400">{stats.negative}</p>
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
            <Card className="border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 dark:from-orange-950/40 dark:to-orange-900/30 hover:shadow-lg transition-all duration-300">
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center gap-2 sm:gap-4 min-w-0">
                  <div className="p-2 sm:p-3 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 text-white">
                    <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm text-orange-700 dark:text-orange-300 font-medium leading-tight">Needs Follow-up</p>
                    <p className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">{stats.needsFollowUp}</p>
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
            </motion.div>
          )}
        </AnimatePresence>

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
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <FileText className="w-5 h-5 text-blue-500" />
                      Events Log
                    </CardTitle>
                    <CardDescription>
                      Showing {filteredEvents.length} of {events.length} events
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="bg-white dark:bg-slate-800">
                    Sorted by {sortConfig.key} ({sortConfig.direction})
                  </Badge>
                </div>
              </CardHeader>
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
                ) : filteredEvents.length === 0 ? (
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
                    {filteredEvents.map((event, index) => (
                      <motion.div
                        key={event.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer"
                        onClick={() => {
                          setSelectedEvent(event);
                          setIsDialogOpen(true);
                        }}
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3 flex-1">
                            <div className="mt-1">
                              {getSeverityIcon(event.severity)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <h3 className="font-semibold text-slate-900 dark:text-white">
                                  {event.students?.name || event.student_lrn}
                                </h3>
                                <Badge variant="outline" className="border-slate-200 dark:border-slate-700">
                                  {event.students?.level}
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
                              
                              <p className="font-medium text-sm mt-1 text-slate-800 dark:text-slate-200">
                                {event.event_type}
                              </p>
                              
                              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 line-clamp-2">
                                {event.description}
                              </p>
                              
                              <div className="flex items-center gap-4 mt-2 text-xs text-slate-500 dark:text-slate-500">
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
                              
                              <div className="flex items-center gap-2 mt-2">
                                {event.parent_notified && (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 text-xs">
                                    <CheckCircle className="w-3 h-3 mr-1" />
                                    Parent Notified
                                  </Badge>
                                )}
                                {event.follow_up_required && (
                                  <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 text-xs">
                                    <AlertTriangle className="w-3 h-3 mr-1" />
                                    Follow-up Required
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm" className="shrink-0">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
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
                  <div className="h-[300px]">
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
                  <div className="h-[300px]">
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
                  <div className="h-[300px]">
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
          <DialogContent className="max-w-2xl">
            {selectedEvent && (
              <>
                <DialogHeader>
                  <div className="flex items-center gap-2">
                    {getSeverityIcon(selectedEvent.severity)}
                    <DialogTitle className="text-xl">{selectedEvent.event_type}</DialogTitle>
                  </div>
                  <DialogDescription>
                    Event details for {selectedEvent.students?.name || selectedEvent.student_lrn}
                  </DialogDescription>
                </DialogHeader>
                
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                    <div>
                      <Label className="text-xs text-muted-foreground">Student</Label>
                      <p className="font-medium text-lg">{selectedEvent.students?.name}</p>
                      <p className="text-sm text-muted-foreground">{selectedEvent.student_lrn}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Level</Label>
                      <p className="font-medium">{selectedEvent.students?.level}</p>
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

                  {selectedEvent.notes && (
                    <div>
                      <Label className="text-xs text-muted-foreground">Additional Notes</Label>
                      <p className="mt-1 text-sm">{selectedEvent.notes}</p>
                    </div>
                  )}

                  <div>
                    <Label className="text-xs text-muted-foreground">Reported By</Label>
                    <p className="mt-1 flex items-center gap-2">
                      <User className="w-4 h-4 text-muted-foreground" />
                      {selectedEvent.reported_by}
                    </p>
                  </div>

                  <div className="flex gap-4 pt-2">
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
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {selectedEvent.parent_notified && (
                      <Badge className="bg-green-100 text-green-800 border-0 gap-1">
                        <CheckCircle className="w-3 h-3" />
                        Parent Notified
                      </Badge>
                    )}
                    {selectedEvent.follow_up_required && (
                      <Badge className="bg-orange-100 text-orange-800 border-0 gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Follow-up Required
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