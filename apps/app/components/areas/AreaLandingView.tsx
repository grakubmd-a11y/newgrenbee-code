/**
 * AreaLandingView — server-rendered city / city+service landing page.
 *
 * No "use client": no hooks, no react-i18next, no client Firestore. All data
 * arrives as props (content + copy + phone) so the whole page ships in the
 * initial HTML for SEO. The FAQ uses native <details> (works without JS) and
 * CTAs are plain <Link>s.
 *
 * Two modes:
 *   - City page:    pass `content` only → full services grid.
 *   - Service page: also pass `service` → service-focused hero + that block,
 *                   plus links to the city's other services.
 *
 * SEO <title>/<meta> are emitted by the route's generateMetadata, NOT here.
 */
import React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import type { AreaContent, AreaServiceBlock } from "@grenbee/types";
import type { AreaCopy, Lang } from "@/lib/areaCopy";

// ── Photo slot (placeholder when no URL) ─────────────────────────────────────
function PhotoSlot({
  url,
  alt,
  className = "",
  children,
}: {
  url?: string;
  alt?: string;
  className?: string;
  children?: React.ReactNode;
}) {
  if (url) {
    return (
      <div className={`relative overflow-hidden ${className}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={alt ?? ""} className="w-full h-full object-cover" loading="lazy" />
        {children}
      </div>
    );
  }
  return (
    <div className={`relative flex items-center justify-center bg-gray-100 border-2 border-dashed border-gray-200 text-gray-300 ${className}`}>
      <Icons.ImagePlus size={28} strokeWidth={1.5} />
      {children}
    </div>
  );
}

const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "lawn-mowing": Icons.Scissors,
  "house-cleaning": Icons.Sparkles,
  "pressure-washing": Icons.Droplets,
  "tv-installation": Icons.Tv,
  "furniture-assembly": Icons.Package,
  "wall-mounting": Icons.Frame,
};

const DIFFERENCE_ICONS = [Icons.BadgeCheck, Icons.UserCheck, Icons.ShieldCheck, Icons.Clock];
const STAT_ICONS = [Icons.Users, Icons.Star, Icons.ShieldCheck, Icons.Clock];

interface Props {
  content: AreaContent;
  copy: AreaCopy;
  lang: Lang;
  phone: string;
  /** When present, renders the service-focused variant. */
  service?: AreaServiceBlock;
}

export default function AreaLandingView({ content: c, copy, lang, phone, service }: Props) {
  const langPrefix = lang === "es" ? "/us/es" : "/us";
  const bookHref = `${langPrefix}/book`;
  const areasHref = `${langPrefix}/areas`;
  const cityHref = `${areasHref}/${c.slug}`;
  const telHref = `tel:${phone.replace(/\D/g, "")}`;

  const heroHeadline = service
    ? `${service.serviceName} in ${c.city}, ${c.state}`
    : c.heroHeadline;
  const heroSubtitle = service ? service.localDescription : c.heroSubtitle;
  const otherServices = service
    ? c.serviceBlocks.filter((s) => s.serviceId !== service.serviceId)
    : [];

  return (
    <>
      {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
      <section className="relative min-h-[440px] flex items-end">
        <PhotoSlot url={c.heroPhotoUrl} alt={`Home services in ${c.city}`} className="absolute inset-0">
          {c.heroPhotoUrl && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
          )}
        </PhotoSlot>

        <div className={`relative w-full px-4 py-12 ${c.heroPhotoUrl ? "text-white" : "bg-[#0a2e1e] text-white"}`}>
          <div className="max-w-4xl mx-auto space-y-4">
            <nav className="text-xs text-white/60 flex items-center gap-1.5 flex-wrap">
              <Link href={langPrefix} className="hover:text-white">{copy.home}</Link>
              <Icons.ChevronRight size={12} />
              <Link href={areasHref} className="hover:text-white">{copy.serviceAreas}</Link>
              <Icons.ChevronRight size={12} />
              {service ? (
                <>
                  <Link href={cityHref} className="hover:text-white">{c.city}, {c.state}</Link>
                  <Icons.ChevronRight size={12} />
                  <span className="text-white/80">{service.serviceName}</span>
                </>
              ) : (
                <span className="text-white/80">{c.city}, {c.state}</span>
              )}
            </nav>

            <h1 className="text-3xl sm:text-4xl font-black leading-tight max-w-2xl">{heroHeadline}</h1>
            <p className="text-white/70 text-base leading-relaxed max-w-xl">{heroSubtitle}</p>
            <div className="flex flex-wrap gap-3 pt-2">
              <Link href={bookHref} className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
                <Icons.CalendarCheck size={16} />
                {copy.bookService}
              </Link>
              <a href={telHref} className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/25 transition-colors">
                <Icons.Phone size={16} />
                {copy.callUs}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. TRUST STATS ───────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {copy.stats.map((item, idx) => {
            const Icon = STAT_ICONS[idx] ?? Icons.CheckCircle2;
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

      {/* ── 3. SERVICES / FOCUSED SERVICE ────────────────────────────────── */}
      <section className="py-14 px-4 bg-[#f0faf4]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-gray-900">
              {service ? `${service.serviceName} in ${c.city}` : copy.servicesTitle(c.city)}
            </h2>
            <p className="text-gray-500 text-sm max-w-xl mx-auto">{c.introParagraph}</p>
          </div>

          <div className={`grid grid-cols-1 ${service ? "" : "sm:grid-cols-2"} gap-6`}>
            {(service ? [service] : c.serviceBlocks).map((svc) => {
              const ServiceIcon = SERVICE_ICONS[svc.serviceId] ?? Icons.Wrench;
              return (
                <div key={svc.serviceId} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
                  <PhotoSlot url={svc.photoUrl} alt={`${svc.serviceName} in ${c.city}`} className="h-44" />
                  <div className="p-5 flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-brand/10 flex items-center justify-center">
                        <ServiceIcon size={16} className="text-brand" />
                      </div>
                      <h3 className="font-black text-gray-900">{svc.serviceName}</h3>
                    </div>
                    <p className="text-sm text-gray-600 leading-relaxed">{svc.localDescription}</p>
                    <Link href={bookHref} className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline mt-1">
                      {copy.bookNow} <Icons.ArrowRight size={12} />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Links to the city's other services (service mode only) */}
          {service && otherServices.length > 0 && (
            <div className="text-center space-y-3 pt-2">
              <p className="text-xs font-bold uppercase tracking-widest text-gray-400">
                {copy.otherServices} {c.city}
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {otherServices.map((svc) => (
                  <Link
                    key={svc.serviceId}
                    href={`${cityHref}/${svc.serviceId}`}
                    className="bg-white border border-gray-200 rounded-full px-4 py-2 text-xs font-bold text-gray-700 hover:border-brand hover:text-brand transition-colors"
                  >
                    {svc.serviceName}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ── 4. THE GRENBEE DIFFERENCE ────────────────────────────────────── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <span className="text-xs font-black uppercase tracking-widest text-brand">{copy.difference.eyebrow}</span>
            <h2 className="text-2xl font-black text-gray-900 mt-1">{copy.difference.title}</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {copy.difference.pillars.map((pillar, idx) => {
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
            <h2 className="text-xl font-black text-white">{copy.plansCta.title}</h2>
            <p className="text-white/50 text-sm">{copy.plansCta.subtitle}</p>
          </div>
          <Link href={`${langPrefix}/plans`} className="shrink-0 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors whitespace-nowrap">
            {copy.plansCta.button}
          </Link>
        </div>
      </section>

      {/* ── 6. TESTIMONIALS ──────────────────────────────────────────────── */}
      {c.testimonials.length > 0 && (
        <section className="py-14 px-4 bg-white">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-gray-900">{copy.testimonialsTitle(c.city)}</h2>
              <p className="text-sm text-gray-400">{copy.testimonialsSubtitle}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {c.testimonials.map((testimonial, i) => (
                <div key={i} className="bg-[#f0faf4] rounded-2xl p-5 space-y-3 border border-brand/10">
                  <div className="flex">
                    {Array.from({ length: testimonial.rating }).map((_, j) => (
                      <Icons.Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed italic">&ldquo;{testimonial.text}&rdquo;</p>
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

      {/* ── 7. NEIGHBORHOODS (SEO) ───────────────────────────────────────── */}
      {c.neighborhoods.length > 0 && (
        <section className="py-12 px-4 bg-gray-50 border-t border-gray-100">
          <div className="max-w-4xl mx-auto space-y-5">
            <h2 className="text-lg font-black text-gray-900">{copy.neighborhoodsTitle(c.city)}</h2>
            <div className="flex flex-wrap gap-2">
              {c.neighborhoods.map((n) => (
                <span key={n} className="bg-white border border-gray-200 rounded-full px-3 py-1 text-xs text-gray-600 font-medium">
                  {n}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── 8. FAQ (native <details>, no JS) ─────────────────────────────── */}
      {c.faqs.length > 0 && (
        <section className="py-14 px-4 bg-white">
          <div className="max-w-2xl mx-auto space-y-4">
            <h2 className="text-2xl font-black text-gray-900 text-center mb-8">{copy.faqTitle}</h2>
            {c.faqs.map((faq, i) => (
              <details key={i} className="bg-gray-50 border border-gray-100 rounded-xl overflow-hidden group">
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-sm text-gray-800 list-none">
                  {faq.question}
                  <Icons.ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
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
          <h2 className="text-2xl font-black text-white">{copy.bottomCta.title(c.city)}</h2>
          <p className="text-white/50 text-sm">{copy.bottomCta.subtitle}</p>
          <Link href={bookHref} className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
            <Icons.CalendarCheck size={16} />
            {copy.bottomCta.button(c.city)}
          </Link>
        </div>
      </section>
    </>
  );
}
