// AI-Mock-Interview-/middleware.js
// Replace Clerk middleware with custom auth middleware

import { auth } from "@/app/api/auth/[...auth]/route"

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/interview/:path*",
    "/find-job/:path*",
    "/personality/:path*",
    "/results/:path*",
  ],
};