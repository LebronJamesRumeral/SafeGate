/**
 * ML System Diagnostic Utility
 * Add this to your app to test the ML system and debug issues
 * 
 * Usage in browser console:
 * import { testMLSystem } from '@/lib/ml-diagnostic';
 * await testMLSystem('ABC123'); // Replace with actual student LRN
 */

import { supabase } from './supabase';
import {
  calculateStudentRiskScore,
  getAttendanceMetrics,
  detectAbsencePatterns,
  getSimpleRiskScore,
  getStudentMLProfile,
} from './ml-risk-calculator';

interface DiagnosticResult {
  test: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  data?: unknown;
  error?: unknown;
}

const results: DiagnosticResult[] = [];

function addResult(
  test: string,
  status: 'pass' | 'fail' | 'warning',
  message: string,
  data?: unknown,
  error?: unknown
) {
  results.push({ test, status, message, data, error });
  const icon = status === 'pass' ? '✅' : status === 'fail' ? '❌' : '⚠️';
  console.log(`${icon} ${test}: ${message}`, data || error || '');
}

/**
 * Test if a student exists in the database
 */
async function testStudentExists(studentLrn: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('students')
      .select('lrn, first_name, last_name')
      .eq('lrn', studentLrn)
      .limit(1);

    if (error) throw error;

    if (data && data.length > 0) {
      addResult(
        '1. Student Exists',
        'pass',
        `Found student: ${data[0].first_name} ${data[0].last_name}`,
        data[0]
      );
      return true;
    } else {
      addResult('1. Student Exists', 'fail', `Student ${studentLrn} not found in database`);
      return false;
    }
  } catch (error) {
    addResult('1. Student Exists', 'fail', 'Database query failed', undefined, error);
    return false;
  }
}

/**
 * Test if student has attendance data
 */
async function testAttendanceData(studentLrn: string): Promise<number> {
  try {
    const { data, error, count } = await supabase
      .from('attendance_logs')
      .select('*', { count: 'exact' })
      .eq('student_lrn', studentLrn)
      .gte('date', new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) throw error;

    const recordCount = count || 0;

    if (recordCount > 5) {
      addResult(
        '2. Attendance Data',
        'pass',
        `Found ${recordCount} attendance records (60 days)`,
        { recordCount }
      );
    } else if (recordCount > 0) {
      addResult(
        '2. Attendance Data',
        'warning',
        `Only ${recordCount} attendance records (need 5+ for accurate ML)`,
        { recordCount }
      );
    } else {
      addResult('2. Attendance Data', 'warning', 'No attendance data found', { recordCount: 0 });
    }

    return recordCount;
  } catch (error) {
    addResult('2. Attendance Data', 'fail', 'Database query failed', undefined, error);
    return 0;
  }
}

/**
 * Test if student has behavioral events
 */
async function testBehavioralData(studentLrn: string): Promise<number> {
  try {
    const { data, error, count } = await supabase
      .from('behavioral_events')
      .select('*', { count: 'exact' })
      .eq('student_lrn', studentLrn)
      .gte('event_date', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);

    if (error) throw error;

    const recordCount = count || 0;

    if (recordCount > 0) {
      addResult(
        '3. Behavioral Data',
        'pass',
        `Found ${recordCount} behavioral events (30 days)`,
        { recordCount }
      );
    } else {
      addResult('3. Behavioral Data', 'warning', 'No behavioral events found', { recordCount: 0 });
    }

    return recordCount;
  } catch (error) {
    addResult('3. Behavioral Data', 'fail', 'Database query failed', undefined, error);
    return 0;
  }
}

/**
 * Test attendance metrics RPC function
 */
async function testAttendanceMetrics(studentLrn: string): Promise<boolean> {
  try {
    const metrics = await getAttendanceMetrics(studentLrn);

    if (metrics) {
      addResult(
        '4. Attendance Metrics RPC',
        'pass',
        `Attendance: ${(metrics.attendance_rate * 100).toFixed(1)}%`,
        metrics
      );
      return true;
    } else {
      addResult('4. Attendance Metrics RPC', 'warning', 'RPC returned null');
      return false;
    }
  } catch (error) {
    addResult('4. Attendance Metrics RPC', 'fail', 'RPC call failed', undefined, error);
    return false;
  }
}

/**
 * Test absence pattern detection RPC function
 */
async function testAbsencePatterns(studentLrn: string): Promise<boolean> {
  try {
    const patterns = await detectAbsencePatterns(studentLrn, 30);

    if (patterns && patterns.length > 0) {
      addResult(
        '5. Absence Patterns RPC',
        'pass',
        `Detected ${patterns.length} pattern(s): ${patterns.map(p => p.pattern).join(', ')}`,
        patterns
      );
      return true;
    } else {
      addResult('5. Absence Patterns RPC', 'warning', 'No patterns detected or returned null');
      return false;
    }
  } catch (error) {
    addResult('5. Absence Patterns RPC', 'fail', 'RPC call failed', undefined, error);
    return false;
  }
}

/**
 * Test main risk scoring RPC function
 */
async function testRiskScoring(studentLrn: string): Promise<boolean> {
  try {
    const riskScore = await calculateStudentRiskScore(studentLrn);

    if (riskScore) {
      addResult(
        '6. Risk Score Calculation',
        'pass',
        `Risk: ${riskScore.risk_score}/100 (${riskScore.risk_level}) - Confidence: ${riskScore.confidence}%`,
        riskScore
      );
      return true;
    } else {
      addResult('6. Risk Score Calculation', 'warning', 'calculateStudentRiskScore returned null');
      return false;
    }
  } catch (error) {
    addResult('6. Risk Score Calculation', 'fail', 'Function call failed', undefined, error);
    return false;
  }
}

/**
 * Test fallback risk scoring
 */
async function testFallbackRiskScoring(studentLrn: string): Promise<boolean> {
  try {
    const fallbackScore = await getSimpleRiskScore(studentLrn);

    if (fallbackScore) {
      addResult(
        '7. Fallback Risk Score',
        'pass',
        `Fallback Risk: ${fallbackScore.risk_score}/100 (${fallbackScore.risk_level})`,
        fallbackScore
      );
      return true;
    } else {
      addResult('7. Fallback Risk Score', 'warning', 'getSimpleRiskScore returned null');
      return false;
    }
  } catch (error) {
    addResult('7. Fallback Risk Score', 'fail', 'Fallback function failed', undefined, error);
    return false;
  }
}

/**
 * Test complete ML profile
 */
async function testCompleteProfile(studentLrn: string): Promise<boolean> {
  try {
    const profile = await getStudentMLProfile(studentLrn);

    if (profile && profile.riskScore) {
      addResult(
        '8. Complete ML Profile',
        'pass',
        'Successfully retrieved all metrics',
        {
          attendance: profile.attendanceMetrics?.attendance_rate,
          risk_score: profile.riskScore?.risk_score,
          patterns: profile.absencePatterns?.length,
        }
      );
      return true;
    } else {
      addResult('8. Complete ML Profile', 'warning', 'Profile partially returned');
      return false;
    }
  } catch (error) {
    addResult('8. Complete ML Profile', 'fail', 'Failed to retrieve complete profile', undefined, error);
    return false;
  }
}

/**
 * Main diagnostic function
 */
export async function testMLSystem(studentLrn: string): Promise<void> {
  results.length = 0; // Clear previous results

  console.clear();
  console.log(
    '%c🔍 SafeGate ML System Diagnostics',
    'font-size: 16px; font-weight: bold; color: #2563eb;'
  );
  console.log(`Testing student: ${studentLrn}\n`);

  // Run all tests
  const studentExists = await testStudentExists(studentLrn);

  if (!studentExists) {
    console.log(
      '\n%c❌ Student not found. Please use a valid student LRN.',
      'font-size: 12px; color: #dc2626;'
    );
    printSummary();
    return;
  }

  await testAttendanceData(studentLrn);
  await testBehavioralData(studentLrn);
  await testAttendanceMetrics(studentLrn);
  await testAbsencePatterns(studentLrn);
  await testRiskScoring(studentLrn);
  await testFallbackRiskScoring(studentLrn);
  await testCompleteProfile(studentLrn);

  printSummary();
}

/**
 * Print diagnostic summary
 */
function printSummary(): void {
  console.log('\n' + '='.repeat(60));
  console.log('%cDiagnostic Summary', 'font-size: 14px; font-weight: bold;');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warnings = results.filter(r => r.status === 'warning').length;

  console.log(
    `%c✅ Passed: ${passed} | %c❌ Failed: ${failed} | %c⚠️  Warnings: ${warnings}`,
    'color: #16a34a;',
    'color: #dc2626;',
    'color: #f59e0b;'
  );

  console.log('\n' + '='.repeat(60));
  console.log('Detailed Results:');
  console.log('='.repeat(60));
  console.table(results.map(r => ({ Test: r.test, Status: r.status, Message: r.message })));

  if (failed > 0) {
    console.log(
      '\n%c💡 Troubleshooting Tips:',
      'font-size: 12px; font-weight: bold; color: #f59e0b;'
    );
    console.log('1. Check ML_DIAGNOSTICS.md for detailed debugging steps');
    console.log('2. Verify PostgreSQL functions exist in Supabase');
    console.log('3. Check student LRN is correct (case-sensitive)');
    console.log('4. Ensure attendance data exists for the student');
    console.log('5. Check browser console logs for RPC error details');
  } else {
    console.log('\n%c✅ All systems operational!', 'font-size: 12px; color: #16a34a;');
  }

  console.log('\nView full results object:');
  console.log(results);
}

/**
 * Quick test for dashboard students at risk
 */
export async function testDashboardRiskCalculation(studentLrns: string[]): Promise<void> {
  console.clear();
  console.log(
    '%c📊 Testing Dashboard Risk Calculation',
    'font-size: 16px; font-weight: bold; color: #2563eb;'
  );
  console.log(`Testing ${studentLrns.length} students\n`);

  const results: { lrn: string; status: string; score?: number; level?: string }[] = [];

  for (const lrn of studentLrns) {
    try {
      const riskScore = await calculateStudentRiskScore(lrn);
      if (riskScore) {
        results.push({
          lrn,
          status: '✅ Success',
          score: riskScore.risk_score,
          level: riskScore.risk_level,
        });
      } else {
        results.push({
          lrn,
          status: '⚠️  Null result',
        });
      }
    } catch (error) {
      results.push({
        lrn,
        status: `❌ Error: ${error instanceof Error ? error.message : String(error)}`,
      });
    }
  }

  console.table(results);
  console.log('Summary:', {
    total: studentLrns.length,
    successful: results.filter(r => r.status === '✅ Success').length,
    failed: results.filter(r => r.status.includes('❌')).length,
  });
}
