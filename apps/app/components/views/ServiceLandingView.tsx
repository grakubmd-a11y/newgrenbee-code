"use client";
import React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import { SERVICES_DATA } from "@grenbee/config";
import { useTranslatedService } from "@/hooks/useTranslatedService";
import PageShell from "@/components/layout/PageShell";

// ── Service hero images (same source as ServiceCard) ─────────────────────────
const SERVICE_IMAGES: Record<string, string> = {
  "house-cleaning":          "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=1200&q=80",
  "tv-installation":         "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=1200&q=80",
  "lawn-mowing":             "https://images.unsplash.com/photo-1589923188900-85dae440342b?auto=format&fit=crop&w=1200&q=80",
  "furniture-assembly":      "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=1200&q=80",
  "pressure-washing":        "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=1200&q=80",
  "wall-mounting":           "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1200&q=80",
  "vacation-rental-turnover":"https://images.unsplash.com/photo-1502005229762-fc1b2d812ca5?auto=format&fit=crop&w=1200&q=80",
};

// ── Trust badge ───────────────────────────────────────────────────────────────
function TrustBadge({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
      <span className="text-brand">{icon}</span>
      {label}
    </div>
  );
}

// ── Main view ─────────────────────────────────────────────────────────────────
export default function ServiceLandingView({ serviceId }: { serviceId: string }) {
  const { t }    = useTranslation();
  const params   = useParams();
  const country  = (params?.country as string) ?? "us";
  const base     = `/${country}`;

  const rawService = SERVICES_DATA.find((s) => s.id === serviceId);
  const service    = useTranslatedService(rawService ?? SERVICES_DATA[0]);

  const IconComponent = (Icons as any)[service.iconName] ?? Icons.HelpCircle;
  const heroImage     = SERVICE_IMAGES[serviceId] ?? SERVICE_IMAGES["house-cleaning"];
  const bookHref      = `/book?service=${serviceId}`;

  type HowItWorksStep = { title: string; body: string };
  const steps = t("serviceLanding.howItWorksSteps", { returnObjects: true }) as HowItWorksStep[];

  const STEP_ICONS = [Icons.Calculator, Icons.CalendarCheck, Icons.Sparkles];

  // Related services — same list minus current
  const related = SERVICES_DATA.filter((s) => s.id !== serviceId).slice(0, 3);

  if (!rawService) return null;

  return (
    <PageShell
      seo={{
        title:       `${service.name} | Grenbee`,
        description: service.description,
      }}
    >
      {/* ── Hero ────────────────────────────────────────────────────────── */}
      <section className="relative bg-gray-950 text-white overflow-hidden">
        <img
          src={heroImage}
          alt={service.name}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-gray-950/60 via-gray-950/40 to-gray-950/80" />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 py-20 md:py-28">
          {/* Back link */}
          <Link
            href={`${base}/services`}
            className="inline-flex items-center gap-1.5 text-sm text-white/60 hover:text-white transition-colors mb-8 font-semibold"
          >
            {t("serviceLanding.backToServices")}
          </Link>

          <div className="flex flex-col md:flex-row md:items-center gap-8">
            {/* Icon */}
            <div className="shrink-0 w-20 h-20 rounded-3xl bg-brand/20 border border-brand/30 flex items-center justify-center">
              <IconComponent size={36} className="text-brand" />
            </div>

            {/* Text */}
            <div className="flex-1">
              <p className="text-brand font-black text-xs uppercase tracking-widest mb-2">
                {t("serviceLanding.startingAt")} ${service.basePrice}
                <span className="text-white/40 font-normal"> {t("serviceLanding.perVisit")}</span>
              </p>
              <h1 className="text-4xl md:text-5xl font-black leading-tight mb-3">
                {service.name}
              </h1>
              <p className="text-white/60 text-lg max-w-xl leading-relaxed">
                {service.description}
              </p>
            </div>

            {/* CTA */}
            <div className="shrink-0 flex flex-col items-start md:items-center gap-2">
              <Link
                href={bookHref}
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand/90 text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors shadow-lg shadow-brand/20 whitespace-nowrap"
              >
                {t("serviceLanding.bookNow")}
                <Icons.ArrowRight size={16} />
              </Link>
              <span className="text-[11px] text-white/40 font-medium">
                {t("serviceLanding.bookNowSub")}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ───────────────────────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex flex-wrap gap-6 justify-center md:justify-start">
          <TrustBadge icon={<Icons.ShieldCheck size={16} />} label={t("serviceLanding.trustInsured")} />
          <TrustBadge icon={<Icons.UserCheck size={16} />}   label={t("serviceLanding.trustVetted")} />
          <TrustBadge icon={<Icons.ThumbsUp size={16} />}   label={t("serviceLanding.trustGuarantee")} />
        </div>
      </section>

      <div className="bg-gray-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-20">

          {/* ── What's included ────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-8">
              {t("serviceLanding.includedTitle")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {service.includedSpecs.map((spec, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm"
                >
                  <div className="shrink-0 w-7 h-7 rounded-xl bg-brand/10 flex items-center justify-center">
                    <Icons.Check size={14} className="text-brand" strokeWidth={3} />
                  </div>
                  <span className="text-sm font-semibold text-gray-700 leading-snug pt-0.5">{spec}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── How it works ───────────────────────────────────────────── */}
          <section>
            <h2 className="text-2xl font-black text-gray-900 mb-8">
              {t("serviceLanding.howItWorksTitle")}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {steps.map((step, i) => {
                const StepIcon = STEP_ICONS[i] ?? Icons.CheckCircle2;
                return (
                  <div key={i} className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm space-y-3">
                    <div className="w-10 h-10 rounded-2xl bg-brand/10 flex items-center justify-center">
                      <StepIcon size={20} className="text-brand" />
                    </div>
                    <div className="text-[10px] font-black text-brand uppercase tracking-widest">
                      {String(i + 1).padStart(2, "0")}
                    </div>
                    <h3 className="font-black text-gray-900">{step.title}</h3>
                    <p className="text-sm text-gray-500 leading-relaxed">{step.body}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* ── Book CTA ───────────────────────────────────────────────── */}
          <section className="bg-[#0a2e1e] rounded-3xl px-8 py-12 text-center space-y-4">
            <h2 className="text-2xl font-black text-white">{t("serviceLanding.ctaTitle")}</h2>
            <p className="text-white/50 text-sm">{t("serviceLanding.ctaSub")}</p>
            <Link
              href={bookHref}
              className="inline-flex items-center gap-2 bg-brand hover:bg-brand/90 text-white font-black text-sm px-8 py-4 rounded-2xl transition-colors mt-2"
            >
              {t("serviceLanding.bookNow")}
              <Icons.ArrowRight size={16} />
            </Link>
            <p className="text-white/30 text-xs">{t("serviceLanding.bookNowSub")}</p>
          </section>

          {/* ── Related services ───────────────────────────────────────── */}
          <section>
            <h2 className="text-xl font-black text-gray-900 mb-6">
              {t("serviceLanding.relatedTitle")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {related.map((s) => {
                const RelIcon = (Icons as any)[s.iconName] ?? Icons.HelpCircle;
                return (
                  <Link
                    key={s.id}
                    href={`${base}/services/${s.id}`}
                    className="flex items-center gap-3 bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm hover:border-brand/40 hover:shadow-md transition-all group"
                  >
                    <div className="w-9 h-9 rounded-xl bg-brand/10 group-hover:bg-brand/20 flex items-center justify-center transition-colors shrink-0">
                      <RelIcon size={18} className="text-brand" />
                    </div>
                    <div>
                      <span className="block text-sm font-bold text-gray-900">{s.name}</span>
                      <span className="block text-xs text-gray-400">{t("serviceLanding.startingAt")} ${s.basePrice}</span>
                    </div>
                    <Icons.ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-brand transition-colors" />
                  </Link>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </PageShell>
  );
}
