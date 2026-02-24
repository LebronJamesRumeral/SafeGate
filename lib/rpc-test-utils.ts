/**
 * RPC Function Verification Script
 * Use this in browser console to verify RPC functions are callable
 */

// Step 1: Direct RPC Test - Test if the function exists and is callable
export async function testRPCDirectly() {
  console.clear();
  console.log('%c🔧 Testing RPC Functions Directly', 'font-size: 16px; font-weight: bold; color: #2563eb;');
  console.log('This bypasses the TypeScript wrappers to test the functions directly\n');

  const studentLrn = 'LRN-2026-0001'; // Use the first test student

  // Test 1: Check if supabase is available
  console.log('%c1. Checking Supabase Client...', 'font-weight: bold;');
  try {
    console.log('Supabase initialized:', supabase ? '✅' : '❌');
    console.log('Supabase URL:', supabase?.supabaseUrl);
  } catch (e) {
    console.error('❌ Supabase not available in global scope');
    console.log('Try importing: import { supabase } from "@/lib/supabase"');
    return;
  }

  // Test 2: Test attendance metrics RPC
  console.log('\n%c2. Testing calculate_student_attendance_metrics RPC...', 'font-weight: bold;');
  try {
    const { data: attendanceData, error: attendanceError } = await supabase.rpc(
      'calculate_student_attendance_metrics',
      {
        p_student_lrn: studentLrn,
        p_days_back: 60
      }
    );

    if (attendanceError) {
      console.error('❌ RPC Error:', attendanceError);
      console.error('Error details:', JSON.stringify(attendanceError, null, 2));
    } else if (attendanceData) {
      console.log('✅ RPC Success');
      console.log('Data:', attendanceData);
    } else {
      console.warn('⚠️ No data returned');
    }
  } catch (e) {
    console.error('❌ Exception:', e);
  }

  // Test 3: Test absence patterns RPC
  console.log('\n%c3. Testing detect_student_absence_patterns RPC...', 'font-weight: bold;');
  try {
    const { data: patternData, error: patternError } = await supabase.rpc(
      'detect_student_absence_patterns',
      {
        p_student_lrn: studentLrn,
        p_days_back: 30
      }
    );

    if (patternError) {
      console.error('❌ RPC Error:', patternError);
      console.error('Error details:', JSON.stringify(patternError, null, 2));
    } else if (patternData) {
      console.log('✅ RPC Success');
      console.log('Data:', patternData);
    } else {
      console.warn('⚠️ No data returned');
    }
  } catch (e) {
    console.error('❌ Exception:', e);
  }

  // Test 4: Test main risk scoring RPC (THE ONE FAILING)
  console.log('\n%c4. Testing calculate_student_risk_score RPC (THE FAILING FUNCTION)...', 'font-weight: bold; color: #ef4444;');
  try {
    const { data: riskData, error: riskError } = await supabase.rpc(
      'calculate_student_risk_score',
      {
        p_student_lrn: studentLrn
      }
    );

    if (riskError) {
      console.error('❌ RPC Error:', riskError);
      console.error('Error object keys:', Object.keys(riskError));
      console.error('Full error:', JSON.stringify(riskError, null, 2));
      
      // Try to extract more information
      if (typeof riskError === 'object') {
        console.log('\nError properties:');
        for (const [key, value] of Object.entries(riskError)) {
          console.log(`  ${key}:`, value);
        }
      }
    } else if (riskData) {
      console.log('✅ RPC Success');
      console.log('Data:', riskData);
    } else {
      console.warn('⚠️ No data returned');
    }
  } catch (e) {
    console.error('❌ Exception:', e);
  }

  console.log('\n%cTest Complete', 'font-size: 14px; font-weight: bold; color: #059669;');
}

// Step 2: Check function signatures in Supabase
export async function checkFunctionSignatures() {
  console.clear();
  console.log('%c📋 Checking Function Signatures in Supabase', 'font-size: 16px; font-weight: bold; color: #2563eb;');

  try {
    // This attempts to get the RPC signatures
    const { data, error } = await supabase
      .rpc('calculate_student_attendance_metrics', {
        p_student_lrn: 'test',
        p_days_back: 1
      })
      .select('*')
      .limit(0);

    if (error) {
      console.log('RPC introspection error (expected):', error.message);
    }

    console.log('\n✅ At minimum, Supabase can see the RPC endpoint');
    console.log('If you see an error above, check:');
    console.log('1. Function names match exactly (case-sensitive)');
    console.log('2. Parameter names start with "p_"');
    console.log('3. Functions exist in Supabase database');
  } catch (e) {
    console.error('Exception:', e);
  }
}

// Step 3: Comprehensive RPC status check
export async function getRPCStatus() {
  console.clear();
  console.log('%c🔍 RPC Status Check', 'font-size: 16px; font-weight: bold; color: #2563eb;');

  const functions = [
    { name: 'calculate_student_attendance_metrics', params: { p_student_lrn: 'LRN-2026-0001', p_days_back: 60 } },
    { name: 'detect_student_absence_patterns', params: { p_student_lrn: 'LRN-2026-0001', p_days_back: 30 } },
    { name: 'calculate_student_risk_score', params: { p_student_lrn: 'LRN-2026-0001' } }
  ];

  const results: { function: string; status: string; error?: string }[] = [];

  for (const fn of functions) {
    try {
      const { data, error } = await supabase.rpc(fn.name, fn.params);

      results.push({
        function: fn.name,
        status: error ? '❌ Error' : data ? '✅ Success' : '⚠️ No Data',
        error: error?.message
      });
    } catch (e) {
      results.push({
        function: fn.name,
        status: '❌ Exception',
        error: (e as Error).message
      });
    }
  }

  console.table(results);

  // Summary
  const failures = results.filter(r => r.status.includes('❌'));
  if (failures.length > 0) {
    console.log('\n%cFailing functions:', 'font-weight: bold; color: #ef4444;');
    failures.forEach(f => {
      console.log(`- ${f.function}: ${f.error}`);
    });
  } else {
    console.log('\n%c✅ All RPC functions are accessible!', 'font-weight: bold; color: #059669;');
  }
}

// Usage instructions
console.log(`
%c📚 RPC Troubleshooting Commands

Run these in browser console to diagnose the issue:

1. Test RPC directly (bypassing TypeScript):
   await testRPCDirectly()

2. Check function signatures:
   await checkFunctionSignatures()

3. Get RPC status summary:
   await getRPCStatus()

Select and paste the commands above, then check console for results.

%cThe calculate_student_risk_score function is the one failing with empty error {}.
It's likely that:
1. Function doesn't exist in Supabase yet
2. Function has a syntax error
3. Function location is wrong (schema, permissions issue)

%cNext Steps:
1. Run getRPCStatus() to see which functions work
2. Go to Supabase Dashboard → SQL Editor
3. Run: SELECT * FROM calculate_student_risk_score('LRN-2026-0001');
4. If that fails in SQL Editor, the function has an issue
5. Check supabase-schema.sql lines 510+ for the function definition
`, 'font-size: 14px; font-weight: bold; color: #2563eb;', 'font-size: 12px; color: #ef4444;', 'font-size: 12px; color: #059669;');
