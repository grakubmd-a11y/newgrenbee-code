/**
 * HostsLandingView — server-rendered "Grenbee for Hosts" marketing page.
 *
 * No "use client": no hooks, no react-i18next. Content arrives via the
 * HOSTS_COPY dictionary + phone prop so the page ships in the initial HTML for
 * SEO. FAQ uses native <details> (works without JS). CTAs deep-link the
 * estimator to the turnover service via ?service=vacation-rental-turnover.
 */
import React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import type { HostsCopy, Lang } from "@/lib/hostsCopy";

const VALUE_ICONS = [Icons.CalendarCheck, Icons.Camera, Icons.PackageCheck, Icons.ShieldCheck];

export default function HostsLandingView({
  copy,
  lang,
  phone,
}: {
  copy: HostsCopy;
  lang: Lang;
  phone: string;
}) {
  const langPrefix = lang === "es" ? "/us/es" : "/us";
  const bookHref = `/book?service=vacation-rental-turnover`;
  const telHref = `tel:${phone.replace(/\D/g, "")}`;

  return (
    <>
      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section className="relative bg-[#0a2e1e] text-white px-4 py-16">
        <div className="max-w-4xl mx-auto space-y-5">
          <nav className="text-xs text-white/50 flex items-center gap-1.5">
            <Link href={langPrefix} className="hover:text-white">{copy.breadcrumbHome}</Link>
            <Icons.ChevronRight size={12} />
            <span className="text-white/80">{copy.hero.badge}</span>
          </nav>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest bg-brand/20 text-brand-light border border-brand/30 rounded-full px-3 py-1.5">
            <Icons.KeyRound size={12} /> {copy.hero.badge}
          </span>
          <h1 className="text-3xl sm:text-5xl font-black leading-tight max-w-2xl">{copy.hero.title}</h1>
          <p className="text-white/70 text-base leading-relaxed max-w-xl">{copy.hero.subtitle}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <Link href={bookHref} className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
              <Icons.CalendarCheck size={16} /> {copy.hero.ctaBook}
            </Link>
            <a href={telHref} className="inline-flex items-center gap-2 bg-white/15 backdrop-blur border border-white/25 text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-white/25 transition-colors">
              <Icons.Phone size={16} /> {copy.hero.ctaCall}
            </a>
          </div>
        </div>
      </section>

      {/* ── VALUE PROPS ───────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
          {copy.valueProps.map((prop, idx) => {
            const Icon = VALUE_ICONS[idx] ?? Icons.CheckCircle2;
            return (
              <div key={prop.title} className="space-y-2">
                <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center">
                  <Icon size={22} className="text-brand" />
                </div>
                <h3 className="font-black text-sm text-gray-900">{prop.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{prop.desc}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── HOW IT WORKS ──────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-[#f0faf4]">
        <div className="max-w-4xl mx-auto space-y-10">
          <h2 className="text-2xl font-black text-gray-900 text-center">{copy.howTitle}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {copy.how.map((s) => (
              <div key={s.step} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-2">
                <div className="w-9 h-9 rounded-full bg-brand text-white font-black flex items-center justify-center text-sm">
                  {s.step}
                </div>
                <h3 className="font-black text-gray-900">{s.title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PRICING ───────────────────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-white">
        <div className="max-w-3xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-black text-gray-900">{copy.pricing.title}</h2>
            <p className="text-sm text-gray-500">{copy.pricing.subtitle}</p>
          </div>

          <div className="rounded-2xl border border-gray-200 overflow-hidden">
            <div className="flex items-center justify-between bg-[#0a2e1e] text-white px-6 py-4">
              <span className="font-bold text-sm">{copy.pricing.baseLabel}</span>
              <span className="text-2xl font-black">{copy.pricing.basePrice}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {copy.pricing.rows.map((r) => (
                <div key={r.label} className="flex items-center justify-between px-6 py-3">
                  <span className="text-sm text-gray-700">{r.label}</span>
                  <span className="text-sm font-bold text-gray-900">{r.price}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200 p-6 space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">{copy.pricing.addonsTitle}</h3>
            {copy.pricing.addons.map((a) => (
              <div key={a.label} className="flex items-center justify-between gap-4">
                <span className="text-sm text-gray-700">{a.label}</span>
                <span className="text-sm font-bold text-gray-900 whitespace-nowrap">{a.price}</span>
              </div>
            ))}
          </div>

          <p className="flex items-center gap-2 text-sm text-brand font-semibold justify-center">
            <Icons.Camera size={15} /> {copy.pricing.includedNote}
          </p>

          <div className="text-center">
            <Link href={bookHref} className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
              <Icons.CalendarCheck size={16} /> {copy.hero.ctaBook}
            </Link>
          </div>
        </div>
      </section>

      {/* ── FAQ (native <details>) ────────────────────────────────────────── */}
      <section className="py-14 px-4 bg-gray-50 border-t border-gray-100">
        <div className="max-w-2xl mx-auto space-y-4">
          <h2 className="text-2xl font-black text-gray-900 text-center mb-8">{copy.faqTitle}</h2>
          {copy.faqs.map((faq, i) => (
            <details key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden group">
              <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-sm text-gray-800 list-none">
                {faq.q}
                <Icons.ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
              </summary>
              <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
                {faq.a}
              </div>
            </details>
          ))}
        </div>
      </section>

      {/* ── BOTTOM CTA ────────────────────────────────────────────────────── */}
      <section className="bg-[#0a2e1e] py-14 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-black text-white">{copy.bottomCta.title}</h2>
          <p className="text-white/50 text-sm">{copy.bottomCta.subtitle}</p>
          <Link href={bookHref} className="inline-flex items-center gap-2 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors">
            <Icons.CalendarCheck size={16} /> {copy.bottomCta.button}
          </Link>
        </div>
      </section>
    </>
  );
}
