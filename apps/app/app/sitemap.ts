import type { MetadataRoute } from "next";
import { getAllAreaSlugs } from "@/lib/areaContent.server";

const BASE = "https://grenbee.com";
// Service slugs that have city+service landing pages (local services only)
const SERVICE_SLUGS = ["house-cleaning", "lawn-mowing", "tv-installation"];

// Top-level marketing routes worth indexing.
const STATIC_PATHS = ["", "/areas", "/hosts", "/plans", "/faq", "/contact"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const slugs = await getAllAreaSlugs();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((p) => ({
    url: `${BASE}/us${p}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: p === "" ? 1 : 0.7,
  }));

  const cityEntries: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: `${BASE}/us/areas/${slug}`,
    lastModified: now,
    changeFrequency: "weekly",
    priority: 0.8,
  }));

  const serviceEntries: MetadataRoute.Sitemap = slugs.flatMap((slug) =>
    SERVICE_SLUGS.map((svc) => ({
      url: `${BASE}/us/areas/${slug}/${svc}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
  );

  return [...staticEntries, ...cityEntries, ...serviceEntries];
}
