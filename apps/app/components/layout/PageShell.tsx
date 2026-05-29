"use client";
import React from "react";
import Link from "next/link";
import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useParams } from "next/navigation";
import SiteNavbar from "./SiteNavbar";
import { useSiteSettings } from "@grenbee/firebase/contexts";

interface SEOMeta {
  title: string;
  description: string;
  canonical?: string;
}

interface PageShellProps {
  children: React.ReactNode;
  /** Optional. Omit on routes that emit SEO via Next's generateMetadata (server-rendered pages). */
  seo?: SEOMeta;
}


export default function PageShell({ children, seo }: PageShellProps) {
  const { t } = useTranslation();
  const { phone, email } = useSiteSettings();
  const params = useParams();
  const base = `/${(params?.country as string) ?? "us"}`;
  const canonicalUrl =
    seo?.canonical ??
    `https://grenbee.com${typeof window !== "undefined" ? window.location.pathname : ""}`;

  const footerServiceLinks = t("home.footer.serviceLinks", { returnObjects: true }) as string[];

  return (
    <>
      {/* React 19 hoists these to <head>. Skipped when the route uses generateMetadata. */}
      {seo && (
        <>
          <title>{seo.title}</title>
          <meta name="description" content={seo.description} />
          <link rel="canonical" href={canonicalUrl} />
          <meta property="og:title" content={seo.title} />
          <meta property="og:description" content={seo.description} />
          <meta property="og:type" content="website" />
          <meta property="og:url" content={canonicalUrl} />
          <meta name="twitter:card" content="summary" />
          <meta name="twitter:title" content={seo.title} />
          <meta name="twitter:description" content={seo.description} />
        </>
      )}

      <div className="min-h-screen flex flex-col bg-white">
        <SiteNavbar />

        <main className="flex-1">{children}</main>

        {/* Site footer */}
        <footer className="bg-gray-950 text-gray-400 py-14 mt-0">
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
                    <Link href="/#services" className="hover:text-emerald-400 transition-colors">
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">
                Utah County
              </h4>
              <ul className="space-y-2 text-sm">
                {["mapleton", "spanish-fork", "springville", "salem"].map((slug) => (
                  <li key={slug}>
                    <Link href={`${base}/areas/${slug}`} className="hover:text-emerald-400 transition-colors capitalize">
                      {slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </Link>
                  </li>
                ))}
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">
                Wasatch Back
              </h4>
              <ul className="space-y-2 text-sm">
                {["heber", "midway", "park-city"].map((slug) => (
                  <li key={slug}>
                    <Link href={`${base}/areas/${slug}`} className="hover:text-emerald-400 transition-colors">
                      {slug.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Link href={`${base}/areas`} className="text-emerald-400 hover:text-emerald-300 font-semibold text-sm transition-colors">
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
                <li><Link href={`${base}/plans`}   className="hover:text-emerald-400 transition-colors">{t("home.footer.membershipPlans")}</Link></li>
                <li><Link href={`${base}/areas`}   className="hover:text-emerald-400 transition-colors">{t("home.footer.allServiceAreas")}</Link></li>
                <li><Link href={`${base}/hosts`}   className="hover:text-emerald-400 transition-colors">For Hosts</Link></li>
                <li><Link href={`${base}/faq`}     className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                <li><Link href={`${base}/contact`} className="hover:text-emerald-400 transition-colors">{t("home.footer.contactUs")}</Link></li>
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">
                {t("home.footer.legalTitle")}
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link href={`${base}/terms`}        className="hover:text-emerald-400 transition-colors">{t("home.footer.termsOfService")}</Link></li>
                <li><Link href={`${base}/privacy`}      className="hover:text-emerald-400 transition-colors">{t("home.footer.privacyPolicy")}</Link></li>
                <li><Link href={`${base}/cancellation`} className="hover:text-emerald-400 transition-colors">{t("home.footer.cancellationPolicy")}</Link></li>
                <li><Link href={`${base}/guarantee`}    className="hover:text-emerald-400 transition-colors">{t("home.footer.satisfactionGuarantee")}</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
