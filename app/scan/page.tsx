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
import { QrCode, Camera, CheckCircle, XCircle, User, Clock, Hash } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { toast } from '@/components/ui/use-toast';
import { motion } from 'framer-motion';

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
}

export default function ScanPage() {
  const [scanning, setScanning] = useState(true);
  const [qrText, setQrText] = useState<string | null>(null);
  const [lastScan, setLastScan] = useState<ScanResult | null>(null);
  const [manualId, setManualId] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<any>(null);
  const recordingRef = useRef(false);
  const lastScanRef = useRef<{ value: string; time: number } | null>(null);
  const startupRetryRef = useRef<number | null>(null);

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
      
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('lrn', normalized)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error finding student:', error);
        toast({
          title: 'Failed to find student',
          description: error.message || String(error),
          variant: 'destructive',
        });
        return null;
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

  const recordAttendance = async (student: any) => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];

    try {
      if (!supabase) {
        const msg = 'Supabase client not initialized';
        toast({
          title: 'Internal Error',
          description: msg,
          variant: 'destructive',
        });
        throw new Error(msg);
      }

      const { data: existing, error: existingError } = await supabase
        .from('attendance_logs')
        .select('id, check_in_time, check_out_time')
        .eq('student_lrn', student.lrn)
        .eq('date', date)
        .order('check_in_time', { ascending: false })
        .limit(1);

      if (existingError) throw existingError;

      if (!existing || existing.length === 0) {
        const { error } = await supabase
          .from('attendance_logs')
          .insert([{
            student_lrn: student.lrn,
            check_in_time: now.toISOString(),
            date: date,
          }]);

        if (error) throw error;

        setLastScan({
          student: student.name,
          studentId: student.lrn,
          grade: student.level,
          checkinTime: now.toLocaleTimeString(),
          time: now.toLocaleTimeString(),
          date: now.toLocaleDateString(),
          status: 'success',
          action: 'Checked In'
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
      } else {
        if (existing[0].check_out_time) {
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
          return;
        }

        const { error } = await supabase
          .from('attendance_logs')
          .update({
            check_out_time: now.toISOString(),
          })
          .eq('id', existing[0].id);

        if (error) throw error;

        const duration = calculateDuration(existing[0].check_in_time, now.toISOString());
        
        setLastScan({
          student: student.name,
          studentId: student.lrn,
          grade: student.level,
          checkinTime: new Date(existing[0].check_in_time).toLocaleTimeString(),
          time: now.toLocaleTimeString(),
          date: now.toLocaleDateString(),
          duration: duration,
          status: 'success',
          action: 'Checked Out'
        });
      }
    } catch (error) {
      console.error('Error recording attendance:', error);
      setLastScan({
        status: 'error',
        message: 'Failed to record attendance',
        time: now.toLocaleTimeString(),
      });
    }
  };

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
                await recordAttendance(student);
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
      await recordAttendance(student);
      setManualId('');
      setShowManualEntry(false);
      return true;
    } else {
      setLastScan({
        status: 'error',
        message: 'Student ID not found',
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
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
              Attendance Scanner
            </h1>
            <p className="text-base text-gray-600 dark:text-gray-300 mt-2">
              Scan student QR codes to automatically check in or check out
            </p>
          </div>
          <Badge className="bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 px-3 py-1">
            Auto Mode
          </Badge>
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
              <CardContent className="p-6">
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
                <CardContent className="pt-6">
                  {lastScan.status === 'success' ? (
                    <div className="space-y-4">
                      <div className="flex items-start gap-4 p-4 rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border border-emerald-200/40 dark:border-emerald-700/30 shadow-sm">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-blue-500/25">
                          <User className="w-6 h-6" />
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-lg text-slate-900 dark:text-white">{lastScan.student}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                            {lastScan.studentId} • {lastScan.grade}
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
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
                onClick={() => setShowManualEntry(true)}
                className="w-full gap-2 border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400 dark:hover:bg-orange-950/20"
              >
                <Hash className="w-4 h-4" />
                Manual Entry
              </Button>

              <Dialog open={showManualEntry} onOpenChange={setShowManualEntry}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <Hash className="w-4 h-4 text-orange-500" />
                      Manual Entry
                    </DialogTitle>
                    <DialogDescription>
                      Enter student ID to auto check in or check out.
                    </DialogDescription>
                  </DialogHeader>

                  <div className="space-y-3">
                    <Input
                      placeholder="Enter Student ID"
                      value={manualId}
                      onChange={(e) => setManualId(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          void handleManualEntry();
                        }
                      }}
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
            </div>
          </div>
        </div>
      </motion.div>
    </DashboardLayout>
  );
}