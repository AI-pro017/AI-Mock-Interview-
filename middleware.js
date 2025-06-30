// AI-Mock-Interview-/middleware.js
// Replace Clerk middleware with custom auth middleware

import { auth } from "@/auth"

export default auth((req) => {
  if (!req.auth && req.nextUrl.pathname !== "/sign-in") {
    const newUrl = new URL("/sign-in", req.nextUrl.origin)
    return Response.redirect(newUrl)
  }
})

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/interview/:path*",
    "/find-job/:path*",
    "/personality/:path*",
    "/results/:path*",
  ],
};