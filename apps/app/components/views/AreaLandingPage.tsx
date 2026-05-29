"use client";
/**
 * AreaLandingPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic SEO landing page for each city/area Grenbee serves.
 * Route: /areas/:areaSlug
 *
 * Structure (mirrors Stellar Window Cleaners approach):
 *   1. Hero — photo + headline + CTAs
 *   2. Trust stats
 *   3. Services grid
 *   4. "The Grenbee Difference"
 *   5. Service plans (links to /plans)
 *   6. Testimonials
 *   7. Neighborhoods served (SEO internal links)
 *   8. FAQ
 *   9. Bottom CTA
 *
 * All content is editable from the Admin → Áreas tab.
 * Photos come from the Admin → Media library.
 */

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import * as Icons from "lucide-react";
import { useTranslation } from "react-i18next";
import PageShell from "../layout/PageShell";
import { useSiteSettings } from "@grenbee/firebase/contexts";
import { fetchAreaContent } from "@grenbee/firebase/services";
import { AreaContent } from "@grenbee/types";

// ─── Placeholder photo component ─────────────────────────────────────────────
function PhotoSlot({
  url,
  alt,
  className = "",
  children,
  placeholderText,
}: {
  url?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
  placeholderText?: string;
}) {
  if (url) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        <img src={url} alt={alt ?? ""} className="w-full h-full object-cover" loading="lazy" />
        {children}
      </div>
    );
  }
  return (
    <div
      className={`relative flex flex-col items-center justify-center gap-2 bg-gray-100 border-2 border-dashed border-gray-200 text-gray-400 ${className}`}
    >
      <Icons.ImagePlus size={28} strokeWidth={1.5} />
      <span className="text-xs font-medium">{placeholderText}</span>
      {children}
    </div>
  );
}

// ─── Service icon map ─────────────────────────────────────────────────────────
const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "lawn-mowing":        Icons.Scissors,
  "house-cleaning":     Icons.Sparkles,
  "pressure-washing":   Icons.Droplets,
  "tv-installation":    Icons.Tv,
  "furniture-assembly": Icons.Package,
  "wall-mounting":      Icons.Frame,
};

const DIFFERENCE_ICONS = [Icons.BadgeCheck, Icons.UserCheck, Icons.ShieldCheck, Icons.Clock];

// ─── Main component ───────────────────────────────────────────────────────────
export default function AreaLandingPage() {
  const { t } = useTranslation();
  const { phone } = useSiteSettings();
  const params = useParams();
  const areaSlug = (params?.areaSlug ?? "") as string;
  const [content, setContent] = useState<AreaContent | null>(null);
  const [loading, setLoading]  = useState(true);

  const photoPlaceholder = t("areaPage.photoPlaceholder");

  // Build fallback content using i18n keys (no hardcoded strings)
  function buildFallback(city: string, state: string): AreaContent {
    const interp = { city, state };
    const fbTestimonials = t("areaPage.fallback.testimonials", { returnObjects: true, ...interp }) as { name: string; text: string }[];
    const fbFaqs = t("areaPage.fallback.faqs", { returnObjects: true, ...interp }) as { q: string; a: string }[];

    return {
      id:    city.toLowerCase().replace(/\s+/g, "-"),
      slug:  city.toLowerCase().replace(/\s+/g, "-"),
      city,
      state,
      active: true,
      heroHeadline:   t("areaPage.fallback.heroHeadline",   interp),
      heroSubtitle:   t("areaPage.fallback.heroSubtitle",   interp),
      introParagraph: t("areaPage.fallback.introParagraph", interp),
      serviceBlocks: [
        { serviceId: "lawn-mowing",      serviceName: "Lawn Mowing",        localDescription: t("areaPage.fallback.serviceDescriptions.lawnMowing",      interp) },
        { serviceId: "house-cleaning",   serviceName: "House Cleaning",     localDescription: t("areaPage.fallback.serviceDescriptions.houseCleaning",   interp) },
        { serviceId: "pressure-washing", serviceName: "Pressure Washing",   localDescription: t("areaPage.fallback.serviceDescriptions.pressureWashing", interp) },
        { serviceId: "tv-installation",  serviceName: "TV Installation",    localDescription: t("areaPage.fallback.serviceDescriptions.tvInstallation",  interp) },
      ],
      testimonials: fbTestimonials.map((item) => ({
        name: item.name,
        location: city,
        text: item.text,
        rating: 5,
      })),
      neighborhoods: [],
      faqs: fbFaqs.map((item) => ({ question: item.q, answer: item.a })),
      seoTitle:       t("areaPage.fallback.seoTitle",       interp),
      seoDescription: t("areaPage.fallback.seoDescription", interp),
      updatedAt: "",
    };
  }

  useEffect(() => {
    if (!areaSlug) return;
    fetchAreaContent(areaSlug).then((data) => {
      setContent(data);
      setLoading(false);
    });
  }, [areaSlug]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Icons.Loader2 size={28} className="animate-spin text-brand" />
      </div>
    );
  }

  // Use Firestore content or generate fallback from the slug
  const city  = content?.city  ?? (areaSlug ?? "").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const state = content?.state ?? "FL";
  const c     = content ?? buildFallback(city, state);

  // i18n arrays
  const differencePillars = t("areaPage.difference.pillars", { returnObjects: true }) as { title: string; desc: string }[];
  const stats = t("areaPage.stats", { returnObjects: true }) as { stat: string; label: string }[];

  if (content && !content.active) {
    return (
      <PageShell seo={{ title: t("areaPage.notAvailable.pageTitle"), description: "" }}>
        <div className="max-w-lg mx-auto py-24 text-center space-y-4">
          <Icons.MapPin size={40} className="text-gray-300 mx-auto" />
          <h1 className="text-2xl font-black text-gray-800">{t("areaPage.notAvailable.heading")}</h1>
          <p className="text-gray-500">{t("areaPage.notAvailable.body")}</p>
          <Link href="/areas" className="text-brand font-bold hover:underline">{t("areaPage.notAvailable.backLink")}</Link>
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell
      seo={{
        title: c.seoTitle,
        description: c.seoDescription,
        canonical: `https://grenbee.com/areas/${c.slug}`,
      }}
    >
      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[480px] flex items-end">
        <PhotoSlot
          url={c.heroPhotoUrl}
          alt={`Home services in ${c.city}`}
          className="absolute inset-0"
          placeholderText={photoPlaceholder}
        >
          {/* dark overlay when photo is present */}
          {c.heroPhotoUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          )}
        </PhotoSlot>

        <div
          className={`relative w-full px-4 py-12 ${
            c.heroPhotoUrl ? "text-white" : "bg-[#0a2e1e] text-white"
          }`}
        >
          <div className="max-w-4xl mx-auto space-y-4">
            {/* Breadcrumb */}
            <nav className="text-xs text-white/60 flex items-center gap-1.5">
              <Link href="/" className="hover:text-white">{t("areaPage.home")}</Link>
              <Icons.ChevronRight size={12} />
              <Link href="/areas" className="hover:text-white">{t("areaPage.serviceAreas")}</Link>
              <Icons.ChevronRight size={12} />
              <span className="text-white/80">{c.city}, {c.state}</span>
            </nav>

            <h1 className="text-3xl sm:text-4xl font-black leading-tight max-w-2xl">
              {c.heroHeadline}
            </h1>
            <p className="text-white/70 text-base leading-relaxed max-w-xl">
              {c.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href="/#estimate"
                className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors"
              >
                <Icons.CalendarCheck size={16} />
                {t("areaPage.bookService")}
              </Link>
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/25 transition-colors"
              >
                <Icons.Phone size={16} />
                {t("areaPage.callUs")}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. TRUST STATS ───────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[Icons.Users, Icons.Star, Icons.ShieldCheck, Icons.Clock].map((Icon, idx) => {
            const item = stats[idx];
            if (!item) return null;
            return (
              <div key={idx} className="space-y-1">
                <Icon size={22} className="text-brand mx-auto" />
                <p className="text-xl font-black text-gray-900">{item.stat}</p>
                <p className="text-xs text-gray-500">{item.label}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── 3. SERVICES GRID ─────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-[#f0faf4]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-gray-900">
              {t("areaPage.servicesTitle", { city: c.city })}
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">
              {c.introParagraph}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {c.serviceBlocks.map((svc) => {
              const ServiceIcon = SERVICE_ICONS[svc.serviceId] ?? Icons.Wrench;
              return (
                <div
                  key={svc.serviceId}
                  className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col"
                >
                  <PhotoSlot
                    url={svc.photoUrl}
                    alt={`${svc.serviceName} in ${c.city}`}
                    className="h-44"
                    placeholderText={photoPlaceholder}
                  />
                  <div className="p-5 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
                        <ServiceIcon size={16} className="text-brand" />
                      </div>
                      <h3 className="font-black text-gray-900">{svc.serviceName}</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">
                      {svc.localDescription}
                    </p>
                    <Link href="/#estimate"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline mt-1"
                    >
                      {t("areaPage.bookNow")} <Icons.ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. THE GREENBEE DIFFERENCE ───────────────────────────────────── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-black uppercase tracking-widest text-brand">{t("areaPage.difference.eyebrow")}</span>
            <h2 className="text-2xl font-black text-gray-900 mt-1">{t("areaPage.difference.title")}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {differencePillars.map((pillar, idx) => {
              const Icon = DIFFERENCE_ICONS[idx] ?? Icons.CheckCircle2;
              return (
                <div key={pillar.title} className="text-center space-y-2 p-4">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                    <Icon size={22} className="text-brand" />
                  </div>
                  <h3 className="font-black text-sm text-gray-900">{pillar.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{pillar.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 5. PLANS CTA ─────────────────────────────────────────────────── */}
      <section className="bg-[#0a2e1e] py-12 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-black text-white">{t("areaPage.plansCta.title")}</h2>
            <p className="text-white/50 text-sm">{t("areaPage.plansCta.subtitle")}</p>
          </div>
          <Link href="/plans"
            className="shrink-0 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors whitespace-nowrap"
          >
            {t("areaPage.plansCta.button")}
          </Link>
        </div>
      </section>

      {/* ── 6. TESTIMONIALS ──────────────────────────────────────────────── */}
      {c.testimonials.length > 0 && (
        <section className="py-14 px-4 bg-white">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-gray-900">
                {t("areaPage.testimonialsTitle", { city: c.city })}
              </h2>
              <p className="text-sm text-gray-400">{t("areaPage.testimonialsSubtitle")}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {c.testimonials.map((testimonial, i) => (
                <div
                  key={i}
                  className="bg-[#f0faf4] rounded-2xl p-5 space-y-3 border border-brand/10"
                >
                  <div className="flex">
                    {Array.from({ length: testimonial.rating }).map((_, j) => (
                      <Icons.Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed italic">"{testimonial.text}"</p>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-[11px] text-gray-400">{testimonial.location}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 7. NEIGHBORHOODS SERVED (SEO) ────────────────────────────────── */}
      {c.neighborhoods.length > 0 && (
        <section className="py-12 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto space-y-5">
            <h2 className="text-lg font-black text-gray-900">
              {t("areaPage.neighborhoodsTitle", { city: c.city })}
            </h2>
            <div className="flex flex-wrap gap-2">
              {c.neighborhoods.map((n) => (
                <span
                  key={n}
                  className="bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600 font-medium"
                >
                  {n}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 8. FAQ ───────────────────────────────────────────────────────── */}
      {c.faqs.length > 0 && (
        <section className="py-14 px-4 bg-white">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black text-gray-900 text-center mb-8">
              {t("areaPage.faqTitle")}
            </h2>
            {c.faqs.map((faq, i) => (
              <details
                key={i}
                className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden group"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-sm text-gray-800 list-none">
                  {faq.question}
                  <Icons.ChevronDown
                    size={16}
                    className="text-gray-400 group-open:rotate-180 transition-transform shrink-0"
                  />
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                  {faq.answer}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* ── 9. BOTTOM CTA ────────────────────────────────────────────────── */}
      <section className="bg-[#0a2e1e] py-14 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-black text-white">
            {t("areaPage.bottomCta.title", { city: c.city })}
          </h2>
          <p className="text-white/50 text-sm">
            {t("areaPage.bottomCta.subtitle")}
          </p>
          <Link href="/#estimate"
            className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors"
          >
            <Icons.CalendarCheck size={16} />
            {t("areaPage.bottomCta.button", { city: c.city })}
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
