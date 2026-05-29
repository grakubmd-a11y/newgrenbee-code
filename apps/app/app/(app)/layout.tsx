"use client";
/**
 * Layout para rutas de app: /book, /account, /bookings, /estimate
 *
 * Idéntico al diseño de PageShell (marketing pages):
 *   • misma SiteNavbar con auth
 *   • mismo footer oscuro
 *
 * AuthProvider ya está montado en app/providers.tsx (root), no se duplica aquí.
 */

import React from "react";
import Link from "next/link";
import { Phone, LayoutDashboard, Server } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteSettings } from "@grenbee/firebase/contexts";
import { useAuth } from "@/contexts/AuthContext";
import SiteNavbar from "@/components/layout/SiteNavbar";

// ── Footer shared with PageShell ─────────────────────────────────────────────

function toSlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

function SiteFooter() {
  const { t } = useTranslation();
  const { phone } = useSiteSettings();
  const footerServiceLinks = t("home.footer.serviceLinks", {
    returnObjects: true,
  }) as string[];

  return (
    <footer className="bg-gray-950 text-gray-400 py-14 mt-0">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        {/* Brand */}
        <div className="md:col-span-1 space-y-3">
          <Link href="/" className="inline-block">
            <span className="text-lg font-extrabold text-white tracking-tight">
              Green<span className="text-emerald-400">bee</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed">{t("home.footer.tagline")}</p>
          <a
            href={`tel:${phone.replace(/\D/g, "")}`}
            className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
          >
            <Phone className="w-3.5 h-3.5" />
            {phone}
          </a>
          <p className="text-xs text-gray-600">
            © {new Date().getFullYear()} Grenbee. {t("home.footer.rights")}
          </p>
        </div>

        {/* Services */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            {t("home.footer.servicesTitle")}
          </h4>
          <ul className="space-y-2 text-sm">
            {footerServiceLinks.map((label) => (
              <li key={label}>
                <Link
                  href="/#services"
                  className="hover:text-emerald-400 transition-colors"
                >
                  {label}
                </Link>
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
            {["Miami", "Miami Beach", "Coral Gables", "Brickell", "Doral", "Hialeah"].map(
              (city) => (
                <li key={city}>
                  <Link
                    href={`/areas/${toSlug(city)}`}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    {city}
                  </Link>
                </li>
              ),
            )}
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">
            {t("home.footer.browardTitle")}
          </h4>
          <ul className="space-y-2 text-sm">
            {["Fort Lauderdale", "Hollywood", "Pembroke Pines", "Miramar"].map(
              (city) => (
                <li key={city}>
                  <Link
                    href={`/areas/${toSlug(city)}`}
                    className="hover:text-emerald-400 transition-colors"
                  >
                    {city}
                  </Link>
                </li>
              ),
            )}
          </ul>
          <div className="mt-3">
            <Link
              href="/areas"
              className="text-emerald-400 hover:text-emerald-300 font-semibold text-sm transition-colors"
            >
              {t("home.footer.allServiceAreas")} →
            </Link>
          </div>
        </div>

        {/* Company */}
        <div>
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
            {t("home.footer.companyTitle")}
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/plans" className="hover:text-emerald-400 transition-colors">
                {t("home.footer.membershipPlans")}
              </Link>
            </li>
            <li>
              <Link href="/areas" className="hover:text-emerald-400 transition-colors">
                {t("home.footer.allServiceAreas")}
              </Link>
            </li>
            <li>
              <Link href="/faq" className="hover:text-emerald-400 transition-colors">
                FAQ
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:text-emerald-400 transition-colors">
                {t("home.footer.contactUs")}
              </Link>
            </li>
          </ul>
          <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">
            {t("home.footer.legalTitle")}
          </h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/terms" className="hover:text-emerald-400 transition-colors">
                {t("home.footer.termsOfService")}
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="hover:text-emerald-400 transition-colors">
                {t("home.footer.privacyPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/cancellation" className="hover:text-emerald-400 transition-colors">
                {t("home.footer.cancellationPolicy")}
              </Link>
            </li>
            <li>
              <Link href="/guarantee" className="hover:text-emerald-400 transition-colors">
                {t("home.footer.satisfactionGuarantee")}
              </Link>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
}

// ── Shell ─────────────────────────────────────────────────────────────────────

function AppShell({ children }: { children: React.ReactNode }) {
  const auth = useAuth();
  const isAdmin = auth?.isAdmin ?? false;

  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Admin operator bar — only shown to verified admins */}
      {isAdmin && (
        <div className="bg-[#0f172a] text-slate-300 text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800 sticky top-0 z-[60] select-none">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-emerald-400 uppercase tracking-wider">
              <Server size={13} className="text-emerald-400 animate-pulse" />
              Consola Operativa
            </div>
            <div className="h-4 w-px bg-slate-800" />
            <a
              href="/admin"
              className="text-emerald-400 hover:text-emerald-300 font-black text-[11px] transition-all hover:underline flex items-center gap-1.5"
            >
              <LayoutDashboard size={12} />
              Ingresar al Workspace de Administración
            </a>
          </div>
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50" />
        </div>
      )}

      <SiteNavbar />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  );
}

// ── Layout export ─────────────────────────────────────────────────────────────

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
