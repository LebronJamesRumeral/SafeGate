'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { TimePickerInput } from '@/components/time-picker-input';
import { Download, Search, Eye, Mail, Phone, Archive, Upload, CheckCircle2, ChevronLeft, ChevronRight, Calendar, User, MapPin, Filter, Loader2 } from 'lucide-react';
import { UserCheck, GraduationCap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { calculateAgeWithDecimal, shouldShowAge } from '@/lib/age-calculator';
import { supabase, type Student } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { sortByLevel } from '@/lib/level-order';
import { AnimatePresence, motion } from 'framer-motion';

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
  const [savingStudentInfo, setSavingStudentInfo] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;
  
  const [importingStudents, setImportingStudents] = useState(false);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, filterGrade, filterStatus]);

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
        parent2Name: student.parent2_name || null,
        parent2Contact: student.parent2_contact || null,
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

  const handleReactivateById = async (studentId: number) => {
    if (!studentId || !supabase) return;
    setSavingStudentInfo(true);
    try {
      const { error } = await supabase
        .from('students')
        .update({ status: 'active', substatus: null, updated_at: new Date().toISOString() })
        .eq('id', studentId);

      if (error) {
        toast({ title: 'Failed to reactivate', description: error.message || String(error), variant: 'destructive' });
        return;
      }

      await fetchAllStudents();
      toast({ title: 'Student reactivated', description: 'Student is now active.' });
    } catch (err) {
      toast({ title: 'Failed to reactivate', description: err instanceof Error ? err.message : String(err), variant: 'destructive' });
    } finally {
      setSavingStudentInfo(false);
    }
  };

  // Only show students whose level is in YEAR_LEVEL_OPTIONS
  const filteredStudents = students
    .filter(student => {
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
    })
    .sort((a, b) => {
      const aName = (a.name || '').toLowerCase();
      const bName = (b.name || '').toLowerCase();
      const byName = aName.localeCompare(bName);
      if (byName !== 0) return byName;
      return (a.lrn || '').localeCompare(b.lrn || '');
    });

  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const paginatedStudents = filteredStudents.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const showingFrom = filteredStudents.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const showingTo = Math.min(currentPage * PAGE_SIZE, filteredStudents.length);

  // Count statistics
  const activeCount = students.filter(s => (s.status || 'active') === 'active').length;
  const undergradCount = students.filter(s => (s.status || 'active') === 'undergrad').length;

  const exportMasterlist = async () => {
    const headers = ['LRN', 'Name', 'Gender', 'Birthday', 'Age', 'Level', 'Risk Level', 'Status', 'Parent/Guardian 1 Name', 'Parent/Guardian 1 Contact', 'Parent/Guardian 1 Email', 'Parent/Guardian 2 Name', 'Parent/Guardian 2 Contact', 'Address'];
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
        'Parent/Guardian 1 Name': student.parentName || '',
        'Parent/Guardian 1 Contact': student.parentContact || '',
        'Parent/Guardian 1 Email': student.parentEmail || '',
        'Parent/Guardian 2 Name': student.parent2Name || '',
        'Parent/Guardian 2 Contact': student.parent2Contact || '',
        Address: student.address || '',
      };
    });

    const baseFileName = 'masterlist of SGCDC';

    // Build Excel using ExcelJS so we can apply the letterhead header with logo
    void (async () => {
      try {
        const mod = await import('exceljs');
        const ExcelJS = (mod && (mod.default || mod)) as any;

        const theme = {
          slate200: 'FFE2E8F0',
          slate100: 'FFF1F5F9',
          slate50: 'FFF8FAFC',
          slate900: 'FF0F172A',
          slate500: 'FF64748B',
          white: 'FFFFFFFF',
        };

        const solidFill = (argb: string) => ({ type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb } });
        const borderAll = (argb = theme.slate200) => ({ top: { style: 'thin' as any, color: { argb } }, left: { style: 'thin' as any, color: { argb } }, bottom: { style: 'thin' as any, color: { argb } }, right: { style: 'thin' as any, color: { argb } } });
        const blobToBase64 = (blob: Blob) => new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => { const result = reader.result as string; resolve(result.split(',')[1] || ''); };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        const wb = new ExcelJS.Workbook();
        wb.creator = 'SafeGate';
        wb.created = new Date();
        wb.title = 'SGCDC Masterlist';

        const colNumberToName = (n: number) => {
          let s = '';
          while (n > 0) {
            const m = (n - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            n = Math.floor((n - 1) / 26);
          }
          return s;
        };

        const applyEmailHeader = async (sheet: any) => {
          sheet.properties.defaultRowHeight = 22;
          // keep freeze just after the header rows (2 header rows)
          sheet.views = [{ showGridLines: false, state: 'frozen', ySplit: 3 }];
          sheet.pageSetup = { orientation: 'landscape', paperSize: 9, fitToPage: true, fitToWidth: 1, fitToHeight: 0, margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 } };
          // ensure sheet.columns is sized to headers length (set earlier)

          try {
            const logoResponse = await fetch('/SGCDC.png');
            if (logoResponse.ok) {
              const logoBlob = await logoResponse.blob();
              const logoBase64 = await blobToBase64(logoBlob);
              const img = new (window as any).Image();
              img.src = `data:image/png;base64,${logoBase64}`;
              await new Promise<void>((resolve, reject) => { img.onload = () => resolve(); img.onerror = (e: any) => reject(e); });
              const maxHeight = 72;
              const ratio = (img.naturalWidth && img.naturalHeight) ? img.naturalWidth / img.naturalHeight : 1;
              const height = Math.min(maxHeight, img.naturalHeight || maxHeight);
              const width = Math.round(height * ratio);
              const logoId = wb.addImage({ base64: logoBase64, extension: 'png' });
              // center the logo across the header width
              const lastCol = Math.max(1, (sheet.columns && sheet.columns.length) || 1);
              const centerCol = lastCol / 2;
              const approxColsForImage = Math.max(1, Math.round(width / 40));
              const tlCol = Math.max(0.25, centerCol - approxColsForImage / 2);
              sheet.addImage(logoId, { tl: { col: tlCol, row: 0.08 }, ext: { width, height }, editAs: 'oneCell' });
            }
          } catch (logoError) {
            console.warn('SGCDC logo could not be embedded in Masterlist export:', logoError);
          }

          sheet.getRow(1).height = 80;
          sheet.getRow(2).height = 44;
          // merge kicker across all columns
          const lastColLetter = colNumberToName(Math.max(1, sheet.columns.length || 1));
          sheet.mergeCells(`A1:${lastColLetter}1`);
          const kickerCell = sheet.getCell('A1');
          kickerCell.value = { richText: [ { text: 'SUBIC GATEWAY CHILD DEVELOPMENT CENTER, INC.\n', font: { name: 'Calibri', size: 14, bold: true, color: { argb: 'FF000000' } } }, { text: 'Building 5144 & 5145, Argonaut Highway, West Kalayaan,\nSubic Bay Freeport Zone, 2222\nTel. No.: (047)639-4690\n', font: { name: 'Calibri', size: 11, color: { argb: 'FF000000' } } }, { text: 'subicgatewayedc@gmail.com', font: { name: 'Calibri', size: 11, color: { argb: 'FF0563C1' } } } ] } as any;
          kickerCell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
          kickerCell.border = borderAll();
        };

        const ws = wb.addWorksheet('Masterlist', { views: [{ state: 'frozen', ySplit: 3 }] });
        // set columns to match headers so header merge covers full data width
        ws.columns = headers.map((h) => ({ width: Math.min(40, Math.max(12, String(h).length + 8)) }));
        await applyEmailHeader(ws);

        // Header row for data (immediately after two header rows)
        const headerRowIndex = 3;
        ws.getRow(headerRowIndex).values = headers;
        ws.getRow(headerRowIndex).eachCell((cell: any) => {
          cell.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF000000' } };
          cell.border = borderAll();
        });

        // Add data rows
        exportRows.forEach((r) => {
          const row = ws.addRow(headers.map((h) => r[h as keyof typeof r]));
          row.eachCell((cell: any) => { cell.font = { name: 'Calibri', size: 10, color: { argb: 'FF000000' } }; cell.border = borderAll(); });
        });

        ws.columns.forEach((c: any, i: number) => { if (!c.width) ws.getColumn(i + 1).width = 18; });

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${baseFileName}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Failed to export masterlist as Excel:', err);
        toast({ title: 'Export failed', description: 'Unable to generate Excel file. Try again or contact support.', variant: 'destructive' });
      }
    })();
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

  const renderStudentDetailsContent = () => (
    <>
      <DialogTitle className="sr-only">
        Student Details - {selectedStudent?.name}
      </DialogTitle>
      <div className="flex flex-col items-center gap-3 sm:gap-4 pt-3 sm:pt-4">
        <Avatar className="h-12 w-12 sm:h-16 sm:w-16 bg-linear-to-br from-blue-400 to-blue-600">
          <AvatarFallback className="text-sm sm:text-lg font-bold text-white">
            {selectedStudent?.name
              .split(' ')
              .slice(0, 2)
              .map(word => word[0])
              .join('')
              .toUpperCase() || 'ST'}
          </AvatarFallback>
        </Avatar>
        <div className="text-center">
          <h2 className="text-lg sm:text-2xl font-bold text-foreground flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
            <span>{selectedStudent?.name}</span>
            {selectedStudent?.is_special_case && (
              <img
                src="/Helping-Hand.png"
                alt="Special Education needs"
                className="h-4 w-4 sm:h-5 sm:w-5 shrink-0"
              />
            )}
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {selectedStudent?.lrn} • {selectedStudent?.level} • {(selectedStudent?.status || 'active') === 'active' ? 'Active' : selectedStudent?.substatus === 'transferred' ? 'Transferred' : selectedStudent?.substatus === 'dropped' ? 'Dropped' : 'Inactive'}
          </p>
        </div>
      </div>
      <div className="space-y-2 sm:space-y-4 pt-2 sm:pt-4">
        <div className="grid grid-cols-1 gap-2 sm:gap-3 sm:grid-cols-2">
          {selectedStudent && shouldShowAge(selectedStudent.level) && (
            <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
              <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Age
              </p>
              <p className="text-sm sm:text-base font-semibold text-foreground">{calculateAgeWithDecimal(selectedStudent.birthday)} years old</p>
            </div>
          )}
          <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 flex items-center gap-1">
              <User className="w-3 h-3" />
              Gender
            </p>
            <p className="text-sm sm:text-base font-semibold text-foreground">{selectedStudent?.gender}</p>
          </div>
          <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              Birthday
            </p>
            <p className="text-sm sm:text-base font-semibold text-foreground">{selectedStudent?.birthday}</p>
          </div>
          <div className="p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              Status
            </p>
            <p className="text-sm sm:text-base font-semibold text-foreground capitalize">{(selectedStudent?.status || 'active') === 'active' ? 'Active' : selectedStudent?.substatus === 'transferred' ? 'Transferred' : selectedStudent?.substatus === 'dropped' ? 'Dropped' : 'Inactive'}</p>
          </div>
          <div className="col-span-1 sm:col-span-2 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-0.5 sm:mb-1 flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              Address
            </p>
            <p className="text-sm sm:text-base font-semibold text-foreground line-clamp-2">{selectedStudent?.address}</p>
          </div>
          <div className="col-span-1 sm:col-span-2 p-2 sm:p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border-2 border-blue-200 dark:border-blue-900/40">
            <p className="text-[11px] sm:text-xs text-muted-foreground mb-1 sm:mb-2 flex items-center gap-1">
              <Mail className="w-3 h-3" />
              Parent/Guardian 1
            </p>
            <p className="text-sm sm:text-base font-semibold text-foreground truncate">{selectedStudent?.parentName}</p>
            {selectedStudent?.parentContact && (
              <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                <Phone className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs sm:text-sm text-foreground truncate">{selectedStudent?.parentContact}</p>
              </div>
            )}
            {selectedStudent?.parentEmail && (
              <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                <Mail className="w-3 h-3 text-muted-foreground" />
                <p className="text-xs sm:text-sm text-foreground truncate">{selectedStudent?.parentEmail}</p>
              </div>
            )}
          </div>
          {selectedStudent?.parent2Name && (
            <div className="col-span-1 sm:col-span-2 p-2 sm:p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border-2 border-amber-200 dark:border-amber-900/40">
              <p className="text-[11px] sm:text-xs text-amber-700 dark:text-amber-300 mb-1 sm:mb-2 flex items-center gap-1 font-semibold">
                <Mail className="w-3 h-3" />
                Parent/Guardian 2
              </p>
              <p className="text-sm sm:text-base font-semibold text-foreground truncate">{selectedStudent?.parent2Name}</p>
              {selectedStudent?.parent2Contact && (
                <div className="flex items-center gap-2 mt-0.5 sm:mt-1">
                  <Phone className="w-3 h-3 text-muted-foreground" />
                  <p className="text-xs sm:text-sm text-foreground truncate">{selectedStudent?.parent2Contact}</p>
                </div>
              )}
            </div>
          )}
        </div>
        {selectedStudent?.substatus === 'transferred' && (
          <div className="flex justify-end pt-1 sm:pt-2">
            <Button variant="outline" className="gap-2 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-300 text-xs sm:text-sm" onClick={() => {
              setReAdmitValidationErrors({});
              setReAdmitError('');
              setReAdmitDialogOpen(true);
            }}>
              <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4" />
              Re-Admit Student
            </Button>
          </div>
        )}
      </div>
    </>
  );

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

      await fetchAllStudents();

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
            <Button
              variant="outline"
              className="gap-2 flex-1 sm:flex-none"
              onClick={() => importInputRef.current?.click()}
              disabled={importingStudents}
            >
              <Upload size={16} />
              {importingStudents ? 'Importing...' : 'Import'}
            </Button>
            <Button variant="outline" className="gap-2 flex-1 sm:flex-none" onClick={exportMasterlist}>
              <Download size={16} />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-3 gap-2 md:grid-cols-3 sm:gap-4">
          {/* Total Records Card */}
          <div className="relative group">
            <Card className="border-0 bg-linear-to-br from-blue-50 to-white dark:from-blue-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-blue-500/15 dark:bg-blue-400/10 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8 group-hover:scale-125 transition-transform duration-500" />
              <CardContent className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] text-blue-600 dark:text-blue-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Total Records</p>
                  <div className="text-base sm:text-lg md:text-2xl font-bold text-blue-600 dark:text-blue-400 leading-tight">{students.length}</div>
                  <p className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">all-time student entries</p>
                </div>
                <div className="hidden md:flex shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-linear-to-br from-blue-500 to-blue-600 text-white items-center justify-center shadow-md shadow-blue-500/20 dark:shadow-blue-500/10 group-hover:scale-105 transition-all duration-300">
                  <Archive className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </div>
              </CardContent>
              <div className="h-0.5 sm:h-1 w-full bg-linear-to-r from-blue-400 to-blue-600 dark:from-blue-500 dark:to-blue-700" />
            </Card>
          </div>

          {/* Active Students Card */}
          <div className="relative group">
            <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-emerald-500/15 dark:bg-emerald-400/10 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8 group-hover:scale-125 transition-transform duration-500" />
              <CardContent className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Active</p>
                  <div className="text-base sm:text-lg md:text-2xl font-bold text-emerald-600 dark:text-emerald-400 leading-tight">{activeCount}</div>
                  <p className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">currently enrolled</p>
                </div>
                <div className="hidden md:flex shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-md shadow-emerald-500/20 dark:shadow-emerald-500/10 group-hover:scale-105 transition-all duration-300">
                  <UserCheck className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </div>
              </CardContent>
              <div className="h-0.5 sm:h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
            </Card>
          </div>

          {/* Undergrad Students Card */}
          <div className="relative group">
            <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-lg overflow-hidden relative group hover:shadow-xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-16 h-16 sm:w-20 sm:h-20 bg-orange-500/15 dark:bg-orange-400/10 rounded-full -mr-6 sm:-mr-8 -mt-6 sm:-mt-8 group-hover:scale-125 transition-transform duration-500" />
              <CardContent className="p-2 sm:p-3 md:p-4 flex items-start justify-between relative z-10 gap-1.5 sm:gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[8px] sm:text-[9px] md:text-[10px] text-orange-600 dark:text-orange-400 font-semibold mb-0.5 uppercase tracking-wide leading-tight">Undergrad</p>
                  <div className="text-base sm:text-lg md:text-2xl font-bold text-orange-600 dark:text-orange-400 leading-tight">{undergradCount}</div>
                  <p className="text-[7px] sm:text-[8px] md:text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 leading-tight">not yet graduated</p>
                </div>
                <div className="hidden md:flex shrink-0 w-8 h-8 sm:w-10 sm:h-10 md:w-14 md:h-14 rounded-lg sm:rounded-xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-md shadow-orange-500/20 dark:shadow-orange-500/10 group-hover:scale-105 transition-all duration-300">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                </div>
              </CardContent>
              <div className="h-0.5 sm:h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
            </Card>
          </div>
        </div>

        {/* Filters */}
        <AnimatePresence>
          {!showFilters ? (
            <motion.div
              key="masterlist-filters-summary"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className="mb-3"
            >
              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/60 bg-slate-50 px-4 py-2 dark:border-slate-700/40 dark:bg-slate-900/50">
                <div className="min-w-0 text-sm truncate">
                  <strong className="mr-2">Filters</strong>
                  <span className="text-muted-foreground">
                    {search.trim() ? `Search: ${search.trim()}` : 'No search'} • {filterGrade === 'all' ? 'All Levels' : filterGrade} • {filterStatus === 'all' ? 'All Status' : filterStatus}
                  </span>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setShowFilters(true)} className="gap-2">
                  Show
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="masterlist-filters-expanded"
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.28 }}
            >
              <Card className="overflow-hidden rounded-[28px] border-0 bg-white shadow-[0_24px_70px_-30px_rgba(15,23,42,0.28)] dark:bg-slate-950/70 dark:shadow-[0_24px_70px_-30px_rgba(15,23,42,0.58)]">
                <CardHeader className="border-b border-blue-100/70 bg-linear-to-r from-white via-blue-50/60 to-white py-3 dark:border-blue-900/30 dark:from-slate-950/80 dark:via-blue-950/10 dark:to-slate-950/80">
                  <div className="flex w-full items-start justify-between">
                    <CardTitle className="flex items-center gap-3 text-lg font-semibold text-slate-900 dark:text-slate-100">
                      <span className="hidden sm:flex h-10 w-10 items-center justify-center rounded-2xl bg-linear-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/20 ring-4 ring-blue-100/70 dark:ring-blue-950/40">
                        <Filter className="w-5 h-5" />
                      </span>
                      Search & Filter Masterlist
                    </CardTitle>
                    <Button size="sm" variant="ghost" onClick={() => setShowFilters(false)} className="gap-2">
                      Hide
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-5">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
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
                    <div className="text-sm font-medium text-muted-foreground flex items-center md:col-span-4">
                      Showing <span className="mx-1 font-bold text-foreground">{filteredStudents.length}</span> of <span className="mx-1 font-bold text-foreground">{students.length}</span> records
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Students (mobile-optimized) */}
        {isMobile ? (
          <div className="space-y-3">
            <div className="flex gap-2 bg-slate-100 dark:bg-slate-800/50 p-1 rounded-lg border border-slate-200 dark:border-slate-700 max-w-md mx-2">
              <div className={`flex-1 px-3 py-1.5 rounded-md font-medium text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm`}>Students</div>
            </div>

            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={`mobile-students-${currentPage}`}
                initial={{ opacity: 0, x: 12, scale: 0.995 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -12, scale: 0.995 }}
                transition={{ duration: 0.22, ease: 'easeOut' }}
                className="space-y-3 px-2"
              >
                {paginatedStudents.map((student) => (
                  <div key={student.id} className="bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800 rounded-xl p-3 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{student.name}</p>
                        <p className="text-xs text-gray-500 truncate">{student.lrn} • {student.level}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="mb-1 flex justify-end">
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
                        </div>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" variant="ghost" onClick={() => setSelectedStudent(student)}>View</Button>
                          </DialogTrigger>
                          <DialogContent className="w-[95vw] max-w-sm sm:max-w-md max-h-[85vh] sm:max-h-[92vh] overflow-y-auto p-3 sm:p-6">
                            {renderStudentDetailsContent()}
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between gap-2 px-2 py-3">
                  <p className="text-xs sm:text-sm truncate">Showing {showingFrom} - {showingTo} of {filteredStudents.length}</p>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}><ChevronLeft className="w-4 h-4"/></Button>
                    <span className="text-xs sm:text-sm whitespace-nowrap">Page {currentPage} / {totalPages}</span>
                    <Button size="sm" variant="outline" onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}><ChevronRight className="w-4 h-4"/></Button>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        ) : (
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
                      <TableHead className="text-foreground font-semibold">Level</TableHead>
                      <TableHead className="text-foreground font-semibold">Status</TableHead>
                      <TableHead className="text-foreground font-semibold hidden lg:table-cell">Parent Info</TableHead>
                      <TableHead className="text-foreground text-center font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No records found
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedStudents.map((student, index) => (
                        <TableRow key={student.id} className="border-border/50 hover:bg-muted/50 transition-colors animate-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
                          <TableCell className="text-foreground">{student.lrn}</TableCell>
                          <TableCell className="text-foreground">
                            <div className="flex items-center gap-2">
                              <span>{student.name}</span>
                              {student.is_special_case && (
                                <img src="/Helping-Hand.png" alt="Special Education needs" className="w-4 h-4 shrink-0" />
                              )}
                            </div>
                          </TableCell>
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
                              <div className="flex items-center gap-2 text-xs hover:text-foreground transition-colors">
                                <Mail className="h-3.5 w-3.5 text-primary" />
                                <span className="truncate">{student.parentName}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs hover:text-foreground transition-colors">
                                <Phone className="h-3.5 w-3.5 text-primary" />
                                {student.parentContact}
                              </div>
                              {student.parentEmail && (
                                <div className="flex items-center gap-2 text-xs hover:text-foreground transition-colors">
                                  <Mail className="h-3.5 w-3.5 text-primary" />
                                  <span className="truncate">{student.parentEmail}</span>
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">
                            {((student.status || '').toLowerCase() === 'inactive' ) && (
                              <Button size="sm" variant="default" className="mr-2" onClick={async () => {
                                await handleReactivateById(student.id);
                              }} disabled={savingStudentInfo}>
                                {savingStudentInfo ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                                Reactivate
                              </Button>
                            )}

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
                              <DialogContent className="w-[95vw] max-w-sm sm:max-w-md max-h-[85vh] sm:max-h-[92vh] overflow-y-auto p-3 sm:p-6">
                                {renderStudentDetailsContent()}
                              </DialogContent>
                            </Dialog>

                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              <div className="flex flex-col gap-2 border-t border-border/40 px-4 py-3 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                <p>
                  Showing <span className="font-semibold text-foreground">{showingFrom}</span> - <span className="font-semibold text-foreground">{showingTo}</span> of <span className="font-semibold text-foreground">{filteredStudents.length}</span> records
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-20 text-center">Page {currentPage} / {totalPages}</span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

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
                          <TimePickerInput
                            value={slot.startTime}
                            onChange={(value) => updateReAdmitScheduleSlot(slotIndex, 'startTime', value)}
                            className="h-12 rounded-[18px] border-blue-200 bg-white dark:bg-slate-950"
                          />
                          <TimePickerInput
                            value={slot.endTime}
                            onChange={(value) => updateReAdmitScheduleSlot(slotIndex, 'endTime', value)}
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
