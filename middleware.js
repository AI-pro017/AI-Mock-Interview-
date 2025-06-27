// AI-Mock-Interview-/middleware.js
// Replace Clerk middleware with custom auth middleware

import { withAuth } from "next-auth/middleware";
import { authOptions } from "./app/api/auth/[...auth]/route";

export default withAuth({
  callbacks: {
    authorized: ({ token }) => !!token, // Only allow authenticated users
  },
  pages: {
    signIn: '/sign-in',
  },
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/interview/:path*",
    "/find-job/:path*",
    "/personality/:path*",
    "/results/:path*",
  ],
};