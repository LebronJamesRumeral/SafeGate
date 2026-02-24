import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  // Allow login page without authentication
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  // For now, allow all routes (authentication handled client-side)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon|apple-icon).*)',
  ],
};
