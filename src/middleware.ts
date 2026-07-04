import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

// Paths that do not require authentication
const publicPaths = ['/login', '/api/auth/login'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to public paths and static assets
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // like .png, .svg
  ) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    // No session found, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Verify the JWT session
  const payload = await decrypt(sessionCookie);

  if (!payload) {
    // Invalid or expired session, redirect to login
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    // Clear the invalid cookie
    const response = NextResponse.redirect(url);
    response.cookies.delete('session');
    return response;
  }

  // Session is valid, proceed
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api/auth/login|_next/static|_next/image|favicon.ico).*)'],
};
