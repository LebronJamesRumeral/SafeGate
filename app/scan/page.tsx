'use client';

import { DashboardLayout } from '@/components/dashboard-layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QrCode, Camera, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';

export default function ScanPage() {
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<any>(null);

  const handleScan = () => {
    setScanning(true);
    // Simulate scanning
    setTimeout(() => {
      setLastScan({
        student: 'Sarah Johnson',
        studentId: 'STU001',
        grade: '10A',
        time: new Date().toLocaleTimeString(),
        status: 'success',
        action: 'Check In'
      });
      setScanning(false);
    }, 2000);
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground mb-2">QR Code Scanner</h1>
          <p className="text-muted-foreground">Scan student QR codes for check-in and check-out</p>
        </div>

        {/* Scanner Card */}
        <Card className="bg-gradient-to-br from-primary/5 via-accent/5 to-primary/5 border-2 border-primary/20 shadow-2xl">
          <CardContent className="p-8 md:p-12">
            <div className="flex flex-col items-center gap-6">
              {scanning ? (
                <div className="relative">
                  <div className="w-64 h-64 border-4 border-primary rounded-2xl flex items-center justify-center animate-pulse bg-primary/5">
                    <Camera className="w-32 h-32 text-primary" />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan opacity-75" />
                  </div>
                  <p className="text-center mt-4 text-muted-foreground font-medium">Scanning for QR code...</p>
                </div>
              ) : (
                <div
                  onClick={handleScan}
                  className="w-64 h-64 border-4 border-dashed border-muted-foreground/30 rounded-2xl flex items-center justify-center group hover:border-primary hover:bg-primary/5 transition-all cursor-pointer"
                >
                  <div className="text-center">
                    <QrCode className="w-32 h-32 mx-auto text-muted-foreground group-hover:text-primary transition-colors mb-4" />
                    <p className="text-sm text-muted-foreground group-hover:text-primary transition-colors">
                      Click to scan
                    </p>
                  </div>
                </div>
              )}

              <Button
                size="lg"
                onClick={handleScan}
                disabled={scanning}
                className="w-full max-w-sm h-14 text-lg font-semibold gap-3 shadow-lg hover:shadow-xl transition-all"
              >
                {scanning ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Scanning...
                  </>
                ) : (
                  <>
                    <Camera size={20} />
                    Start Scanning
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Last Scan Result */}
        {lastScan && (
          <Card className={`border-2 animate-fade-in-up shadow-xl ${
            lastScan.status === 'success' 
              ? 'border-green-500 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/30' 
              : 'border-red-500 bg-gradient-to-br from-red-50 to-rose-50 dark:from-red-950/30 dark:to-rose-950/30'
          }`}>
            <CardHeader>
              <div className="flex items-center gap-3">
                {lastScan.status === 'success' ? (
                  <div className="h-12 w-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-green-600" />
                  </div>
                ) : (
                  <div className="h-12 w-12 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="w-6 h-6 text-red-600" />
                  </div>
                )}
                <div>
                  <CardTitle className="text-xl">Scan Successful!</CardTitle>
                  <p className="text-sm text-muted-foreground">Student verified and logged</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Student Name</p>
                  <p className="font-semibold text-lg">{lastScan.student}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Student ID</p>
                  <p className="font-mono text-sm font-semibold">{lastScan.studentId}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Grade</p>
                  <Badge variant="outline" className="font-medium text-base">{lastScan.grade}</Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Time</p>
                  <p className="font-semibold">{lastScan.time}</p>
                </div>
                <div className="col-span-2 space-y-1">
                  <p className="text-sm text-muted-foreground">Action</p>
                  <Badge className="bg-primary text-primary-foreground text-base px-4 py-1">
                    {lastScan.action}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        <Card className="bg-card border-border shadow-lg">
          <CardHeader>
            <div className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-primary" />
              <CardTitle>How to Use Scanner</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal list-inside space-y-3 text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground mt-0.5">1.</span>
                <span>Click the "Start Scanning" button or tap the scanner area to activate the camera</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground mt-0.5">2.</span>
                <span>Position the student's QR code within the camera frame</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground mt-0.5">3.</span>
                <span>Wait for automatic detection and verification (usually takes 1-2 seconds)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-foreground mt-0.5">4.</span>
                <span>Check the scan result displayed below and verify the student information</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
