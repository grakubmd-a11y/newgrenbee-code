import type { MetadataRoute } from "next";
import { getAllAreaSlugs } from "@/lib/areaContent.server";
import { SERVICES_DATA } from "@grenbee/config";

const BASE = "https://grenbee.com";

// All service slugs (individual service landing pages)
const ALL_SERVICE_SLUGS = SERVICES_DATA.map((s) => s.id);

// Service slugs that have city+service landing pages
const SERVICE_SLUGS = ["house-cleaning", "lawn-mowing", "tv-installation"];

// Top-level routes for each language variant
const STATIC_PATHS = ["", "/areas", "/hosts", "/plans", "/faq", "/contact", "/services"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const slugs = await getAllAreaSlugs();

  // ── EN pages (/us/*) ──────────────────────────────────────────────────────
  const staticEN: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${BASE}/us${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1.0 : 0.7,
  }));

  const cityEN: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE}/us/areas/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));

  const serviceEN: MetadataRoute.Sitemap = slugs.flatMap((slug) =>
    SERVICE_SLUGS.map((svc) => ({
      url: `${BASE}/us/areas/${slug}/${svc}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  );

  // ── ES pages (/us/es/*) ───────────────────────────────────────────────────
  const staticES: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${BASE}/us/es${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 0.9 : 0.65,
  }));

  const cityES: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE}/us/es/areas/${slug}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.75,
  }));

  const serviceES: MetadataRoute.Sitemap = slugs.flatMap((slug) =>
    SERVICE_SLUGS.map((svc) => ({
      url: `${BASE}/us/es/areas/${slug}/${svc}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.85,
    })),
  );

  // ── Individual service landing pages ─────────────────────────────────────
  const serviceLandingEN: MetadataRoute.Sitemap = ALL_SERVICE_SLUGS.map((slug) => ({
    url: `${BASE}/us/services/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const serviceLandingES: MetadataRoute.Sitemap = ALL_SERVICE_SLUGS.map((slug) => ({
    url: `${BASE}/us/es/services/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  return [
    ...staticEN, ...cityEN, ...serviceEN, ...serviceLandingEN,
    ...staticES, ...cityES, ...serviceES, ...serviceLandingES,
  ];
}
