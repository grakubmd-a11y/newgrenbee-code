import type { NextConfig } from "next";

// Stable Vercel project URL for the operational app (grenbee-app).
// Set GRENBEE_APP_URL in Vercel → grenbee-web environment variables to override.
// This URL is the project alias — it always points to the latest production deployment.
const APP_URL =
  process.env.GRENBEE_APP_URL ||
  "https://grenbee-app-grakubmd-6842s-projects.vercel.app";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@grenbee/types", "@grenbee/firebase", "@grenbee/i18n", "@grenbee/config"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
  },

  // ── Multi-zone rewrites ────────────────────────────────────────────────────
  // Proxy customer-facing routes and all API calls to grenbee-app.
  // apps/web has no /api routes of its own, so the blanket /api rewrite is safe.
  // Uses the internal Vercel project URL (not app.grenbee.com) to avoid redirect loops.
  async rewrites() {
    return [
      // Customer routes
      { source: "/book",              destination: `${APP_URL}/book` },
      { source: "/book/:path*",       destination: `${APP_URL}/book/:path*` },
      { source: "/account",           destination: `${APP_URL}/account` },
      { source: "/account/:path*",    destination: `${APP_URL}/account/:path*` },
      { source: "/checkout",          destination: `${APP_URL}/checkout` },
      { source: "/checkout/:path*",   destination: `${APP_URL}/checkout/:path*` },
      { source: "/bookings",          destination: `${APP_URL}/bookings` },
      { source: "/bookings/:path*",   destination: `${APP_URL}/bookings/:path*` },
      // API routes — all relative fetch() calls from the booking app go here
      { source: "/api/:path*",        destination: `${APP_URL}/api/:path*` },
    ];
  },
};

export default nextConfig;
