import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get('firebase-auth-token')?.value;
  const userRole = request.cookies.get('user-role')?.value;
  const { pathname } = request.nextUrl;

  const isProtectedPage = pathname.startsWith('/users');
  const isProtectedApi = pathname.startsWith('/api/users');

  if (!isProtectedPage && !isProtectedApi) {
    return NextResponse.next();
  }

  if (!authToken) {
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If the role is missing, we might still allow API requests to proceed 
  // since they are verified more thoroughly in the route handlers (checking both cookies and headers)
  if (!userRole && isProtectedApi) {
    return NextResponse.next();
  }

  if (userRole !== 'admin') {
    console.warn(`Middleware: Access denied for role: ${userRole} at ${pathname}`);
    if (isProtectedApi) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/users/:path*', '/api/users/:path*'],
};
