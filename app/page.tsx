'use client';

import { useState, useEffect } from 'react';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Clock, AlertTriangle, TrendingUp, Download, CheckCircle, UserCheck, Calendar, Activity } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export default function Dashboard() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sample data
  const stats = {
    totalPresent: 156,
    totalStudents: 180,
    lateArrivals: 12,
    earlyDepartures: 8,
    absent: 24
  };

  const recentEvents = [
    { id: 1, student: 'Sarah Johnson', grade: '10A', event: 'Check In', time: '08:15 AM', status: 'on-time' },
    { id: 2, student: 'James Smith', grade: '9B', event: 'Check In', time: '08:32 AM', status: 'late' },
    { id: 3, student: 'Emily Davis', grade: '11C', event: 'Check Out', time: '02:45 PM', status: 'verified' },
    { id: 4, student: 'Michael Brown', grade: '10A', event: 'Check In', time: '08:45 AM', status: 'late' },
    { id: 5, student: 'Jessica White', grade: '12A', event: 'Check Out', time: '02:30 PM', status: 'early' },
    { id: 6, student: 'David Wilson', grade: '9A', event: 'Check In', time: '08:10 AM', status: 'on-time' },
    { id: 7, student: 'Lisa Anderson', grade: '11B', event: 'Check In', time: '08:20 AM', status: 'on-time' },
    { id: 8, student: 'Robert Taylor', grade: '10C', event: 'Check Out', time: '03:00 PM', status: 'verified' },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'on-time':
      case 'verified':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'late':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'early':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header Section */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome Back!</h1>
            <p className="text-lg text-muted-foreground">Real-time student attendance monitoring</p>
          </div>
          {time && (
            <div className="hidden sm:block text-right p-4 rounded-xl bg-card border border-border shadow-md">
              <p className="text-xs text-muted-foreground mb-1">Current Time</p>
              <p className="text-2xl font-bold font-mono text-primary">{time}</p>
            </div>
          )}
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-4 mb-6">
          <label className="text-sm font-medium text-foreground">Date:</label>
          <Select value={selectedDate} onValueChange={setSelectedDate}>
            <SelectTrigger className="w-[200px]">
              <SelectValue>{new Date(selectedDate).toLocaleDateString()}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={new Date().toISOString().split('T')[0]}>Today</SelectItem>
              <SelectItem value={new Date(Date.now() - 86400000).toISOString().split('T')[0]}>Yesterday</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" className="ml-auto gap-2">
            <Download size={16} />
            Export Report
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Present</CardTitle>
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">{stats.totalPresent}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {((stats.totalPresent / stats.totalStudents) * 100).toFixed(1)}% of {stats.totalStudents} students
              </p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-200 dark:border-yellow-800 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Late Arrivals</CardTitle>
                <Clock className="w-4 h-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">{stats.lateArrivals}</div>
              <p className="text-xs text-muted-foreground mt-1">Students arrived after 8:30 AM</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Early Departures</CardTitle>
                <TrendingUp className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">{stats.earlyDepartures}</div>
              <p className="text-xs text-muted-foreground mt-1">Left before 3:00 PM</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30 border-red-200 dark:border-red-800 shadow-lg hover:shadow-xl transition-all">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Absent Today</CardTitle>
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-600">{stats.absent}</div>
              <p className="text-xs text-muted-foreground mt-1">No attendance recorded</p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity Table */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Live attendance events for {new Date(selectedDate).toLocaleDateString()}</CardDescription>
              </div>
              <Button variant="outline" size="sm">View All</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border border-border rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-muted">
                  <TableRow className="border-border">
                    <TableHead className="text-foreground">Student</TableHead>
                    <TableHead className="text-foreground">Grade</TableHead>
                    <TableHead className="text-foreground">Event</TableHead>
                    <TableHead className="text-foreground">Time</TableHead>
                    <TableHead className="text-center text-foreground">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentEvents.map((event) => (
                    <TableRow key={event.id} className="border-border hover:bg-muted/50 transition-colors">
                      <TableCell className="font-medium text-foreground">{event.student}</TableCell>
                      <TableCell className="text-foreground">{event.grade}</TableCell>
                      <TableCell className="text-foreground">{event.event}</TableCell>
                      <TableCell className="text-muted-foreground">{event.time}</TableCell>
                      <TableCell className="text-center">
                        <Badge className={getStatusColor(event.status)}>
                          {event.status === 'on-time' ? 'On Time' : event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                        </Badge>
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
