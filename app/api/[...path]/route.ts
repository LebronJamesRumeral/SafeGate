/**
 * Proxy Route Handler
 * 
 * Forwards all requests to http://localhost:8000/api/[...path]
 * Acts as middleware between React frontend and FastAPI backend
 * 
 * Flow:
 * React Component → Next.js API Route → FastAPI Backend → Next.js → React
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const API_BASE = `${BACKEND_URL}/api`;

/**
 * Handle all HTTP methods (GET, POST, PUT, DELETE, PATCH)
 */
async function handleRequest(
  req: NextRequest,
  { params }: { params: { path: string[] } }
) {
  try {
    // Construct the full backend URL
    const pathString = params.path.join('/');
    const url = new URL(`${API_BASE}/${pathString}`);

    // Append query parameters if present
    const searchParams = req.nextUrl.searchParams;
    searchParams.forEach((value, key) => {
      url.searchParams.append(key, value);
    });

    // Prepare headers
    const headers = new Headers(req.headers);
    headers.set('Content-Type', 'application/json');

    // Prepare request options
    const requestOptions: RequestInit = {
      method: req.method,
      headers,
    };

    // Include body for methods that support it
    if (
      req.method !== 'GET' &&
      req.method !== 'HEAD' &&
      req.method !== 'DELETE'
    ) {
      const body = await req.text();
      if (body) {
        requestOptions.body = body;
      }
    }

    // Forward request to FastAPI backend
    const response = await fetch(url.toString(), requestOptions);

    // Get response body
    const responseBody = await response.text();

    // Create Next.js response
    const nextResponse = new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
    });

    // Copy response headers
    response.headers.forEach((value, key) => {
      if (key !== 'content-encoding' && key !== 'transfer-encoding') {
        nextResponse.headers.set(key, value);
      }
    });

    // Ensure JSON content type
    nextResponse.headers.set('Content-Type', 'application/json');

    return nextResponse;
  } catch (error) {
    console.error('Proxy Error:', error);

    // Return error response
    return NextResponse.json(
      {
        detail: 'Failed to communicate with backend service',
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 503 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function POST(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function PUT(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function DELETE(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}

export async function PATCH(
  req: NextRequest,
  context: { params: { path: string[] } }
) {
  return handleRequest(req, context);
}
