'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, TrendingUp, TrendingDown, Users } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';

export default function AnalyticsPage() {
  const [timePeriod, setTimePeriod] = useState('week');

  // Sample data
  const weeklyStats = [
    { day: 'Mon', present: 165, absent: 15, late: 8 },
    { day: 'Tue', present: 170, absent: 10, late: 6 },
    { day: 'Wed', present: 168, absent: 12, late: 7 },
    { day: 'Thu', present: 172, absent: 8, late: 5 },
    { day: 'Fri', present: 156, absent: 24, late: 12 },
  ];

  const gradeStats = [
    { grade: 'Grade 9', total: 45, present: 42, attendance: 93.3 },
    { grade: 'Grade 10', total: 48, present: 45, attendance: 93.8 },
    { grade: 'Grade 11', total: 42, present: 38, attendance: 90.5 },
    { grade: 'Grade 12', total: 45, present: 41, attendance: 91.1 },
  ];

  const maxPresent = Math.max(...weeklyStats.map(s => s.present));

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Analytics & Reports</h1>
            <p className="text-muted-foreground">Comprehensive attendance insights and trends</p>
          </div>
          <Button className="gap-2">
            <Download size={16} />
            Export Report
          </Button>
        </div>

        {/* Time Period Filter */}
        <div className="flex items-center gap-4">
          <label className="text-sm font-medium text-foreground">Time Period:</label>
          <Select value={timePeriod} onValueChange={setTimePeriod}>
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
              <SelectItem value="year">This Year</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30 border-green-200 dark:border-green-800 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Average Attendance</CardTitle>
                <TrendingUp className="w-4 h-4 text-green-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">92.1%</div>
              <p className="text-xs text-muted-foreground mt-1">+2.3% from last week</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 dark:from-blue-950/30 dark:to-cyan-950/30 border-blue-200 dark:border-blue-800 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Students</CardTitle>
                <Users className="w-4 h-4 text-blue-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">180</div>
              <p className="text-xs text-muted-foreground mt-1">Across 4 grade levels</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 dark:from-yellow-950/30 dark:to-amber-950/30 border-yellow-200 dark:border-yellow-800 shadow-lg">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-medium text-muted-foreground">Late Arrivals</CardTitle>
                <TrendingDown className="w-4 h-4 text-yellow-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-yellow-600">38</div>
              <p className="text-xs text-muted-foreground mt-1">-5 from last week</p>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Attendance Chart */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle>Weekly Attendance Trend</CardTitle>
            <CardDescription>Daily attendance breakdown for this week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyStats.map((stat) => (
                <div key={stat.day} className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium text-foreground">{stat.day}</span>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="text-green-600 font-semibold">Present: {stat.present}</span>
                      <span className="text-red-600 font-semibold">Absent: {stat.absent}</span>
                      <span className="text-yellow-600 font-semibold">Late: {stat.late}</span>
                    </div>
                  </div>
                  <div className="flex gap-1 h-8">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-l transition-all hover:opacity-80"
                      style={{ width: `${(stat.present / maxPresent) * 100}%` }}
                      title={`Present: ${stat.present}`}
                    />
                    <div
                      className="bg-gradient-to-r from-red-500 to-rose-500 transition-all hover:opacity-80"
                      style={{ width: `${(stat.absent / maxPresent) * 100}%` }}
                      title={`Absent: ${stat.absent}`}
                    />
                    <div
                      className="bg-gradient-to-r from-yellow-500 to-amber-500 rounded-r transition-all hover:opacity-80"
                      style={{ width: `${(stat.late / maxPresent) * 100}%` }}
                      title={`Late: ${stat.late}`}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Grade-wise Attendance */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <CardTitle>Attendance by Grade</CardTitle>
            <CardDescription>Performance comparison across grade levels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {gradeStats.map((grade) => (
                <div key={grade.grade} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-foreground">{grade.grade}</span>
                    <div className="text-sm text-muted-foreground">
                      {grade.present}/{grade.total} students • {grade.attendance}%
                    </div>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-accent rounded-full transition-all"
                      style={{ width: `${grade.attendance}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
