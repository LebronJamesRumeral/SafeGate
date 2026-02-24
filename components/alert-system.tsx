'use client';

import { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle, X, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

interface Alert {
  id: string;
  type: 'risk' | 'attendance' | 'behavioral' | 'positive';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
  studentLrn?: string;
  studentName?: string;
  timestamp: Date;
  read: boolean;
}

export function AlertSystem() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAlerts();
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 300000);
    return () => clearInterval(interval);
  }, []);

  const fetchAlerts = async () => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    try {
      const generatedAlerts: Alert[] = [];
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);

      // Fetch recent behavioral events
      const { data: recentEvents, error: eventsError } = await supabase
        .from('behavioral_events')
        .select('*, students(name, lrn)')
        .eq('follow_up_required', true)
        .order('event_date', { ascending: false })
        .limit(10);

      if (!eventsError && recentEvents) {
        recentEvents.forEach(event => {
          if (event.severity === 'critical' || event.severity === 'major') {
            generatedAlerts.push({
              id: `event-${event.id}`,
              type: 'behavioral',
              severity: event.severity === 'critical' ? 'critical' : 'warning',
              title: `${event.severity.toUpperCase()}: ${event.event_type}`,
              description: `${event.students?.name} - ${event.description.substring(0, 100)}...`,
              studentLrn: event.student_lrn,
              studentName: event.students?.name,
              timestamp: new Date(event.event_date + ' ' + event.event_time),
              read: false
            });
          }
        });
      }

      // Check for students with low attendance
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('lrn, name')
        .eq('status', 'active');

      if (!studentsError && students) {
        for (const student of students.slice(0, 50)) { // Limit to 50 students to avoid timeout
          const { data: attendance } = await supabase
            .from('attendance_logs')
            .select('date')
            .eq('student_lrn', student.lrn)
            .gte('date', thirtyDaysAgo.toISOString().split('T')[0]);

          const attendanceRate = attendance ? (attendance.length / 20) * 100 : 0;

          if (attendanceRate < 70) {
            generatedAlerts.push({
              id: `attendance-${student.lrn}`,
              type: 'attendance',
              severity: attendanceRate < 50 ? 'critical' : 'warning',
              title: 'Low Attendance Rate',
              description: `${student.name} has ${attendanceRate.toFixed(0)}% attendance in the last 30 days`,
              studentLrn: student.lrn,
              studentName: student.name,
              timestamp: today,
              read: false
            });
          }
        }
      }

      // Check for behavioral patterns indicating risk
      const { data: patterns, error: patternsError } = await supabase
        .from('behavioral_patterns')
        .select('*, students(name, lrn)')
        .in('risk_level', ['high', 'critical'])
        .eq('status', 'active')
        .order('detected_at', { ascending: false })
        .limit(10);

      if (!patternsError && patterns) {
        patterns.forEach(pattern => {
          generatedAlerts.push({
            id: `pattern-${pattern.id}`,
            type: 'risk',
            severity: pattern.risk_level === 'critical' ? 'critical' : 'warning',
            title: `Risk Pattern Detected: ${pattern.pattern_type}`,
            description: `${pattern.students?.name} requires intervention`,
            studentLrn: pattern.student_lrn,
            studentName: pattern.students?.name,
            timestamp: new Date(pattern.detected_at),
            read: false
          });
        });
      }

      // Add some positive alerts for achievements
      const { data: positiveEvents, error: positiveError } = await supabase
        .from('behavioral_events')
        .select('*, students(name, lrn)')
        .eq('severity', 'positive')
        .gte('event_date', today.toISOString().split('T')[0])
        .order('event_date', { ascending: false })
        .limit(5);

      if (!positiveError && positiveEvents) {
        positiveEvents.forEach(event => {
          generatedAlerts.push({
            id: `positive-${event.id}`,
            type: 'positive',
            severity: 'info',
            title: `Achievement: ${event.event_type}`,
            description: `${event.students?.name} - ${event.description.substring(0, 100)}`,
            studentLrn: event.student_lrn,
            studentName: event.students?.name,
            timestamp: new Date(event.event_date + ' ' + event.event_time),
            read: false
          });
        });
      }

      // Sort alerts by timestamp (most recent first)
      generatedAlerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      setAlerts(generatedAlerts);
      setUnreadCount(generatedAlerts.filter(a => !a.read).length);
    } catch (error) {
      console.error('Error fetching alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, read: true } : alert
    ));
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = () => {
    setAlerts(prev => prev.map(alert => ({ ...alert, read: true })));
    setUnreadCount(0);
  };

  const dismissAlert = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    setUnreadCount(prev => {
      const alert = alerts.find(a => a.id === alertId);
      return alert && !alert.read ? Math.max(0, prev - 1) : prev;
    });
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200 text-red-900 dark:bg-red-950/20 dark:text-red-100';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-900 dark:bg-yellow-950/20 dark:text-yellow-100';
      case 'info':
        return 'bg-green-50 border-green-200 text-green-900 dark:bg-green-950/20 dark:text-green-100';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-950/20 dark:text-gray-100';
    }
  };

  const getAlertIcon = (type: string, severity: string) => {
    switch (type) {
      case 'positive':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'attendance':
        return <Clock className="w-5 h-5 text-orange-600" />;
      case 'behavioral':
      case 'risk':
        return <AlertTriangle className={`w-5 h-5 ${severity === 'critical' ? 'text-red-600' : 'text-yellow-600'}`} />;
      default:
        return <Bell className="w-5 h-5 text-blue-600" />;
    }
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - timestamp.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return timestamp.toLocaleDateString();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 bg-red-500 text-white text-xs"
              variant="destructive"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Card className="border-0 shadow-none">
          <CardHeader className="border-b">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Alerts & Notifications</CardTitle>
                <CardDescription>
                  {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
                </CardDescription>
              </div>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-[500px] overflow-y-auto">
              {loading ? (
                <div className="p-8 flex justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : alerts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No alerts at the moment</p>
                </div>
              ) : (
                <div className="divide-y">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-4 hover:bg-accent/50 transition-colors ${
                        !alert.read ? 'bg-accent/20' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          {getAlertIcon(alert.type, alert.severity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <p className="font-semibold text-sm">{alert.title}</p>
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                {alert.description}
                              </p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge variant="outline" className="text-xs">
                                  {alert.severity}
                                </Badge>
                                <span className="text-xs text-muted-foreground">
                                  {formatTimestamp(alert.timestamp)}
                                </span>
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              onClick={() => dismissAlert(alert.id)}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                          {!alert.read && (
                            <Button
                              variant="link"
                              size="sm"
                              className="h-auto p-0 text-xs mt-2"
                              onClick={() => markAsRead(alert.id)}
                            >
                              Mark as read
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}
