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
      console.warn('Missing Supabase credentials');
      return Response.json({
        success: true,
        data: {
          patternType: 'Unknown',
          patternConfidence: 0,
          predictedAbsentDate: null,
          predictionConfidence: 0,
          riskFactors: 'Not available',
          recommendation: 'Check database',
        },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .rpc('analyze_and_predict_absence', {
        p_student_lrn: studentLrn,
      });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      console.error('Prediction error:', error);
      return Response.json({
        success: true,
        data: {
          patternType: 'Unknown',
          patternConfidence: 0,
          predictedAbsentDate: null,
          predictionConfidence: 0,
          riskFactors: 'Insufficient data',
          recommendation: 'More attendance records needed',
        },
        message: 'Prediction data not available',
      });
    }

    return Response.json({
      success: true,
      data: {
        patternType: data[0].pattern_type || 'Unknown',
        patternConfidence: data[0].pattern_confidence || 0,
        predictedAbsentDate: data[0].predicted_absent_date || null,
        predictionConfidence: data[0].prediction_confidence || 0,
        riskFactors: data[0].risk_factors || 'N/A',
        recommendation: data[0].recommendation || 'Monitor student',
      },
    });
  } catch (error) {
    console.error('API Error:', error);
    return Response.json(
      {
        success: true,
        data: {
          patternType: 'Unknown',
          patternConfidence: 0,
          predictedAbsentDate: null,
          predictionConfidence: 0,
          riskFactors: 'Error loading',
          recommendation: 'Try again later',
        },
      },
      { status: 200 }
    );
  }
}
