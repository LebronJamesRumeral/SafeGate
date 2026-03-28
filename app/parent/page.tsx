"use client";


import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getParentStudents } from '@/lib/parent-data';
import { supabase } from '@/lib/supabase';
import { Users, CheckCircle, AlertCircle, GraduationCap, Search } from 'lucide-react';

export default function ParentDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState('attendance');
  const [attendanceLogs, setAttendanceLogs] = useState<any>({});
  const [behavioralEvents, setBehavioralEvents] = useState<any>({});
  // TODO: Add notification state

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    if (user.role !== "parent") {
      router.push("/");
      return;
    }
    const parentEmail = user.username;
    if (parentEmail) {
      setLoading(true);
      getParentStudents(parentEmail).then(async (data) => {
        setChildren(data);
        if (!supabase) {
          setAttendanceLogs({});
          setBehavioralEvents({});
          setLoading(false);
          return;
        }
        // Fetch attendance logs and behavioral events for each child
        const logs: any = {};
        const events: any = {};
        for (const child of data) {
          // Attendance logs
          const { data: attLogs } = await supabase
            .from('attendance_logs')
            .select('*')
            .eq('student_lrn', child.lrn)
            .order('date', { ascending: false });
          logs[child.lrn] = attLogs || [];
          // Behavioral events (approved only)
          const { data: behEvents } = await supabase
            .from('behavioral_events')
            .select('*')
            .eq('student_lrn', child.lrn)
            .eq('guidance_status', 'approved')
            .order('event_date', { ascending: false });
          events[child.lrn] = behEvents || [];
        }
        setAttendanceLogs(logs);
        setBehavioralEvents(events);
        setLoading(false);
      });
    }
  }, [authLoading, user, user?.username, router]);

  if (authLoading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

  // Filter children by search
  const filteredChildren = children.filter((child) => {
    const term = search.toLowerCase();
    return (
      child.name?.toLowerCase().includes(term) ||
      child.level?.toLowerCase().includes(term)
    );
  });

  return (
    <DashboardLayout>
      <div className="space-y-6 animate-fade-in-up">
        {/* Page Header - match main dashboard style */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-linear-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Parent Dashboard
            </h1>
            <p className="text-base text-slate-600 dark:text-slate-400 mt-2">
              View your linked children and notifications.
            </p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Children Linked */}
          <Card className="border-0 bg-linear-to-br from-sky-50 to-white dark:from-sky-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/10 dark:bg-sky-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-sky-500/5 dark:bg-sky-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-sky-600 dark:text-sky-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Children Linked</p>
                <div className="text-xl sm:text-4xl font-bold text-sky-600 dark:text-sky-400">{children.length}</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Total children linked</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-sky-500 to-sky-600 text-white items-center justify-center shadow-lg shadow-sky-500/25 dark:shadow-sky-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <Users className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-sky-400 to-sky-600 dark:from-sky-500 dark:to-sky-700" />
          </Card>

          {/* Attendance Card */}
          <Card className="border-0 bg-linear-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 dark:bg-emerald-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-emerald-500/5 dark:bg-emerald-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-emerald-600 dark:text-emerald-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Attendance Records</p>
                <div className="text-xl sm:text-4xl font-bold text-emerald-600 dark:text-emerald-400">{
                  Object.values(attendanceLogs).reduce((acc: number, logs: any) => acc + (Array.isArray(logs) ? logs.length : 0), 0)
                }</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Total attendance logs</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-emerald-500 to-emerald-600 text-white items-center justify-center shadow-lg shadow-emerald-500/25 dark:shadow-emerald-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <CheckCircle className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-emerald-400 to-emerald-600 dark:from-emerald-500 dark:to-emerald-700" />
          </Card>

          {/* Behavior Card */}
          <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/80 shadow-xl overflow-hidden relative group hover:shadow-2xl transition-all duration-300">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 dark:bg-orange-400/5 rounded-full -mr-16 -mt-16 group-hover:scale-150 transition-transform duration-500" />
            <div className="absolute bottom-0 left-0 w-16 h-16 bg-orange-500/5 dark:bg-orange-400/5 rounded-full -ml-8 -mb-8 group-hover:scale-150 transition-transform duration-500" />
            <CardContent className="p-3 sm:p-6 flex items-center justify-between relative z-10">
              <div>
                <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-semibold mb-1 sm:mb-2 uppercase tracking-wider leading-tight">Behavioral Events</p>
                <div className="text-xl sm:text-4xl font-bold text-orange-600 dark:text-orange-400">{
                  Object.values(behavioralEvents).reduce((acc: number, events: any) => acc + (Array.isArray(events) ? events.length : 0), 0)
                }</div>
                <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 mt-1 sm:mt-2 leading-tight">Total behavioral events</p>
              </div>
              <div className="hidden sm:flex w-16 h-16 rounded-2xl bg-linear-to-br from-orange-500 to-orange-600 text-white items-center justify-center shadow-lg shadow-orange-500/25 dark:shadow-orange-500/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300">
                <AlertCircle className="w-8 h-8" />
              </div>
            </CardContent>
            <div className="h-1 w-full bg-linear-to-r from-orange-400 to-orange-600 dark:from-orange-500 dark:to-orange-700" />
          </Card>
        </div>

        {/* Notifications section is handled in the header, nothing to render here. */}
      </div>
    </DashboardLayout>
  );
}
