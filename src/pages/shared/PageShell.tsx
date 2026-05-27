import React from "react";
import { Link } from "react-router-dom";
import { Phone } from "lucide-react";
import { useTranslation } from "react-i18next";
import SiteNavbar from "../../public/components/SiteNavbar";

interface SEOMeta {
  title: string;
  description: string;
  canonical?: string;
}

interface PageShellProps {
  children: React.ReactNode;
  seo: SEOMeta;
}

function toSlug(city: string) {
  return city.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export default function PageShell({ children, seo }: PageShellProps) {
  const { t } = useTranslation();
  const canonicalUrl =
    seo.canonical ??
    `https://grenbee.com${typeof window !== "undefined" ? window.location.pathname : ""}`;

  const footerServiceLinks = t("home.footer.serviceLinks", { returnObjects: true }) as string[];

  return (
    <>
      {/* React 19 hoists these to <head> */}
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

      <div className="min-h-screen flex flex-col bg-white">
        <SiteNavbar />

        <main className="flex-1">{children}</main>

        {/* Site footer */}
        <footer className="bg-gray-950 text-gray-400 py-14 mt-0">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="md:col-span-1 space-y-3">
              <Link to="/" className="inline-block">
                <span className="text-lg font-extrabold text-white tracking-tight">
                  Green<span className="text-emerald-400">bee</span>
                </span>
              </Link>
              <p className="text-sm leading-relaxed">
                {t("home.footer.tagline")}
              </p>
              <a
                href="tel:+13055550000"
                className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors"
              >
                <Phone className="w-3.5 h-3.5" />
                (305) 555-0000
              </a>
              <p className="text-xs text-gray-600">
                © {new Date().getFullYear()} Greenbee. {t("home.footer.rights")}
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
                    <Link to="/#services" className="hover:text-emerald-400 transition-colors">
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
                {["Miami", "Miami Beach", "Coral Gables", "Brickell", "Doral", "Hialeah"].map((city) => (
                  <li key={city}>
                    <Link to={`/areas/${toSlug(city)}`} className="hover:text-emerald-400 transition-colors">
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">
                {t("home.footer.browardTitle")}
              </h4>
              <ul className="space-y-2 text-sm">
                {["Fort Lauderdale", "Hollywood", "Pembroke Pines", "Miramar"].map((city) => (
                  <li key={city}>
                    <Link to={`/areas/${toSlug(city)}`} className="hover:text-emerald-400 transition-colors">
                      {city}
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="mt-3">
                <Link to="/areas" className="text-emerald-400 hover:text-emerald-300 font-semibold text-sm transition-colors">
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
                <li><Link to="/plans"   className="hover:text-emerald-400 transition-colors">{t("home.footer.membershipPlans")}</Link></li>
                <li><Link to="/areas"   className="hover:text-emerald-400 transition-colors">{t("home.footer.allServiceAreas")}</Link></li>
                <li><Link to="/faq"     className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-400 transition-colors">{t("home.footer.contactUs")}</Link></li>
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">
                {t("home.footer.legalTitle")}
              </h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms"        className="hover:text-emerald-400 transition-colors">{t("home.footer.termsOfService")}</Link></li>
                <li><Link to="/privacy"      className="hover:text-emerald-400 transition-colors">{t("home.footer.privacyPolicy")}</Link></li>
                <li><Link to="/cancellation" className="hover:text-emerald-400 transition-colors">{t("home.footer.cancellationPolicy")}</Link></li>
                <li><Link to="/guarantee"    className="hover:text-emerald-400 transition-colors">{t("home.footer.satisfactionGuarantee")}</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
