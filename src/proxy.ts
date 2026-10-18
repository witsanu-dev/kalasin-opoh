import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decrypt } from '@/lib/auth';

// Paths that do not require authentication
const publicPaths = [
  '/login', 
  '/api/auth/login', 
  '/api/auth/mfa/verify-login', 
  '/api/auth/mfa/recovery-login',
  '/api/db-config', 
  '/api/db-config/test', 
  '/api/db-schema'
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Allow access to public paths, external OPOH endpoints, and static assets
  if (
    publicPaths.includes(pathname) ||
    pathname.startsWith('/api/opoh/') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.') // like .png, .svg
  ) {
    return NextResponse.next();
  }

  // Check for Bearer API Key auth (e.g. for server-to-server or cron triggers)
  const authHeader = request.headers.get('Authorization');
  const serverApiKey = process.env.API_KEY;
  if (authHeader && serverApiKey && authHeader === `Bearer ${serverApiKey}`) {
    return NextResponse.next();
  }

  // Check for session cookie
  const sessionCookie = request.cookies.get('session')?.value;

  if (!sessionCookie) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Verify the JWT session
  const payload = await decrypt(sessionCookie);

  if (!payload) {
    // Invalid or expired session
    if (pathname.startsWith('/api/')) {
      const response = NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      response.cookies.delete('session');
      return response;
    }
    const url = request.nextUrl.clone();
    url.pathname = '/login';
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
