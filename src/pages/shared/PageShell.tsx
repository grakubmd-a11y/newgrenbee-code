import React from "react";
import { Link } from "react-router-dom";
import { Leaf } from "lucide-react";

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
  const canonicalUrl = seo.canonical ?? `https://grenbee.com${typeof window !== "undefined" ? window.location.pathname : ""}`;

  return (
    <>
      {/* React 19 hoists these to <head> automatically */}
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
        <header className="bg-white border-b border-gray-100 sticky top-0 z-50">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                <Leaf className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-bold text-emerald-700 group-hover:text-emerald-600 transition-colors">
                Greenbee
              </span>
            </Link>
            <Link
              to="/"
              className="text-sm text-gray-500 hover:text-emerald-600 transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </header>

        <main className="flex-1">{children}</main>

        <footer className="bg-gray-50 border-t border-gray-100 py-10 mt-16">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <Link to="/" className="flex items-center gap-2">
                <div className="w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                  <Leaf className="w-3 h-3 text-white" />
                </div>
                <span className="text-sm font-semibold text-emerald-700">Greenbee</span>
              </Link>
              <nav className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-gray-500">
                <Link to="/terms" className="hover:text-emerald-600 transition-colors">Terms</Link>
                <Link to="/privacy" className="hover:text-emerald-600 transition-colors">Privacy</Link>
                <Link to="/cancellation" className="hover:text-emerald-600 transition-colors">Cancellation</Link>
                <Link to="/guarantee" className="hover:text-emerald-600 transition-colors">Guarantee</Link>
                <Link to="/payment-policy" className="hover:text-emerald-600 transition-colors">Payment Policy</Link>
                <Link to="/faq" className="hover:text-emerald-600 transition-colors">FAQ</Link>
                <Link to="/contact" className="hover:text-emerald-600 transition-colors">Contact</Link>
              </nav>
              <p className="text-xs text-gray-400">© {new Date().getFullYear()} Greenbee. All rights reserved.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
