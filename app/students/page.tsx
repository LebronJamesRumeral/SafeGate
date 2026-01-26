'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Download, Search, Eye, Mail, Phone } from 'lucide-react';
import { useState } from 'react';

export default function StudentsPage() {
  const [search, setSearch] = useState('');
  const [filterGrade, setFilterGrade] = useState('all');

  // Sample data
  const students = [
    { id: 1, name: 'Sarah Johnson', grade: '10A', email: 'sarah.j@school.edu', phone: '555-0101', status: 'active', attendance: 95.2 },
    { id: 2, name: 'James Smith', grade: '9B', email: 'james.s@school.edu', phone: '555-0102', status: 'active', attendance: 87.5 },
    { id: 3, name: 'Emily Davis', grade: '11C', email: 'emily.d@school.edu', phone: '555-0103', status: 'active', attendance: 92.8 },
    { id: 4, name: 'Michael Brown', grade: '10A', email: 'michael.b@school.edu', phone: '555-0104', status: 'active', attendance: 88.3 },
    { id: 5, name: 'Jessica White', grade: '12A', email: 'jessica.w@school.edu', phone: '555-0105', status: 'active', attendance: 96.7 },
    { id: 6, name: 'David Wilson', grade: '9A', email: 'david.w@school.edu', phone: '555-0106', status: 'active', attendance: 91.5 },
    { id: 7, name: 'Lisa Anderson', grade: '11B', email: 'lisa.a@school.edu', phone: '555-0107', status: 'active', attendance: 89.2 },
    { id: 8, name: 'Robert Taylor', grade: '10C', email: 'robert.t@school.edu', phone: '555-0108', status: 'active', attendance: 93.1 },
  ];

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(search.toLowerCase()) ||
                          student.email.toLowerCase().includes(search.toLowerCase());
    const matchesGrade = filterGrade === 'all' || student.grade === filterGrade;
    return matchesSearch && matchesGrade;
  });

  const getAttendanceColor = (attendance: number) => {
    if (attendance >= 95) return 'text-green-600 font-semibold';
    if (attendance >= 85) return 'text-blue-600 font-semibold';
    if (attendance >= 75) return 'text-yellow-600 font-semibold';
    return 'text-red-600 font-semibold';
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Student Management</h1>
            <p className="text-muted-foreground">Manage student records and attendance tracking</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2">
              <Download size={16} />
              Export
            </Button>
            <Button className="gap-2">
              <UserPlus size={16} />
              Add Student
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="bg-card border-border shadow-md">
          <CardHeader>
            <CardTitle className="text-lg">Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search students..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={filterGrade} onValueChange={setFilterGrade}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="9A">Grade 9A</SelectItem>
                  <SelectItem value="9B">Grade 9B</SelectItem>
                  <SelectItem value="10A">Grade 10A</SelectItem>
                  <SelectItem value="10C">Grade 10C</SelectItem>
                  <SelectItem value="11B">Grade 11B</SelectItem>
                  <SelectItem value="11C">Grade 11C</SelectItem>
                  <SelectItem value="12A">Grade 12A</SelectItem>
                </SelectContent>
              </Select>
              <div className="text-sm text-muted-foreground flex items-center">
                Showing {filteredStudents.length} of {students.length} students
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Students Table */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle>Student Directory</CardTitle>
            <CardDescription>Complete list of enrolled students</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow className="border-border">
                    <TableHead className="text-foreground">Name</TableHead>
                    <TableHead className="text-foreground">Grade</TableHead>
                    <TableHead className="text-foreground">Contact</TableHead>
                    <TableHead className="text-foreground text-right">Attendance</TableHead>
                    <TableHead className="text-foreground text-center">Status</TableHead>
                    <TableHead className="text-foreground text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-foreground">{student.name}</TableCell>
                      <TableCell className="text-foreground">
                        <Badge variant="outline" className="font-medium">
                          {student.grade}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 text-xs">
                            <Mail className="h-3 w-3" />
                            {student.email}
                          </div>
                          <div className="flex items-center gap-2 text-xs">
                            <Phone className="h-3 w-3" />
                            {student.phone}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className={getAttendanceColor(student.attendance)}>
                          {student.attendance}%
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                          Active
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button variant="ghost" size="sm" className="gap-1">
                          <Eye size={14} />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
