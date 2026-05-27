/**
 * SiteNavbar.tsx
 * Marketing-site navigation bar (home, areas, plans, faq, contact pages).
 * Matches Stellar Window Cleaners layout: logo | nav links | phone + CTA button.
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone, ChevronDown } from "lucide-react";

const NAV_LINKS = [
  { label: "Servicios",  href: "/#services" },
  { label: "Planes",     href: "/plans" },
  { label: "Áreas",      href: "/areas" },
  { label: "FAQ",        href: "/faq" },
  { label: "Contacto",   href: "/contact" },
];

export default function SiteNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled,   setScrolled]   = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  function handleHashLink(href: string) {
    if (!href.startsWith("/#")) return;
    const id = href.slice(2);
    if (location.pathname === "/") {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = href;
    }
  }

  return (
    <header
      className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-200 ${
        scrolled ? "shadow-md" : "border-b border-gray-100"
      }`}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center shrink-0">
            <span className="text-xl font-extrabold text-gray-950 tracking-tight leading-none">
              Green<span className="text-emerald-500">bee</span>
            </span>
          </Link>

          {/* Desktop nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {NAV_LINKS.map((link) =>
              link.href.startsWith("/#") ? (
                <button
                  key={link.label}
                  onClick={() => handleHashLink(link.href)}
                  className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                >
                  {link.label}
                </button>
              ) : (
                <Link
                  key={link.label}
                  to={link.href}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    location.pathname === link.href
                      ? "text-emerald-600 bg-emerald-50"
                      : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                  }`}
                >
                  {link.label}
                </Link>
              )
            )}
          </nav>

          {/* Right: phone + CTA */}
          <div className="hidden md:flex items-center gap-3">
            <a
              href="tel:+13055550000"
              className="flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-emerald-600 transition-colors"
            >
              <Phone className="w-4 h-4" />
              (305) 555-0000
            </a>
            <Link
              to="/#estimate"
              onClick={() => handleHashLink("/#estimate")}
              className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              Get a Free Quote
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden bg-white border-t border-gray-100 px-4 py-4 space-y-1 shadow-lg">
          {NAV_LINKS.map((link) =>
            link.href.startsWith("/#") ? (
              <button
                key={link.label}
                onClick={() => { handleHashLink(link.href); setMobileOpen(false); }}
                className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer"
              >
                {link.label}
              </button>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors"
              >
                {link.label}
              </Link>
            )
          )}
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            <a href="tel:+13055550000" className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700">
              <Phone className="w-4 h-4 text-emerald-500" />
              (305) 555-0000
            </a>
            <Link
              to="/#estimate"
              onClick={() => { handleHashLink("/#estimate"); setMobileOpen(false); }}
              className="mx-4 text-center bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors"
            >
              Get a Free Quote
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
