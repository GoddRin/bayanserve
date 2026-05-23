import { auth } from '@/auth';
import { NextResponse } from 'next/server';

// Staff roles that are allowed to access /admin/* routes
const STAFF_ROLES = new Set([
  'BARANGAY_CLERK',
  'DEPARTMENT_OFFICER',
  'TREASURER',
  'ADMIN',
  'MAYOR',
]);

// Role → dashboard redirect mapping
const ROLE_REDIRECT: Record<string, string> = {
  BARANGAY_CLERK: '/admin/applications',
  DEPARTMENT_OFFICER: '/admin/applications',
  TREASURER: '/admin/payments',
  MAYOR: '/admin/analytics',
  ADMIN: '/admin/settings',
};

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // ── Protect /admin/* routes ──────────────────────────────────────────────
  if (pathname.startsWith('/admin')) {
    // Allow access to /admin/login without authentication
    if (pathname === '/admin/login') {
      // If already authenticated as staff, redirect to their dashboard
      if (session?.user && STAFF_ROLES.has(session.user.role)) {
        // If user must change password, redirect to change-password page
        if (session.user.mustChangePassword) {
          return NextResponse.redirect(new URL('/admin/change-password', req.url));
        }
        const target = ROLE_REDIRECT[session.user.role] || '/admin';
        return NextResponse.redirect(new URL(target, req.url));
      }
      return NextResponse.next();
    }

    // Allow access to /admin/change-password for authenticated staff
    if (pathname === '/admin/change-password') {
      // Must be authenticated as staff to change password
      if (session?.user && STAFF_ROLES.has(session.user.role)) {
        return NextResponse.next();
      }
      // Not authenticated or not staff → redirect to admin login
      return NextResponse.redirect(new URL('/admin/login', req.url));
    }

    // Not authenticated → redirect to admin login
    if (!session?.user) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Authenticated but not a staff role (e.g. CITIZEN) → forbidden, redirect to citizen home
    if (!STAFF_ROLES.has(session.user.role)) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Authenticated staff but must change password → block all admin routes except change-password
    if (session.user.mustChangePassword) {
      return NextResponse.redirect(new URL('/admin/change-password', req.url));
    }

    return NextResponse.next();
  }

  // ── Citizen login: redirect if already authenticated ─────────────────────
  if (pathname === '/login') {
    if (session?.user && session.user.role === 'CITIZEN') {
      return NextResponse.redirect(new URL('/', req.url));
    }
    return NextResponse.next();
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/admin/:path*',
    '/login',
  ],
};
