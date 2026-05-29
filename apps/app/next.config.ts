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
