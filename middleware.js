// AI-Mock-Interview-/middleware.js
// Replace Clerk middleware with custom auth middleware

import { auth } from "./auth"

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const isProtectedRoute = req.nextUrl.pathname.startsWith('/dashboard');

  if (isProtectedRoute && !isLoggedIn) {
    // Redirect unauthenticated users trying to access protected routes
    return Response.redirect(new URL('/sign-in', req.nextUrl.origin));
  }
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/interview/:path*",
    "/find-job/:path*",
    "/personality/:path*",
    "/results/:path*",
    // Exclude API routes from middleware processing for stability
    "/((?!api|_next/static|_next/image|favicon.ico).*)",
  ],
};