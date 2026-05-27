import React from "react";
import { Link } from "react-router-dom";
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

export default function PageShell({ children, seo }: PageShellProps) {
  const canonicalUrl =
    seo.canonical ??
    `https://grenbee.com${typeof window !== "undefined" ? window.location.pathname : ""}`;

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
                Professional lawn care and home cleaning services across South Florida.
              </p>
              <a href="tel:+13055550000" className="flex items-center gap-1.5 text-sm text-emerald-400 font-semibold hover:text-emerald-300 transition-colors">
                (305) 555-0000
              </a>
              <p className="text-xs text-gray-600">© {new Date().getFullYear()} Greenbee. All rights reserved.</p>
            </div>

            {/* Services */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Services</h4>
              <ul className="space-y-2 text-sm">
                {[
                  ["Lawn Care",           "/#services"],
                  ["House Cleaning",      "/#services"],
                  ["Pressure Washing",    "/#services"],
                  ["TV Installation",     "/#services"],
                  ["Furniture Assembly",  "/#services"],
                ].map(([label, href]) => (
                  <li key={label}>
                    <Link to={href} className="hover:text-emerald-400 transition-colors">{label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Service Areas</h4>
              <ul className="space-y-2 text-sm">
                {[
                  ["Miami",           "miami"],
                  ["Miami Beach",     "miami-beach"],
                  ["Coral Gables",    "coral-gables"],
                  ["Fort Lauderdale", "fort-lauderdale"],
                  ["Brickell",        "brickell"],
                  ["Doral",           "doral"],
                ].map(([city, slug]) => (
                  <li key={slug}>
                    <Link to={`/areas/${slug}`} className="hover:text-emerald-400 transition-colors">{city}</Link>
                  </li>
                ))}
                <li>
                  <Link to="/areas" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
                    View all areas →
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/plans" className="hover:text-emerald-400 transition-colors">Membership Plans</Link></li>
                <li><Link to="/faq" className="hover:text-emerald-400 transition-colors">FAQ</Link></li>
                <li><Link to="/contact" className="hover:text-emerald-400 transition-colors">Contact Us</Link></li>
              </ul>
              <h4 className="text-xs font-bold uppercase tracking-widest text-gray-500 mb-3 mt-5">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link to="/terms" className="hover:text-emerald-400 transition-colors">Terms of Service</Link></li>
                <li><Link to="/privacy" className="hover:text-emerald-400 transition-colors">Privacy Policy</Link></li>
                <li><Link to="/cancellation" className="hover:text-emerald-400 transition-colors">Cancellation</Link></li>
                <li><Link to="/guarantee" className="hover:text-emerald-400 transition-colors">Guarantee</Link></li>
              </ul>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
