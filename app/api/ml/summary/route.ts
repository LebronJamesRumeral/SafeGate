/**
 * Student Summary API Route
 * Proxies to FastAPI backend for student attendance summary
 */

const RAW_BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://safegate-pg3g.onrender.com';
const BACKEND_URL = RAW_BACKEND_URL.replace(/\/api\/?$/, '');

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const studentLrn = searchParams.get('studentLrn');

    if (!studentLrn) {
      return Response.json(
        { error: 'studentLrn query parameter is required' },
        { status: 400 }
      );
    }

    const response = await fetch(`${BACKEND_URL}/api/attendance/summary/`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Backend request failed');
    }

    const data = await response.json();
    return Response.json({
      success: true,
      data: {
        attendanceRate: data.attendance_rate,
        trend: data.trend,
        riskLevel: data.risk_level,
        nextLikelyAbsentDate: data.next_likely_absent_date,
        predictionConfidence: data.prediction_confidence,
        daysUntilCritical: data.days_until_critical,
      },
    });
  } catch (error) {
    console.error('Summary Proxy Error:', error);
    return Response.json(
      {
        success: false,
        error: 'Failed to fetch student summary',
        detail: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
