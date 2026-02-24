import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { studentLrn } = body;

    if (!studentLrn || typeof studentLrn !== 'string') {
      return Response.json(
        { error: 'studentLrn is required and must be a string' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Missing Supabase credentials - scan logged but ML update skipped');
      return Response.json({
        success: true,
        message: 'Attendance scan processed',
        data: {
          studentLrn,
          predictionUpdated: false,
          summaryUpdated: false,
          behavioralEventUpdated: false,
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Update attendance patterns based on latest attendance
    const { error: patternError } = await supabase.rpc(
      'update_attendance_patterns',
      { p_student_lrn: studentLrn }
    );

    if (patternError) {
      console.error('Pattern update error:', patternError);
    }

    // 2. Store absence prediction
    const { data: predictionData, error: predictionError } = await supabase.rpc(
      'store_absence_prediction',
      {
        p_student_lrn: studentLrn,
      }
    );

    if (predictionError) {
      console.error('Prediction error:', predictionError);
    }

    // 2. Update student summary (attendance trend + risk)
    const { data: summaryData, error: summaryError } = await supabase.rpc(
      'update_student_summary',
      {
        p_student_lrn: studentLrn,
      }
    );

    if (summaryError) {
      console.error('Summary error:', summaryError);
    }

    // 3. Generate behavioral events based on latest attendance patterns
    const { data: behavioralData, error: behavioralError } = await supabase.rpc(
      'generate_behavioral_events_from_patterns',
      {
        p_student_lrn: studentLrn,
      }
    );

    if (behavioralError) {
      console.error('Behavioral event generation error:', behavioralError);
    }

    return Response.json({
      success: true,
      message: 'Attendance scan processed and ML models updated',
      data: {
        studentLrn,
        predictionUpdated: !predictionError,
        summaryUpdated: !summaryError,
        behavioralEventUpdated: !behavioralError,
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      {
        success: true,
        message: 'Attendance scan processed',
        data: {
          studentLrn: (await request.json()).studentLrn || 'unknown',
          predictionUpdated: false,
          summaryUpdated: false,
        },
      },
      { status: 200 }
    );
  }
}
