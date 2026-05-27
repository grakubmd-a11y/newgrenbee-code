/**
 * AreaLandingPage.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamic SEO landing page for each city/area Greenbee serves.
 * Route: /areas/:areaSlug
 *
 * Structure (mirrors Stellar Window Cleaners approach):
 *   1. Hero — photo + headline + CTAs
 *   2. Trust stats
 *   3. Services grid
 *   4. "The Greenbee Difference"
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
import { useParams, Link } from "react-router-dom";
import * as Icons from "lucide-react";
import PageShell from "./shared/PageShell";
import { fetchAreaContent } from "../shared/services/firebaseService";
import { AreaContent } from "../shared/types";

// ─── Placeholder photo component ─────────────────────────────────────────────
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
      <span className="text-xs font-medium">Photo — add from Admin → Media</span>
      {children}
    </div>
  );
}

// ─── Static fallback content (shown when no Firestore doc exists yet) ─────────
function buildFallback(city: string, state: string): AreaContent {
  return {
    id: city.toLowerCase().replace(/\s+/g, "-"),
    slug: city.toLowerCase().replace(/\s+/g, "-"),
    city,
    state,
    active: true,
    heroHeadline: `Professional Home Services in ${city}, ${state}`,
    heroSubtitle: `Greenbee brings professional lawn care, cleaning, and home maintenance to ${city}. Reliable technicians. Transparent pricing. Satisfaction guaranteed.`,
    introParagraph: `Looking for dependable home services in ${city}? Greenbee connects you with vetted, insured technicians ready to handle lawn mowing, house cleaning, pressure washing, and more. We serve homeowners across ${city} and surrounding neighborhoods.`,
    serviceBlocks: [
      { serviceId: "lawn-mowing",        serviceName: "Lawn Mowing",        localDescription: `Keep your ${city} lawn looking its best with regular professional mowing, edging, and blowoff.` },
      { serviceId: "house-cleaning",     serviceName: "House Cleaning",     localDescription: `From standard maintenance cleans to deep structural cleans, our team keeps ${city} homes spotless.` },
      { serviceId: "pressure-washing",   serviceName: "Pressure Washing",   localDescription: `Remove dirt, mold, and grime from driveways, patios, and exteriors with professional pressure washing.` },
      { serviceId: "tv-installation",    serviceName: "TV Installation",    localDescription: `Professional TV wall mounting and installation for ${city} homeowners. Any wall type, any size.` },
    ],
    testimonials: [
      { name: "Maria G.", location: `${city}`, text: "Greenbee has been amazing — always on time and the lawn looks perfect every week.", rating: 5 },
      { name: "Jason T.", location: `${city}`, text: "Booked a deep clean and was blown away. Very professional team.", rating: 5 },
      { name: "Sandra L.", location: `${city}`, text: "Love how easy it is to book online. The technicians are courteous and thorough.", rating: 5 },
    ],
    neighborhoods: [],
    faqs: [
      { question: `Do you serve all of ${city}?`, answer: `Yes — we serve ${city} and the surrounding area. Enter your ZIP code during booking to confirm coverage.` },
      { question: "How do I get a quote?", answer: "Use our online estimator to get an instant price estimate. No phone call needed." },
      { question: "Are your technicians insured?", answer: "Yes. All Greenbee technicians are vetted, background-checked, and fully insured." },
      { question: "Can I book a recurring service?", answer: "Yes — you can book a one-time visit or choose a recurring schedule. Check our membership plans for the best rates." },
      { question: "What if I'm not satisfied?", answer: "We offer a satisfaction guarantee. If something isn't right, we'll come back and make it right at no extra cost." },
    ],
    seoTitle: `Home Services in ${city}, ${state} | Greenbee`,
    seoDescription: `Professional lawn care, house cleaning & home maintenance in ${city}, ${state}. Vetted technicians, transparent pricing, satisfaction guaranteed. Book online.`,
    updatedAt: "",
  };
}

// ─── Service icon map ─────────────────────────────────────────────────────────
const SERVICE_ICONS: Record<string, React.ComponentType<{ size?: number; className?: string }>> = {
  "lawn-mowing":       Icons.Scissors,
  "house-cleaning":    Icons.Sparkles,
  "pressure-washing":  Icons.Droplets,
  "tv-installation":   Icons.Tv,
  "furniture-assembly": Icons.Package,
  "wall-mounting":     Icons.Frame,
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function AreaLandingPage() {
  const { areaSlug } = useParams<{ areaSlug: string }>();
  const [content, setContent] = useState<AreaContent | null>(null);
  const [loading, setLoading]  = useState(true);

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
  const city  = content?.city  ?? (areaSlug ?? "").replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  const state = content?.state ?? "FL";
  const c     = content ?? buildFallback(city, state);

  if (content && !content.active) {
    return (
      <PageShell seo={{ title: "Area Not Found | Greenbee", description: "" }}>
        <div className="max-w-lg mx-auto py-24 text-center space-y-4">
          <Icons.MapPin size={40} className="text-gray-300 mx-auto" />
          <h1 className="text-2xl font-black text-gray-800">Area not available</h1>
          <p className="text-gray-500">We don't currently serve this area, but we're expanding soon.</p>
          <Link to="/areas" className="text-brand font-bold hover:underline">← View all service areas</Link>
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
              <Link to="/" className="hover:text-white">Home</Link>
              <Icons.ChevronRight size={12} />
              <Link to="/areas" className="hover:text-white">Service Areas</Link>
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
              <Link
                to="/#booking"
                className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors"
              >
                <Icons.CalendarCheck size={16} />
                Book a Service
              </Link>
              <a
                href="tel:+1"
                className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/25 transition-colors"
              >
                <Icons.Phone size={16} />
                Call Us
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── 2. TRUST STATS ───────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 py-8 grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
          {[
            { icon: Icons.Users,      stat: "5,000+",  label: "Happy Customers" },
            { icon: Icons.Star,       stat: "500+",    label: "5-Star Reviews" },
            { icon: Icons.ShieldCheck,stat: "100%",    label: "Insured & Vetted" },
            { icon: Icons.Clock,      stat: "Same Day",label: "Available" },
          ].map(({ icon: Icon, stat, label }) => (
            <div key={label} className="space-y-1">
              <Icon size={22} className="text-brand mx-auto" />
              <p className="text-xl font-black text-gray-900">{stat}</p>
              <p className="text-xs text-gray-500">{label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── 3. SERVICES GRID ─────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-[#f0faf4]">
        <div className="max-w-5xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-gray-900">
              Services in {c.city}
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
                  {/* Photo slot */}
                  <PhotoSlot
                    url={svc.photoUrl}
                    alt={`${svc.serviceName} in ${c.city}`}
                    className="h-44"
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
                    <Link
                      to="/#booking"
                      className="inline-flex items-center gap-1 text-xs font-bold text-brand hover:underline mt-1"
                    >
                      Book now <Icons.ArrowRight size={12} />
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
            <span className="text-xs font-black uppercase tracking-widest text-brand">Our Promise</span>
            <h2 className="text-2xl font-black text-gray-900 mt-1">The Greenbee Difference</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: Icons.BadgeCheck,   title: "Spotless Results",          desc: "We don't leave until the job meets our quality standard." },
              { icon: Icons.UserCheck,    title: "Vetted Technicians",        desc: "Every pro is background-checked, trained, and insured." },
              { icon: Icons.ShieldCheck,  title: "Fully Insured",             desc: "All work is covered. Zero risk for you." },
              { icon: Icons.Clock,        title: "On Time & Reliable",        desc: "We show up when we say we will. Every time." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="text-center space-y-2 p-4">
                <div className="mx-auto w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <Icon size={22} className="text-brand" />
                </div>
                <h3 className="font-black text-sm text-gray-900">{title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PLANS CTA ─────────────────────────────────────────────────── */}
      <section className="bg-[#0a2e1e] py-12 px-4">
        <div className="max-w-3xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-xl font-black text-white">Save with a membership plan</h2>
            <p className="text-white/50 text-sm">
              Regular service? Our lawn care membership plans start at just $59/mo for small yards.
            </p>
          </div>
          <Link
            to="/plans"
            className="shrink-0 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors whitespace-nowrap"
          >
            View Plans →
          </Link>
        </div>
      </section>

      {/* ── 6. TESTIMONIALS ──────────────────────────────────────────────── */}
      {c.testimonials.length > 0 && (
        <section className="py-14 px-4 bg-white">
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center space-y-1">
              <h2 className="text-2xl font-black text-gray-900">
                What {c.city} homeowners say
              </h2>
              <p className="text-sm text-gray-400">500+ five-star reviews and counting</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {c.testimonials.map((t, i) => (
                <div
                  key={i}
                  className="bg-[#f0faf4] rounded-2xl p-5 space-y-3 border border-brand/10"
                >
                  <div className="flex">
                    {Array.from({ length: t.rating }).map((_, j) => (
                      <Icons.Star key={j} size={14} className="text-yellow-400 fill-yellow-400" />
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 leading-relaxed italic">"{t.text}"</p>
                  <div>
                    <p className="text-xs font-bold text-gray-900">{t.name}</p>
                    <p className="text-[11px] text-gray-400">{t.location}</p>
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
              Neighborhoods we serve in {c.city}
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
              Frequently asked questions
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
            Ready for a cleaner home in {c.city}?
          </h2>
          <p className="text-white/50 text-sm">
            Book in 60 seconds. Transparent pricing. No surprises.
          </p>
          <Link
            to="/#booking"
            className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors"
          >
            <Icons.CalendarCheck size={16} />
            Book a Service in {c.city}
          </Link>
        </div>
      </section>
    </PageShell>
  );
}
