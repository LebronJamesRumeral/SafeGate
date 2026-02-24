'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingDown, TrendingUp, AlertCircle, Target, AlertOctagon, Phone, Calendar, Activity, Brain, Shield, Clock, Zap, Sparkles, BarChart3, Users, ChevronRight, Info } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface StudentRisk {
  lrn: string;
  name: string;
  parentContact: string;
  attendanceRate: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextAbsentDate: string | null;
  predictionConfidence: number;
}

interface StudentSummary {
  attendanceRate: number;
  trend: 'improving' | 'stable' | 'declining';
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  nextLikelyAbsentDate: string | null;
  predictionConfidence: number;
  daysUntilCritical: number | null;
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

  useEffect(() => {
    fetchHighRiskStudents();
  }, []);

  const fetchHighRiskStudents = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/ml/high-risk');
      const result = await response.json().catch(() => null);

      if (!result) {
        console.warn('No valid response from ML API');
        setHighRiskStudents([]);
        setLoading(false);
        return;
      }

      if (result.success === false || (result.error && !result.data)) {
        setError(result.error || result.message || 'Unable to load data');
        setHighRiskStudents([]);
        setLoading(false);
        return;
      }

      const students = result.data || [];
      setHighRiskStudents(Array.isArray(students) ? students : []);
    } catch (err) {
      console.error('Error fetching high-risk students:', err);
      setHighRiskStudents([]);
      setError('Unable to load data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {/* Header Skeleton */}
        <div className="flex items-start gap-4 mb-6">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-600 animate-pulse w-14 h-14" />
          <div className="flex-1 space-y-2">
            <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded-lg w-64 animate-pulse" />
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded-lg w-96 animate-pulse" />
          </div>
        </div>
        
        {/* Cards Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div 
              key={i} 
              className="h-96 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-700 shadow-lg"
              style={{ animationDelay: `${i * 100}ms` }}
            >
              <div className="h-1.5 bg-slate-300 dark:bg-slate-600 rounded-t-2xl" />
              <div className="p-6 space-y-4">
                <div className="flex justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
                    <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/2" />
                  </div>
                  <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded-full w-20" />
                </div>
                <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
                <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
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
        <div className="p-3 rounded-2xl bg-gradient-to-br from-blue-900 to-blue-700 shadow-lg shadow-blue-600/25">
          <Brain className="w-8 h-8 text-white" />
        </div>
        <div className="flex-1">
          <h2 className="text-3xl font-bold bg-gradient-to-r from-blue-900 to-blue-700 bg-clip-text text-transparent mb-2">
            ML Risk Predictions
          </h2>
          <p className="text-base text-slate-600 dark:text-slate-400">
            AI-powered analysis identifying students at risk of absence
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      {!error && highRiskStudents.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/50 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-red-100 dark:bg-red-900/40">
                <AlertOctagon className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-red-600 dark:text-red-400 font-semibold">Critical Risk</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400">
                  {highRiskStudents.filter(s => s.riskLevel === 'critical').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/30 dark:to-slate-800/50 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/40">
                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400" />
              </div>
              <div>
                <p className="text-xs text-orange-600 dark:text-orange-400 font-semibold">High Risk</p>
                <p className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                  {highRiskStudents.filter(s => s.riskLevel === 'high').length}
                </p>
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/50 shadow-lg">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-semibold">Medium Risk</p>
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                  {highRiskStudents.filter(s => s.riskLevel === 'medium').length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-0 bg-gradient-to-br from-red-50 to-white dark:from-red-950/30 dark:to-slate-800/50 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-red-600 to-red-700" />
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/40">
                <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-lg text-red-700 dark:text-red-300 mb-1">Unable to load predictions</p>
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                <Button 
                  onClick={fetchHighRiskStudents}
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

      {/* Empty State */}
      {!error && highRiskStudents.length === 0 ? (
        <Card className="border-0 bg-gradient-to-br from-green-50 to-white dark:from-green-950/30 dark:to-slate-800/50 shadow-xl overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-green-600 to-emerald-600" />
          <CardContent className="p-12">
            <div className="text-center">
              <div className="mb-6 inline-flex p-4 rounded-full bg-green-100 dark:bg-green-900/40">
                <Shield className="w-12 h-12 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                All Clear!
              </h3>
              <p className="text-base text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                No students are currently identified as high-risk. Continue monitoring attendance patterns.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Student Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {highRiskStudents.map((student, index) => {
            const colors = getRiskColor(student.riskLevel);
            return (
              <motion.div
                key={student.lrn}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  className={`${colors.cardBg} border-2 ${colors.border} shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden group`}
                >
                  {/* Animated Gradient Bar */}
                  <div className={`h-1.5 bg-gradient-to-r ${colors.gradient} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-white/30 animate-shimmer" />
                  </div>
                  
                  <CardContent className="p-6 space-y-5">
                    {/* Header with Name and Badge */}
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1 truncate group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-slate-900 group-hover:to-slate-600 dark:group-hover:from-white dark:group-hover:to-slate-300 transition-all">
                          {student.name}
                        </h3>
                        <p className="text-sm text-slate-500 dark:text-slate-400 font-mono flex items-center gap-1">
                          <span className="w-1 h-1 rounded-full bg-slate-400" />
                          {student.lrn}
                        </p>
                      </div>
                      <Badge className={`${colors.badge} font-bold uppercase text-xs px-3 py-1.5 flex items-center gap-1.5`}>
                        <Zap className="w-3.5 h-3.5" />
                        {student.riskLevel}
                      </Badge>
                    </div>

                    {/* Attendance Rate Section */}
                    <div className="space-y-3 p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4" />
                          Attendance Rate
                        </p>
                        <span className="text-3xl font-bold text-slate-900 dark:text-white">
                          {student.attendanceRate}%
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(student.attendanceRate, 100)}%` }}
                          transition={{ duration: 1, delay: index * 0.1 }}
                          className={`absolute inset-y-0 left-0 bg-gradient-to-r ${colors.gradient} rounded-full`}
                        />
                      </div>
                    </div>

                    {/* Predicted Absence */}
                    {student.nextAbsentDate && (
                      <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
                        <div className="flex items-center gap-2 mb-3">
                          <Calendar className="w-4 h-4 text-blue-900 dark:text-blue-300" />
                          <p className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                            AI Prediction
                          </p>
                        </div>
                        <p className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                          {student.nextAbsentDate}
                        </p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${student.predictionConfidence}%` }}
                              transition={{ duration: 1, delay: index * 0.1 + 0.3 }}
                              className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                            />
                          </div>
                          <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[45px] text-right">
                            {Math.round(student.predictionConfidence)}%
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Parent Contact */}
                    {student.parentContact && (
                      <div className="flex items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-700">
                        <div className="p-2 rounded-lg bg-gradient-to-br from-blue-100 to-sky-100 dark:from-blue-900/40 dark:to-sky-900/40">
                          <Phone className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-0.5">
                            Parent Contact
                          </p>
                          <p className="text-sm font-semibold text-blue-600 dark:text-blue-400 truncate">
                            {student.parentContact}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition-transform" />
                      </div>
                    )}
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
export function StudentRiskCard({ studentLrn }: { studentLrn: string }) {
  const [summary, setSummary] = useState<StudentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStudentSummary();
  }, [studentLrn]);

  const fetchStudentSummary = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ml/summary?studentLrn=${studentLrn}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to fetch data' }));
        setError(errorData.error || `Error: ${response.status}`);
        console.error('Fetch error:', errorData);
        setLoading(false);
        return;
      }

      const result = await response.json();

      if (!result.success) {
        setError(result.error || 'Failed to fetch student data');
        setLoading(false);
        return;
      }

      setSummary(result.data);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching summary:', err);
      setError('Unable to load data');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-64 bg-gradient-to-br from-slate-100 to-slate-50 dark:from-slate-800 dark:to-slate-900 rounded-2xl animate-pulse border border-slate-200 dark:border-slate-700 shadow-lg overflow-hidden">
        <div className="h-1.5 bg-slate-300 dark:bg-slate-600" />
        <div className="p-6 space-y-4">
          <div className="flex justify-between">
            <div className="space-y-2 flex-1">
              <div className="h-6 bg-slate-300 dark:bg-slate-600 rounded w-3/4" />
              <div className="h-4 bg-slate-300 dark:bg-slate-600 rounded w-1/2" />
            </div>
            <div className="h-8 bg-slate-300 dark:bg-slate-600 rounded-full w-20" />
          </div>
          <div className="h-20 bg-slate-200 dark:bg-slate-700 rounded-xl" />
          <div className="h-16 bg-slate-200 dark:bg-slate-700 rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-0 bg-gradient-to-br from-amber-50 to-white dark:from-amber-950/30 dark:to-slate-800/50 shadow-xl overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-amber-600 to-orange-600" />
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
        <div className={`h-1.5 bg-gradient-to-r ${colors.gradient} relative overflow-hidden`}>
          <div className="absolute inset-0 bg-white/30 animate-shimmer" />
        </div>
        
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/40 dark:to-blue-800/40">
                <Brain className="w-4 h-4 text-blue-900 dark:text-blue-300" />
              </div>
              ML Risk Assessment
            </CardTitle>
            <Badge className={colors.badge}>
              <Sparkles className="w-3.5 h-3.5 mr-1" />
              {summary.riskLevel.toUpperCase()}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Attendance Rate & Trend */}
          <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-4 h-4" />
                  Attendance Rate
                </p>
                <p className="text-4xl font-bold text-slate-900 dark:text-white">
                  {summary.attendanceRate}%
                </p>
              </div>
              <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${getTrendColor(summary.trend)}`}>
                {getTrendIcon(summary.trend)}
                <span className="text-sm font-semibold capitalize">{summary.trend}</span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="relative w-full h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(summary.attendanceRate, 100)}%` }}
                transition={{ duration: 1 }}
                className={`absolute inset-y-0 left-0 bg-gradient-to-r ${summary.attendanceRate >= 95 ? 'from-green-600 to-emerald-600' : summary.attendanceRate >= 85 ? 'from-yellow-500 to-amber-500' : 'from-red-600 to-red-700'} rounded-full`}
              />
            </div>
          </div>

          {/* Prediction Info */}
          {summary.nextLikelyAbsentDate && (
            <div className="p-4 rounded-xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-sm border border-slate-200/50 dark:border-slate-700/50">
              <div className="flex items-center gap-2 mb-3">
                <div className="p-1 rounded-md bg-blue-100 dark:bg-blue-900/40">
                  <Calendar className="w-3.5 h-3.5 text-blue-900 dark:text-blue-300" />
                </div>
                <p className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wider">
                  AI Prediction
                </p>
              </div>
              <p className="text-lg font-bold text-slate-900 dark:text-white mb-3">
                {summary.nextLikelyAbsentDate}
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${summary.predictionConfidence}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                    className="h-full bg-gradient-to-r from-blue-600 to-blue-500 rounded-full"
                  />
                </div>
                <span className="text-sm font-semibold text-blue-600 dark:text-blue-400 min-w-[45px] text-right">
                  {Math.round(summary.predictionConfidence)}%
                </span>
              </div>
            </div>
          )}

          {/* Critical Threshold Warning */}
          {summary.daysUntilCritical && summary.daysUntilCritical > 0 && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-950/50 dark:to-yellow-950/40 border-2 border-amber-300 dark:border-amber-600/50">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-800/50">
                  <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                <div>
                  <p className="font-semibold text-amber-700 dark:text-amber-300 mb-1">
                    Approaching Critical Threshold
                  </p>
                  <p className="text-sm text-amber-600 dark:text-amber-400">
                    <span className="font-bold text-lg">{summary.daysUntilCritical}</span> days until 70% attendance threshold
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}