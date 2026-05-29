/**
 * AreasView — server-rendered /areas directory hub.
 *
 * The internal-linking SEO hub: every active city link is in the initial HTML
 * so crawlers can reach each landing page. Data is fetched server-side; only
 * the waitlist form (WaitlistForm) is a client child.
 */
import React from "react";
import Link from "next/link";
import { MapPin, CheckCircle2, Clock, Bell, ArrowRight } from "lucide-react";
import { getAllAreas } from "@/lib/areaContent.server";
import { COMING_SOON_AREAS } from "@/lib/launchAreas";
import { AREA_COPY, type Lang } from "@/lib/areaCopy";
import WaitlistForm from "./WaitlistForm";

export default async function AreasView({ lang }: { lang: Lang }) {
  const copy = AREA_COPY[lang].hub;
  const langPrefix = lang === "es" ? "/us/es" : "/us";
  const active = await getAllAreas();

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{copy.heading}</h1>
        <p className="text-gray-500 max-w-xl">{copy.subheading}</p>
      </div>

      {/* Active areas */}
      <section className="mb-10">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          {copy.availableNow}
        </h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
          {active.map((area) => (
            <Link
              key={area.id}
              href={`${langPrefix}/areas/${area.slug}`}
              className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 hover:bg-emerald-100 hover:border-emerald-200 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">{area.city}</p>
                  <p className="text-xs text-gray-400">{area.state}</p>
                </div>
              </div>
              <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          ))}
        </div>
      </section>

      {/* Coming soon */}
      {COMING_SOON_AREAS.length > 0 && (
        <section className="mb-12">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {copy.comingSoon}
          </h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {COMING_SOON_AREAS.map((area) => (
              <div key={area.id} className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-500">{area.city}</p>
                  <p className="text-xs text-amber-500 font-medium">{copy.comingSoonLabel}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Waitlist */}
      <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-8">
        <div className="flex items-start gap-4 mb-6">
          <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
            <Bell className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-800 mb-1">{copy.waitlistHeading}</h2>
            <p className="text-sm text-gray-500">{copy.waitlistSubheading}</p>
          </div>
        </div>
        <WaitlistForm
          successMessage={copy.waitlistSuccess}
          zipPlaceholder={copy.zipPlaceholder}
          emailPlaceholder={copy.emailPlaceholder}
          notifyMe={copy.notifyMe}
        />
      </div>
    </div>
  );
}
