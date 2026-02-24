/**
 * Health check endpoint
 * GET /api/health
 */

export async function GET() {
  try {
    const response = await fetch('http://localhost:8000/health', {
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
