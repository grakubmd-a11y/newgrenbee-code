"use client";
import React from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { useTranslation } from "react-i18next";
import { Service } from "@grenbee/types";
import { useTranslatedService } from "@/hooks/useTranslatedService";

/**
 * ServiceCard — two clear modes, no ambiguity:
 *
 * • href mode   (marketing pages): the whole card is a <Link>.
 *   Use on ServicesPage, HomePage, ServiceLandingView "related" section.
 *
 * • select mode (booking flow):    the CTA triggers a callback.
 *   Use inside PublicApp when the user is choosing a service to book.
 */
type ServiceCardProps = {
  service: Service;
  avgRating?: number;
  reviewsCount?: number;
} & (
  | { href: string; onBookClick?: never }
  | { href?: never; onBookClick: (serviceId: string) => void }
);

const DEFAULT_SERVICE_IMAGES: Record<string, string> = {
  "house-cleaning": "https://images.unsplash.com/photo-1581578731548-c64695cc6952?auto=format&fit=crop&w=600&q=80",
  "tv-installation": "https://images.unsplash.com/photo-1593305841991-05c297ba4575?auto=format&fit=crop&w=600&q=80",
  "lawn-mowing": "https://images.unsplash.com/photo-1589923188900-85dae440342b?auto=format&fit=crop&w=600&q=80",
  "furniture-assembly": "https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=600&q=80",
  "pressure-washing": "https://images.unsplash.com/photo-1628177142898-93e36e4e3a50?auto=format&fit=crop&w=600&q=80",
};

const GENERIC_SERVICE_IMAGE = "https://images.unsplash.com/photo-1502005229762-fc1b2d812ca5?auto=format&fit=crop&w=600&q=80";

export default function ServiceCard({ service: rawService, href, onBookClick, avgRating = 4.8, reviewsCount = 0 }: ServiceCardProps) {
  const { t } = useTranslation();
  const service = useTranslatedService(rawService);
  const IconComponent = (Icons as any)[service.iconName] || Icons.HelpCircle;
  const cardImage = DEFAULT_SERVICE_IMAGES[service.id] || GENERIC_SERVICE_IMAGE;
  const isLinkMode = Boolean(href);

  const cardClassName = "group relative flex flex-col overflow-hidden rounded-[2.5rem] bg-white p-4 pb-6 ring-1 ring-slate-900/[0.06] shadow-[0_8px_40px_rgba(0,0,0,0.05)] transition-all duration-300 hover:ring-brand/25 hover:shadow-[0_24px_60px_-12px_rgba(14,173,107,0.18)] hover:-translate-y-2 no-underline";

  const cardContent = (
    <React.Fragment>
      {/* Top accent gradient stripe */}
      <div className="absolute top-0 inset-x-0 h-[3px] bg-gradient-to-r from-brand/60 via-emerald-400/80 to-brand/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

      <div className="absolute inset-0 bg-grid-pattern opacity-0 group-hover:opacity-[0.02] transition-opacity duration-500 pointer-events-none" />

      {/* Photo — slightly wider than the card padding (-mx-1) for a subtle bleed effect */}
      <div className="relative h-48 -mx-1 -mt-1 overflow-hidden rounded-[2rem] bg-slate-50 shadow-inner">
        <img
          src={cardImage}
          alt={service.name}
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-110 group-hover:rotate-1"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-slate-900/10 to-transparent" />

        <div className="absolute top-3.5 left-3.5">
          <span className="flex items-center gap-1 bg-white/95 backdrop-blur-md text-[9px] font-black text-slate-900 tracking-widest uppercase px-3 py-1.5 rounded-full shadow-sm border border-white/20">
            <Icons.Sparkles size={11} className="text-brand animate-pulse" />
            {t("serviceCard.premiumBadge")}
          </span>
        </div>

        <div className="absolute bottom-3.5 left-3.5 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md rounded-full px-2.5 py-1 border border-white/10 shadow-sm">
          <Icons.Star size={11} className="text-amber-400" fill="currentColor" />
          <span className="text-xs font-black text-white">{avgRating.toFixed(1)}</span>
          <span className="text-white/40 text-[9px] font-bold">•</span>
          <span className="text-[10px] font-bold text-white/95">{reviewsCount} {t("serviceCard.reviews")}</span>
        </div>

        <div className="absolute -bottom-1.5 right-4 z-10 flex h-13 w-13 items-center justify-center rounded-2xl bg-white text-brand border border-slate-100 shadow-[0_6px_16px_rgba(0,0,0,0.06)] group-hover:bg-brand group-hover:text-white group-hover:border-brand transition-all duration-300 transform group-hover:rotate-12">
          <IconComponent size={22} strokeWidth={2} />
        </div>
      </div>

      {/* Content */}
      <div className="px-3 pt-5 flex flex-col flex-grow text-left">
        <div>
          <h3 className="text-lg font-extrabold text-slate-950 tracking-tight transition-colors duration-300 group-hover:text-brand font-display leading-tight">
            {service.name}
          </h3>
          <p className="mt-1 text-[10px] text-brand font-black tracking-wider uppercase">
            {service.tagline}
          </p>
        </div>

        <p className="mt-3 text-xs leading-relaxed text-slate-500 font-semibold line-clamp-2">
          {service.description}
        </p>

        {/* Specs grid */}
        <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-50/70 border border-slate-100/80 rounded-2xl p-2.5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white group-hover:bg-brand/5 rounded-xl text-slate-400 group-hover:text-brand border border-slate-100 transition-colors duration-300 shadow-sm">
              <Icons.Clock size={12} strokeWidth={2.5} />
            </div>
            <div className="text-left leading-tight">
              <span className="text-[8px] text-gray-400 uppercase tracking-wider block font-bold leading-none">{t("serviceCard.estimatedMin")}</span>
              <span className="text-xs font-bold text-slate-800">~{service.estimatedMinutesPerUnit}m / {service.unitName}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white group-hover:bg-brand/5 rounded-xl text-slate-400 group-hover:text-brand border border-slate-100 transition-colors duration-300 shadow-sm">
              <Icons.PlusCircle size={12} strokeWidth={2.5} />
            </div>
            <div className="text-left leading-tight">
              <span className="text-[8px] text-gray-400 uppercase tracking-wider block font-bold leading-none">{t("serviceCard.extraUnit")}</span>
              <span className="text-xs font-bold text-slate-800">+${service.pricePerUnit} / {service.unitName}</span>
            </div>
          </div>
        </div>

        {/* Inclusions */}
        <div className="mt-4 space-y-2.5 flex-grow">
          <span className="text-[9px] text-gray-400 font-extrabold uppercase tracking-widest block">{t("serviceCard.includedLabel")}</span>
          <ul className="space-y-2">
            {service.includedSpecs.slice(0, 3).map((spec, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-600 font-semibold leading-tight">
                <div className="h-4.5 w-4.5 bg-brand/5 text-brand rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:bg-brand group-hover:text-white transition-all duration-300">
                  <Icons.Check size={11} strokeWidth={3} />
                </div>
                <span className="line-clamp-1 text-slate-600/90">{spec}</span>
              </li>
            ))}
            {service.includedSpecs.length > 3 && (
              <li className="flex items-center gap-1.5 text-[10px] text-brand font-extrabold pl-0.5 mt-0.5">
                <Icons.Plus size={10} strokeWidth={3} className="flex-shrink-0" />
                <span>{t("serviceCard.moreSpecs", { count: service.includedSpecs.length - 3 })}</span>
              </li>
            )}
          </ul>
        </div>

        {/* Price & CTA */}
        <div className="mt-5.5 pt-2 flex items-center justify-between gap-3">
          <div className="text-left">
            <span className="text-[8px] text-slate-400 font-black uppercase tracking-wider block leading-none">{t("serviceCard.basePrice")}</span>
            <span className="text-lg font-black text-slate-950 tracking-tight leading-none">
              ${service.basePrice} <span className="text-[9px] text-slate-400 font-bold">{t("serviceCard.currency")}</span>
            </span>
          </div>

          {/* In link mode the CTA is a <span> — the parent <Link> handles navigation.
              In select mode it's a <button> with the callback. */}
          {isLinkMode ? (
            <span className="flex-grow flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 group-hover:bg-brand text-white py-3 px-4 text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.06)] group-hover:shadow-[0_8px_20px_-4px_rgba(14,173,107,0.3)]">
              <span>{t("serviceCard.viewService")}</span>
              <Icons.ChevronRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </span>
          ) : (
            <button
              onClick={() => onBookClick!(service.id)}
              className="flex-grow cursor-pointer flex items-center justify-center gap-1.5 rounded-xl bg-slate-950 hover:bg-brand text-white py-3 px-4 text-xs font-black uppercase tracking-widest transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_20px_-4px_rgba(14,173,107,0.25)] group-hover:bg-brand group-hover:shadow-[0_8px_20px_-4px_rgba(14,173,107,0.3)] active:scale-[0.97]"
            >
              <span>{t("serviceCard.book")}</span>
              <Icons.ChevronRight size={13} className="transition-transform duration-300 group-hover:translate-x-0.5" strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </React.Fragment>
  );

  // Link mode: entire card is a <Link> — no <button> inside = valid HTML
  if (isLinkMode) {
    return (
      <Link href={href!} id={`service-card-${service.id}`} className={cardClassName}>
        {cardContent}
      </Link>
    );
  }

  // Select mode: plain <div> — CTA button handles the interaction
  return (
    <div id={`service-card-${service.id}`} className={cardClassName}>
      {cardContent}
    </div>
  );
}
