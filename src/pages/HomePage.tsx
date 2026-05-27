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
 *   6. Greenbee Standard — 4 guarantee pillars
 *   7. Plans preview — 3 tiers → /plans
 *   8. Testimonials
 *   9. CTA Banner
 *  10. Service area directory — neighborhoods by county
 *  11. Estimator  — inline CostEstimator (id="estimate")
 *  12. FAQ
 *  13. Footer (inside PageShell)
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as Icons from "lucide-react";
import SiteNavbar from "../public/components/SiteNavbar";
import CostEstimator from "../public/components/CostEstimator";
import { fetchServicesFromFirestore, fetchReviewsFromFirestore } from "../shared/services/firebaseService";
import { SERVICES_DATA } from "../shared/data";
import { Service, Review } from "../shared/types";

// ─── PhotoSlot ────────────────────────────────────────────────────────────────
function PhotoSlot({
  url,
  alt = "",
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
      <span className="text-xs text-center px-2">Photo — add from Admin → Media</span>
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

// ─── FAQ accordion ────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  {
    q: "What areas do you serve?",
    a: "We serve Miami-Dade and Broward County, including Miami, Miami Beach, Coral Gables, Brickell, Doral, Fort Lauderdale, Pembroke Pines, and more. Check our Areas page for the full list.",
  },
  {
    q: "How quickly can I get an appointment?",
    a: "Most customers can book same-week. Use our instant quote tool above to see available time slots for your zip code.",
  },
  {
    q: "Do I need to be home during the service?",
    a: "No. You can provide lockbox access or entry instructions in the booking notes. We'll send you real-time status updates and before/after photos.",
  },
  {
    q: "Are your technicians insured?",
    a: "Yes. All Greenbee technicians are background-checked, licensed, and fully insured. Your home is protected.",
  },
  {
    q: "What's your satisfaction guarantee?",
    a: "If you're not 100% satisfied, we'll return and re-do the work at no extra charge — or refund you. No questions asked.",
  },
  {
    q: "How do recurring plans work?",
    a: "Choose weekly, bi-weekly, or monthly frequency when booking. You'll get a discount on every visit and can pause, reschedule, or cancel any time — no lock-in contracts.",
  },
];

// Miami-Dade and Broward city lists for the directory
const MIAMI_DADE = [
  "Miami", "Miami Beach", "Coral Gables", "Brickell", "Coconut Grove",
  "Doral", "Hialeah", "Kendall", "Homestead", "Aventura", "Bal Harbour",
  "Key Biscayne", "Little Havana", "Wynwood", "Edgewater",
];
const BROWARD = [
  "Fort Lauderdale", "Pembroke Pines", "Hollywood", "Miramar",
  "Weston", "Davie", "Sunrise", "Plantation", "Deerfield Beach",
  "Pompano Beach", "Hallandale Beach", "Coral Springs",
];

// City → slug map (simple kebab-case)
function toSlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

// ─── SERVICE ICONS mapping ────────────────────────────────────────────────────
const SERVICE_DESCRIPTIONS: Record<string, string> = {
  "lawn-mowing":          "Precision lawn cuts, edging, and cleanup to keep your yard looking its best all season.",
  "house-cleaning":       "Professional deep cleaning using eco-friendly products for a spotless, fresh home.",
  "pressure-washing":     "High-pressure washing for driveways, patios, and exterior surfaces — like new again.",
  "tv-installation":      "Safe, level TV mounting with cable management on any wall type.",
  "furniture-assembly":   "Fast, accurate assembly of any flat-pack furniture — we handle the instructions.",
};

// ─── Main component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const [services, setServices]   = useState<Service[]>(SERVICES_DATA);
  const [reviews,  setReviews]    = useState<Review[]>([]);
  const [activeFaq, setActiveFaq] = useState<number | null>(null);
  const [wizardParams, setWizardParams] = useState<any>(null);
  const estimatorRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchServicesFromFirestore()
      .then((s) => { if (s?.length) setServices(s); })
      .catch(() => {});
    fetchReviewsFromFirestore()
      .then((r) => { if (r?.length) setReviews(r); })
      .catch(() => {});
  }, []);

  function scrollToEstimator() {
    estimatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // Top 3 testimonials (prefer 5-star)
  const testimonials = [...reviews]
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  return (
    <>
      <title>Greenbee — Professional Lawn Care &amp; Home Cleaning in Miami, FL</title>
      <meta
        name="description"
        content="Book professional lawn care and house cleaning in Miami, Fort Lauderdale, and South Florida. Instant online quotes, same-week availability, eco-friendly products."
      />
      <link rel="canonical" href="https://grenbee.com/" />

      <div className="min-h-screen flex flex-col bg-white">
        <SiteNavbar />

        {/* ── 1. HERO ──────────────────────────────────────────────────────── */}
        <section className="relative w-full overflow-hidden bg-gray-950 text-white min-h-[580px] flex items-center">
          {/* Background photo slot */}
          <PhotoSlot
            className="absolute inset-0 w-full h-full"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-gray-950/70" />

          <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-24 md:py-36 w-full">
            <div className="max-w-2xl">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full px-4 py-1.5 text-sm font-semibold mb-6">
                <Icons.Star className="w-4 h-4 fill-emerald-400 text-emerald-400" />
                200+ Five-Star Reviews in South Florida
              </div>

              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black leading-tight text-white mb-6">
                Professional Lawn Care &amp;{" "}
                <span className="text-emerald-400">Home Cleaning</span>{" "}
                in Miami, FL
              </h1>

              <p className="text-lg md:text-xl text-gray-300 mb-8 leading-relaxed">
                Greenbee delivers reliable, eco-friendly home services across Miami-Dade and Broward.
                Book online in minutes — same-week availability guaranteed.
              </p>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-8">
                <button
                  onClick={scrollToEstimator}
                  className="inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors shadow-lg cursor-pointer"
                >
                  Get a Free Quote
                  <Icons.ArrowRight className="w-4 h-4" />
                </button>
                <a
                  href="tel:+13055550000"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-7 py-3.5 rounded-xl text-base transition-colors border border-white/20"
                >
                  <Icons.Phone className="w-4 h-4" />
                  (305) 555-0000
                </a>
              </div>

              {/* Trust statement */}
              <p className="text-sm text-gray-400 flex items-center gap-2">
                <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                Talk to a real person — we typically respond within the hour.
              </p>
            </div>
          </div>
        </section>

        {/* ── 2. STATS BAR ─────────────────────────────────────────────────── */}
        <section className="bg-emerald-600 text-white py-10">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              {[
                { value: "500+",  label: "Happy Homeowners Served",   icon: Icons.Home },
                { value: "200+",  label: "Five-Star Google Reviews",  icon: Icons.Star },
                { value: "5+",    label: "Service Trucks on the Road",icon: Icons.Truck },
                { value: "10+",   label: "Professional Technicians",  icon: Icons.Users },
              ].map(({ value, label, icon: Icon }) => (
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
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">What We Do</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">Our Services</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                From weekly lawn maintenance to deep house cleaning — all booked online with instant pricing.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {services.slice(0, 6).map((service) => (
                <div
                  key={service.id}
                  className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow group"
                >
                  <PhotoSlot className="h-48 w-full" alt={service.name} />
                  <div className="p-5">
                    <h3 className="font-bold text-gray-900 text-lg mb-2">{service.name}</h3>
                    <p className="text-gray-500 text-sm leading-relaxed mb-4">
                      {SERVICE_DESCRIPTIONS[service.id] ?? service.description ?? service.tagline}
                    </p>
                    <button
                      onClick={scrollToEstimator}
                      className="text-sm font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1 cursor-pointer"
                    >
                      Get a quote <Icons.ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 4. COVERAGE REGIONS ──────────────────────────────────────────── */}
        <section className="py-20 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">Where We Operate</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">Service Regions</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                We cover two major counties in South Florida and are growing fast.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Miami-Dade */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <PhotoSlot className="h-52 w-full" alt="Miami-Dade County" />
                <div className="p-6">
                  <h3 className="text-xl font-black text-gray-950 mb-1">Miami-Dade County</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Miami, Miami Beach, Coral Gables, Brickell, Coconut Grove, Doral, Hialeah, and more.
                  </p>
                  <Link
                    to="/areas"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    View Miami-Dade areas <Icons.ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>

              {/* Broward */}
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                <PhotoSlot className="h-52 w-full" alt="Broward County" />
                <div className="p-6">
                  <h3 className="text-xl font-black text-gray-950 mb-1">Broward County</h3>
                  <p className="text-sm text-gray-500 mb-4">
                    Fort Lauderdale, Pembroke Pines, Hollywood, Miramar, Weston, Sunrise, and more.
                  </p>
                  <Link
                    to="/areas"
                    className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700"
                  >
                    View Broward areas <Icons.ArrowRight className="w-3.5 h-3.5" />
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
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">Our Promise</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">The Greenbee Standard</h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Every job backed by our four-pillar guarantee.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                {
                  icon: Icons.Sparkles,
                  title: "Spotless Results",
                  desc: "We don't cut corners. Every job is inspected before we consider it done.",
                },
                {
                  icon: Icons.ShieldCheck,
                  title: "Licensed & Insured",
                  desc: "All technicians are background-checked, licensed, and fully insured for your peace of mind.",
                },
                {
                  icon: Icons.Leaf,
                  title: "Eco-Friendly Products",
                  desc: "We use pet-safe, biodegradable cleaning products that are tough on grime, gentle on the planet.",
                },
                {
                  icon: Icons.Clock,
                  title: "On-Time & Reliable",
                  desc: "We show up when we say we will. Real-time status updates keep you informed at every step.",
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center p-6 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-950 mb-2">{title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. PLANS PREVIEW ─────────────────────────────────────────────── */}
        <section className="py-20 bg-gray-950 text-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-400 font-bold text-sm uppercase tracking-widest mb-2">Save More</p>
              <h2 className="text-3xl md:text-4xl font-black mb-4">Lawn Care Membership Plans</h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Join a plan and get consistent, professional care — with pricing locked in and zero hassle.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-6 mb-10">
              {[
                {
                  name: "Basic",
                  freq: "1 visit / month",
                  price: "$59–$179",
                  features: ["Lawn mowing & edging", "Blowing & cleanup", "Email reminders"],
                  highlight: false,
                },
                {
                  name: "Standard",
                  freq: "2 visits / month",
                  price: "$109–$329",
                  features: ["Everything in Basic", "Priority scheduling", "Bi-weekly consistency"],
                  highlight: true,
                },
                {
                  name: "Premium",
                  freq: "4 visits / month",
                  price: "$199–$599",
                  features: ["Everything in Standard", "Weekly cuts", "$100 service credit/mo"],
                  highlight: false,
                },
              ].map((plan) => (
                <div
                  key={plan.name}
                  className={`rounded-2xl p-6 border ${
                    plan.highlight
                      ? "border-emerald-500 bg-emerald-600 shadow-lg shadow-emerald-900/40"
                      : "border-gray-700 bg-gray-800"
                  }`}
                >
                  {plan.highlight && (
                    <div className="inline-flex items-center gap-1 bg-white text-emerald-700 text-xs font-bold px-2.5 py-1 rounded-full mb-3">
                      <Icons.Star className="w-3 h-3 fill-emerald-500 text-emerald-500" />
                      Most Popular
                    </div>
                  )}
                  <h3 className="text-xl font-black text-white mb-0.5">{plan.name}</h3>
                  <p className="text-sm text-gray-300 mb-3">{plan.freq}</p>
                  <p className="text-2xl font-black text-white mb-4">
                    {plan.price}
                    <span className="text-sm font-normal text-gray-300"> /mo</span>
                  </p>
                  <ul className="space-y-2 mb-6">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-200">
                        <Icons.CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    to="/plans"
                    className={`block text-center text-sm font-bold py-2.5 rounded-xl transition-colors ${
                      plan.highlight
                        ? "bg-white text-emerald-700 hover:bg-gray-100"
                        : "bg-gray-700 text-white hover:bg-gray-600"
                    }`}
                  >
                    View Plans
                  </Link>
                </div>
              ))}
            </div>

            <div className="text-center">
              <Link
                to="/plans"
                className="inline-flex items-center gap-2 text-emerald-400 hover:text-emerald-300 font-bold text-sm transition-colors"
              >
                See all membership details, pricing, and yard size guide
                <Icons.ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* ── 7. TESTIMONIALS ──────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">Reviews</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">What Our Customers Say</h2>
            </div>

            {testimonials.length > 0 ? (
              <div className="grid md:grid-cols-3 gap-6">
                {testimonials.map((r) => (
                  <div key={r.id} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <Stars rating={r.rating} />
                    <p className="text-gray-700 text-sm leading-relaxed mt-3 mb-4">"{r.comment}"</p>
                    <p className="text-sm font-bold text-gray-900">{r.authorName}</p>
                    <p className="text-xs text-gray-400">Verified customer</p>
                  </div>
                ))}
              </div>
            ) : (
              /* Default testimonials when no Firestore data yet */
              <div className="grid md:grid-cols-3 gap-6">
                {[
                  {
                    name: "María G.",
                    location: "Coral Gables, FL",
                    text: "Greenbee has been maintaining our lawn for 6 months. Always on time, always perfect. My neighbors keep asking who does our yard!",
                    rating: 5,
                  },
                  {
                    name: "Carlos R.",
                    location: "Brickell, Miami",
                    text: "Booked a deep clean for my condo online in under 5 minutes. The team was professional and the place looked brand new. Highly recommend.",
                    rating: 5,
                  },
                  {
                    name: "Jennifer M.",
                    location: "Fort Lauderdale, FL",
                    text: "The pressure washing on my driveway was incredible. Looks like new concrete. Great price, great team, easy booking process.",
                    rating: 5,
                  },
                ].map((t) => (
                  <div key={t.name} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
                    <Stars rating={t.rating} />
                    <p className="text-gray-700 text-sm leading-relaxed mt-3 mb-4">"{t.text}"</p>
                    <p className="text-sm font-bold text-gray-900">{t.name}</p>
                    <p className="text-xs text-gray-400">{t.location}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* ── 8. CTA BANNER ────────────────────────────────────────────────── */}
        <section className="relative py-20 bg-emerald-600 text-white overflow-hidden">
          <PhotoSlot className="absolute inset-0 w-full h-full opacity-20" />
          <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 text-center">
            <h2 className="text-3xl md:text-4xl font-black mb-4">
              Make Your Home Look Its Best
            </h2>
            <p className="text-emerald-100 text-lg mb-8 max-w-xl mx-auto">
              Get an instant quote in seconds. No contracts, no hidden fees — just reliable service.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <button
                onClick={scrollToEstimator}
                className="inline-flex items-center gap-2 bg-white text-emerald-700 hover:bg-gray-100 font-bold px-8 py-3.5 rounded-xl text-base transition-colors shadow-md cursor-pointer"
              >
                Get a Free Quote
                <Icons.ArrowRight className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-2 text-emerald-100 text-sm font-semibold">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Icons.Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                200+ Five-Star Reviews
              </div>
            </div>
          </div>
        </section>

        {/* ── 9. SERVICE AREA DIRECTORY ─────────────────────────────────────── */}
        <section className="py-16 bg-white border-t border-gray-100">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <h2 className="text-xl font-black text-gray-950 mb-8">
              Service Areas — South Florida
            </h2>
            <div className="grid md:grid-cols-2 gap-10">
              {/* Miami-Dade */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">
                  Miami-Dade County
                </h3>
                <div className="flex flex-wrap gap-2">
                  {MIAMI_DADE.map((city) => (
                    <Link
                      key={city}
                      to={`/areas/${toSlug(city)}`}
                      className="text-sm text-gray-600 hover:text-emerald-600 hover:underline transition-colors"
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              </div>

              {/* Broward */}
              <div>
                <h3 className="text-sm font-bold uppercase tracking-widest text-emerald-600 mb-4">
                  Broward County
                </h3>
                <div className="flex flex-wrap gap-2">
                  {BROWARD.map((city) => (
                    <Link
                      key={city}
                      to={`/areas/${toSlug(city)}`}
                      className="text-sm text-gray-600 hover:text-emerald-600 hover:underline transition-colors"
                    >
                      {city}
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6">
              <Link
                to="/areas"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                <Icons.MapPin className="w-4 h-4" />
                View full coverage map &amp; area landing pages
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
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">Instant Pricing</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">
                Get Your Free Quote
              </h2>
              <p className="text-gray-500 max-w-xl mx-auto">
                Select your service and options below. Price updates in real time — no email required.
              </p>
            </div>

            <CostEstimator
              services={services}
              activeMembership={null}
              onProceedToBook={(params) => {
                // Store params in sessionStorage and navigate to the app booking flow
                sessionStorage.setItem("gbee_wizard_params", JSON.stringify(params));
                navigate("/book");
              }}
            />
          </div>
        </section>

        {/* ── 11. FAQ ──────────────────────────────────────────────────────── */}
        <section className="py-20 md:py-28 bg-white">
          <div className="max-w-3xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-14">
              <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">Got Questions?</p>
              <h2 className="text-3xl md:text-4xl font-black text-gray-950 mb-4">Frequently Asked Questions</h2>
            </div>

            <div className="space-y-3">
              {FAQ_ITEMS.map((item, i) => (
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
              <Link
                to="/faq"
                className="inline-flex items-center gap-2 text-emerald-600 hover:text-emerald-700 font-bold text-sm transition-colors"
              >
                View all frequently asked questions
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
              <Link to="/" className="inline-block">
                <span className="text-lg font-extrabold text-white tracking-tight">
                  Green<span className="text-emerald-400">bee</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed">
                Professional lawn care and home cleaning services across South Florida.
              </p>
              <a
                href="tel:+13055550000"
                className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
              >
                <Icons.Phone className="w-3.5 h-3.5" />
                (305) 555-0000
              </a>
              <p className="text-xs text-gray-600">© {new Date().getFullYear()} Greenbee. All rights reserved.</p>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Services</h4>
              <ul className="space-y-2 text-sm">
                {[
                  "Lawn Care", "House Cleaning", "Pressure Washing",
                  "TV Installation", "Furniture Assembly",
                ].map((s) => (
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
                Miami-Dade
              </h4>
              <ul className="space-y-2 text-sm">
                {["Miami", "Miami Beach", "Coral Gables", "Brickell", "Doral", "Hialeah"].map((c) => (
                  <li key={c}>
                    <Link to={`/areas/${toSlug(c)}`} className="hover:text-emerald-400 transition-colors">
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">Broward</h4>
              <ul className="space-y-2 text-sm">
                {["Fort Lauderdale", "Hollywood", "Pembroke Pines", "Miramar"].map((c) => (
                  <li key={c}>
                    <Link to={`/areas/${toSlug(c)}`} className="hover:text-emerald-400 transition-colors">
                      {c}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/plans"   className="hover:text-emerald-400 transition-colors">Membership Plans</Link></li>
                <li><Link to="/areas"   className="hover:text-emerald-400 transition-colors">All Service Areas</Link></li>
                <li><Link to="/faq"     className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-400 transition-colors">Contact Us</Link></li>
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms"          className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy"        className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cancellation"   className="hover:text-emerald-400 transition-colors">Cancellation Policy</Link></li>
                <li><Link to="/guarantee"      className="hover:text-emerald-400 transition-colors">Satisfaction Guarantee</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
