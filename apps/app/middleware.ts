import { NextRequest, NextResponse } from "next/server";

/**
 * Domain-based routing middleware.
 *
 * Each internal subdomain is locked to its own section of the app:
 *   staff.grenbee.com        → /staff only
 *   control-room.grenbee.com → /admin only
 *   app.grenbee.com          → redirect to grenbee.com configured in Vercel domain settings (not in code)
 *
 * NOTE: This middleware is a routing/UX layer only.
 * All admin and staff API routes still perform their own server-side role checks.
 * Do not rely on middleware as the sole security mechanism.
 */
export function middleware(request: NextRequest) {
  // Normalise: strip port suffix so local dev (localhost:3001) doesn't break
  const hostname = (request.headers.get("host") || "").split(":")[0];
  const pathname = request.nextUrl.pathname;

  // Skip Next.js internals, static assets, and API routes
  const isInternal =
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico");

  if (isInternal) return NextResponse.next();

  // ── staff.grenbee.com ── only /staff/* ──────────────────────────────────
  if (hostname === "staff.grenbee.com") {
    if (!pathname.startsWith("/staff")) {
      return NextResponse.redirect(new URL("/staff", request.url));
    }
    return NextResponse.next();
  }

  // ── control-room.grenbee.com ── only /admin/* ────────────────────────────
  if (hostname === "control-room.grenbee.com") {
    if (!pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // ── app.grenbee.com ── no redirect ───────────────────────────────────────
  // This domain is used as the rewrite destination from grenbee-web's
  // multi-zone proxy (Next.js rewrites grenbee.com/book → app.grenbee.com/book
  // server-side). Adding a redirect here would cause an infinite loop.
  // app.grenbee.com is not exposed in customer-facing links or emails;
  // it is a technical proxy target only.

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js static/image optimisation internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
