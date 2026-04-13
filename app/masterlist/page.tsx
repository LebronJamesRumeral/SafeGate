'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Search, Eye, Mail, Phone, Archive, Upload, CheckCircle2 } from 'lucide-react';
import { UserCheck, GraduationCap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { calculateAgeWithDecimal, shouldShowAge } from '@/lib/age-calculator';
import { supabase, type Student } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { sortByLevel } from '@/lib/level-order';

// Only these levels are considered current students
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
import { MLDashboard } from '@/components/ml-dashboard';
import { MasterlistPageSkeleton } from '@/components/masterlist-skeleton';
import { useIsMobile } from '@/hooks/use-mobile';
import { getStudentImportRequiredFieldsHint, parseStudentImportRows } from '@/lib/student-import';

// Enforce consistent layout structure for masterlist page
export default function MasterlistPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reAdmitDialogOpen, setReAdmitDialogOpen] = useState(false);
  const [reAdmitConfirmEmail, setReAdmitConfirmEmail] = useState('');
  const [reAdmitConfirmPassword, setReAdmitConfirmPassword] = useState('');
  const [reAdmitLevel, setReAdmitLevel] = useState('');
  const [reAdmitSelectedScheduleDays, setReAdmitSelectedScheduleDays] = useState<string[]>(WEEKDAY_OPTIONS.map((d) => d.label));
  const [reAdmitScheduleSlots, setReAdmitScheduleSlots] = useState<Array<{ label: string; startTime: string; endTime: string }>>([...DEFAULT_SCHEDULE_SLOTS]);
  const [reAdmitError, setReAdmitError] = useState('');
  const [reAdmitValidationErrors, setReAdmitValidationErrors] = useState<{ email?: string; password?: string; level?: string }>({});
  const [reAdmittingStudent, setReAdmittingStudent] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);
  const [importingStudents, setImportingStudents] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isMobile) {
      setShowFilters(false);
    }
  }, [isMobile]);

  // Fetch all students from Supabase
  useEffect(() => {
    fetchAllStudents();
  }, []);

  const fetchAllStudents = async () => {
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
      
      // Map database fields to component format
      const mappedStudents = data.map(student => ({
        ...student,
        riskLevel: student.risk_level || null,
        parentName: student.parent_name,
        parentContact: student.parent_contact,
        parentEmail: student.parent_email,
        // Default status to 'active' for all students
        status: student.status || 'active',
      }));
      
      // Sort by level order
      setStudents(sortByLevel(mappedStudents));
      toast({
        title: 'Masterlist Loaded',
        description: 'Student masterlist loaded successfully.',
        variant: 'default',
      });
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

  // Only show students whose level is in YEAR_LEVEL_OPTIONS
  const filteredStudents = students.filter(student => {
    if (!YEAR_LEVEL_OPTIONS.includes(student.level)) return false;
    if (student.status === 'dropped' && filterStatus === 'all') return false; // Hide dropped from current by default
    const term = search.toLowerCase();
    const matchesSearch =
      (student.name && student.name.toLowerCase().includes(term)) ||
      (student.lrn && student.lrn.toLowerCase().includes(term)) ||
      (student.parentName && student.parentName.toLowerCase().includes(term));
    const matchesLevel = filterGrade === 'all' || student.level === filterGrade;
    const matchesStatus = filterStatus === 'all' || (student.status || 'active') === filterStatus;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  // Count statistics
  const activeCount = students.filter(s => (s.status || 'active') === 'active').length;
  const undergradCount = students.filter(s => (s.status || 'active') === 'undergrad').length;

  const exportMasterlist = async () => {
    const headers = ['LRN', 'Name', 'Gender', 'Birthday', 'Age', 'Level', 'Risk Level', 'Status', 'Parent Name', 'Parent Contact', 'Parent Email', 'Address'];
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
        Status: student.status || 'active',
        'Parent Name': student.parentName || '',
        'Parent Contact': student.parentContact || '',
        'Parent Email': student.parentEmail || '',
        Address: student.address || '',
      };
    });

    const baseFileName = 'masterlist of SGCDC';

    try {
      const XLSX = await import('xlsx');
      const worksheet = XLSX.utils.json_to_sheet(exportRows, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Masterlist');
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

  const handleReAdmitStudent = async () => {
    if (!selectedStudent) return;
    setReAdmitError('');

    const validationErrors: { email?: string; password?: string; level?: string } = {};
    if (!reAdmitConfirmEmail.trim()) {
      validationErrors.email = 'Please provide your account email.';
    }
    if (!reAdmitConfirmPassword.trim()) {
      validationErrors.password = 'Please provide your password.';
    }
    if (!reAdmitLevel.trim()) {
      validationErrors.level = 'Please select a year level.';
    }

    const isEarlyLevel = EARLY_LEVEL_OPTIONS.includes(reAdmitLevel);
    const isGradeLevel = GRADE_LEVEL_OPTIONS.includes(reAdmitLevel);
    const shouldCreateSchedule = isEarlyLevel || isGradeLevel;

    if (isEarlyLevel && reAdmitSelectedScheduleDays.length === 0) {
      toast({
        title: 'Schedule days required',
        description: 'Please select at least one weekday for the student schedule.',
        variant: 'destructive',
      });
      return;
    }

    if (shouldCreateSchedule && reAdmitScheduleSlots.length === 0) {
      toast({
        title: 'Schedule slots required',
        description: 'Please add at least one schedule time slot.',
        variant: 'destructive',
      });
      return;
    }

    if (shouldCreateSchedule) {
      const invalidSlot = reAdmitScheduleSlots.find((slot) => {
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

    if (Object.keys(validationErrors).length > 0) {
      setReAdmitValidationErrors(validationErrors);
      toast({
        title: 'Required Inputs Missing',
        description: 'Please provide email, password, and year level.',
        variant: 'destructive',
      });
      return;
    }

    if (!supabase) {
      setReAdmitError('Supabase client not initialized.');
      toast({
        title: 'Failed to Re-Admit Student',
        description: 'Supabase client not initialized.',
        variant: 'destructive',
      });
      return;
    }

    setReAdmittingStudent(true);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: reAdmitConfirmEmail,
        password: reAdmitConfirmPassword,
      });
      if (signInError) {
        setReAdmitError('Invalid email or password.');
        toast({
          title: 'Invalid Credentials',
          description: 'Invalid email or password.',
          variant: 'destructive',
        });
        setReAdmittingStudent(false);
        return;
      }

      const { error } = await supabase
        .from('students')
        .update({ status: 'active', substatus: null, level: reAdmitLevel, updated_at: new Date().toISOString() })
        .eq('id', selectedStudent.id);

      if (error) throw error;

      const { data: currentSchoolYear } = await supabase
        .from('school_years')
        .select('id')
        .eq('is_current', true)
        .maybeSingle();

      const { error: deleteScheduleError } = await supabase
        .from('student_schedules')
        .delete()
        .eq('student_lrn', selectedStudent.lrn);

      if (deleteScheduleError) throw deleteScheduleError;

      if (shouldCreateSchedule) {
        const scheduleDays = isEarlyLevel
          ? reAdmitSelectedScheduleDays
          : WEEKDAY_OPTIONS.map((day) => day.label);

        const scheduleRows = scheduleDays.flatMap((day) => {
          const dayConfig = WEEKDAY_OPTIONS.find((item) => item.label === day);
          return reAdmitScheduleSlots.map((slot, slotIndex) => ({
            student_lrn: selectedStudent.lrn,
            school_year_id: currentSchoolYear?.id ?? null,
            day_of_week: day,
            day_number: dayConfig?.dayNumber ?? 1,
            subject: slot.label?.trim() ? `${reAdmitLevel} ${slot.label.trim()}` : `${reAdmitLevel} Session ${slotIndex + 1}`,
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

        if (scheduleError) throw scheduleError;
      }

      setReAdmitDialogOpen(false);
      setSelectedStudent(null);
      await fetchAllStudents();
      toast({ title: 'Student re-admitted', description: 'Student has been returned to current students with an updated level and schedule.' });
    } catch (err) {
      setReAdmitError('Failed to re-admit student.');
      toast({
        title: 'Failed to Re-Admit Student',
        description: err instanceof Error ? err.message : 'Failed to re-admit student.',
        variant: 'destructive',
      });
    } finally {
      setReAdmittingStudent(false);
      setReAdmitConfirmEmail('');
      setReAdmitConfirmPassword('');
      setReAdmitLevel('');
      setReAdmitSelectedScheduleDays(WEEKDAY_OPTIONS.map((d) => d.label));
      setReAdmitScheduleSlots([...DEFAULT_SCHEDULE_SLOTS]);
      setReAdmitValidationErrors({});
    }
  };

  const toggleReAdmitScheduleDay = (dayLabel: string) => {
    setReAdmitSelectedScheduleDays((prev) =>
      prev.includes(dayLabel) ? prev.filter((day) => day !== dayLabel) : [...prev, dayLabel],
    );
  };

  const addReAdmitScheduleSlot = () => {
    setReAdmitScheduleSlots((prev) => [
      ...prev,
      {
        label: `Session ${prev.length + 1}`,
        startTime: '08:00',
        endTime: '09:00',
      },
    ]);
  };

  const updateReAdmitScheduleSlot = (index: number, key: 'label' | 'startTime' | 'endTime', value: string) => {
    setReAdmitScheduleSlots((prev) =>
      prev.map((slot, slotIndex) => (slotIndex === index ? { ...slot, [key]: value } : slot)),
    );
  };

  const removeReAdmitScheduleSlot = (index: number) => {
    setReAdmitScheduleSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, slotIndex) => slotIndex !== index);
    });
  };

  const isReAdmitEarlyLevel = EARLY_LEVEL_OPTIONS.includes(reAdmitLevel);
  const isReAdmitGradeLevel = GRADE_LEVEL_OPTIONS.includes(reAdmitLevel);
  const shouldShowReAdmitScheduleConfig = isReAdmitEarlyLevel || isReAdmitGradeLevel;

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

      await fetchAllStudents();

      toast({
        title: 'Import completed',
        description: `Imported ${parsed.rows.length} student records. Skipped ${parsed.skippedMissingRequired} missing required and ${parsed.skippedEmpty} empty rows.`,
      });
    } catch (error) {
      console.error('Error importing students:', error);
      toast({
        title: 'Import failed',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    } finally {
      setImportingStudents(false);
      event.target.value = '';
    }
  };

  return (
    <DashboardLayout>
      {loading ? (
        <MasterlistPageSkeleton />
      ) : (
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Archive size={32} className="text-primary" />
              Student Masterlist
            </h1>
            <p className="text-muted-foreground font-medium">Complete archive of all recorded students from previous to current generations</p>
          </div>
          <div className="flex w-full sm:w-auto flex-wrap gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportStudents}
              className="hidden"
            />
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={() => setShowFilters(!showFilters)}>
              <Search size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => importInputRef.current?.click()}
              disabled={importingStudents}
            >
              <Upload size={16} />
              {importingStudents ? 'Importing...' : 'Import'}
            </Button>
            <Button variant="secondary" className="gap-2 flex-1 sm:flex-none" onClick={exportMasterlist}>
              <Download size={16} />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 sm:gap-4 animate-slide-in-left">
          {/* Total Records Card */}
          <div className="relative group">
            <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/10 dark:bg-blue-400/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-blue-500/5 dark:bg-blue-400/5 rounded-full -ml-6 -mb-6 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-blue-600 dark:text-blue-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Total Records</p>
                  <div className="text-xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">{students.length}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">all-time student entries</p>
                </div>
                <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-lg shadow-blue-500/25 dark:shadow-blue-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <Archive size={22} />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
            </Card>
          </div>

          {/* Active Students Card */}
          <div className="relative group">
            <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-6 -mb-6 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Active</p>
                  <div className="text-xl sm:text-3xl font-bold text-emerald-600 dark:text-emerald-400">{activeCount}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">currently enrolled</p>
                </div>
                <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <UserCheck size={22} />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
            </Card>
          </div>

          {/* Undergrad Students Card */}
          <div className="relative group">
            <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-6 -mb-6 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Undergrad</p>
                  <div className="text-xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{undergradCount}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">not yet graduated</p>
                </div>
                <div className="hidden sm:flex w-10 h-10 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                  <GraduationCap size={22} />
                </div>
              </CardContent>
              <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
            </Card>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
        <Card className="bg-card border-border/50 shadow-lg card-elevated animate-slide-in-left" style={{ animationDelay: '0.1s' }}>
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter Masterlist</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by LRN, name, or parent..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary hover:border-border transition-colors"
                />
              </div>
              <div className="flex gap-2">
                <Select value={filterGrade} onValueChange={setFilterGrade}>
                  <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary focus:ring-primary hover:border-border transition-colors">
                    <SelectValue placeholder="Filter by level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Levels</SelectItem>
                    <SelectItem value="Toddler & Nursery">Toddler & Nursery</SelectItem>
                    <SelectItem value="Pre-K">Pre-K</SelectItem>
                    <SelectItem value="Kinder 1">Kinder 1</SelectItem>
                    <SelectItem value="Kinder 2">Kinder 2</SelectItem>
                    <SelectItem value="Grade 1">Grade 1</SelectItem>
                    <SelectItem value="Grade 2">Grade 2</SelectItem>
                    <SelectItem value="Grade 3">Grade 3</SelectItem>
                    <SelectItem value="Grade 4">Grade 4</SelectItem>
                    <SelectItem value="Grade 5">Grade 5</SelectItem>
                    <SelectItem value="Grade 6">Grade 6</SelectItem>
                    <SelectItem value="Grade 7">Grade 7</SelectItem>
                    <SelectItem value="Grade 8">Grade 8</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="bg-muted/30 border-border/50 focus:border-primary focus:ring-primary hover:border-border transition-colors">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="undergrad">Undergrad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-muted-foreground font-medium flex items-center md:col-span-4">
                Showing <span className="font-bold text-foreground ml-1 mr-1">{filteredStudents.length}</span> of <span className="font-bold text-foreground ml-1">{students.length}</span> records
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Students Table */}
        <Card className="bg-card border-border/50 shadow-lg card-elevated animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader>
            <CardTitle>Student Records</CardTitle>
            <CardDescription>Complete masterlist of all students ever enrolled in the school</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-border/50 rounded-lg overflow-hidden">
              <Table className="min-w-205">
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/50 hover:bg-muted/50">
                    <TableHead className="text-foreground font-semibold">LRN</TableHead>
                    <TableHead className="text-foreground font-semibold">Name</TableHead>
                    <TableHead className="text-foreground font-semibold">Gender</TableHead>
                    <TableHead className="text-foreground font-semibold">Level</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-foreground font-semibold hidden lg:table-cell">Parent Info</TableHead>
                    <TableHead className="text-foreground text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <TableRow key={student.id} className="border-border/50 hover:bg-muted/50 transition-colors animate-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
                        <TableCell className="font-semibold text-foreground">{student.lrn}</TableCell>
                        <TableCell className="font-semibold text-foreground">{student.name}</TableCell>
                        <TableCell className="text-foreground">{student.gender}</TableCell>
                        <TableCell className="text-foreground">
                          <Badge variant="outline" className="font-medium border-border/60">
                            {student.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground text-center">
                          {(student.status || 'active') === 'active' ? (
                            <Badge className="bg-success/20 text-success border-success/30 font-medium">Active</Badge>
                          ) : student.substatus === 'undergrad' ? (
                            <Badge className="bg-info/20 text-info border-info/30 font-medium">Undergrad</Badge>
                          ) : student.substatus === 'transferred' ? (
                            <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30 font-medium dark:text-blue-300">Transferred</Badge>
                          ) : student.substatus === 'dropped' ? (
                            <Badge className="bg-destructive/20 text-destructive border-destructive/30 font-medium">Dropped</Badge>
                          ) : (
                            <Badge className="bg-muted/20 text-muted-foreground border-muted/30 font-medium">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground hidden lg:table-cell">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-2 text-xs font-medium hover:text-foreground transition-colors">
                              <Mail className="h-3.5 w-3.5 text-primary" />
                              <span className="truncate">{student.parentName}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium hover:text-foreground transition-colors">
                              <Phone className="h-3.5 w-3.5 text-primary" />
                              {student.parentContact}
                            </div>
                            {student.parentEmail && (
                              <div className="flex items-center gap-2 text-xs font-medium hover:text-foreground transition-colors">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate">{student.parentEmail}</span>
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedStudent(student)}
                                className="gap-1.5 hover:bg-muted hover:text-primary transition-colors"
                              >
                                <Eye size={14} />
                                <span className="hidden sm:inline">View</span>
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">{selectedStudent?.name}</DialogTitle>
                                <DialogDescription>
                                  {selectedStudent?.lrn} • {selectedStudent?.level} • {(selectedStudent?.status || 'active') === 'active' ? 'Active' : selectedStudent?.substatus === 'transferred' ? 'Transferred' : selectedStudent?.substatus === 'dropped' ? 'Dropped' : 'Inactive'}
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4">
                                <div className="border-t border-border/40 pt-4">
                                  <h3 className="font-semibold text-foreground mb-3">Complete Details</h3>
                                  <div className="space-y-3">
                                    {selectedStudent && shouldShowAge(selectedStudent.level) && (
                                      <div>
                                        <p className="text-xs text-muted-foreground font-medium">Age</p>
                                        <p className="text-sm text-foreground font-semibold">{calculateAgeWithDecimal(selectedStudent.birthday)} years old</p>
                                      </div>
                                    )}
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium">Gender</p>
                                      <p className="text-sm text-foreground">{selectedStudent?.gender}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium">Birthday</p>
                                      <p className="text-sm text-foreground">{selectedStudent?.birthday}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium">Address</p>
                                      <p className="text-sm text-foreground">{selectedStudent?.address}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium">Status</p>
                                      <p className="text-sm text-foreground capitalize">{(selectedStudent?.status || 'active') === 'active' ? 'Active' : selectedStudent?.substatus === 'transferred' ? 'Transferred' : selectedStudent?.substatus === 'dropped' ? 'Dropped' : 'Inactive'}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground font-medium">Parent/Guardian</p>
                                      <p className="text-sm text-foreground">{selectedStudent?.parentName}</p>
                                      <p className="text-xs text-muted-foreground">{selectedStudent?.parentContact}</p>
                                      {selectedStudent?.parentEmail && (
                                        <p className="text-xs text-muted-foreground">{selectedStudent?.parentEmail}</p>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                  {selectedStudent?.substatus === 'transferred' && (
                                    <div className="flex justify-end pt-2">
                                      <Button variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300" onClick={() => {
                                        setReAdmitValidationErrors({});
                                        setReAdmitError('');
                                        setReAdmitDialogOpen(true);
                                      }}>
                                        <CheckCircle2 className="w-4 h-4" />
                                        Re-Admit Student
                                      </Button>
                                    </div>
                                  )}
                              </div>
                            </DialogContent>
                          </Dialog>

                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Dialog open={reAdmitDialogOpen} onOpenChange={(open) => {
          setReAdmitDialogOpen(open);
          if (open) {
            setReAdmitConfirmEmail('');
            setReAdmitConfirmPassword('');
            setReAdmitLevel(selectedStudent?.level || '');
            setReAdmitSelectedScheduleDays(WEEKDAY_OPTIONS.map((d) => d.label));
            setReAdmitScheduleSlots([...DEFAULT_SCHEDULE_SLOTS]);
            setReAdmitError('');
            setReAdmitValidationErrors({});
          }
        }}>
          <DialogContent className="w-[96vw] max-w-5xl lg:max-w-4xl max-h-[92vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">Re-admit student?</DialogTitle>
              <DialogDescription>
                Set the new grade level and schedule details before re-admitting this student to current records.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Year Level *</label>
                <Select
                  value={reAdmitLevel}
                  onValueChange={(value) => {
                    setReAdmitLevel(value);
                    if (value) {
                      setReAdmitValidationErrors((prev) => ({ ...prev, level: undefined }));
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select Year Level" />
                  </SelectTrigger>
                  <SelectContent>
                    {YEAR_LEVEL_OPTIONS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {reAdmitValidationErrors.level && <div className="text-red-600 text-sm">{reAdmitValidationErrors.level}</div>}
              </div>

              {shouldShowReAdmitScheduleConfig && (
                <div className="rounded-3xl border border-blue-200/70 dark:border-blue-800/50 bg-blue-50/50 dark:bg-blue-950/20 p-5 space-y-5">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">Student Schedule Setup</p>
                    <p className="mt-1 text-xs leading-6 text-blue-700/80 dark:text-blue-400/80">
                      {isReAdmitEarlyLevel
                        ? 'Select weekdays (Monday to Friday). You can choose 3-4 days or fewer, and add multiple daily schedule slots.'
                        : 'Weekdays are automatically set to Monday-Friday for Grades 1-8. Set the daily time slots below.'}
                    </p>
                  </div>

                  {isReAdmitEarlyLevel && (
                    <div className="grid grid-cols-2 gap-2 xl:grid-cols-5">
                      {WEEKDAY_OPTIONS.map((day) => (
                        <label
                          key={day.label}
                          className="flex items-center gap-2 rounded-[18px] border border-slate-200 bg-white/90 px-4 py-3 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900/70"
                        >
                          <input
                            type="checkbox"
                            checked={reAdmitSelectedScheduleDays.includes(day.label)}
                            onChange={() => toggleReAdmitScheduleDay(day.label)}
                            className="h-4 w-4 accent-blue-600"
                          />
                          <span>{day.label}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Daily Time Slots</label>
                      <Button type="button" variant="outline" size="sm" onClick={addReAdmitScheduleSlot} className="rounded-[18px] px-5">
                        Add Slot
                      </Button>
                    </div>
                    <div className="space-y-2">
                      {reAdmitScheduleSlots.map((slot, slotIndex) => (
                        <div key={`${slot.label}-${slotIndex}`} className="grid grid-cols-1 items-center gap-3 rounded-[20px] border border-slate-200 bg-white/80 p-3 shadow-sm md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1fr)_auto] dark:border-slate-700 dark:bg-slate-900/65">
                          <Input
                            value={slot.label}
                            onChange={(e) => updateReAdmitScheduleSlot(slotIndex, 'label', e.target.value)}
                            placeholder={`Session ${slotIndex + 1}`}
                            className="h-12 rounded-[18px] border-blue-200 bg-white dark:bg-slate-950"
                          />
                          <Input
                            type="time"
                            value={slot.startTime}
                            onChange={(e) => updateReAdmitScheduleSlot(slotIndex, 'startTime', e.target.value)}
                            className="h-12 rounded-[18px] border-blue-200 bg-white dark:bg-slate-950"
                          />
                          <Input
                            type="time"
                            value={slot.endTime}
                            onChange={(e) => updateReAdmitScheduleSlot(slotIndex, 'endTime', e.target.value)}
                            className="h-12 rounded-[18px] border-blue-200 bg-white dark:bg-slate-950"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            disabled={reAdmitScheduleSlots.length <= 1}
                            onClick={() => removeReAdmitScheduleSlot(slotIndex)}
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

              <input type="text" name="fakeusernameremembered_re_admit" autoComplete="username" style={{ display: 'none' }} tabIndex={-1} />
              <Input
                type="email"
                name="confirm_email_re_admit"
                value={reAdmitConfirmEmail}
                onChange={e => {
                  setReAdmitConfirmEmail(e.target.value);
                  if (e.target.value.trim()) {
                    setReAdmitValidationErrors((prev) => ({ ...prev, email: undefined }));
                  }
                }}
                placeholder="Enter your email"
                autoComplete="new-password"
                disabled={reAdmittingStudent}
              />
              {reAdmitValidationErrors.email && <div className="text-red-600 text-sm">{reAdmitValidationErrors.email}</div>}
              <Input
                type="password"
                name="confirm_password_re_admit"
                value={reAdmitConfirmPassword}
                onChange={e => {
                  setReAdmitConfirmPassword(e.target.value);
                  if (e.target.value.trim()) {
                    setReAdmitValidationErrors((prev) => ({ ...prev, password: undefined }));
                  }
                }}
                placeholder="Enter your password"
                autoComplete="new-password"
                disabled={reAdmittingStudent}
              />
              {reAdmitValidationErrors.password && <div className="text-red-600 text-sm">{reAdmitValidationErrors.password}</div>}
              {reAdmitError && <div className="text-red-600 text-sm">{reAdmitError}</div>}
            </div>
            <div className="flex gap-3 justify-end mt-6">
              <Button variant="outline" onClick={() => setReAdmitDialogOpen(false)} disabled={reAdmittingStudent}>Cancel</Button>
              <Button variant="default" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={handleReAdmitStudent} disabled={reAdmittingStudent}>
                {reAdmittingStudent ? 'Re-Admitting...' : 'Re-Admit Student'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      )}
    </DashboardLayout>
  );
}
