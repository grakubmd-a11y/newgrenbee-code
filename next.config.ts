import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Output standalone for optimized Vercel deploys
  // Allows legacy api/ Vercel Functions to coexist
  reactStrictMode: true,

  // Images: allow Firebase Storage domain
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "*.firebasestorage.app" },
    ],
  },

  // Transpile packages that ship non-ESM code if needed
  // (firebase is fine with Next.js 15 + React 19)
  experimental: {
    // React 19 is stable in Next.js 15 — no flag needed
  },
};

export default nextConfig;
