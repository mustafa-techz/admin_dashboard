import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Get the session token from cookies
  // Note: Firebase Auth clientside doesn't automatically set cookies.
  // For basic clientside protection, AppLayout is sufficient.
  // This middleware is a placeholder for future SSR/Cookie-based auth.
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/students/:path*', '/teachers/:path*', '/attendance/:path*', '/profile/:path*'],
};
