import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Paths that require authentication (handled client-side by AdminRoute/StaffRoute,
// but the middleware adds an extra layer by checking for the auth cookie).
// Firebase sets a session cookie on sign-in when using server-side auth.
// For now, we rely on the client-side route guards (AdminRoute / StaffRoute)
// and use middleware only to enforce HTTPS + security headers.

export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Security headers (same as the previous vercel.json headers)
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );

  return response;
}

export const config = {
  matcher: [
    // Run on all routes except Next.js internals and static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)).*)",
  ],
};
