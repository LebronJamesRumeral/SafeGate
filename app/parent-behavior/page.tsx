"use client";

import { useAuth } from "@/lib/auth-context";
import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getParentStudents } from '@/lib/parent-data';
import { supabase } from '@/lib/supabase';
import { GraduationCap, Search } from 'lucide-react';

export default function ParentBehaviorPage() {
  const { user, loading: authLoading } = useAuth();
  const [children, setChildren] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [behavioralEvents, setBehavioralEvents] = useState<any>({});

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    const parentEmail = user.username || user.email;
    if (parentEmail) {
      setLoading(true);
      getParentStudents(parentEmail).then(async (data) => {
        setChildren(data);
        if (!supabase) {
          setBehavioralEvents({});
          setLoading(false);
          return;
        }
        const events: any = {};
        for (const child of data) {
          const { data: behEvents } = await supabase
            .from('behavioral_events')
            .select('*')
            .eq('student_lrn', child.lrn)
            .eq('guidance_status', 'approved')
            .order('event_date', { ascending: false });
          events[child.lrn] = behEvents || [];
        }
        setBehavioralEvents(events);
        setLoading(false);
      });
    }
  }, [authLoading, user, user?.username]);

  if (authLoading || !user) {
    return <div className="p-8 text-center">Loading...</div>;
  }

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
        <Card className="border-0 bg-white dark:bg-slate-900 shadow-xl rounded-2xl card-elevated animate-fade-in-up">
          <CardHeader className="border-b border-orange-100/40 dark:border-orange-800/30 bg-linear-to-r from-orange-50/50 to-transparent dark:from-orange-950/20 dark:to-transparent pb-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-orange-100 dark:bg-orange-900/40">
                <GraduationCap className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900 dark:text-white font-mono">Behavioral Events (Approved)</CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-400 font-mono">Events reviewed and approved by guidance</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
              <div className="relative w-full md:w-1/2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or level..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-10 bg-muted/30 border-border/50 focus:border-primary focus:ring-primary hover:border-border transition-colors"
                />
              </div>
            </div>
            {loading ? (
              <div className="py-8 text-center text-muted-foreground">Loading behavioral events...</div>
            ) : filteredChildren.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">No children linked to your account.</div>
            ) : (
              filteredChildren.map((child) => (
                <div key={child.id} className="mb-8">
                  <h3 className="font-bold text-lg mb-2">{child.name} ({child.level})</h3>
                  <div className="border border-border/50 rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader className="bg-muted/40">
                        <TableRow className="border-border/50 hover:bg-muted/50">
                          <TableHead className="text-foreground font-semibold">Date</TableHead>
                          <TableHead className="text-foreground font-semibold">Type</TableHead>
                          <TableHead className="text-foreground font-semibold">Severity</TableHead>
                          <TableHead className="text-foreground font-semibold">Description</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(behavioralEvents[child.lrn] || []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={4} className="text-center text-muted-foreground py-6">No approved behavioral events found.</TableCell>
                          </TableRow>
                        ) : (
                          behavioralEvents[child.lrn].map((event: any) => (
                            <TableRow key={event.id} className="border-border/50 hover:bg-muted/50 transition-colors animate-fade-in-up">
                              <TableCell>{event.event_date}</TableCell>
                              <TableCell>{event.event_type}</TableCell>
                              <TableCell>
                                <Badge className={event.severity === 'critical' ? 'bg-red-100 text-red-700 border-0 text-xs' : event.severity === 'major' ? 'bg-orange-100 text-orange-700 border-0 text-xs' : event.severity === 'minor' ? 'bg-yellow-100 text-yellow-700 border-0 text-xs' : 'bg-emerald-100 text-emerald-700 border-0 text-xs'}>
                                  {event.severity.charAt(0).toUpperCase() + event.severity.slice(1)}
                                </Badge>
                              </TableCell>
                              <TableCell>{event.description}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
