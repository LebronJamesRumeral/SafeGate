"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { getParentStudents } from '@/lib/parent-data';
import { supabase } from '@/lib/supabase';
import { Users, Search } from 'lucide-react';

export default function ParentAttendancePage() {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  // Removed search state
  const [attendanceLogs, setAttendanceLogs] = useState<any>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    const parentEmail = user.username;
    if (parentEmail) {
      setLoading(true);
      getParentStudents(parentEmail).then(async (data) => {
        setChildren(data);
        if (!supabase) {
          setAttendanceLogs({});
          setLoading(false);
          return;
        }
        const logs: any = {};
        for (const child of data) {
          const { data: attLogs } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('student_lrn', child.lrn)
            .order('date', { ascending: false });
          logs[child.lrn] = attLogs || [];
        }
        setAttendanceLogs(logs);
        setLoading(false);
      });
    }
  }, [authLoading, user, user?.username]);

  if (authLoading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // Show all children, no filtering
  const filteredChildren = children;

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up px-2 sm:px-0">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white font-mono mb-1">Parent Attendance</h1>
            <p className="text-slate-600 dark:text-slate-400 font-mono text-base">View your linked children and attendance logs.</p>
          </div>
        </div>
        <Card className="border-0 bg-white dark:bg-slate-900 shadow-xl rounded-2xl card-elevated animate-fade-in-up overflow-x-auto">
          <CardHeader className="border-b border-blue-100/40 dark:border-blue-800/30 bg-linear-to-r from-blue-50/50 to-transparent dark:from-blue-950/20 dark:to-transparent pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/40">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white font-mono">Children Attendance</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-mono">View attendance logs for each child</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search removed for redesign */}
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading attendance logs...</div>
            ) : filteredChildren.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No children linked to your account.</div>
            ) : (
              <Accordion type="single" collapsible className="w-full">
                {filteredChildren.map((child) => (
                  <AccordionItem key={child.id} value={String(child.id)}>
                    <AccordionTrigger className="text-lg font-bold">
                      {child.name} ({child.level})
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="border border-border/50 rounded-lg overflow-x-auto">
                        <Table>
                          <TableHeader className="bg-muted/40">
                            <TableRow className="border-border/50 hover:bg-muted/50">
                              <TableHead className="text-foreground font-semibold">Date</TableHead>
                              <TableHead className="text-foreground font-semibold">Check In</TableHead>
                              <TableHead className="text-foreground font-semibold">Check Out</TableHead>
                              <TableHead className="text-foreground font-semibold">Status</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {(attendanceLogs[child.lrn] || []).length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">No attendance records found.</TableCell>
                              </TableRow>
                            ) : (
                              attendanceLogs[child.lrn].slice(0, 10).map((log: any) => (
                                <TableRow key={log.id} className="border-border/50 hover:bg-muted/50 transition-colors animate-fade-in-up">
                                  <TableCell className="py-4 px-6 text-base">{log.date}</TableCell>
                                  <TableCell className="py-4 px-6 text-base">{log.check_in_time ? new Date(log.check_in_time).toLocaleTimeString() : '-'}</TableCell>
                                  <TableCell className="py-4 px-6 text-base">{log.check_out_time ? new Date(log.check_out_time).toLocaleTimeString() : '-'}</TableCell>
                                  <TableCell className="py-4 px-6 text-base">
                                    <Badge className={log.attendance_status === 'present' ? 'bg-emerald-100 text-emerald-700 border-0 text-xs' : log.attendance_status === 'late' ? 'bg-orange-100 text-orange-700 border-0 text-xs' : 'bg-gray-100 text-gray-700 border-0 text-xs'}>
                                      {log.attendance_status.charAt(0).toUpperCase() + log.attendance_status.slice(1)}
                                    </Badge>
                                  </TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
