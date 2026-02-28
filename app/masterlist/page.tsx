'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Download, Search, Eye, Mail, Phone, Archive } from 'lucide-react';
import { useState, useEffect } from 'react';
import { calculateAgeWithDecimal, shouldShowAge } from '@/lib/age-calculator';
import { supabase, type Student } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { sortByLevel } from '@/lib/level-order';
import { MLDashboard } from '@/components/ml-dashboard';
import { MasterlistSkeleton } from '@/components/loading-skeletons';

// Enforce consistent layout structure for masterlist page
export default function MasterlistPage() {
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

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
        // Default status to 'active' for all students
        status: student.status || 'active',
      }));
      
      // Sort by level order
      setStudents(sortByLevel(mappedStudents));
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

  return (
    <DashboardLayout>
      {loading ? (
        <MasterlistSkeleton />
      ) : (
      <div className="space-y-6 animate-fade-in-up">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
              <Archive size={32} className="text-primary" />
              Student Masterlist
            </h1>
            <p className="text-muted-foreground font-medium">Complete archive of all recorded students from previous to current generations</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" className="gap-2">
              <Download size={16} />
              Export
            </Button>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-slide-in-left">
          <Card className="bg-card border-border/50 shadow-lg card-elevated">
            <CardContent className="pt-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Total Records</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{students.length}</p>
                </div>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Archive size={24} className="text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-lg card-elevated">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Active</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{activeCount}</p>
                </div>
                <div className="shrink-0">
                  <Badge className="bg-success/20 text-success border-success/30 px-3 py-1 text-xs">Active</Badge>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50 shadow-lg card-elevated">
            <CardContent className="pt-6">
              <div className="flex justify-between items-center gap-4">
                <div>
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wide">Graduated</p>
                  <p className="text-3xl font-bold text-foreground mt-2">{graduatedCount}</p>
                </div>
                <div className="shrink-0">
                  <Badge className="bg-info/20 text-info border-info/30 px-3 py-1 text-xs">Graduated</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
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
                                    {shouldShowAge(selectedStudent?.level) && (
                                      <div>
                                        <p className="text-xs text-muted-foreground font-medium">Age</p>
                                        <p className="text-sm text-foreground font-semibold">{calculateAgeWithDecimal(selectedStudent?.birthday)} years old</p>
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
