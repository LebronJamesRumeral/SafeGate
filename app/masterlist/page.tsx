'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Search, Eye, Mail, Phone, Archive, Upload } from 'lucide-react';
import { UserCheck, GraduationCap } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { calculateAgeWithDecimal, shouldShowAge } from '@/lib/age-calculator';
import { supabase, type Student } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { sortByLevel } from '@/lib/level-order';
import { MLDashboard } from '@/components/ml-dashboard';
import { MasterlistSkeleton } from '@/components/loading-skeletons';
import { useIsMobile } from '@/hooks/use-mobile';
import { getStudentImportRequiredFieldsHint, parseStudentImportRows } from '@/lib/student-import';

// Enforce consistent layout structure for masterlist page
export default function MasterlistPage() {
  const isMobile = useIsMobile();
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
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

  const filteredStudents = students.filter(student => {
    const term = search.toLowerCase();
    const matchesSearch = student.name.toLowerCase().includes(term) ||
                          student.lrn.toLowerCase().includes(term) ||
                          student.parentName.toLowerCase().includes(term);
    const matchesLevel = filterGrade === 'all' || student.level === filterGrade;
    const matchesStatus = filterStatus === 'all' || (student.status || 'active') === filterStatus;
    return matchesSearch && matchesLevel && matchesStatus;
  });

  // Count statistics
  const activeCount = students.filter(s => (s.status || 'active') === 'active').length;
  const graduatedCount = students.filter(s => (s.status || 'active') === 'graduated').length;

  const exportMasterlist = async () => {
    const headers = ['LRN', 'Name', 'Gender', 'Birthday', 'Age', 'Level', 'Status', 'Parent Name', 'Parent Contact', 'Parent Email', 'Address'];
    const exportRows = filteredStudents.map((student) => {
      const age = shouldShowAge(student.level) ? calculateAgeWithDecimal(student.birthday) : 'N/A';
      return {
        LRN: student.lrn || '',
        Name: student.name || '',
        Gender: student.gender || '',
        Birthday: student.birthday || '',
        Age: age,
        Level: student.level || '',
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
        <MasterlistSkeleton />
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
          <div className="flex gap-2">
            <input
              ref={importInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleImportStudents}
              className="hidden"
            />
            <Button variant="outline" className="gap-2" onClick={() => setShowFilters(!showFilters)}>
              <Search size={16} />
              {showFilters ? 'Hide Filters' : 'Show Filters'}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => importInputRef.current?.click()}
              disabled={importingStudents}
            >
              <Upload size={16} />
              {importingStudents ? 'Importing...' : 'Import'}
            </Button>
            <Button variant="secondary" className="gap-2" onClick={exportMasterlist}>
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

          {/* Graduated Students Card */}
          <div className="relative group">
            <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden group-hover:shadow-2xl transition-all duration-300">
              <div className="absolute top-0 right-0 w-20 h-20 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-8 -mt-8 group-hover:scale-150 transition-transform duration-500" />
              <div className="absolute bottom-0 left-0 w-12 h-12 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-6 -mb-6 group-hover:scale-150 transition-transform duration-500" />
              <CardContent className="p-4 sm:p-6 flex items-center justify-between relative z-10">
                <div>
                  <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Graduated</p>
                  <div className="text-xl sm:text-3xl font-bold text-orange-600 dark:text-orange-400">{graduatedCount}</div>
                  <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">alumni records</p>
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
                  <SelectItem value="graduated">Graduated</SelectItem>
                </SelectContent>
              </Select>
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
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="border-border/50 hover:bg-muted/50">
                    <TableHead className="text-foreground font-semibold">LRN</TableHead>
                    <TableHead className="text-foreground font-semibold">Name</TableHead>
                    <TableHead className="text-foreground font-semibold">Gender</TableHead>
                    <TableHead className="text-foreground font-semibold">Birthday</TableHead>
                    <TableHead className="text-foreground font-semibold">Level</TableHead>
                    <TableHead className="text-foreground font-semibold">Status</TableHead>
                    <TableHead className="text-foreground font-semibold">Parent Info</TableHead>
                    <TableHead className="text-foreground text-center font-semibold">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredStudents.map((student, index) => (
                      <TableRow key={student.id} className="border-border/50 hover:bg-muted/50 transition-colors animate-fade-in-up" style={{ animationDelay: `${0.3 + index * 0.05}s` }}>
                        <TableCell className="font-semibold text-foreground">{student.lrn}</TableCell>
                        <TableCell className="font-semibold text-foreground">{student.name}</TableCell>
                        <TableCell className="text-foreground">{student.gender}</TableCell>
                        <TableCell className="text-foreground">{student.birthday}</TableCell>
                        <TableCell className="text-foreground">
                          <Badge variant="outline" className="font-medium border-border/60">
                            {student.level}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-foreground">
                          {(student.status || 'active') === 'active' ? (
                            <Badge className="bg-success/20 text-success border-success/30 font-medium">Active</Badge>
                          ) : (
                            <Badge className="bg-info/20 text-info border-info/30 font-medium">Graduated</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
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
                                View
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle className="text-2xl font-bold">{selectedStudent?.name}</DialogTitle>
                                <DialogDescription>{selectedStudent?.lrn} • {selectedStudent?.level} • {(selectedStudent?.status || 'active') === 'active' ? 'Active' : 'Graduated'}</DialogDescription>
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
                                      <p className="text-sm text-foreground capitalize">{(selectedStudent?.status || 'active')}</p>
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
      </div>
      )}
    </DashboardLayout>
  );
}
