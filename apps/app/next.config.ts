import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@grenbee/types", "@grenbee/firebase", "@grenbee/i18n", "@grenbee/config"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
  },

  // ── Multi-zone asset prefix ────────────────────────────────────────────────
  // When grenbee-web proxies /book,/account,etc. to this app, the browser loads
  // the page from grenbee.com but Next.js bundles live here.
  // assetPrefix tells Next.js to load _next/static/* from the app's own origin,
  // not from grenbee.com where those assets don't exist.
  // Set NEXT_PUBLIC_ASSET_PREFIX in Vercel → grenbee-app to the stable project URL.
  assetPrefix: process.env.NEXT_PUBLIC_ASSET_PREFIX || "",

  // ── noindex headers for internal domains ──────────────────────────────────
  async headers() {
    return [
      {
        source: "/(.*)",
        has: [{ type: "host", value: "staff.grenbee.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/(.*)",
        has: [{ type: "host", value: "control-room.grenbee.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/(.*)",
        has: [{ type: "host", value: "staging.grenbee.com" }],
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
