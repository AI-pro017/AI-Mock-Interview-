// AI-Mock-Interview-/middleware.js
// Replace Clerk middleware with custom auth middleware
import { NextResponse } from 'next/server'
import { auth } from "./auth"

export default auth(async (req) => {
  const isLoggedIn = !!req.auth;
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard') || 
                          req.nextUrl.pathname.startsWith('/interview') ||
                          req.nextUrl.pathname.startsWith('/find-job') ||
                          req.nextUrl.pathname.startsWith('/personality') ||
                          req.nextUrl.pathname.startsWith('/results');

  // Check if user is disabled (if they have a session)
  if (isLoggedIn && req.auth?.user?.disabled) {
    console.log(`❌ Disabled user attempting to access protected route: ${req.auth.user.email}`);
    // Redirect to sign-in
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin));
  }

  if (isProtectedRoute && !isLoggedIn) {
    // Redirect unauthenticated users trying to access protected routes
    return NextResponse.redirect(new URL('/sign-in', req.nextUrl.origin));
  }
});

export async function middleware(request) {
  // Protect admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const session = await auth()
    
    if (!session) {
      return NextResponse.redirect(new URL('/sign-in', request.url))
    }
    
    // Check if user is disabled
    if (session.user?.disabled) {
      console.log(`❌ Disabled user attempting to access admin: ${session.user.email}`);
      return NextResponse.redirect(new URL('/sign-in', request.url));
    }

    // Additional admin check will be done in the component
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/admin/:path*',
    "/dashboard/:path*",
    "/interview/:path*",
    "/find-job/:path*",
    "/personality/:path*",
    "/results/:path*",
    // Exclude API routes from middleware processing for stability
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};