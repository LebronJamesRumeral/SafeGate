import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export default function middleware(request: NextRequest) {
  // Allow login page without authentication
  if (request.nextUrl.pathname === '/login') {
    return NextResponse.next();
  }

  // Check for user authentication from cookies (server-side)
  const userCookie = request.cookies.get('safegate_user');

  // If not authenticated and trying to access root, redirect to /login
  if (!userCookie && request.nextUrl.pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If not authenticated and trying to access any other page, redirect to /login
  if (!userCookie && request.nextUrl.pathname !== '/login') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If authenticated, allow access to any page (including last visited)
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|manifest.json|sw.js|icon|apple-icon).*)',
  ],
};
