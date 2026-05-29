"use client";
/**
 * HomePage.tsx  —  /
 * ─────────────────────────────────────────────────────────────────────────────
 * Full marketing landing page modeled after Stellar Window Cleaners.
 *
 * Sections:
 *   1. SiteNavbar (via PageShell / standalone)
 *   2. Hero        — photo + headline + dual CTAs
 *   3. Stats       — 4 trust metrics
 *   4. Services    — cards with photo slots + descriptions
 *   5. Coverage    — Miami-Dade / Broward region cards
 *   6. Grenbee Standard — 4 guarantee pillars
 *   7. Plans preview — 3 tiers → /plans
 *   8. Testimonials
 *   9. CTA Banner
 *  10. Service area directory — neighborhoods by county
 *  11. Estimator  — inline CostEstimator (id="estimate")
 *  12. FAQ
 *  13. Footer (inside PageShell)
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as Icons from "lucide-react";
import { useTranslation } from "react-i18next";
import SiteNavbar from "@/components/layout/SiteNavbar";
import CostEstimator from "@/components/CostEstimator";
import { fetchServicesFromFirestore, fetchReviewsFromFirestore, fetchPageContent } from "@grenbee/firebase/services";
import { SERVICES_DATA } from "@grenbee/config";
import { Service, Review, HomePageContent } from "@grenbee/types";
import { useSiteSettings } from "@grenbee/firebase/contexts";

// ─── PhotoSlot ────────────────────────────────────────────────────────────────
function PhotoSlot({
  url,
  alt = "",
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
        <img src={url} alt={alt} className="w-full h-full object-cover" loading="lazy" />
        {children}
      </div>
    );
  }
  return (
    <div
      className={`relative flex flex-col items-center justify-center border-2 border-dashed border-gray-200 bg-gray-50 text-gray-300 ${className}`}
    >
      <Icons.ImagePlus className="w-8 h-8 mb-1" />
      <span className="text-xs text-center px-2">{placeholderText ?? "Photo — add from Admin → Media"}</span>
      {children}
    </div>
  );
}

// ─── Star rating ──────────────────────────────────────────────────────────────
function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <Icons.Star
          key={n}
          className={`w-4 h-4 ${n <= rating ? "text-yellow-400 fill-yellow-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
    </div>
  );
}

// Utah County city lists for the directory and footer
const UTAH_COUNTY = [
  "Mapleton", "Spanish Fork", "Springville", "Payson", "Salem",
];
const SALT_LAKE = [
  "Salt Lake City", "Draper", "Sandy",
];

// City → slug map (simple kebab-case)
function toSlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ─── SERVICE ICONS mapping ────────────────────────────────────────────────────
const SERVICE_DESCRIPTION_KEYS: Record<string, string> = {
  "lawn-mowing":        "home.serviceDescriptions.lawnMowing",
  "house-cleaning":     "home.serviceDescriptions.houseCleaning",
  "pressure-washing":   "home.serviceDescriptions.pressureWashing",
  "tv-installation":    "home.serviceDescriptions.tvInstallation",
  "furniture-assembly": "home.serviceDescriptions.furnitureAssembly",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const { t, i18n } = useTranslation();
  const { phone } = useSiteSettings();
  const [services, setServices]   = useState<Service[]>(SERVICES_DATA);
  const [reviews,  setReviews]    = useState<Review[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [cms, setCms]             = useState<HomePageContent | null>(null);
  const estimatorRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const faqItems = t("home.faq.items", { returnObjects: true }) as { q: string; a: string }[];
  const standardPillars = t("home.standard.pillars", { returnObjects: true }) as { title: string; desc: string }[];
  const plansItems = t("home.plans.items", { returnObjects: true }) as { name: string; freq: string; price: string; features: string[] }[];
  const defaultTestimonials = t("home.testimonials.defaultItems", { returnObjects: true }) as { name: string; location: string; text: string }[];
  const footerServiceLinks = t("home.footer.serviceLinks", { returnObjects: true }) as string[];
  const statsItems = [
    { value: "500+", label: t("home.stats.happyHomeowners"),  icon: Icons.Home },
    { value: "200+", label: t("home.stats.fiveStarReviews"),  icon: Icons.Star },
    { value: "5+",   label: t("home.stats.serviceTrucks"),    icon: Icons.Truck },
    { value: "10+",  label: t("home.stats.technicians"),      icon: Icons.Users },
  ];
  const standardIcons = [Icons.Sparkles, Icons.ShieldCheck, Icons.Leaf, Icons.Clock];

  // CMS overrides: pick EN or ES value, fall back to i18n default
  const lang = i18n.language?.startsWith("es") ? "es" : "en";
  const heroHeadline = (lang === "es" ? cms?.heroHeadlineEs : cms?.heroHeadlineEn) || t("home.hero.title");
  const heroSubtitle = (lang === "es" ? cms?.heroSubtitleEs : cms?.heroSubtitleEn) || t("home.hero.subtitle");
  const heroCta      = (lang === "es" ? cms?.heroCtaEs      : cms?.heroCtaEn)      || t("home.hero.ctaPrimary");

  useEffect(() => {
    fetchServicesFromFirestore()
      .then((s) => { if (s?.length) setServices(s); })
      .catch(() => {});
    fetchReviewsFromFirestore()
      .then((r) => { if (r?.length) setReviews(r); })
      .catch(() => {});
    fetchPageContent("home")
      .then((d) => { if (d) setCms(d); })
      .catch(() => {});
  }, []);

  function scrollToEstimator() {
    estimatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Top 3 testimonials (prefer 5-star)
  const testimonials = [...reviews]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const photoPlaceholder = t("home.photoSlot.placeholder");

  return (
    <>
      <title>{t("home.pageTitle")}</title>
      <meta
        name="description"
        content={t("home.metaDescription")}
      />
      <link rel="canonical" href="https://grenbee.com/" />

      <div className="min-h-screen flex flex-col bg-white">
        <SiteNavbar />

        {/* ── 1. HERO ───────────────────────────────────────────�����──────────── */}
        <section className="relative w-full overflow-hidden text-white min-h-[500px] flex items-center justify-start pt-24 md:pt-32">
          {/* Background photo - full width */}
          <PhotoSlot
            url={cms?.heroPhotoUrl}
            className="absolute inset-0 w-full h-full"
            placeholderText={photoPlaceholder}
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-black/50" />

          {/* Text content overlay - left side */}
          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 w-full">
            <div className="max-w-2xl">
                {/* Badge */}
                <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
                  <Icons.Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                  {t("home.hero.badge")}
                </div>

                <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-white mb-6">
                  {heroHeadline}
                </h1>

                <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                  {heroSubtitle}
                </p>

                {/* CTAs */}
                <div className="flex flex-col sm:flex-row gap-3 mb-8">
                  <button
                    onClick={scrollToEstimator}
                    className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors shadow-lg cursor-pointer"
                  >
                    {heroCta}
                    <Icons.ArrowRight className="w-4 h-4" />
                  </button>
                  <a
                    href={`tel:${phone.replace(/\D/g, "")}`}
                    className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors border border-white/20"
                  >
                    <Icons.Phone className="w-4 h-4" />
                    {phone}
                  </a>
                </div>

                {/* Trust statement */}
                <p className="text-sm text-gray-400 flex items-center gap-2">
                  <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  {t("home.hero.trustNote")}
                </p>
            </div>
          </div>
        </section>

        {/* ── 2. STATS BAR ─────────────────────────────────────────────────── */}
        <section className="bg-emerald-600 text-white py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {statsItems.map(({ value, label, icon: Icon }) => (
                <div key={label} className="space-y-1">
                  <Icon className="w-6 h-6 mx-auto text-emerald-200 mb-2" />
                  <p className="text-3xl font-black">{value}</p>
                  <p className="text-sm text-emerald-100">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. SERVICES ──────────────────────────────────────────────────── */}
        <section id="services" className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">{t("home.servicesSection.eyebrow")}</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">{t("home.servicesSection.title")}</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                {t("home.servicesSection.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service) => {
                const descKey = SERVICE_DESCRIPTION_KEYS[service.id];
                const desc = descKey ? t(descKey) : (service.description ?? service.tagline ?? "");
                const IconComponent = (Icons as any)[service.iconName] || Icons.HelpCircle;
                return (
                  <div
                    key={service.id}
                    className="group relative flex flex-col overflow-hidden rounded-[2.5rem] border border-slate-100/90 bg-white p-4 pb-6 shadow-[0_10px_45px_rgba(0,0,0,0.012)] transition-all duration-300 hover:border-emerald-500/35 hover:shadow-[0_24px_60px_-15px_rgba(14,173,107,0.15)] hover:-translate-y-2"
                  >
                    {/* Photo */}
                    <div className="relative h-48 w-full overflow-hidden rounded-[2rem] bg-slate-50 shadow-inner">
                      <PhotoSlot className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-1" url={cms?.servicePhotos?.[service.id]} alt={service.name} placeholderText={photoPlaceholder} />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />
                      <div className="absolute top-3.5 left-3.5">
                        <span className="flex items-center gap-1 bg-white/95 backdrop-blur-md text-[9px] font-black text-slate-900 tracking-widest uppercase px-3 py-1.5 rounded-full shadow-sm border border-white/20">
                          <Icons.Sparkles size={11} className="text-emerald-500 animate-pulse" />
                          {t("serviceCard.premiumBadge")}
                        </span>
                      </div>
                      <div className="absolute -bottom-1.5 right-4 z-10 flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-emerald-500 border border-slate-100 shadow-[0_6px_16px_rgba(0,0,0,0.06)] group-hover:bg-emerald-500 group-hover:text-white group-hover:border-emerald-500 transition-all duration-300 transform group-hover:rotate-12">
                        <IconComponent size={22} strokeWidth={2} />
                      </div>
                    </div>

                    {/* Content */}
                    <div className="px-3 pt-5 flex flex-col flex-grow text-left">
                      <h3 className="text-lg font-extrabold text-slate-950 tracking-tight transition-colors duration-300 group-hover:text-emerald-600 leading-tight">
                        {service.name}
                      </h3>
                      <p className="mt-1 text-[10px] text-emerald-600 font-black tracking-wider uppercase">
                        {service.tagline}
                      </p>
                      <p className="mt-3 text-xs leading-relaxed text-slate-500 font-semibold line-clamp-2">
                        {desc}
                      </p>

                      {/* Price & CTA */}
                      <div className="mt-5 pt-3 flex items-center justify-between gap-3">
                        <div className="text-left">
                          <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block leading-none">{t("serviceCard.basePrice")}</span>
                          <span className="text-lg font-black text-slate-950 tracking-tight leading-none">
                            ${service.basePrice} <span className="text-[9px] text-slate-400 font-bold">{t("serviceCard.currency")}</span>
                          </span>
                        </div>
                        <button
                          onClick={scrollToEstimator}
                          className="flex-grow cursor-pointer flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-emerald-600 text-white py-3 px-4 text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_-4px_rgba(14,173,107,0.25)] group-hover:bg-emerald-600 active:scale-[0.97]"
                        >
                          <span>{t("home.servicesSection.getQuote")}</span>
                          <Icons.ChevronRight size={13} strokeWidth={2.5} className="transition-transform duration-300 group-hover:translate-x-0.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 4. COVERAGE REGIONS ──────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">{t("home.coverage.eyebrow")}</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">{t("home.coverage.title")}</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                {t("home.coverage.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Utah County */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <PhotoSlot className="h-52 w-full" url={cms?.coverageArea1PhotoUrl} alt="Utah County" placeholderText={photoPlaceholder} />
                <div className="p-6">
                  <h3 className="text-xl font-black text-gray-950 mb-1">{t("home.coverage.miamidade.title")}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t("home.coverage.miamidade.description")}
                  </p>
                  <Link href="/areas"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {t("home.coverage.miamidade.link")} <Icons.ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Salt Lake County — coming soon */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <PhotoSlot className="h-52 w-full" url={cms?.coverageArea2PhotoUrl} alt="Salt Lake County" placeholderText={photoPlaceholder} />
                <div className="p-6">
                  <h3 className="text-xl font-black text-gray-950 mb-1">{t("home.coverage.broward.title")}</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    {t("home.coverage.broward.description")}
                  </p>
                  <Link href="/areas"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    {t("home.coverage.broward.link")} <Icons.ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 5. THE GREENBEE STANDARD ─────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">{t("home.standard.eyebrow")}</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">{t("home.standard.title")}</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                {t("home.standard.subtitle")}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {standardPillars.map((pillar, idx) => {
                const Icon = standardIcons[idx];
                return (
                  <div key={pillar.title} className="text-center p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                    <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="font-bold text-gray-950 mb-2">{pillar.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{pillar.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ── 6. PLANS PREVIEW ─────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-950 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">{t("home.plans.eyebrow")}</p>
              <h2 className="text-3xl md:text-4xl font-black mb-4">{t("home.plans.title")}</h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                {t("home.plans.subtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {plansItems.map((plan, idx) => {
                const highlight = idx === 1;
                return (
                  <div
                    key={plan.name}
                    className={`rounded-2xl p-6 border ${
                      highlight
                        ? "border-emerald-500 bg-emerald-600 shadow-lg shadow-emerald-900/40"
                        : "border-gray-700 bg-gray-800"
                    }`}
                  >
                    {highlight && (
                      <div className="inline-flex items-center gap-1 bg-white text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                        <Icons.Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                        {t("home.plans.mostPopular")}
                      </div>
                    )}
                    <h3 className="text-xl font-black text-white mb-0.5">{plan.name}</h3>
                    <p className="text-sm text-gray-300 mb-3">{plan.freq}</p>
                    <p className="text-2xl font-black text-white mb-4">
                      {plan.price}
                      <span className="text-sm font-normal text-gray-300"> {t("home.plans.perMonth")}</span>
                    </p>
                    <ul className="space-y-2 mb-6">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-sm text-gray-200">
                          <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link href="/plans"
                      className={`block text-center text-sm font-bold py-2.5 rounded-xl transition-colors ${
                        highlight
                          ? "bg-white text-emerald-700 hover:bg-gray-100"
                          : "bg-gray-700 text-white hover:bg-gray-600"
                      }`}
                    >
                      {t("home.plans.viewPlans")}
                    </Link>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
              <Link href="/plans"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-sm transition-colors"
              >
                {t("home.plans.viewAll")}
                <Icons.ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 7. TESTIMONIALS ──────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">{t("home.testimonials.eyebrow")}</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">{t("home.testimonials.title")}</h2>
            </div>

            {testimonials.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((r) => (
                  <div key={r.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <Stars rating={r.rating} />
                    <p className="text-gray-700 text-sm leading-relaxed mt-3 mb-4">"{r.comment}"</p>
                    <p className="text-sm font-bold text-gray-900">{r.authorName}</p>
                    <p className="text-xs text-gray-400">{t("home.testimonials.verifiedCustomer")}</p>
                  </div>
                ))}
              </div>
            ) : (
              /* Default testimonials when no Firestore data yet */
              <div className="grid md:grid-cols-3 gap-6">
                {defaultTestimonials.map((testimonial) => (
                  <div key={testimonial.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <Stars rating={5} />
                    <p className="text-gray-700 text-sm leading-relaxed mt-3 mb-4">"{testimonial.text}"</p>
                    <p className="text-sm font-bold text-gray-900">{testimonial.name}</p>
                    <p className="text-xs text-gray-400">{testimonial.location}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 8. CTA BANNER ────────────────────────────────────────────────── */}
        <section className="relative py-20 bg-emerald-600 text-white overflow-hidden">
          <PhotoSlot url={cms?.ctaBannerPhotoUrl} className="absolute inset-0 w-full h-full opacity-20" placeholderText={photoPlaceholder} />
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              {t("home.ctaBanner.title")}
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
              {t("home.ctaBanner.subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToEstimator}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-gray-100 font-bold px-8 py-3.5 rounded-xl text-base transition-colors shadow-md cursor-pointer"
              >
                {t("home.ctaBanner.cta")}
                <Icons.ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 text-emerald-100 text-sm font-semibold">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Icons.Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                {t("home.ctaBanner.reviewsBadge")}
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. SERVICE AREA DIRECTORY ─────────────────────────────────────── */}
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-black text-gray-950 mb-8">
              {t("home.directory.title")}
            </h2>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Utah County */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">
                  {t("home.directory.miamidadeTitle")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {UTAH_COUNTY.map((city) => (
                    <Link
                      key={city}
                      href={`/areas/${toSlug(city)}`}
                      className="text-sm text-gray-600 hover:text-emerald-600 hover:underline transition-colors"
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Salt Lake County — coming soon */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">
                  {t("home.directory.browardTitle")}
                </h3>
                <div className="flex flex-wrap gap-2">
                  {SALT_LAKE.map((city) => (
                    <span key={city} className="text-sm text-gray-400 cursor-default">
                      {city}
                    </span>
                  ))}
                  <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-2 py-0.5 rounded-full font-semibold">
                    Coming soon
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link href="/areas"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <Icons.MapPin className="w-4 h-4" />
                {t("home.directory.viewFullMap")}
              </Link>
            </div>
          </div>
        </section>

        {/* ── 10. INLINE ESTIMATOR ─────────────────────────────────────────── */}
        <section
          id="estimate"
          ref={estimatorRef}
          className="py-20 md:py-28 bg-gray-50 border-t border-gray-100"
        >
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">{t("home.estimator.eyebrow")}</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">
                {t("home.estimator.title")}
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                {t("home.estimator.subtitle")}
              </p>
            </div>

            <CostEstimator
              services={services}
              onProceedToBook={(params) => {
                // Store params in sessionStorage and navigate to the app booking flow
                sessionStorage.setItem("gbee_wizard_params", JSON.stringify(params));
                router.push("/book");
              }}
            />
          </div>
        </section>

        {/* ── 11. FAQ ─────────────────────��────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">{t("home.faq.eyebrow")}</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">{t("home.faq.title")}</h2>
            </div>

            <div className="space-y-3">
              {faqItems.map((item, i) => (
                <div key={i} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <button
                    onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 text-sm pr-4">{item.q}</span>
                    <Icons.ChevronDown
                      className={`w-5 h-5 text-gray-400 shrink-0 transition-transform ${activeFaq === i ? "rotate-180" : ""}`}
                    />
                  </button>
                  {activeFaq === i && (
                    <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50">
                      <div className="pt-3">{item.a}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            <div className="text-center mt-10">
              <Link href="/faq"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
              >
                {t("home.faq.viewAll")}
                <Icons.ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 12. FOOTER ───────────────────────────────────────────────────── */}
        <footer className="bg-gray-950 text-gray-400 py-14">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1 space-y-3">
              <Link href="/" className="inline-block">
                <span className="text-lg font-extrabold text-white tracking-tight">
                  Green<span className="text-emerald-400">bee</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed">
                {t("home.footer.tagline")}
              </p>
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
              >
                <Icons.Phone className="w-3.5 h-3.5" />
                {phone}
              </a>
              <p className="text-xs text-gray-600">© {new Date().getFullYear()} Grenbee. {t("home.footer.rights")}</p>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{t("home.footer.servicesTitle")}</h4>
              <ul className="space-y-2 text-sm">
                {footerServiceLinks.map((s) => (
                  <li key={s}>
                    <button
                      onClick={scrollToEstimator}
                      className="hover:text-emerald-400 transition-colors cursor-pointer text-left"
                    >
                      {s}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                {t("home.footer.miamidadeTitle")}
              </h4>
              <ul className="space-y-2 text-sm">
                {UTAH_COUNTY.map((c) => (
                  <li key={c}>
                    <Link href={`/areas/${toSlug(c)}`} className="hover:text-emerald-400 transition-colors">
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">{t("home.footer.browardTitle")}</h4>
              <ul className="space-y-2 text-sm">
                {SALT_LAKE.map((c) => (
                  <li key={c} className="text-gray-500">
                    {c} <span className="text-[10px] text-amber-500 font-semibold">soon</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">{t("home.footer.companyTitle")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/plans"   className="hover:text-emerald-400 transition-colors">{t("home.footer.membershipPlans")}</Link></li>
                <li><Link href="/areas"   className="hover:text-emerald-400 transition-colors">{t("home.footer.allServiceAreas")}</Link></li>
                <li><Link href="/faq"     className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                <li><Link href="/contact" className="hover:text-emerald-400 transition-colors">{t("home.footer.contactUs")}</Link></li>
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">{t("home.footer.legalTitle")}</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/terms"          className="hover:text-emerald-400 transition-colors">{t("home.footer.termsOfService")}</Link></li>
                <li><Link href="/privacy"        className="hover:text-emerald-400 transition-colors">{t("home.footer.privacyPolicy")}</Link></li>
                <li><Link href="/cancellation"   className="hover:text-emerald-400 transition-colors">{t("home.footer.cancellationPolicy")}</Link></li>
                <li><Link href="/guarantee"      className="hover:text-emerald-400 transition-colors">{t("home.footer.satisfactionGuarantee")}</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
