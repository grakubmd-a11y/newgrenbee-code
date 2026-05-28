import type { NextConfig } from "next";

// Custom domain for the operational app (grenbee-app).
// Using the custom domain (not the raw Vercel project URL) because grenbee-app
// has Vercel SSO protection enabled for non-custom-domain URLs.
// Set GRENBEE_APP_URL in Vercel → grenbee-web environment variables to override.
const APP_URL =
  process.env.GRENBEE_APP_URL ||
  "https://app.grenbee.com";

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
      // ── grenbee-app API routes ──────────────────────────────────────────────
      // These are explicit rewrites instead of a blanket /api/:path* so that
      // apps/web can safely add its own API routes in the future without
      // accidentally proxying them to grenbee-app.
      //
      // When adding a new endpoint to api/ in grenbee-app that the booking
      // flow calls from the browser, add it here too.
      { source: "/api/availability",            destination: `${APP_URL}/api/availability` },
      { source: "/api/capture-lead",            destination: `${APP_URL}/api/capture-lead` },
      { source: "/api/check-coverage",          destination: `${APP_URL}/api/check-coverage` },
      { source: "/api/confirm-payment",         destination: `${APP_URL}/api/confirm-payment` },
      { source: "/api/create-payment-intent",   destination: `${APP_URL}/api/create-payment-intent` },
      { source: "/api/create-recurring-plan",   destination: `${APP_URL}/api/create-recurring-plan` },
      { source: "/api/manage-recurring-plan",   destination: `${APP_URL}/api/manage-recurring-plan` },
      { source: "/api/notify",                  destination: `${APP_URL}/api/notify` },
      { source: "/api/staff-jobs",              destination: `${APP_URL}/api/staff-jobs` },
      { source: "/api/stripe-webhook",          destination: `${APP_URL}/api/stripe-webhook` },
      { source: "/api/update-job-status",       destination: `${APP_URL}/api/update-job-status` },
      { source: "/api/update-lead",             destination: `${APP_URL}/api/update-lead` },
      { source: "/api/save-job-photo",          destination: `${APP_URL}/api/save-job-photo` },
      { source: "/api/delete-job-photo",        destination: `${APP_URL}/api/delete-job-photo` },
      { source: "/api/set-job-payout",          destination: `${APP_URL}/api/set-job-payout` },
      { source: "/api/invite-staff",            destination: `${APP_URL}/api/invite-staff` },
      { source: "/api/auto-assign-staff",       destination: `${APP_URL}/api/auto-assign-staff` },
      { source: "/api/integrations/status",     destination: `${APP_URL}/api/integrations/status` },
    ];
  },
};

export default nextConfig;
