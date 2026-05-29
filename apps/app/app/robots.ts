import type { MetadataRoute } from "next";

// Internal hosts (staff/admin/staging) are additionally blocked via the
// X-Robots-Tag header in next.config.ts.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/staff", "/account", "/api"],
    },
    sitemap: "https://grenbee.com/sitemap.xml",
  };
}
