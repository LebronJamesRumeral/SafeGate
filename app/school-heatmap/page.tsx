'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { HeatmapZonesProvider } from '@/lib/heatmap-zones-context';
import Image from 'next/image';
import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Activity, AlertCircle, AlertTriangle, Calendar, Clock3, Flame, MapPinned, Phone, Plus, RefreshCw, ShieldAlert, Target, Trash2, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type InternalSeverity = 'positive' | 'neutral' | 'minor' | 'major' | 'critical' | 'unknown';
type Severity = 'positive' | 'minor' | 'major' | 'critical';

interface BehavioralLog {
  id: number;
  event_type: string | null;
  severity: string | null;
  description: string | null;
  location: string | null;
  student_lrn: string | null;
  event_date: string | null;
  event_time: string | null;
  created_at: string | null;
  students?:
    | {
        level: string | null;
      }
    | Array<{
        level: string | null;
      }>
    | null;
  event_categories?:
    | {
        name: string | null;
        severity_level: string | null;
      }
    | Array<{
        name: string | null;
        severity_level: string | null;
      }>
    | null;
}

interface HeatZone {
  id: string;
  name: string;
  top: number;
  left: number;
  width: number;
  height: number;
  keywords: string[];
}

interface HighRiskStudent {
  lrn: string;
  name: string;
  riskLevel: string;
}

type DragMode = 'move' | 'resize';

interface ZoneDragState {
  zoneId: string;
  mode: DragMode;
  startClientX: number;
  startClientY: number;
  initialTop: number;
  initialLeft: number;
  initialWidth: number;
  initialHeight: number;
}

const ZONES_STORAGE_KEY = 'sgcdc-school-heatmap-zones-v3';
const NEW_ZONE_DEFAULTS = {
  top: 42,
  left: 42,
  width: 14,
  height: 14,
};

const DEFAULT_ZONES: HeatZone[] = [
  {
    id: 'kinder-room',
    name: 'Kinder Room',
    top: 24,
    left: 18,
    width: 12,
    height: 14,
    keywords: ['kinder room', 'kinder', 'kindergarten room'],
  },
  { id: 'grade-1-room', name: 'Grade 1 Room', top: 24, left: 31, width: 12, height: 14, keywords: ['grade 1 room', 'grade 1'] },
  { id: 'grade-2-room', name: 'Grade 2 Room', top: 24, left: 44, width: 12, height: 14, keywords: ['grade 2 room', 'grade 2'] },
  { id: 'grade-3-room', name: 'Grade 3 Room', top: 39, left: 18, width: 12, height: 14, keywords: ['grade 3 room', 'grade 3'] },
  { id: 'grade-4-room', name: 'Grade 4 Room', top: 39, left: 31, width: 12, height: 14, keywords: ['grade 4 room', 'grade 4'] },
  { id: 'grade-5-room', name: 'Grade 5 Room', top: 39, left: 44, width: 12, height: 14, keywords: ['grade 5 room', 'grade 5'] },
  { id: 'grade-6-room', name: 'Grade 6 Room', top: 54, left: 18, width: 12, height: 14, keywords: ['grade 6 room', 'grade 6'] },
  { id: 'grade-7-room', name: 'Grade 7 Room', top: 54, left: 31, width: 12, height: 14, keywords: ['grade 7 room', 'grade 7'] },
  { id: 'grade-8-room', name: 'Grade 8 Room', top: 54, left: 44, width: 12, height: 14, keywords: ['grade 8 room', 'grade 8'] },
  { id: 'gym-area', name: 'Gym Area', top: 12, left: 58, width: 19, height: 23, keywords: ['gym area', 'gym'] },
  { id: 'cafeteria', name: 'Cafeteria', top: 36, left: 59, width: 20, height: 16, keywords: ['cafeteria', 'canteen'] },
  {
    id: 'sensory-room',
    name: 'Sensory Room',
    top: 30,
    left: 34,
    width: 12,
    height: 14,
    keywords: ['sensory room', 'calm room', 'special needs room'],
  },
  { id: 'dance-room', name: 'Dance Room', top: 54, left: 60, width: 16, height: 12, keywords: ['dance room'] },
  { id: 'library', name: 'Library', top: 41, left: 24, width: 14, height: 12, keywords: ['library'] },
  {
    id: 'science-laboratory',
    name: 'Science Laboratory',
    top: 52,
    left: 27,
    width: 14,
    height: 12,
    keywords: ['science laboratory', 'science lab', 'laboratory'],
  },
  { id: 'music-room', name: 'Music Room', top: 58, left: 42, width: 13, height: 11, keywords: ['music room'] },
  { id: 'entry-gate', name: 'Entrance / Gate', top: 72, left: 80, width: 16, height: 19, keywords: ['entrance', 'entry', 'gate', 'drop off'] },
];

const SEVERITY_WEIGHT: Record<InternalSeverity, number> = {
  critical: 5,
  major: 3,
  minor: 2,
  neutral: 1,
  positive: -1,
  unknown: 0,
};

const SEVERITY_BADGE_CLASS: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 border border-red-200 dark:border-red-800/70',
  major: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300 border border-orange-200 dark:border-orange-800/70',
  minor: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800/70',
  positive: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70',
};

function getPatternSeverityStyle(severity: Severity): {
  badge: string;
  border: string;
  bg: string;
  textColor: string;
  iconColor: string;
} {
  if (severity === 'critical') {
    return {
      badge: 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg shadow-red-500/25',
      border: 'border-red-200 dark:border-red-700/60 bg-red-50/50 dark:bg-red-950/40',
      bg: 'border-l-4 border-l-red-600 bg-gradient-to-br from-red-50/80 via-white to-red-50/40 dark:from-red-950/30 dark:via-slate-800/50 dark:to-red-900/20',
      textColor: 'text-red-600 dark:text-red-400',
      iconColor: 'text-red-600 dark:text-red-400',
    };
  }

  if (severity === 'major') {
    return {
      badge: 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white shadow-lg shadow-amber-500/25',
      border: 'border-amber-200 dark:border-amber-700/60 bg-amber-50/50 dark:bg-amber-950/40',
      bg: 'border-l-4 border-l-amber-600 bg-gradient-to-br from-amber-50/80 via-white to-amber-50/40 dark:from-amber-950/30 dark:via-slate-800/50 dark:to-amber-900/20',
      textColor: 'text-amber-600 dark:text-amber-400',
      iconColor: 'text-amber-600 dark:text-amber-400',
    };
  }

  if (severity === 'minor') {
    return {
      badge: 'bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-600 hover:to-amber-600 text-white shadow-lg shadow-yellow-500/25',
      border: 'border-yellow-200 dark:border-yellow-700/60 bg-yellow-50/50 dark:bg-yellow-950/40',
      bg: 'border-l-4 border-l-yellow-500 bg-gradient-to-br from-yellow-50/80 via-white to-yellow-50/40 dark:from-yellow-950/30 dark:via-slate-800/50 dark:to-yellow-900/20',
      textColor: 'text-yellow-600 dark:text-yellow-400',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
    };
  }

  return {
    badge: 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white shadow-lg shadow-blue-500/25',
    border: 'border-blue-200 dark:border-blue-700/60 bg-blue-50/50 dark:bg-blue-950/40',
    bg: 'border-l-4 border-l-blue-600 bg-gradient-to-br from-blue-50/80 via-white to-blue-50/40 dark:from-blue-950/30 dark:via-slate-800/50 dark:to-blue-900/20',
    textColor: 'text-blue-600 dark:text-blue-400',
    iconColor: 'text-blue-600 dark:text-blue-400',
  };
}

const BLOCKS_ROOM_ALIASES = ['blocks room', 'block room', 'year level room', 'classroom', 'homeroom'];

const ZONE_LEVEL_MATCHERS: Record<string, string[]> = {
  'kinder-room': ['kinder', 'kindergarten'],
  'grade-1-room': ['grade 1', 'g1'],
  'grade-2-room': ['grade 2', 'g2'],
  'grade-3-room': ['grade 3', 'g3'],
  'grade-4-room': ['grade 4', 'g4'],
  'grade-5-room': ['grade 5', 'g5'],
  'grade-6-room': ['grade 6', 'g6'],
  'grade-7-room': ['grade 7', 'g7'],
  'grade-8-room': ['grade 8', 'g8'],
};

function normalizeText(value: string | null | undefined) {
  return (value || '').toLowerCase().trim();
}

function normalizeSeverity(input: string | null | undefined): InternalSeverity {
  const normalized = normalizeText(input);
  if (normalized === 'critical') return 'critical';
  if (normalized === 'major') return 'major';
  if (normalized === 'minor') return 'minor';
  if (normalized === 'neutral') return 'neutral';
  if (normalized === 'positive') return 'positive';
  return 'unknown';
}

function toSeverityBucket(severity: InternalSeverity): Severity {
  if (severity === 'critical') return 'critical';
  if (severity === 'major') return 'major';
  if (severity === 'positive') return 'positive';
  // Keep ML-style visible buckets only; neutral/unknown are folded into minor.
  return 'minor';
}

function getSingleRelation<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] || null : value;
}

function getResolvedSeverity(log: BehavioralLog): InternalSeverity {
  const category = getSingleRelation(log.event_categories);
  return normalizeSeverity(log.severity || category?.severity_level || null);
}

function getResolvedEventType(log: BehavioralLog): string {
  const category = getSingleRelation(log.event_categories);
  const eventType = (log.event_type || '').trim();
  const categoryName = (category?.name || '').trim();
  return eventType || categoryName || 'Behavioral report';
}

function getTimeBand(eventTime: string | null | undefined): string {
  if (!eventTime) return 'Unknown Time';
  const hour = Number((eventTime || '').split(':')[0]);
  if (Number.isNaN(hour)) return 'Unknown Time';
  if (hour < 10) return 'Morning';
  if (hour < 13) return 'Midday';
  if (hour < 17) return 'Afternoon';
  return 'Late Day';
}

function inferSituationLabel(log: BehavioralLog): string {
  const haystack = `${getResolvedEventType(log)} ${log.description || ''} ${log.location || ''}`.toLowerCase();

  if (/(hallway|corridor|transition|line up|lineup|moving class|between classes)/.test(haystack)) return 'Transition-related';
  if (/(peer|fight|bully|conflict|tease|argue|aggression)/.test(haystack)) return 'Peer interaction';
  if (/(class|lesson|teacher|disrupt|off-task|seatwork|instruction)/.test(haystack)) return 'Classroom management';
  if (/(play|gym|dance|sports|playground|recess)/.test(haystack)) return 'Activity/recess context';
  if (/(cafeteria|canteen|lunch|snack|food)/.test(haystack)) return 'Meal-time context';
  if (/(arrival|dismissal|gate|entry|drop off|pick up)/.test(haystack)) return 'Arrival/dismissal';

  return 'General context';
}

function getHeatStyle(score: number, criticalCount: number) {
  if (criticalCount >= 2 || score >= 16) {
    return { background: 'rgba(220, 38, 38, 0.48)', border: 'rgba(153, 27, 27, 0.95)', label: 'Critical' };
  }
  if (criticalCount >= 1 || score >= 9) {
    return { background: 'rgba(249, 115, 22, 0.42)', border: 'rgba(194, 65, 12, 0.95)', label: 'High' };
  }
  if (score >= 4) {
    return { background: 'rgba(234, 179, 8, 0.34)', border: 'rgba(161, 98, 7, 0.95)', label: 'Medium' };
  }
  if (score >= 1) {
    return { background: 'rgba(34, 197, 94, 0.28)', border: 'rgba(21, 128, 61, 0.9)', label: 'Low' };
  }
  return { background: 'rgba(148, 163, 184, 0.2)', border: 'rgba(71, 85, 105, 0.85)', label: 'Stable' };
}

function isLogInZone(log: BehavioralLog, zone: HeatZone) {
  const location = normalizeText(log.location);
  const zoneTokens = [zone.name, ...zone.keywords].map(normalizeText).filter(Boolean);
  const directLocationMatch = zoneTokens.some((token) => location.includes(token));
  if (directLocationMatch) {
    return true;
  }

  // If a log still uses generic location names (e.g., "Blocks Room"),
  // route it to the matching grade zone using the student's level.
  const levelMatchers = ZONE_LEVEL_MATCHERS[zone.id];
  if (!levelMatchers || levelMatchers.length === 0) {
    return false;
  }

  const usesGenericBlocksLabel = BLOCKS_ROOM_ALIASES.some((alias) => location.includes(alias));
  if (!usesGenericBlocksLabel) {
    return false;
  }

  const student = getSingleRelation(log.students);
  const studentLevelValue = student?.level;
  const studentLevel = normalizeText(studentLevelValue);
  return levelMatchers.some((matcher) => studentLevel.includes(matcher));
}

function parseZonesFromStorage(raw: string | null): HeatZone[] {
  if (!raw) return DEFAULT_ZONES;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return DEFAULT_ZONES;

    const cleaned = parsed
      .map((zone: any): HeatZone | null => {
        if (!zone || typeof zone !== 'object') return null;
        if (!zone.id || !zone.name) return null;
        const top = Number(zone.top);
        const left = Number(zone.left);
        const width = Number(zone.width);
        const height = Number(zone.height);
        if ([top, left, width, height].some((n) => Number.isNaN(n))) return null;

        return {
          id: String(zone.id),
          name: String(zone.name),
          top,
          left,
          width,
          height,
          keywords: Array.isArray(zone.keywords) ? zone.keywords.map((k: any) => String(k).trim()).filter(Boolean) : [],
        };
      })
      .filter((z: HeatZone | null): z is HeatZone => Boolean(z));

    return cleaned.length > 0 ? cleaned : DEFAULT_ZONES;
  } catch {
    return DEFAULT_ZONES;
  }
}

export default function SchoolHeatmapPage() {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const [logs, setLogs] = useState<BehavioralLog[]>([]);
  const [zones, setZones] = useState<HeatZone[]>(DEFAULT_ZONES);
  const [selectedZoneId, setSelectedZoneId] = useState<string>(DEFAULT_ZONES[0].id);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [daysFilter, setDaysFilter] = useState<'7' | '30' | '90' | 'all'>('30');
  const [highRiskStudents, setHighRiskStudents] = useState<HighRiskStudent[]>([]);

  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneKeywords, setNewZoneKeywords] = useState('');
  const [recentLogsModalOpen, setRecentLogsModalOpen] = useState(false);
  const [behaviorPatternsModalOpen, setBehaviorPatternsModalOpen] = useState(false);
  const [zoneDragState, setZoneDragState] = useState<ZoneDragState | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const stored = window.localStorage.getItem(ZONES_STORAGE_KEY);
    const parsed = parseZonesFromStorage(stored);
    setZones(parsed);
    setSelectedZoneId(parsed[0]?.id || '');
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ZONES_STORAGE_KEY, JSON.stringify(zones));
  }, [zones]);

  useEffect(() => {
    void fetchData();
  }, [daysFilter]);

  const fetchData = async () => {
    setLoading(true);

    try {
      if (!supabase) {
        setLogs([]);
        setHighRiskStudents([]);
        return;
      }

      let query = supabase
        .from('behavioral_events')
        .select('id, event_type, severity, description, location, student_lrn, event_date, event_time, created_at, students(level), event_categories(name, severity_level)')
        .order('event_date', { ascending: false })
        .limit(1000);

      if (daysFilter !== 'all') {
        const days = Number(daysFilter);
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - days);
        const dateKey = fromDate.toISOString().split('T')[0];
        query = query.gte('event_date', dateKey);
      }

      const [logsResult, riskResult] = await Promise.all([
        query,
        fetch('/api/ml/high-risk').then(async (response) => {
          if (!response.ok) return { success: true, data: [] as HighRiskStudent[] };
          return response.json();
        }),
      ]);

      if (logsResult.error) {
        throw new Error(logsResult.error.message || 'Failed to load behavioral events.');
      }

      setLogs((logsResult.data || []) as BehavioralLog[]);
      setHighRiskStudents(Array.isArray(riskResult?.data) ? riskResult.data : []);
    } catch (error) {
      toast({
        title: 'Heatmap load failed',
        description: error instanceof Error ? error.message : 'Unable to load school heatmap data.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const zoneAnalytics = useMemo(() => {
    return zones.map((zone) => {
      const zoneLogs = logs.filter((log) => isLogInZone(log, zone));
      const score = zoneLogs.reduce((acc, log) => acc + SEVERITY_WEIGHT[getResolvedSeverity(log)], 0);

      const breakdown: Record<Severity, number> = {
        critical: 0,
        major: 0,
        minor: 0,
        positive: 0,
      };

      zoneLogs.forEach((log) => {
        const severity = toSeverityBucket(getResolvedSeverity(log));
        breakdown[severity] += 1;
      });

      const incidentTypeMap = new Map<string, number>();
      const situationMap = new Map<string, number>();

      zoneLogs.forEach((log) => {
        const eventType = getResolvedEventType(log);
        const situation = inferSituationLabel(log);
        incidentTypeMap.set(eventType, (incidentTypeMap.get(eventType) || 0) + 1);
        situationMap.set(situation, (situationMap.get(situation) || 0) + 1);
      });

      const topIncidentType = Array.from(incidentTypeMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No dominant pattern';
      const topSituation = Array.from(situationMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'General context';

      const dominantSeverity = (Object.keys(breakdown) as Severity[])
        .sort((a, b) => breakdown[b] - breakdown[a])[0] || 'minor';

      const matchedStudentLrns = new Set(zoneLogs.map((log) => normalizeText(log.student_lrn)).filter(Boolean));
      const highRiskInZone = highRiskStudents.filter((student) => matchedStudentLrns.has(normalizeText(student.lrn)));

      return {
        zone,
        logs: zoneLogs,
        score,
        breakdown,
        heat: getHeatStyle(score, breakdown.critical),
        highRiskInZone,
        topIncidentType,
        topSituation,
        dominantSeverity,
      };
    });
  }, [zones, logs, highRiskStudents]);

  const selectedZone = zoneAnalytics.find((entry) => entry.zone.id === selectedZoneId) || zoneAnalytics[0];

  const selectedZoneContext = useMemo(() => {
    const zoneLogs = selectedZone?.logs || [];

    const typeMap = new Map<string, number>();
    const situationMap = new Map<string, number>();
    const timeMap = new Map<string, number>();

    zoneLogs.forEach((log) => {
      const type = getResolvedEventType(log);
      const situation = inferSituationLabel(log);
      const timeBand = getTimeBand(log.event_time);

      typeMap.set(type, (typeMap.get(type) || 0) + 1);
      situationMap.set(situation, (situationMap.get(situation) || 0) + 1);
      timeMap.set(timeBand, (timeMap.get(timeBand) || 0) + 1);
    });

    const topIncidentTypes = Array.from(typeMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const topSituations = Array.from(situationMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3);

    const peakTimeBand = Array.from(timeMap.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] || 'Unknown Time';

    return {
      topIncidentTypes,
      topSituations,
      peakTimeBand,
      total: zoneLogs.length,
    };
  }, [selectedZone]);

  const areaPatternRows = useMemo(
    () => zoneAnalytics.filter((entry) => entry.logs.length > 0).sort((a, b) => b.logs.length - a.logs.length),
    [zoneAnalytics]
  );
  const modalSeverityStyle = areaPatternRows.length > 0 ? getPatternSeverityStyle(areaPatternRows[0].dominantSeverity) : getPatternSeverityStyle('minor');

  const totalCritical = useMemo(
    () => logs.filter((log) => getResolvedSeverity(log) === 'critical').length,
    [logs]
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData();
  };

  const handleAddZone = () => {
    const name = newZoneName.trim();
    if (!name) {
      toast({ title: 'Zone name required', description: 'Please provide a room or area name.', variant: 'destructive' });
      return;
    }

    const keywords = newZoneKeywords
      .split(',')
      .map((token) => token.trim())
      .filter(Boolean);

    const newZone: HeatZone = {
      id: `zone-${Date.now()}`,
      name,
      top: NEW_ZONE_DEFAULTS.top,
      left: NEW_ZONE_DEFAULTS.left,
      width: NEW_ZONE_DEFAULTS.width,
      height: NEW_ZONE_DEFAULTS.height,
      keywords,
    };

    setZones((prev) => [...prev, newZone]);
    setSelectedZoneId(newZone.id);
    setNewZoneName('');
    setNewZoneKeywords('');

    toast({
      title: 'Area added',
      description: `${name} is now part of the heatmap and linked to behavioral log locations.`,
    });
  };

  const handleDeleteZone = (zoneId: string) => {
    setZones((prev) => {
      const next = prev.filter((zone) => zone.id !== zoneId);
      if (next.length > 0 && selectedZoneId === zoneId) {
        setSelectedZoneId(next[0].id);
      }
      return next;
    });
  };

  const recentSelectedLogs = (selectedZone?.logs || []).slice(0, 8);

  const maskStudentLrn = (value: string | null | undefined) => {
    if (!value) return 'LRN hidden';
    const safe = value.trim();
    if (safe.length <= 4) return 'LRN hidden';
    return `${safe.slice(0, 3)}***${safe.slice(-2)}`;
  };

  const beginZoneDrag = (
    event: React.MouseEvent<HTMLButtonElement>,
    zone: HeatZone,
    mode: DragMode
  ) => {
    event.preventDefault();
    event.stopPropagation();
    setSelectedZoneId(zone.id);
    setZoneDragState({
      zoneId: zone.id,
      mode,
      startClientX: event.clientX,
      startClientY: event.clientY,
      initialTop: zone.top,
      initialLeft: zone.left,
      initialWidth: zone.width,
      initialHeight: zone.height,
    });
  };

  useEffect(() => {
    if (!zoneDragState) return;

    const handleMouseMove = (event: MouseEvent) => {
      const mapRect = mapContainerRef.current?.getBoundingClientRect();
      if (!mapRect) return;

      const dxPercent = ((event.clientX - zoneDragState.startClientX) / mapRect.width) * 100;
      const dyPercent = ((event.clientY - zoneDragState.startClientY) / mapRect.height) * 100;

      setZones((prev) =>
        prev.map((zone) => {
          if (zone.id !== zoneDragState.zoneId) return zone;

          if (zoneDragState.mode === 'move') {
            const nextLeft = Math.max(0, Math.min(100 - zone.width, zoneDragState.initialLeft + dxPercent));
            const nextTop = Math.max(0, Math.min(100 - zone.height, zoneDragState.initialTop + dyPercent));
            return { ...zone, left: Number(nextLeft.toFixed(2)), top: Number(nextTop.toFixed(2)) };
          }

          const minSize = 8;
          const nextWidth = Math.max(minSize, Math.min(100 - zone.left, zoneDragState.initialWidth + dxPercent));
          const nextHeight = Math.max(minSize, Math.min(100 - zone.top, zoneDragState.initialHeight + dyPercent));
          return { ...zone, width: Number(nextWidth.toFixed(2)), height: Number(nextHeight.toFixed(2)) };
        })
      );
    };

    const handleMouseUp = () => {
      setZoneDragState(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [zoneDragState]);

  return (
    <HeatmapZonesProvider initialZones={zones}>
      <DashboardLayout>
        <div className="space-y-6">
        <Card className="border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70 shadow-sm">
          <CardHeader>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                  <MapPinned className="h-6 w-6 text-orange-500" />
                  School Safety Heatmap
                </CardTitle>
                <CardDescription>
                  Click an area to inspect room-level severity reports. Heat intensity is based on behavioral log severity and ML-linked risk signals.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Dialog open={behaviorPatternsModalOpen} onOpenChange={setBehaviorPatternsModalOpen}>
                  <DialogTrigger asChild>
                    <Button type="button" size="sm" variant="outline">
                      Behavior Patterns
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl lg:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
                    <DialogHeader className="border-b border-slate-200 dark:border-slate-700 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                            <DialogTitle className="text-xl font-bold">Behavior Patterns by School Area</DialogTitle>
                          </div>
                          <DialogDescription className="mt-2 text-sm">
                            Complete behavior pattern record for mapped school areas based on recent behavioral logs.
                          </DialogDescription>
                        </div>
                        {areaPatternRows.length > 0 && (
                          <Badge className={`${modalSeverityStyle.badge} text-xs font-semibold px-3 py-1 whitespace-nowrap mr-8`}>
                            {areaPatternRows.length} Incident{areaPatternRows.length !== 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </DialogHeader>

                    <div className="flex-1 overflow-y-auto pr-4 space-y-3">
                      {areaPatternRows.length === 0 ? (
                        <div className="rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 p-8 text-center">
                          <ShieldAlert className="h-10 w-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
                          <p className="text-sm text-slate-600 dark:text-slate-400">
                            No mapped behavior patterns yet for the selected date range.
                          </p>
                        </div>
                      ) : (
                        areaPatternRows.map((entry, index) => {
                          const latestLog = entry.logs[0];
                          const style = getPatternSeverityStyle(entry.dominantSeverity);

                          const observedTypes = Array.from(
                            new Set(entry.logs.map((log) => getResolvedEventType(log)).filter(Boolean))
                          )
                            .slice(0, 2)
                            .join(' • ');

                          return (
                            <div
                              key={entry.zone.id}
                              className={`rounded-lg border ${style.border} ${style.bg} p-4 hover:shadow-md transition-shadow`}
                            >
                              <div className="space-y-3">
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <div className={style.iconColor}>
                                        {entry.dominantSeverity === 'critical' ? <Flame className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                                      </div>
                                      <p className={`font-bold text-sm ${style.textColor}`}>{entry.topIncidentType}</p>
                                    </div>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                      <Calendar className="w-3 h-3 inline mr-1" />
                                      {latestLog?.event_date
                                        ? `${new Date(latestLog.event_date).toLocaleDateString('en-US', {
                                            weekday: 'short',
                                            year: 'numeric',
                                            month: 'short',
                                            day: 'numeric',
                                          })}${latestLog?.event_time ? ` at ${latestLog.event_time}` : ''}`
                                        : 'No timestamp available'}
                                    </p>
                                  </div>

                                  <Badge className={`${style.badge} font-semibold text-xs px-2.5 py-1 uppercase tracking-wider`}>
                                    {entry.dominantSeverity}
                                  </Badge>
                                </div>

                                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                                  {latestLog?.description || 'Mapped recurring behavior incidents in this school area.'}
                                </p>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600 dark:text-slate-400">
                                  <div className="flex items-center gap-2">
                                    <Users className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>
                                      <span className="font-semibold">Reported:</span> Heatmap pattern engine
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Activity className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>
                                      <span className="font-semibold">Location:</span> {entry.zone.name}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Target className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>
                                      <span className="font-semibold">Category:</span> {entry.topSituation}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>
                                      <span className="font-semibold">ML Risk Linked:</span> {Array.isArray(entry.highRiskMatches) && entry.highRiskMatches.length > 0 ? '✓ Yes' : '✗ No'}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock3 className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                                    <span>
                                      <span className="font-semibold">Follow-up:</span> {(entry.dominantSeverity === 'critical' || entry.dominantSeverity === 'major') ? 'Required' : 'Monitoring'}
                                    </span>
                                  </div>
                                </div>

                                <div className="space-y-1 pt-2 border-t border-slate-200 dark:border-slate-700">
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    <span className="font-semibold">Action Taken:</span> Ranked #{index + 1} by mapped incident frequency ({entry.logs.length} total).
                                  </p>
                                  <p className="text-xs text-slate-600 dark:text-slate-400">
                                    <span className="font-semibold">Notes:</span> {observedTypes ? `Observed types: ${observedTypes}.` : 'No additional type metadata available.'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                <Button
                  type="button"
                  size="sm"
                  variant={daysFilter === '7' ? 'default' : 'outline'}
                  onClick={() => setDaysFilter('7')}
                >
                  7 Days
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={daysFilter === '30' ? 'default' : 'outline'}
                  onClick={() => setDaysFilter('30')}
                >
                  30 Days
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={daysFilter === '90' ? 'default' : 'outline'}
                  onClick={() => setDaysFilter('90')}
                >
                  90 Days
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={daysFilter === 'all' ? 'default' : 'outline'}
                  onClick={() => setDaysFilter('all')}
                >
                  All
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={handleRefresh} disabled={refreshing || loading}>
                  <RefreshCw className={cn('mr-2 h-4 w-4', refreshing ? 'animate-spin' : '')} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-xl border border-blue-200/70 bg-blue-50/70 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
              <p className="text-xs text-blue-700 dark:text-blue-300">Behavioral Logs</p>
              <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-100">{logs.length}</p>
            </div>
            <div className="rounded-xl border border-red-200/70 bg-red-50/70 p-4 dark:border-red-900/50 dark:bg-red-950/30">
              <p className="text-xs text-red-700 dark:text-red-300">Critical Incidents</p>
              <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-100">{totalCritical}</p>
            </div>
            <div className="rounded-xl border border-orange-200/70 bg-orange-50/70 p-4 dark:border-orange-900/50 dark:bg-orange-950/30">
              <p className="text-xs text-orange-700 dark:text-orange-300">Mapped Areas</p>
              <p className="mt-1 text-2xl font-bold text-orange-900 dark:text-orange-100">{zones.length}</p>
            </div>
            <div className="rounded-xl border border-rose-200/70 bg-rose-50/70 p-4 dark:border-rose-900/50 dark:bg-rose-950/30">
              <p className="text-xs text-rose-700 dark:text-rose-300">ML High-Risk Students</p>
              <p className="mt-1 text-2xl font-bold text-rose-900 dark:text-rose-100">{highRiskStudents.length}</p>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
          <Card className="xl:col-span-8 border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70">
            <CardHeader>
              <CardTitle className="text-lg">Satellite School View</CardTitle>
              <CardDescription>
                Hotter (redder) areas indicate rooms/zones with higher severity and recurring critical reports.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                ref={mapContainerRef}
                className="relative mx-auto aspect-16/10 w-full overflow-hidden rounded-xl border border-slate-300/70 shadow-sm dark:border-slate-700/70"
              >
                <Image
                  src="/SGCDC-Satellite-View.png"
                  alt="SGCDC satellite map"
                  fill
                  className="object-cover"
                  priority
                />

                {!loading && zoneAnalytics.map((entry) => {
                  const { zone, heat, logs: zoneLogs } = entry;
                  const isSelected = zone.id === selectedZone?.zone.id;
                  return (
                    <div
                      key={zone.id}
                      onClick={() => setSelectedZoneId(zone.id)}
                      className={cn(
                        'absolute rounded-lg border-2 p-1 text-left text-[10px] font-semibold text-white shadow-md backdrop-blur-[1px] transition-all duration-200',
                        'hover:scale-[1.02]',
                        zoneDragState?.zoneId === zone.id ? 'cursor-grabbing' : 'cursor-grab',
                        isSelected ? 'ring-2 ring-white' : ''
                      )}
                      style={{
                        top: `${zone.top}%`,
                        left: `${zone.left}%`,
                        width: `${zone.width}%`,
                        height: `${zone.height}%`,
                        backgroundColor: heat.background,
                        borderColor: heat.border,
                      }}
                      title={`${zone.name}: ${zoneLogs.length} logs, ${heat.label} intensity`}
                    >
                      <button
                        type="button"
                        onMouseDown={(event) => beginZoneDrag(event, zone, 'move')}
                        className="flex h-full w-full flex-col justify-between text-left focus:outline-none"
                      >
                        <span className="truncate pr-1">{zone.name}</span>
                        <span className="text-[9px] opacity-90">{zoneLogs.length} logs</span>
                      </button>

                      <button
                        type="button"
                        aria-label={`Resize ${zone.name}`}
                        onMouseDown={(event) => beginZoneDrag(event, zone, 'resize')}
                        className="absolute bottom-1 right-1 h-3 w-3 rounded-sm border border-white/70 bg-white/40 hover:bg-white/70"
                      />
                    </div>
                  );
                })}

                {loading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/35 text-sm font-semibold text-white">
                    Loading heatmap data...
                  </div>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {zoneAnalytics.map((entry) => (
                  <Button
                    key={entry.zone.id}
                    variant={selectedZone?.zone.id === entry.zone.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedZoneId(entry.zone.id)}
                    className="h-8"
                  >
                    {entry.zone.name}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="xl:col-span-4 border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Flame className="h-5 w-5 text-orange-500" />
                {selectedZone?.zone.name || 'Area Overview'}
              </CardTitle>
              <CardDescription>
                Live severity summary from logs matching this room/area location.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {selectedZone ? (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-600 dark:text-slate-300">Heat Level</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedZone.heat.label}</p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-800/50">
                      <p className="text-xs text-slate-600 dark:text-slate-300">Severity Score</p>
                      <p className="text-xl font-bold text-slate-900 dark:text-slate-100">{selectedZone.score}</p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">Severity Breakdown</p>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(selectedZone.breakdown) as Severity[]).map((severity) => (
                        <Badge key={severity} className={SEVERITY_BADGE_CLASS[severity]}>
                          {severity}: {selectedZone.breakdown[severity]}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3 dark:border-rose-900/50 dark:bg-rose-950/30">
                    <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-rose-700 dark:text-rose-300">
                      <ShieldAlert className="h-3.5 w-3.5" />
                      ML Risk Signal
                    </p>
                    <p className="mt-1 text-sm text-rose-800 dark:text-rose-200">
                      {selectedZone.highRiskInZone.length} high-risk student(s) recently logged in this area.
                    </p>
                  </div>

                  <div className="rounded-lg border border-indigo-200 bg-indigo-50/70 p-3 dark:border-indigo-900/50 dark:bg-indigo-950/30 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-indigo-700 dark:text-indigo-300">
                      Contextual Behavior Analysis
                    </p>
                    <p className="text-xs text-indigo-800 dark:text-indigo-200">
                      Peak situation window: <span className="font-semibold">{selectedZoneContext.peakTimeBand}</span>
                    </p>

                    <div>
                      <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 mb-1">Top Incident Types</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedZoneContext.topIncidentTypes.length > 0 ? selectedZoneContext.topIncidentTypes.map(([type, count]) => (
                          <Badge key={type} variant="outline" className="border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300">
                            {type} ({count})
                          </Badge>
                        )) : (
                          <span className="text-xs text-indigo-800/80 dark:text-indigo-200/80">No incidents in selected range.</span>
                        )}
                      </div>
                    </div>

                    <div>
                      <p className="text-[11px] font-medium text-indigo-700 dark:text-indigo-300 mb-1">Frequent Situations</p>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedZoneContext.topSituations.length > 0 ? selectedZoneContext.topSituations.map(([situation, count]) => (
                          <Badge key={situation} variant="outline" className="border-indigo-300 text-indigo-700 dark:border-indigo-700 dark:text-indigo-300">
                            {situation} ({count})
                          </Badge>
                        )) : (
                          <span className="text-xs text-indigo-800/80 dark:text-indigo-200/80">No contextual signals found.</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div>
                    <p className="mb-2 flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-slate-600 dark:text-slate-300">
                      <Activity className="h-3.5 w-3.5" />
                      Recent Logs
                    </p>
                    <div className="rounded-lg border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-700/70 dark:bg-slate-900/40">
                      <p className="text-xs text-slate-600 dark:text-slate-300 mb-3">
                        Logs are hidden by default for privacy. Open the modal to review room activity.
                      </p>
                      <Dialog open={recentLogsModalOpen} onOpenChange={setRecentLogsModalOpen}>
                        <DialogTrigger asChild>
                          <Button type="button" size="sm" variant="outline" className="w-full">
                            View Recent Logs ({recentSelectedLogs.length})
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-hidden">
                          <DialogHeader>
                            <DialogTitle>{selectedZone.zone.name} - Recent Logs</DialogTitle>
                            <DialogDescription>
                              Showing up to 8 recent logs for this area. Student identifiers are partially masked for privacy.
                            </DialogDescription>
                          </DialogHeader>

                          <div className="overflow-y-auto pr-1 space-y-2">
                            {recentSelectedLogs.length === 0 && (
                              <div className="rounded-lg border border-slate-200/80 p-3 text-sm text-slate-500 dark:border-slate-700/70 dark:text-slate-400">
                                No logs found for this area in the selected date range.
                              </div>
                            )}

                            {recentSelectedLogs.map((log) => {
                              const severity = toSeverityBucket(getResolvedSeverity(log));
                              const eventType = getResolvedEventType(log);
                              return (
                                <div
                                  key={log.id}
                                  className="rounded-lg border border-slate-200/80 p-3 dark:border-slate-700/70"
                                >
                                  <div className="mb-1 flex items-center justify-between gap-2">
                                    <p className="line-clamp-1 text-sm font-medium text-slate-900 dark:text-slate-100">
                                      {eventType}
                                    </p>
                                    <Badge className={SEVERITY_BADGE_CLASS[severity]}>{severity}</Badge>
                                  </div>
                                  <p className="line-clamp-2 text-xs text-slate-600 dark:text-slate-300">{log.description || 'No description provided.'}</p>
                                  <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
                                    {log.event_date || 'No date'} {log.event_time ? `• ${log.event_time}` : ''} • {maskStudentLrn(log.student_lrn)}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-300">Select an area to inspect room-level severity reports.</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-orange-200/70 dark:border-slate-800/70 bg-white/90 dark:bg-slate-900/70">
          <CardHeader>
            <CardTitle className="text-lg">Area / Room Mapper</CardTitle>
            <CardDescription>
              Add rooms or zones from your satellite map. Use names/keywords that match your behavioral event location logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="xl:col-span-2">
                <Label htmlFor="zone-name">Area Name</Label>
                <Input id="zone-name" value={newZoneName} onChange={(e) => setNewZoneName(e.target.value)} placeholder="e.g., Room A-101" />
              </div>
              <div className="xl:col-span-2">
                <Label htmlFor="zone-keywords">Location Keywords</Label>
                <Input
                  id="zone-keywords"
                  value={newZoneKeywords}
                  onChange={(e) => setNewZoneKeywords(e.target.value)}
                  placeholder="room a-101, science lab"
                />
              </div>
            </div>

            <Button type="button" onClick={handleAddZone} className="w-full sm:w-auto">
              <Plus className="mr-2 h-4 w-4" />
              Add Area to Heatmap
            </Button>

            <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
              {zones.map((zone) => (
                <div
                  key={zone.id}
                  className="flex items-center justify-between rounded-lg border border-slate-200/80 px-3 py-2 dark:border-slate-700/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">{zone.name}</p>
                    <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                      {zone.top}% / {zone.left}% / {zone.width}% / {zone.height}%
                    </p>
                  </div>
                  <Button type="button" size="icon" variant="ghost" onClick={() => handleDeleteZone(zone.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ))}
            </div>

            <div className="rounded-lg border border-dashed border-orange-300/80 bg-orange-50/60 p-3 text-sm text-orange-900 dark:border-orange-900/60 dark:bg-orange-950/25 dark:text-orange-100">
              New areas are added with a default size/position. Drag the box on the map to move it, and drag the bottom-right handle to resize. Use consistent location names (for example, "Room A-101") and matching keywords for accurate heatmap scoring.
            </div>
          </CardContent>
        </Card>
        </div>
      </DashboardLayout>
    </HeatmapZonesProvider>
  );
}
