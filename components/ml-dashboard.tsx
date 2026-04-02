'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertTriangle, TrendingDown, TrendingUp, AlertCircle, Target, AlertOctagon, Phone, Calendar, Activity, Brain, Shield, Clock, Zap, Sparkles, BarChart3, Users, ChevronRight, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

interface StudentRisk {
  lrn: string;
  name: string;
  parentContact: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  behaviorStatus: 'stable' | 'watch' | 'concerning' | 'critical';
  concerningEvents: number;
  positiveEvents: number;
  patternType: string;
  attendanceSignal: string;
  nextAbsentDate: string | null;
  predictionConfidence: number;
}

interface StudentSummary {
  name?: string;
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  behaviorStatus: 'stable' | 'watch' | 'concerning' | 'critical';
  concerningEvents: number;
  positiveEvents: number;
  patternType: string;
  attendanceSignal: string;
  nextLikelyAbsentDate: string | null;
  predictionConfidence: number;
}

interface StudentIncident {
  id: number;
  event_type: string;
  severity: string;
  description: string;
  location: string | null;
  reported_by: string;
  event_date: string;
  event_time: string;
  parent_notified: boolean;
  follow_up_required: boolean;
  action_taken?: string | null;
  notes?: string | null;
  event_categories?: {
    name?: string;
    category_type?: string;
  } | null;
}

function getSeverityStyle(severity: string): { 
  badge: string; 
  border: string; 
  bg: string;
  textColor: string;
  iconColor: string;
} {
  const normalizedSeverity = severity?.toLowerCase() || 'major';
  
  switch (normalizedSeverity) {
    case 'critical':
      return {
        badge: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25',
        border: 'border-red-200 dark:border-red-700/60 bg-red-50/50 dark:bg-red-950/40',
        bg: 'border-l-4 border-l-red-600 bg-gradient-to-br from-red-50/80 via-white to-red-50/40 dark:from-red-950/30 dark:via-slate-800/50 dark:to-red-900/20',
        textColor: 'text-red-600 dark:text-red-400',
        iconColor: 'text-red-600 dark:text-red-400',
      };
    case 'major':
      return {
        badge: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25',
        border: 'border-amber-200 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/40',
        bg: 'border-l-4 border-l-amber-600 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-slate-800/50 dark:to-amber-900/20',
        textColor: 'text-amber-600 dark:text-amber-400',
        iconColor: 'text-amber-600 dark:text-amber-400',
      };
    case 'moderate':
      return {
        badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg shadow-yellow-500/25',
        border: 'border-yellow-200 dark:border-yellow-700/60 bg-yellow-50/50 dark:bg-yellow-950/40',
        bg: 'border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-50/80 via-white to-yellow-50/40 dark:from-yellow-950/30 dark:via-slate-800/50 dark:to-yellow-900/20',
        textColor: 'text-yellow-600 dark:text-yellow-400',
        iconColor: 'text-yellow-600 dark:text-yellow-400',
      };
    default:
      return {
        badge: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25',
        border: 'border-blue-200 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/40',
        bg: 'border-l-4 border-l-blue-600 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/30 dark:via-slate-800/50 dark:to-blue-900/20',
        textColor: 'text-blue-600 dark:text-blue-400',
        iconColor: 'text-blue-600 dark:text-blue-400',
      };
  }
}

function getSeverityIcon(severity: string) {
  const normalizedSeverity = severity?.toLowerCase() || 'major';
  
  switch (normalizedSeverity) {
    case 'critical':
      return <AlertOctagon className="w-5 h-5" />;
    case 'major':
      return <AlertTriangle className="w-5 h-5" />;
    case 'moderate':
      return <AlertCircle className="w-5 h-5" />;
    default:
      return <Info className="w-5 h-5" />;
  }
}

function formatKeyIssues(patternType?: string, visibleCount = 2) {
  if (!patternType) return 'No major issues identified';

  const issues = patternType
    .split(' + ')
    .map(issue => issue.trim())
    .filter(Boolean);

  if (issues.length === 0) return 'No major issues identified';
  if (issues.length <= visibleCount) return issues.join(' + ');

  const hiddenCount = issues.length - visibleCount;
  return `${issues.slice(0, visibleCount).join(' + ')} +${hiddenCount} more`;
}

function StudentIncidentsDialog({ studentLrn, studentName }: { studentLrn: string; studentName: string }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [incidents, setIncidents] = useState<StudentIncident[]>([]);
  const [dateFilter, setDateFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [supabase] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  });

  useEffect(() => {
    const loadIncidents = async () => {
      if (!open) return;
      if (!supabase) {
        setError('Supabase is not configured in this environment.');
        return;
      }

      try {
        setLoading(true);
        setError(null);

        const { data, error: queryError } = await supabase
          .from('behavioral_events')
          .select(`
            id,
            event_type,
            severity,
            description,
            location,
            reported_by,
            event_date,
            event_time,
            parent_notified,
            follow_up_required,
            action_taken,
            notes,
            event_categories(name, category_type)
          `)
          .eq('student_lrn', studentLrn)
          .order('event_date', { ascending: false })
          .order('event_time', { ascending: false });

        if (queryError) {
          setError(queryError.message || 'Failed to load incidents.');
          return;
        }

        setIncidents((data || []) as StudentIncident[]);
      } catch {
        setError('Failed to load incidents.');
      } finally {
        setLoading(false);
      }
    };

    void loadIncidents();
  }, [open, studentLrn, supabase]);

  const uniqueEventTypes = Array.from(new Set(incidents.map((incident) => incident.event_type).filter(Boolean)));
  const filteredIncidents = incidents.filter((incident) => {
    const incidentDate = incident.event_date ? String(incident.event_date).slice(0, 10) : '';
    const matchesDate = !dateFilter || incidentDate === dateFilter;
    const matchesType = typeFilter === 'all' || incident.event_type === typeFilter;
    const matchesSeverity = severityFilter === 'all' || String(incident.severity || '').toLowerCase() === severityFilter;
    return matchesDate && matchesType && matchesSeverity;
  });
  const severityStyle = filteredIncidents.length > 0
    ? getSeverityStyle(filteredIncidents[0]?.severity)
    : incidents.length > 0
    ? getSeverityStyle(incidents[0]?.severity)
    : getSeverityStyle('');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="w-full border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50">
          View All Incidents
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                <DialogTitle className="text-xl font-bold">Incident History</DialogTitle>
              </div>
              <DialogDescription className="mt-2 text-sm">
                Complete behavioral incident record for <span className="font-semibold text-slate-900 dark:text-white">{studentName}</span> ({studentLrn})
              </DialogDescription>
            </div>
            {incidents.length > 0 && (
              <Badge className={`${severityStyle.badge} text-xs font-semibold px-3 py-1 whitespace-nowrap mr-8`}>
                {filteredIncidents.length} Incident{filteredIncidents.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto pr-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40 p-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Date</label>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full h-9 px-2.5 rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueEventTypes.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">Severity</label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="All severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Severity</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="major">Major</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="positive">Positive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-slate-300 dark:border-slate-600 mb-3"></div>
                <p className="text-sm text-slate-600 dark:text-slate-400">Loading incidents...</p>
              </div>
            </div>
          )}

          {!loading && error && (
            <div className="rounded-lg border border-red-200 dark:border-red-700/50 bg-red-50 dark:bg-red-950/40 p-4">
              <p className="text-sm text-red-700 dark:text-red-300 font-medium">{error}</p>
            </div>
          )}

          {!loading && !error && incidents.length === 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
              <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">No incidents found for this student.</p>
            </div>
          )}

          {!loading && !error && incidents.length > 0 && filteredIncidents.length === 0 && (
            <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
              <Shield className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
              <p className="text-sm text-slate-600 dark:text-slate-400">No incidents match the selected filters.</p>
            </div>
          )}

          {!loading && !error && filteredIncidents.length > 0 && filteredIncidents.map((incident, index) => {
            const style = getSeverityStyle(incident.severity);
            return (
              <motion.div
                key={incident.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className={`rounded-lg border ${style.border} ${style.bg} p-4 hover:shadow-md transition-shadow`}
              >
                <div className="space-y-3">
                  {/* Header Row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <div className={`${style.iconColor}`}>
                          {getSeverityIcon(incident.severity)}
                        </div>
                        <p className={`font-bold text-sm ${style.textColor}`}>{incident.event_type}</p>
                      </div>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        {new Date(incident.event_date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}{' '}
                        at {incident.event_time}
                      </p>
                    </div>
                    <Badge className={`${style.badge} font-semibold text-xs px-2.5 py-1 uppercase tracking-wider`}>
                      {incident.severity}
                    </Badge>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{incident.description}</p>

                  {/* Metadata Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2">
                      <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>
                        <span className="font-semibold">Reported:</span> {incident.reported_by}
                      </span>
                    </div>

                    {incident.location && (
                      <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>
                          <span className="font-semibold">Location:</span> {incident.location}
                        </span>
                      </div>
                    )}

                    {incident.event_categories?.category_type && (
                      <div className="flex items-center gap-2">
                        <Target className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                        <span>
                          <span className="font-semibold">Category:</span> {incident.event_categories.category_type}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>
                        <span className="font-semibold">Parent Notified:</span> {incident.parent_notified ? '✓ Yes' : '✗ No'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                      <span>
                        <span className="font-semibold">Follow-up:</span> {incident.follow_up_required ? 'Required' : 'Completed'}
                      </span>
                    </div>
                  </div>

                  {/* Action Taken & Notes */}
                  <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                    {incident.action_taken && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Action Taken:</span> {incident.action_taken}
                      </p>
                    )}
                    {incident.notes && (
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        <span className="font-semibold">Notes:</span> {incident.notes}
                      </p>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function formatBehaviorStatus(status: StudentRisk['behaviorStatus'] | StudentSummary['behaviorStatus']) {
  if (status === 'critical') return 'Critical';
  if (status === 'concerning') return 'Concerning';
  if (status === 'watch') return 'Watch';
  return 'Stable';
}

function getRiskColor(riskLevel: string): { 
  badge: string; 
  border: string; 
  bg: string; 
  icon: string;
  cardBg: string;
  accentBg: string;
  gradient: string;
  lightBg: string;
} {
  switch (riskLevel) {
    case 'critical':
      return {
        badge: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25',
        border: 'border-red-200 dark:border-red-700/50',
        bg: 'from-red-50 via-red-50/50 to-white dark:from-red-950/50 dark:via-red-900/30 dark:to-slate-900/80',
        icon: '🚨',
        cardBg: 'bg-gradient-to-br from-red-50 via-white to-red-50/40 dark:from-red-950/40 dark:via-slate-800 dark:to-red-900/30',
        accentBg: 'bg-gradient-to-r from-red-600 to-red-700 dark:from-red-700 dark:to-red-800',
        gradient: 'from-red-600 to-red-700',
        lightBg: 'bg-red-100 dark:bg-red-900/40',
      };
    case 'high':
      return {
        badge: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25',
        border: 'border-amber-200 dark:border-amber-700/50',
        bg: 'from-amber-50 via-amber-50/50 to-white dark:from-amber-950/50 dark:via-amber-900/30 dark:to-slate-900/80',
        icon: '⚠️',
        cardBg: 'bg-gradient-to-br from-amber-50 via-white to-amber-50/40 dark:from-amber-950/40 dark:via-slate-800 dark:to-amber-900/30',
        accentBg: 'bg-gradient-to-r from-amber-600 to-orange-600 dark:from-amber-700 dark:to-orange-700',
        gradient: 'from-amber-600 to-orange-600',
        lightBg: 'bg-amber-100 dark:bg-amber-900/40',
      };
    case 'medium':
      return {
        badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg shadow-yellow-500/25',
        border: 'border-yellow-200 dark:border-yellow-700/50',
        bg: 'from-yellow-50 via-yellow-50/50 to-white dark:from-yellow-950/50 dark:via-yellow-900/30 dark:to-slate-900/80',
        icon: '⏱️',
        cardBg: 'bg-gradient-to-br from-yellow-50 via-white to-yellow-50/40 dark:from-yellow-950/40 dark:via-slate-800 dark:to-yellow-900/30',
        accentBg: 'bg-gradient-to-r from-yellow-500 to-amber-500 dark:from-yellow-600 dark:to-amber-600',
        gradient: 'from-yellow-500 to-amber-500',
        lightBg: 'bg-yellow-100 dark:bg-yellow-900/40',
      };
    default:
      return {
        badge: 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white shadow-lg shadow-green-500/25',
        border: 'border-green-200 dark:border-green-700/50',
        bg: 'from-green-50 via-green-50/50 to-white dark:from-green-950/50 dark:via-green-900/30 dark:to-slate-900/80',
        icon: '✅',
        cardBg: 'bg-gradient-to-br from-green-50 via-white to-green-50/40 dark:from-green-950/40 dark:via-slate-800 dark:to-green-900/30',
        accentBg: 'bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700',
        gradient: 'from-green-600 to-emerald-600',
        lightBg: 'bg-green-100 dark:bg-green-900/40',
      };
  }
}

function getTrendIcon(trend: string) {
  switch (trend) {
    case 'improving':
      return <TrendingUp className="w-4 h-4" />;
    case 'declining':
      return <TrendingDown className="w-4 h-4" />;
    default:
      return <Activity className="w-4 h-4" />;
  }
}

function getTrendColor(trend: string) {
  switch (trend) {
    case 'improving':
      return 'text-emerald-600 dark:text-emerald-400 bg-emerald-100/80 dark:bg-emerald-900/40';
    case 'declining':
      return 'text-red-600 dark:text-red-400 bg-red-100/80 dark:bg-red-900/40';
    default:
      return 'text-gray-600 dark:text-gray-300 bg-gray-100/80 dark:bg-gray-700/40';
  }
}

/**
 * ML Dashboard - Shows high-risk students and their predictions
 */
export function MLDashboard() {
  const [highRiskStudents, setHighRiskStudents] = useState<StudentRisk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [supabase] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  });

  // Filtering state
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Use fixed student level options to match guidance review page
  const gradeOptions = [
    'Grade 1',
    'Grade 2',
    'Grade 3',
    'Grade 4',
    'Grade 5',
    'Grade 6',
    'Kinder 1',
    'Kinder 2',
    'Pre-K',
    'Toddler & Nursery',
  ];

  // Risk level options
  const riskOptions = ['critical', 'high', 'medium', 'low'];

  // Filtered students (match fixed student level labels)
  const filteredStudents = highRiskStudents.filter(s => {
    let matches = true;
    if (gradeFilter !== 'all') {
      // Prefer class_level, fallback to grade/level/name extraction
      let studentLevel = '';
      if ((s as any).class_level) {
        studentLevel = (s as any).class_level;
      } else if ((s as any).grade) {
        studentLevel = (s as any).grade;
      } else if ((s as any).level) {
        studentLevel = (s as any).level;
      } else {
        // Try to extract from name (e.g., "Grade 1", "Kinder 1", etc.)
        const name = s.name || '';
        const knownLevels = [
          'Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6',
          'Kinder 1', 'Kinder 2', 'Pre-K', 'Toddler & Nursery',
        ];
        studentLevel = knownLevels.find(lvl => name.includes(lvl)) || '';
      }
      matches = matches && studentLevel === gradeFilter;
    }
    if (riskFilter !== 'all') {
      matches = matches && s.riskLevel === riskFilter;
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      matches = matches && (
        s.name.toLowerCase().includes(q) ||
        s.lrn.toLowerCase().includes(q)
      );
    }
    return matches;
  });

  useEffect(() => {
    void fetchHighRiskStudents(false);
  }, []);

  useEffect(() => {
    const handleRefresh = () => {
      void fetchHighRiskStudents(true);
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key === 'ml-risk-refresh') {
        void fetchHighRiskStudents(true);
      }
    };

    window.addEventListener('ml-risk-refresh', handleRefresh as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('ml-risk-refresh', handleRefresh as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, []);

  // Real-time subscription to behavioral_events changes
  useEffect(() => {
    if (!supabase) return;

    const channel = supabase
      .channel('behavioral_events_changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'behavioral_events' },
        () => {
          // Update in background without resetting the visible card state.
          void fetchHighRiskStudents(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  const fetchHighRiskStudents = async (silent = false) => {
    try {
      if (!silent || !hasLoadedOnce) {
        setLoading(true);
      }
      if (!silent) {
        setError(null);
      }
      
      const response = await fetch('/api/ml/high-risk', { cache: 'no-store' });
      const result = await response.json().catch(() => null);

      if (!result) {
        console.warn('No valid response from ML API');
        if (!silent) {
          setHighRiskStudents([]);
        }
        return;
      }

      if (result.success === false || (result.error && !result.data)) {
        setError(result.error || result.message || 'Unable to load data');
        if (!silent) {
          setHighRiskStudents([]);
        }
        return;
      }

      const students = result.data || [];
      setHighRiskStudents(Array.isArray(students) ? students : []);
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('Error fetching high-risk students:', err);
      if (!silent) {
        setHighRiskStudents([]);
        setError('Unable to load data. Please try again.');
      }
    } finally {
      if (!silent || !hasLoadedOnce) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-linear-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse w-14 h-14" />
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-96 animate-pulse" />
          </div>
        </div>
        {/* Filter Skeleton */}
        <div className="flex gap-3 mb-4">
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 w-32 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
          <div className="h-10 w-48 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
        </div>
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="bg-linear-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-700 shadow-lg"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded-t-2xl" />
              <div className="p-5 space-y-3">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-5 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
                    <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2" />
                  </div>
                  <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded-full w-16" />
                </div>
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
                <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      {/* Header Section */}
      <div className="flex items-start gap-4">
        <div className="p-3 rounded-2xl bg-linear-to-br from-blue-900 to-blue-700 shadow-lg shadow-blue-600/25">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-bold bg-linear-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
            ML Behavior Risk Insights
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400">
            AI-powered analysis identifying concerning behavior patterns with attendance as a supporting signal
          </p>
        </div>
      </div>

      {/* Guidance Review-style Filter Bar */}
      <div className="mb-4">
        <div className="w-full bg-white/80 dark:bg-slate-900/55 backdrop-blur rounded-xl border border-border/70 shadow-sm p-4 sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:gap-4">
            {/* Student Level Filter */}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Student Level</label>
              <Select value={gradeFilter} onValueChange={(val: string) => setGradeFilter(val)}>
                <SelectTrigger className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 w-full">
                  <SelectValue placeholder="All Levels" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-border/40">
                  <SelectItem value="all">All Levels</SelectItem>
                  {gradeOptions.map(g => (
                    <SelectItem key={g} value={g}>{g}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Risk Filter */}
            <div className="flex flex-col gap-2 w-full max-w-xs">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Risk Level</label>
              <Select value={riskFilter} onValueChange={(val: string) => setRiskFilter(val)}>
                <SelectTrigger className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 w-full">
                  <SelectValue placeholder="All Risks" />
                </SelectTrigger>
                <SelectContent className="dark:bg-slate-800 dark:border-border/40 min-w-55">
                  <SelectItem value="all">All Risks</SelectItem>
                  {riskOptions.map(r => (
                    <SelectItem key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Search */}
            <div className="flex flex-col gap-2 w-full">
              <label className="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-300 mb-1">Search</label>
              <Input
                type="text"
                className="h-10 dark:bg-slate-800 dark:border-border/40 dark:text-slate-200 w-full"
                placeholder="Search by name or LRN..."
                value={search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Summary (filtered) */}
      {!error && filteredStudents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/50 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">Critical Risk</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {filteredStudents.filter(s => s.riskLevel === 'critical').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-linear-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/50 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">High Risk</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {filteredStudents.filter(s => s.riskLevel === 'high').length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/50 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Medium Risk</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {filteredStudents.filter(s => s.riskLevel === 'medium').length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-0 bg-linear-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/50 shadow-xl overflow-hidden">
          <div className="h-1 bg-linear-to-r from-red-600 to-red-700" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/40">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg text-red-700 dark:text-red-300 mb-1">Unable to load predictions</p>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button 
                  onClick={() => {
                    void fetchHighRiskStudents(false);
                  }}
                  variant="outline"
                  size="sm"
                  className="mt-3 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Try Again
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State (filtered) */}
      {!error && filteredStudents.length === 0 ? (
        <Card className="border-0 bg-linear-to-br from-green-50 to-white dark:from-green-950/30 dark:to-slate-800/50 shadow-xl overflow-hidden">
          <div className="h-1 bg-linear-to-r from-green-600 to-emerald-600" />
          <CardContent className="p-12">
            <div className="text-center">
              <div className="mb-6 inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/40">
                <Shield className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                All Clear!
              </h3>
              <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                No students match the selected filters or search.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Student Cards Grid (filtered) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredStudents.map((student, index) => {
            const colors = getRiskColor(student.riskLevel);
            return (
              <motion.div
                key={student.lrn ?? `student-${index}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`${colors.cardBg} border-2 ${colors.border} shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group`}
                >
                  {/* Animated Gradient Bar */}
                  <div className={`h-1.5 bg-linear-to-r ${colors.gradient} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                  </div>
                  
                  <CardContent className="p-5 space-y-4">
                    {/* Header with Name and Badge */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-linear-to-r group-hover:from-slate-900 group-hover:to-slate-600 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-all">
                          {student.name}
                        </h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                          {student.lrn}
                        </p>
                      </div>
                      <Badge className={`${colors.badge} font-bold uppercase text-xs px-2.5 py-1 flex items-center gap-1`}>
                        <Zap className="w-3 h-3" />
                        {student.riskLevel}
                      </Badge>
                    </div>

                    {/* Combined Risk Summary - Compiled Key Issues */}
                    <div className="p-3.5 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                        Key Issues
                      </p>
                      <p className="text-sm font-semibold text-slate-900 dark:text-white">
                        {formatKeyIssues(student.patternType)}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                        {student.attendanceSignal}
                      </p>
                    </div>

                    {/* Behavior Metrics - Compact */}
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2.5 border border-red-100 dark:border-red-900/40">
                        <p className="text-[10px] text-red-700 dark:text-red-300 font-semibold uppercase">Concerning</p>
                        <p className="text-lg font-bold text-red-700 dark:text-red-300">{student.concerningEvents}</p>
                      </div>
                      <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-100 dark:border-emerald-900/40">
                        <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Positive</p>
                        <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{student.positiveEvents}</p>
                      </div>
                    </div>

                    <StudentIncidentsDialog studentLrn={student.lrn} studentName={student.name} />

                    {/* Forecast and Parent Contact Combined Row */}
                    <div className="flex items-center gap-2 pt-1">
                      {student.nextAbsentDate && (
                        <div className="flex-1 p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Calendar className="w-3.5 h-3.5 text-blue-900 dark:text-blue-300" />
                            <p className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                              Forecast
                            </p>
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                            {student.nextAbsentDate}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                              <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${student.predictionConfidence}%` }}
                                transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                                className="h-full bg-linear-to-r from-blue-600 to-blue-500 rounded-full"
                              />
                            </div>
                            <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 min-w-8 text-right">
                              {Math.round(student.predictionConfidence)}%
                            </span>
                          </div>
                        </div>
                      )}
                      {student.parentContact && (
                        <div className="flex-1 p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                          <div className="flex items-center gap-1.5 mb-1.5">
                            <Phone className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                            <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
                              Contact
                            </p>
                          </div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                            {student.parentContact}
                          </p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}

/**
 * Student Risk Card - Shows individual student risk (used in student details)
 */
export function StudentRiskCard({ studentLrn, name, lrn }: { studentLrn: string, name?: string, lrn?: string }) {
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [supabase] = useState(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    return createClient(url, key);
  });

  useEffect(() => {
    void fetchStudentSummary(false);
  }, [studentLrn]);

  useEffect(() => {
    const handleRefresh = (event: Event) => {
      const detail = (event as CustomEvent<{ studentLrn?: string }>).detail;
      if (!detail?.studentLrn || detail.studentLrn === studentLrn) {
        void fetchStudentSummary(true);
      }
    };

    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'ml-risk-refresh' || !event.newValue) return;
      try {
        const parsed = JSON.parse(event.newValue) as { studentLrn?: string };
        if (!parsed.studentLrn || parsed.studentLrn === studentLrn) {
          void fetchStudentSummary(true);
        }
      } catch {
        void fetchStudentSummary(true);
      }
    };

    window.addEventListener('ml-risk-refresh', handleRefresh as EventListener);
    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('ml-risk-refresh', handleRefresh as EventListener);
      window.removeEventListener('storage', handleStorage);
    };
  }, [studentLrn]);

  // Real-time subscription to behavioral events for this student
  useEffect(() => {
    if (!supabase || !studentLrn) return;

    const channel = supabase
      .channel(`student_${studentLrn}_events`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'behavioral_events', filter: `student_lrn=eq.${studentLrn}` },
        () => {
          // Silent refresh to avoid card flicker.
          void fetchStudentSummary(true);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, studentLrn]);

  const fetchStudentSummary = async (silent = false) => {
    try {
      if (!silent || !hasLoadedOnce) {
        setLoading(true);
      }
      const response = await fetch(`/api/ml/summary?studentLrn=${studentLrn}`, { cache: 'no-store' });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
        setError(errorData.error || `Error: ${response.status}`);
        console.error('Fetch error:', errorData);
        return;
      }

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch student data');
        return;
      }

      setSummary(result.data);
      setHasLoadedOnce(true);
    } catch (err) {
      console.error('Error fetching summary:', err);
      if (!silent) {
        setError('Unable to load data');
      }
    } finally {
      if (!silent || !hasLoadedOnce) {
        setLoading(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-linear-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-slate-300 dark:bg-slate-600" />
        <div className="p-4 space-y-3">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
              <div className="h-3 bg-slate-300 dark:bg-slate-600 rounded w-1/2" />
            </div>
            <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded-full w-16" />
          </div>
          <div className="h-14 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-12 bg-slate-200 dark:bg-slate-700 rounded-lg" />
          <div className="h-10 bg-slate-200 dark:bg-slate-700 rounded-lg" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-0 bg-linear-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/50 shadow-xl overflow-hidden">
        <div className="h-1 bg-linear-to-r from-amber-600 to-orange-600" />
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
              <Info className="w-5 h-5 text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-amber-700 dark:text-amber-300 text-base mb-1">
                ML Assessment Unavailable
              </p>
              <p className="text-sm text-amber-600 dark:text-amber-400">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const colors = getRiskColor(summary.riskLevel);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Card className={`${colors.cardBg} border-2 ${colors.border} shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden`}>
        {/* Animated Gradient Bar */}
        <div className={`h-1.5 bg-linear-to-r ${colors.gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-white/30 animate-shimmer" />
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center gap-2">
            <div className="flex flex-col gap-0.5">
              <span className="text-xl font-bold font-mono text-slate-900 dark:text-white leading-tight">{name || summary?.name || 'Student Name'}</span>
              <span className="text-xs font-mono text-slate-500 dark:text-slate-400">{lrn || studentLrn}</span>
            </div>
            <Badge className={`${colors.badge} text-xs`}>
              <Sparkles className="w-3 h-3 mr-0.5" />
              {summary.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Combined Risk Summary */}
          <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <p className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1">
              Key Issues
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white mb-1">
              {formatKeyIssues(summary.patternType)}
            </p>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              {summary.attendanceSignal}
            </p>
          </div>

          {/* Behavior Trend and Behavior Status - Compact */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="rounded-lg bg-red-50 dark:bg-red-950/30 p-2.5 border border-red-100 dark:border-red-900/40">
              <p className="text-[10px] text-red-700 dark:text-red-300 font-semibold uppercase">Concerning</p>
              <p className="text-lg font-bold text-red-700 dark:text-red-300">{summary.concerningEvents}</p>
            </div>
            <div className="rounded-lg bg-emerald-50 dark:bg-emerald-950/30 p-2.5 border border-emerald-100 dark:border-emerald-900/40">
              <p className="text-[10px] text-emerald-700 dark:text-emerald-300 font-semibold uppercase">Positive</p>
              <p className="text-lg font-bold text-emerald-700 dark:text-emerald-300">{summary.positiveEvents}</p>
            </div>
          </div>

          {/* Trend Badge */}
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getTrendColor(summary.trend)}`}>
            {getTrendIcon(summary.trend)}
            <span className="text-xs font-semibold capitalize">{summary.trend}</span>
          </div>

          {/* Prediction Info - Compact */}
          {summary.nextLikelyAbsentDate && (
            <div className="p-3 rounded-lg bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-1.5 mb-1.5">
                <Calendar className="w-3.5 h-3.5 text-blue-900 dark:text-blue-300" />
                <p className="text-[10px] font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                  Forecast
                </p>
              </div>
              <p className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {summary.nextLikelyAbsentDate}
              </p>
              <div className="flex items-center gap-1.5">
                <div className="flex-1 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${summary.predictionConfidence}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-linear-to-r from-blue-600 to-blue-500 rounded-full"
                  />
                </div>
                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 min-w-8 text-right">
                  {Math.round(summary.predictionConfidence)}%
                </span>
              </div>
            </div>
          )}

          {/* Concerning Pattern Alert - Only if needed */}
          {summary.concerningEvents > 0 && (
            <div className="p-3 rounded-lg bg-linear-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/40 border border-amber-300 dark:border-amber-600/50">
              <div className="flex items-start gap-2">
                <div className="p-1 rounded-lg bg-amber-100 dark:bg-amber-800/50 shrink-0">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-300 mb-0.5">
                    Action Needed
                  </p>
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    <span className="font-bold">{summary.concerningEvents}</span> concerning log(s) detected
                  </p>
                </div>
              </div>
            </div>
          )}

          <StudentIncidentsDialog studentLrn={studentLrn} studentName="Student" />
        </CardContent>
      </Card>
    </motion.div>
  );
}