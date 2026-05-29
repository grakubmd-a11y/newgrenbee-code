import { NextRequest, NextResponse } from "next/server";

/**
 * Domain-based routing middleware.
 *
 * Each internal subdomain is locked to its own section of the app:
 *   staff.grenbee.com        → /staff only
 *   control-room.grenbee.com → /admin only
 *   app.grenbee.com          → permanent redirect to grenbee.com (same path + query)
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

  // ── app.grenbee.com ── permanent redirect to grenbee.com ─────────────────
  // The app is now a single unified deployment (the old grenbee-web multi-zone
  // proxy was removed), so app.grenbee.com would otherwise serve a duplicate of
  // grenbee.com. Consolidate everything on the apex domain (same path + query).
  if (hostname === "app.grenbee.com") {
    const target = new URL(request.url);
    target.protocol = "https:";
    target.host = "grenbee.com";
    return NextResponse.redirect(target, 308);
  }

  return NextResponse.next();
}

export const config = {
  // Run on all routes except Next.js static/image optimisation internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
