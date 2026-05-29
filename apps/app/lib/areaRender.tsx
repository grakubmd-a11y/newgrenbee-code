/**
 * Shared server helpers for the area landing routes.
 *
 * The EN routes (under the (en) route group) and ES routes (under /es) are thin
 * page.tsx files that delegate here, so there is a single implementation — no
 * duplicated landing logic. Each route still exports its own
 * generateStaticParams / generateMetadata / default Page (Next.js requirement),
 * but the bodies live here.
 */
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import AreaLandingView from "@/components/areas/AreaLandingView";
import { AREA_COPY, type Lang } from "@/lib/areaCopy";
import { getAllAreaSlugs, getAreaBySlug, getBusinessPhone } from "@/lib/areaContent.server";

const SERVICE_SLUGS = ["house-cleaning", "lawn-mowing"] as const;

function canonicalPath(lang: Lang, ...segments: string[]): string {
  const base = lang === "es" ? "/us/es" : "/us";
  return `${base}/areas/${segments.join("/")}`;
}

// ── City route ────────────────────────────────────────────────────────────
export async function areaStaticParams(): Promise<{ country: string; areaSlug: string }[]> {
  const slugs = await getAllAreaSlugs();
  return slugs.map((areaSlug) => ({ country: "us", areaSlug }));
}

export async function areaMetadata(areaSlug: string, lang: Lang): Promise<Metadata> {
  const content = await getAreaBySlug(areaSlug);
  if (!content) return {};
  return {
    // absolute: seoTitle already includes "| Grenbee"; skip the layout template.
    title: { absolute: content.seoTitle },
    description: content.seoDescription,
    alternates: { canonical: canonicalPath(lang, content.slug) },
    openGraph: {
      title: content.seoTitle,
      description: content.seoDescription,
      url: canonicalPath(lang, content.slug),
    },
  };
}

export async function AreaPage(areaSlug: string, lang: Lang) {
  const content = await getAreaBySlug(areaSlug);
  if (!content || !content.active) notFound();
  const phone = await getBusinessPhone();
  return <AreaLandingView content={content} copy={AREA_COPY[lang]} lang={lang} phone={phone} />;
}

// ── City + service route ────────────────────────────────────────────────────
export async function serviceStaticParams(): Promise<
  { country: string; areaSlug: string; serviceSlug: string }[]
> {
  const slugs = await getAllAreaSlugs();
  return slugs.flatMap((areaSlug) =>
    SERVICE_SLUGS.map((serviceSlug) => ({ country: "us", areaSlug, serviceSlug })),
  );
}

export async function serviceMetadata(
  areaSlug: string,
  serviceSlug: string,
  lang: Lang,
): Promise<Metadata> {
  const content = await getAreaBySlug(areaSlug);
  const service = content?.serviceBlocks.find((s) => s.serviceId === serviceSlug);
  if (!content || !service) return {};
  const title = `${service.serviceName} in ${content.city}, ${content.state} | Grenbee`;
  const description = service.localDescription.slice(0, 158);
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: canonicalPath(lang, content.slug, serviceSlug) },
    openGraph: { title, description, url: canonicalPath(lang, content.slug, serviceSlug) },
  };
}

export async function ServicePage(areaSlug: string, serviceSlug: string, lang: Lang) {
  const content = await getAreaBySlug(areaSlug);
  if (!content || !content.active) notFound();
  const service = content.serviceBlocks.find((s) => s.serviceId === serviceSlug);
  if (!service) notFound();
  const phone = await getBusinessPhone();
  return (
    <AreaLandingView content={content} copy={AREA_COPY[lang]} lang={lang} phone={phone} service={service} />
  );
}
