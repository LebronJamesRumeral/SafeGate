'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { QrCode, Camera, CheckCircle, XCircle, User, Clock, Hash, Wifi, WifiOff, CloudUpload } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';
import { getOfflineQueueCount } from '@/lib/offline-secure-queue';
import { queueAttendanceScan, syncOfflineQueue } from '@/lib/offline-sync';
import { 
  getStudentSchedule, 
  validateAttendanceStatus, 
  getAttendanceStatusDisplay 
} from '@/lib/attendance-schedule-validation';

interface ScanResult {
  status: 'success' | 'error';
  student?: string;
  studentId?: string;
  grade?: string;
  time?: string;
  date?: string;
  action?: string;
  message?: string;
  scannedText?: string;
  duration?: string;
  checkinTime?: string;
  attendanceStatus?: 'present' | 'late' | 'invalid_timeout' | 'absent';
  statusReason?: string;
  temperature?: number;
}

const sharedScanRfidState = {
  connected: false,
  connecting: false,
  disconnecting: false,
  readingActive: false,
  port: null as any,
  reader: null as any,
};

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [qrText, setQrText] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [manualId, setManualId] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [rfidConnected, setRfidConnected] = useState(sharedScanRfidState.connected);
  const [connectingRfid, setConnectingRfid] = useState(sharedScanRfidState.connecting);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncing, setSyncing] = useState(false);
  const [pendingSyncCount, setPendingSyncCount] = useState(0);
  const [offlineAttendanceState, setOfflineAttendanceState] = useState<Record<string, 'in' | 'out'>>({});
  const [temperatureModalOpen, setTemperatureModalOpen] = useState(false);
  const [pendingTemperatureStudent, setPendingTemperatureStudent] = useState<any | null>(null);
  const [temperatureInput, setTemperatureInput] = useState('');
  const [submittingTemperature, setSubmittingTemperature] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<any>(null);
  const rfidPortRef = useRef<any>(null);
  const rfidReaderRef = useRef<any>(null);
  const rfidReadingActiveRef = useRef(false);
  const rfidDisconnectingRef = useRef(false);
  const recordingRef = useRef(false);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);
  const startupRetryRef = useRef<number | null>(null);

  const isMediaPlayAbortError = (error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    return (error instanceof Error && error.name === 'AbortError') || message.includes('play() request was interrupted');
  };

  const normalizeRfidUid = (value: string) => value.toUpperCase().replace(/[^A-F0-9]/g, '');

  const applyRfidLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;

    const uidMatch = trimmed.match(/(?:card\s*uid|uid)\s*:\s*(.+)$/i);
    if (!uidMatch?.[1]) return;
    
    const uid = normalizeRfidUid(uidMatch[1]);
    if (uid.length < 4) return;

    setManualId(uid);
  };

  const disconnectRfidReader = async (silent = false) => {
    if (rfidDisconnectingRef.current || sharedScanRfidState.disconnecting) return;
    rfidDisconnectingRef.current = true;
    sharedScanRfidState.disconnecting = true;
    rfidReadingActiveRef.current = false;
    sharedScanRfidState.readingActive = false;

    try {
      const reader = rfidReaderRef.current ?? sharedScanRfidState.reader;
      const port = rfidPortRef.current ?? sharedScanRfidState.port;

      if (reader) {
        try {
          await reader.cancel();
        } catch {
          // Reader can already be closed while disconnecting.
        }

        try {
          reader.releaseLock();
        } catch {
          // No-op if lock is already released.
        }
      }

      if (port) {
        try {
          await port.close();
        } catch {
          // Port can already be closed.
        }
      }
    } catch {
      // Best effort cleanup.
    } finally {
      rfidReaderRef.current = null;
      rfidPortRef.current = null;
      sharedScanRfidState.reader = null;
      sharedScanRfidState.port = null;
      sharedScanRfidState.connected = false;
      sharedScanRfidState.connecting = false;
      sharedScanRfidState.disconnecting = false;
      sharedScanRfidState.readingActive = false;
      setRfidConnected(false);
      rfidDisconnectingRef.current = false;
      if (!silent) {
        toast({
          title: 'RFID Reader Disconnected',
          description: 'Manual serial input has been disconnected.',
        });
      }
    }
  };

  const connectRfidReader = async () => {
    if (typeof navigator === 'undefined' || !(navigator as any).serial) {
      toast({
        title: 'Web Serial Not Supported',
        description: 'Use Chrome/Edge and open the app over localhost or HTTPS.',
        variant: 'destructive',
      });
      return;
    }

    setConnectingRfid(true);
    sharedScanRfidState.connecting = true;
    try {
      if (sharedScanRfidState.connected || rfidPortRef.current) {
        setRfidConnected(true);
        return;
      }

      const serialApi = (navigator as any).serial;
      const grantedPorts = await serialApi.getPorts();
      const port = grantedPorts[0] ?? await serialApi.requestPort();
      if (!port.readable) {
        await port.open({ baudRate: 115200 });
      }

      rfidPortRef.current = port;
      sharedScanRfidState.port = port;
      rfidReadingActiveRef.current = true;
      sharedScanRfidState.readingActive = true;
      setRfidConnected(true);
      sharedScanRfidState.connected = true;
      setConnectingRfid(false);
      sharedScanRfidState.connecting = false;
      toast({
        title: 'RFID Reader Connected',
        description: 'Tap a tag and the UID will auto-fill manual entry.',
      });

      const decoder = new TextDecoder();
      let buffer = '';

      while (rfidReadingActiveRef.current && port.readable && rfidPortRef.current === port) {
        const reader = port.readable.getReader();
        rfidReaderRef.current = reader;
        sharedScanRfidState.reader = reader;
        try {
          while (rfidReadingActiveRef.current) {
            const { value, done } = await reader.read();
            if (done) {
              break;
            }
            if (!value) {
              continue;
            }

            buffer += decoder.decode(value, { stream: true });

            const lines = buffer.split(/\r?\n/);
            buffer = lines.pop() ?? '';
            for (const line of lines) {
              applyRfidLine(line);
            }
          }
        } catch {
          if (!rfidReadingActiveRef.current) {
            break;
          }
        } finally {
          try {
            reader.releaseLock();
          } catch {
            // No-op if lock already released.
          }
          if (rfidReaderRef.current === reader) {
            rfidReaderRef.current = null;
          }
          if (sharedScanRfidState.reader === reader) {
            sharedScanRfidState.reader = null;
          }
        }
      }
    } catch (error: any) {
      const cancelled = error?.name === 'NotFoundError';
      if (!cancelled) {
        toast({
          title: 'Failed to Connect RFID Reader',
          description: error?.message || String(error),
          variant: 'destructive',
        });
      }
      await disconnectRfidReader(true);
    } finally {
      setConnectingRfid(false);
      sharedScanRfidState.connecting = false;
    }
  };

  const findStudent = async (text: string) => {
    try {
      if (!supabase) {
        const msg = 'Supabase client not initialized';
        console.error(msg);
        toast({
          title: 'Internal Error',
          description: msg,
          variant: 'destructive',
        });
        return null;
      }
      
      const normalized = text.trim().toUpperCase();
      const normalizedUid = normalized.replace(/[^A-F0-9]/g, '');

      const { data: byLrn, error: lrnError } = await supabase
        .from('students')
        .select('*')
        .eq('lrn', normalized)
        .single();

      if (lrnError && lrnError.code !== 'PGRST116') {
        console.error('Error finding student:', lrnError);
        toast({
          title: 'Failed to find student',
          description: lrnError.message || String(lrnError),
          variant: 'destructive',
        });
        return null;
      }

      let data = byLrn;
      if (!data) {
        const rfidCandidates = Array.from(new Set([normalized, normalizedUid].filter(Boolean)));
        const { data: byRfid, error: rfidError } = await supabase
          .from('students')
          .select('*')
          .in('rfid_uid', rfidCandidates)
          .limit(1)
          .maybeSingle();

        if (rfidError) {
          console.error('Error finding student by RFID UID:', rfidError);
          toast({
            title: 'Failed to find student',
            description: rfidError.message || String(rfidError),
            variant: 'destructive',
          });
          return null;
        }

        data = byRfid;
      }
      
      if (data) {
        toast({
          title: 'Student Found',
          description: `Student ${data.name} found successfully.`,
          variant: 'default',
        });
        return {
          ...data,
          parentName: data.parent_name,
          parentContact: data.parent_contact,
          parentEmail: data.parent_email,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error finding student:', error);
      toast({
        title: 'Failed to find student',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
      return null;
    }
  };

  const calculateDuration = (startTime: string, endTime: string): string => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const diffMs = end.getTime() - start.getTime();
    
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours === 0) {
      return `${minutes}m`;
    } else if (minutes === 0) {
      return `${hours}h`;
    } else {
      return `${hours}h ${minutes}m`;
    }
  };

  const refreshPendingSyncCount = async () => {
    try {
      const count = await getOfflineQueueCount();
      setPendingSyncCount(count);
    } catch (error) {
      console.error('Failed to read offline queue count:', error);
    }
  };

  const toMinutes = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };

  const dateMinutes = (date: Date) => date.getHours() * 60 + date.getMinutes();

  const isScheduledSchoolDay = (schedule: Awaited<ReturnType<typeof getStudentSchedule>>, date: Date) => {
    if (!schedule) return false;

    const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
    const schoolDays = schedule.school_days as Record<string, boolean>;
    return Boolean(schoolDays?.[dayName]);
  };

  const formatTimeLabel = (timeStr: string) => {
    const [hourRaw, minuteRaw] = timeStr.split(':');
    const hour = Number(hourRaw);
    const minute = Number(minuteRaw);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 === 0 ? 12 : hour % 12;
    return `${hour12}:${String(minute).padStart(2, '0')} ${suffix}`;
  };

  const applyAttendanceOnline = async (studentLrn: string, scanIsoTime: string, temperature?: number) => {
    if (!supabase) {
      throw new Error('Supabase client not initialized');
    }

    const schedule = await getStudentSchedule(studentLrn);
    if (!schedule) {
      return {
        action: 'Blocked' as const,
        message: 'No active attendance schedule found for this student.',
      };
    }

    const scanTime = new Date(scanIsoTime);
    if (!isScheduledSchoolDay(schedule, scanTime)) {
      return {
        action: 'Blocked' as const,
        message: 'No class schedule for today.',
      };
    }

    const nowMinutes = dateMinutes(scanTime);
    const entryMinutes = toMinutes(schedule.entry_time);
    const exitMinutes = toMinutes(schedule.exit_time);

    const date = scanIsoTime.split('T')[0];
    const { data: existing, error: existingError } = await supabase
      .from('attendance_logs')
      .select('id, check_in_time, check_out_time')
      .eq('student_lrn', studentLrn)
      .eq('date', date)
      .order('check_in_time', { ascending: false })
      .limit(1);

    if (existingError) {
      throw existingError;
    }

    if (!existing || existing.length === 0) {
      if (nowMinutes >= exitMinutes) {
        return {
          action: 'Blocked' as const,
          message: `Check-in window closed. Scheduled end time is ${formatTimeLabel(schedule.exit_time)}.`,
        };
      }
      
      const { error } = await supabase
        .from('attendance_logs')
        .insert([
          {
            student_lrn: studentLrn,
            check_in_time: scanIsoTime,
            check_in_temperature: temperature ?? null,
            date,
          },
        ]);

      if (error) {
        throw error;
      }

      // Validate and update attendance status
      const validation = validateAttendanceStatus(schedule, scanTime);
      await supabase
        .from('attendance_logs')
        .update({
          attendance_status: validation.attendance_status,
          is_late: validation.is_late,
          is_invalid_timeout: false,
        })
        .eq('student_lrn', studentLrn)
        .eq('date', date);

      return {
        action: 'Checked In' as const,
      };
    }

    if (existing[0].check_out_time) {
      return {
        action: 'Already Checked Out' as const,
      };
    }

    if (nowMinutes < exitMinutes) {
      return {
        action: 'Blocked' as const,
        message: `Too early to check out. Check-out starts at ${formatTimeLabel(schedule.exit_time)}.`,
      };
    }

    const { error } = await supabase
      .from('attendance_logs')
      .update({
        check_out_time: scanIsoTime,
        check_out_temperature: temperature ?? null,
      })
      .eq('id', existing[0].id);

    if (error) {
      throw error;
    }

    return {
      action: 'Checked Out' as const,
      checkInTime: existing[0].check_in_time as string,
      message: `Checked out after scheduled end (${formatTimeLabel(schedule.exit_time)}).`,
    };
  };

  const syncQueuedRecords = async (showToastFeedback = false) => {
    if (!supabase || !navigator.onLine || syncing) {
      return;
    }

    setSyncing(true);
    try {
      const result = await syncOfflineQueue(supabase);
      await refreshPendingSyncCount();

      if (showToastFeedback && result.synced > 0) {
        toast({
          title: 'Offline Records Synced',
          description: `${result.synced} queued record(s) uploaded successfully.`,
          variant: 'default',
        });
      }

      if (showToastFeedback && result.failed > 0) {
        toast({
          title: 'Some Records Still Pending',
          description: `${result.failed} record(s) could not sync yet.`,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed syncing offline records:', error);
    } finally {
      setSyncing(false);
    }
  };

  const recordAttendance = async (student: any, temperature: number) => {
    const now = new Date();
    const nowIso = now.toISOString();
    const date = nowIso.split('T')[0];

    if (!navigator.onLine) {
      try {
        await queueAttendanceScan({
          student_lrn: student.lrn,
          scanned_at: nowIso,
          temperature,
        });

        const stateKey = `${student.lrn}:${date}`;
        const lastState = offlineAttendanceState[stateKey] || 'out';
        const nextState = lastState === 'out' ? 'in' : 'out';
        const action = nextState === 'in' ? 'Checked In' : 'Checked Out';

        setOfflineAttendanceState((current) => ({
          ...current,
          [stateKey]: nextState,
        }));

        setLastScan({
          student: student.name,
          studentId: student.lrn,
          grade: student.level,
          time: now.toLocaleTimeString(),
          date: now.toLocaleDateString(),
          status: 'success',
          action,
          message: 'Saved securely offline. Will sync automatically when online.',
          temperature,
        });

        await refreshPendingSyncCount();
      } catch (error) {
        console.error('Failed to save offline attendance:', error);
        setLastScan({
          status: 'error',
          message: 'Unable to save attendance offline',
          time: now.toLocaleTimeString(),
        });
      }
      return;
    }

    try {
      const result = await applyAttendanceOnline(student.lrn, nowIso, temperature);

      if (result.action === 'Checked In') {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
          }

        const client = supabase!;

        // Fetch the attendance status from the database
          const { data: attendanceRecord } = await client
          .from('attendance_logs')
          .select('attendance_status')
          .eq('student_lrn', student.lrn)
          .eq('date', date)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .single();

        const attendanceStatus = attendanceRecord?.attendance_status || 'present';
        const statusDisplay = getAttendanceStatusDisplay({
          attendance_status: attendanceStatus as any,
          is_late: attendanceStatus === 'late',
          is_invalid_timeout: attendanceStatus === 'invalid_timeout',
          minutes_early: 0,
          minutes_overtime: 0,
          status_reason: attendanceStatus === 'late' ? 'Late arrival' : 'On time'
        });

        setLastScan({
          student: student.name,
          studentId: student.lrn,
          grade: student.level,
          checkinTime: now.toLocaleTimeString(),
          time: now.toLocaleTimeString(),
          date: now.toLocaleDateString(),
          status: 'success',
          action: 'Checked In',
          attendanceStatus: attendanceStatus as any,
          statusReason: statusDisplay.text,
          temperature,
        });

        try {
          const response = await fetch('/api/ml/scan', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ studentLrn: student.lrn }),
          });
        } catch (mlError) {
          console.error('ML scan logging error:', mlError);
        }
      } else if (result.action === 'Already Checked Out') {
          setLastScan({
            student: student.name,
            studentId: student.lrn,
            grade: student.level,
            time: now.toLocaleTimeString(),
            date: now.toLocaleDateString(),
            status: 'error',
            message: 'Student already checked out today',
            action: 'Check Out'
          });
      } else if (result.action === 'Blocked') {
          setLastScan({
            student: student.name,
            studentId: student.lrn,
            grade: student.level,
            time: now.toLocaleTimeString(),
            date: now.toLocaleDateString(),
            status: 'error',
            message: result.message,
          });
      } else {
        const duration = result.checkInTime
          ? calculateDuration(result.checkInTime, nowIso)
          : undefined;

        if (!supabase) {
          throw new Error('Supabase client not initialized');
        }

        const client = supabase!;
        
        // Fetch the checkout record to check if there's an invalid timeout
        const { data: attendanceRecord } = await client
          .from('attendance_logs')
          .select('attendance_status')
          .eq('student_lrn', student.lrn)
          .eq('date', date)
          .order('check_in_time', { ascending: false })
          .limit(1)
          .single();

        const attendanceStatus = attendanceRecord?.attendance_status || 'present';
        const statusDisplay = getAttendanceStatusDisplay({
          attendance_status: attendanceStatus as any,
          is_late: false,
          is_invalid_timeout: false,
          minutes_early: 0,
          minutes_overtime: 0,
          status_reason: result.message || 'Checked out'
        });

        setLastScan({
          student: student.name,
          studentId: student.lrn,
          grade: student.level,
          checkinTime: result.checkInTime ? new Date(result.checkInTime).toLocaleTimeString() : undefined,
          time: now.toLocaleTimeString(),
          date: now.toLocaleDateString(),
          duration: duration,
          status: 'success',
          action: 'Checked Out',
          attendanceStatus: attendanceStatus as any,
          statusReason: statusDisplay.text,
          temperature,
        });
      }
    } catch (error) {
      console.error('Error recording attendance online, queueing offline fallback:', error);
      try {
        await queueAttendanceScan({
          student_lrn: student.lrn,
          scanned_at: nowIso,
          temperature,
        });
        await refreshPendingSyncCount();
        setLastScan({
          student: student.name,
          studentId: student.lrn,
          grade: student.level,
          time: now.toLocaleTimeString(),
          date: now.toLocaleDateString(),
          status: 'success',
          action: 'Queued Offline',
          message: 'Network issue detected. Record saved offline and queued for sync.',
          temperature,
        });
      } catch (queueError) {
        console.error('Error queueing fallback attendance:', queueError);
        setLastScan({
          status: 'error',
          message: 'Failed to record attendance',
          time: now.toLocaleTimeString(),
        });
      }
    }
  };

  const promptTemperatureForStudent = (student: any) => {
    // Pause continuous scanning while temperature is being encoded for this scan.
    setScanning(false);
    setPendingTemperatureStudent(student);
    setTemperatureInput('');
    setTemperatureModalOpen(true);
  };

  const submitTemperatureAndRecord = async () => {
    if (!pendingTemperatureStudent) return;
    const parsed = Number.parseFloat(temperatureInput);
    if (Number.isNaN(parsed) || parsed < 30 || parsed > 45) {
      toast({
        title: 'Invalid temperature',
        description: 'Please enter a temperature between 30.0 and 45.0 C.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingTemperature(true);
    try {
      await recordAttendance(pendingTemperatureStudent, Number(parsed.toFixed(1)));
      setTemperatureModalOpen(false);
      setPendingTemperatureStudent(null);
      setTemperatureInput('');
      setManualId('');
      setShowManualEntry(false);
      setScanning(true);
    } finally {
      setSubmittingTemperature(false);
    }
  };

  useEffect(() => {
    void refreshPendingSyncCount();

    // Keep initial SSR and hydration markup consistent, then update status on mount.
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      void syncQueuedRecords(true);
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    const handleServiceWorkerMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OFFLINE_SYNC_REQUEST') {
        void syncQueuedRecords(false);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleServiceWorkerMessage);

    if (navigator.onLine) {
      void syncQueuedRecords(false);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleServiceWorkerMessage);
    };
  }, []);

  useEffect(() => {
    setRfidConnected(sharedScanRfidState.connected);
    setConnectingRfid(sharedScanRfidState.connecting);

    if (typeof navigator !== 'undefined' && (navigator as any).serial) {
      const serialApi = (navigator as any).serial;
      const handleSerialDisconnect = (event: any) => {
        const activePort = rfidPortRef.current ?? sharedScanRfidState.port;
        const disconnectedPort = event?.port ?? event?.target;
        if (activePort && disconnectedPort && activePort !== disconnectedPort) {
          return;
        }
        void disconnectRfidReader(true);
        setLastScan((current) => ({
          ...current,
          status: 'error',
          message: 'RFID reader disconnected. Reconnect to continue tap input.',
          time: new Date().toLocaleTimeString(),
        }));
      };

      serialApi.addEventListener?.('disconnect', handleSerialDisconnect);
      return () => {
        serialApi.removeEventListener?.('disconnect', handleSerialDisconnect);
        void disconnectRfidReader(true);
      };
    }

    return () => {
      void disconnectRfidReader(true);
    };
  }, []);

  useEffect(() => {
    let mounted = true;
    let startupAttempts = 0;
    const maxStartupAttempts = 20;

    async function startScanner() {
      if (!videoRef.current) {
        if (mounted && startupAttempts < maxStartupAttempts) {
          startupAttempts += 1;
          startupRetryRef.current = window.setTimeout(() => {
            void startScanner();
          }, 120);
        }
        return;
      }
      
      try {
        const { default: QrScanner } = await import('qr-scanner');
        
        scannerRef.current = new QrScanner(
          videoRef.current,
          async (result: any) => {
            const data = (typeof result === 'string' ? result : (result?.data ?? '')).toString();
            if (!mounted) return;

            const now = Date.now();
            const lastScan = lastScanRef.current;
            if (recordingRef.current) return;
            if (lastScan && lastScan.value === data && now - lastScan.time < 3000) return;

            recordingRef.current = true;
            lastScanRef.current = { value: data, time: now };
            if (scannerRef.current) {
              await scannerRef.current.stop();
            }
            
            try {
              setQrText(data);
              const student = await findStudent(data);
              
              if (student) {
                promptTemperatureForStudent(student);
                // Keep scanner active for continuous queue processing.
                setScanning(true);
              } else {
                setLastScan({
                  status: 'error',
                  message: 'Student not found',
                  scannedText: data,
                  time: new Date().toLocaleTimeString(),
                });
                // Resume scanner even for unknown QR values.
                setScanning(true);
              }
            } finally {
              if (mounted && scannerRef.current) {
                try {
                  await scannerRef.current.start();
                } catch (restartErr) {
                  if (isMediaPlayAbortError(restartErr)) {
                    return;
                  }

                  console.error('Failed to restart camera scanner:', restartErr);
                }
              }
              recordingRef.current = false;
            }
          },
          {
            returnDetailedScanResult: true,
            highlightScanRegion: true,
            highlightCodeOutline: true,
          }
        );

        await scannerRef.current.start();
      } catch (err) {
        if (isMediaPlayAbortError(err)) {
          return;
        }

        console.error('Camera start failed:', err);
        setLastScan({
          status: 'error',
          message: 'Failed to start camera. Please check permissions.',
          time: new Date().toLocaleTimeString(),
        });
        setScanning(false);
      }
    }

    if (scanning) {
      startScanner();
    }

    return () => {
      mounted = false;
      if (startupRetryRef.current !== null) {
        window.clearTimeout(startupRetryRef.current);
        startupRetryRef.current = null;
      }
      if (scannerRef.current) {
        scannerRef.current.stop();
        scannerRef.current.destroy();
        scannerRef.current = null;
      }
    };
  }, [scanning]);

  const handleManualEntry = async () => {
    if (!manualId.trim()) return false;
    
    const student = await findStudent(manualId);
    if (student) {
      const parsed = Number.parseFloat(temperatureInput);
      if (Number.isNaN(parsed) || parsed < 30 || parsed > 45) {
        toast({
          title: 'Invalid temperature',
          description: 'Please enter a temperature between 30.0 and 45.0 C.',
          variant: 'destructive',
        });
        return false;
      }
      await recordAttendance(student, Number(parsed.toFixed(1)));
      setManualId('');
      setTemperatureInput('');
      setShowManualEntry(false);
      return true;
    } else {
      setLastScan({
        status: 'error',
        message: 'Student not found by LRN or RFID UID',
        scannedText: manualId,
        time: new Date().toLocaleTimeString(),
      });
      return false;
    }
  };

  return (
    <DashboardLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Attendance Scanner
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              Scan student QR codes to automatically check in or check out
            </p>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:gap-2 md:w-auto">
            <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1">
              Auto Mode
            </Badge>
            <Badge className={isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}>
              {isOnline ? <Wifi className="w-3 h-3 mr-1" /> : <WifiOff className="w-3 h-3 mr-1" />}
              {isOnline ? 'Online' : 'Offline'}
            </Badge>
            <Badge className="bg-blue-100 text-blue-700">
              <CloudUpload className="w-3 h-3 mr-1" />
              Pending Sync: {pendingSyncCount}
            </Badge>
            {syncing && (
              <Badge className="bg-indigo-100 text-indigo-700">Syncing...</Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Scanner */}
          <div className="space-y-6">
            {/* Scanner Card */}
            <Card className="border-0 shadow-xl overflow-hidden bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
              <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-950/40 dark:to-slate-900/30 border-b border-slate-200/60 dark:border-slate-700/40">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25">
                    <Camera className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Camera Scanner</CardTitle>
                    <CardDescription>Position QR code within camera view</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center gap-4">
                  {scanning ? (
                    <div className="w-full">
                      <div className="relative rounded-xl overflow-hidden bg-black shadow-2xl aspect-video ring-2 ring-blue-500/20">
                        <video
                          ref={videoRef}
                          className="w-full h-full object-cover"
                          autoPlay
                          playsInline
                          muted
                        />
                        
                        {/* Scanner Overlay */}
                        <div className="absolute inset-0 pointer-events-none">
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/60" />
                          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48">
                            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-blue-400" />
                            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-blue-400" />
                            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-blue-400" />
                            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-blue-400" />
                          </div>
                        </div>

                        {qrText && (
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 to-transparent p-4">
                            <p className="text-center text-sm text-blue-300 font-medium">
                              Scanned: {qrText}
                            </p>
                          </div>
                        )}
                      </div>
                      <p className="text-center mt-3 text-sm text-gray-600 dark:text-gray-400">
                        Point camera at student QR code
                      </p>
                    </div>
                  ) : (
                    <div
                      className="w-full aspect-video rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-2 border-dashed border-blue-300/40 dark:border-blue-700/40 flex items-center justify-center hover:border-blue-400 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 transition-all cursor-pointer group"
                      onClick={() => setScanning(true)}
                    >
                      <div className="text-center space-y-3">
                        <div className="inline-flex p-4 rounded-2xl bg-white/80 dark:bg-slate-800/80 shadow-lg group-hover:scale-110 transition-transform">
                          <QrCode className="w-10 h-10 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900 dark:text-white">Click to start scanning</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Camera access required</p>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="w-full">
                    {scanning ? (
                      <Button
                        size="lg"
                        variant="outline"
                        onClick={() => setScanning(false)}
                        className="w-full border-2 hover:bg-red-50 hover:border-red-300 dark:hover:bg-red-950/20 transition-all"
                      >
                        Stop Scanner
                      </Button>
                    ) : (
                      <Button
                        size="lg"
                        onClick={() => setScanning(true)}
                        className="w-full gap-2 bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 shadow-lg shadow-blue-500/25"
                      >
                        <Camera size={18} />
                        Start Scanner
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Scan Result */}
          <div className="space-y-6">
            {lastScan ? (
              <Card className={`border-0 shadow-xl overflow-hidden ${
                lastScan.status === 'success' 
                  ? 'bg-gradient-to-br from-emerald-50 to-white dark:from-emerald-950/30 dark:to-slate-800/50' 
                  : 'bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/50'
              }`}>
                <CardHeader className={`border-b ${
                  lastScan.status === 'success' 
                    ? 'border-emerald-200/40 dark:border-emerald-700/30 bg-gradient-to-r from-emerald-50/50 to-transparent' 
                    : 'border-red-200/40 dark:border-red-700/30 bg-gradient-to-r from-red-50/50 to-transparent'
                }`}>
                  <div className="flex items-center gap-4">
                    <div className={`p-3 rounded-xl shadow-lg ${
                      lastScan.status === 'success'
                        ? 'bg-gradient-to-br from-emerald-500 to-emerald-600 shadow-emerald-500/25'
                        : 'bg-gradient-to-br from-red-500 to-red-600 shadow-red-500/25'
                    }`}>
                      {lastScan.status === 'success' ? (
                        <CheckCircle className="w-6 h-6 text-white" />
                      ) : (
                        <XCircle className="w-6 h-6 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {lastScan.status === 'success' ? 'Scan Successful' : 'Scan Failed'}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        <Clock className="w-3 h-3 text-gray-500 dark:text-gray-400" />
                        <p className="text-sm text-gray-600 dark:text-gray-400">{lastScan.time}</p>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-4 sm:pt-6">
                  {lastScan.status === 'success' ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-3 p-3 sm:gap-4 sm:p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/30 shadow-sm">
                        <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <User className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-base sm:text-lg text-slate-900 dark:text-white">{lastScan.student}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {lastScan.studentId} • {lastScan.grade}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {typeof lastScan.temperature === 'number' && (
                          <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 backdrop-blur-sm border border-amber-200/40 dark:border-amber-700/30">
                            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Temperature</span>
                            <span className="text-sm font-semibold text-amber-700 dark:text-amber-300">
                              {lastScan.temperature.toFixed(1)} C
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/30">
                          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Check In Time</span>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                            {lastScan.checkinTime || lastScan.time}
                          </span>
                        </div>
                        {lastScan.action === 'Checked Out' && (
                          <>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50/80 dark:bg-orange-900/20 backdrop-blur-sm border border-orange-200/40 dark:border-orange-700/30">
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Check Out Time</span>
                              <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                                {lastScan.time}
                              </span>
                            </div>
                            {lastScan.duration && (
                              <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50/80 dark:bg-blue-900/20 backdrop-blur-sm border border-blue-200/40 dark:border-blue-700/30">
                                <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-2">
                                  <Clock className="w-4 h-4" />
                                  Time at School
                                </span>
                                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                                  {lastScan.duration}
                                </span>
                              </div>
                            )}
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-3 pt-2">
                        <Badge className={`${
                          lastScan.action === 'Checked In'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
                        } px-3 py-1`}>
                          {lastScan.action}
                        </Badge>
                        {lastScan.attendanceStatus && (
                          <Badge className={`px-3 py-1 ${
                            lastScan.attendanceStatus === 'present'
                              ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                              : lastScan.attendanceStatus === 'late'
                              ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                              : lastScan.attendanceStatus === 'invalid_timeout'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                          }`}>
                            {lastScan.statusReason}
                          </Badge>
                        )}
                        <span className="text-sm text-gray-500">{lastScan.date}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-red-50/80 dark:bg-red-900/20 backdrop-blur-sm border border-red-200/40 dark:border-red-700/30">
                        <div className="p-2 rounded-full bg-red-100 dark:bg-red-900/40">
                          <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                        </div>
                        <p className="text-sm font-medium text-red-700 dark:text-red-400">{lastScan.message}</p>
                      </div>
                      {lastScan.scannedText && (
                        <div className="p-3 rounded-lg bg-slate-100 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
                          <p className="text-xs font-mono break-all text-slate-600 dark:text-slate-400">
                            {lastScan.scannedText}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-0 shadow-xl bg-gradient-to-br from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/50">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 shadow-inner mb-4">
                    <QrCode className="w-12 h-12 text-slate-500 dark:text-slate-400" />
                  </div>
                  <p className="text-lg font-medium text-slate-700 dark:text-slate-300">Ready to Scan</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    Scan a QR code to see result here
                  </p>
                </CardContent>
              </Card>
            )}

            <div className="space-y-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  rfidPortRef.current = sharedScanRfidState.port;
                  rfidReaderRef.current = sharedScanRfidState.reader;
                  rfidReadingActiveRef.current = sharedScanRfidState.readingActive;
                  setRfidConnected(sharedScanRfidState.connected || !!sharedScanRfidState.port);
                  setConnectingRfid(sharedScanRfidState.connecting);
                  setShowManualEntry(true);
                }}
                className="w-full gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/20"
              >
                <Hash className="w-4 h-4" />
                Manual Entry
              </Button>

              <Dialog
                open={showManualEntry}
                onOpenChange={(open) => {
                  if (open) {
                    rfidPortRef.current = sharedScanRfidState.port;
                    rfidReaderRef.current = sharedScanRfidState.reader;
                    rfidReadingActiveRef.current = sharedScanRfidState.readingActive;
                    setRfidConnected(sharedScanRfidState.connected || !!sharedScanRfidState.port);
                    setConnectingRfid(sharedScanRfidState.connecting);
                  }
                  setShowManualEntry(open);
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-orange-500" />
                      Manual Entry
                    </DialogTitle>
                    <DialogDescription>
                      Enter student LRN or RFID UID to auto check in or check out.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      {!rfidConnected ? (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void connectRfidReader()}
                          disabled={connectingRfid}
                          className="flex-1"
                        >
                          {connectingRfid ? 'Connecting RFID Reader...' : 'Connect RFID Reader'}
                        </Button>
                      ) : (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void disconnectRfidReader()}
                          className="flex-1"
                        >
                          Disconnect RFID Reader
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {rfidConnected
                        ? 'Reader connected. Tap a tag to auto-fill UID below.'
                        : 'Connect first, then tap a tag to auto-type the UID.'}
                    </p>

                    <Input
                      placeholder="Enter Student LRN or RFID UID"
                      value={manualId}
                      onChange={(e) => setManualId(normalizeRfidUid(e.target.value))}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleManualEntry();
                        }
                      }}
                      className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-orange-500/20"
                    />
                    <Input
                      type="number"
                      min="30"
                      max="45"
                      step="0.1"
                      placeholder="Temperature (e.g. 36.7)"
                      value={temperatureInput}
                      onChange={(e) => setTemperatureInput(e.target.value)}
                      className="bg-white/80 dark:bg-slate-800/80 border-slate-200 dark:border-slate-700 focus:ring-2 focus:ring-orange-500/20"
                    />

                    <Button
                      variant="default"
                      onClick={() => void handleManualEntry()}
                      size="lg"
                      className="w-full gap-2 bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-700 hover:to-orange-600 shadow-lg shadow-orange-500/25"
                    >
                      <Hash size={16} />
                      Submit
                    </Button>

                    <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-2">
                      <kbd className="px-2 py-1 text-xs border rounded-md bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-600">Enter</kbd>
                      to submit
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={temperatureModalOpen}
                onOpenChange={(open) => {
                  if (!submittingTemperature) {
                    setTemperatureModalOpen(open);
                    if (!open) {
                      setPendingTemperatureStudent(null);
                      setTemperatureInput('');
                      setScanning(true);
                    }
                  }
                }}
              >
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Record Student Temperature</DialogTitle>
                    <DialogDescription>
                      Enter the latest temperature for {pendingTemperatureStudent?.name || 'the scanned student'} before check-in/check-out.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <Input
                      type="number"
                      min="30"
                      max="45"
                      step="0.1"
                      placeholder="e.g. 36.7"
                      value={temperatureInput}
                      onChange={(e) => setTemperatureInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void submitTemperatureAndRecord();
                        }
                      }}
                    />
                    <Button
                      onClick={() => void submitTemperatureAndRecord()}
                      disabled={submittingTemperature}
                      className="w-full"
                    >
                      {submittingTemperature ? 'Saving...' : 'Save Temperature & Continue'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}