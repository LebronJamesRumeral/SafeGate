/**
 * Health check endpoint
 * GET /api/health
 */

export async function GET() {
  try {
    const rawBackendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://safegate-pg3g.onrender.com';
    const backendUrl = rawBackendUrl.replace(/\/api\/?$/, '');

    const response = await fetch(`${backendUrl}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    return Response.json(data, { status: response.status });
  } catch (error) {
    return Response.json(
      { detail: 'Backend service unavailable' },
      { status: 503 }
    );
  }
}
