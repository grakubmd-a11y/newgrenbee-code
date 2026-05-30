import type { Metadata } from "next";
import Script from "next/script";
import "@/index.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Grenbee — Home Cleaning & Home Services in Utah",
    template: "%s | Grenbee",
  },
  description:
    "Professional home cleaning, lawn mowing, TV installation and more in Utah County. Book vetted, insured technicians online in minutes. Transparent pricing.",
  metadataBase: new URL("https://grenbee.com"),
  openGraph: {
    type:      "website",
    siteName:  "Grenbee",
    title:     "Grenbee — Home Services in Utah",
    description:
      "Book professional home cleaning, lawn care, TV installation and more. Vetted pros, instant pricing, same-week availability.",
    images: [
      {
        url:    "/og-image.jpg",   // place a 1200×630 image at apps/app/public/og-image.jpg
        width:  1200,
        height: 630,
        alt:    "Grenbee — Professional Home Services in Utah",
      },
    ],
  },
  twitter: {
    card:        "summary_large_image",
    title:       "Grenbee — Home Services in Utah",
    description: "Book vetted, insured home service pros online. Instant pricing, same-week availability.",
    images:      ["/og-image.jpg"],
  },
  keywords: [
    "home cleaning Utah",
    "house cleaning Utah County",
    "lawn mowing Utah",
    "TV installation Utah",
    "home services Utah",
    "Grenbee",
  ],
};

// GA4 Measurement ID — set NEXT_PUBLIC_GA_MEASUREMENT_ID in Vercel env vars.
// The script is only injected when the var is present so local dev stays clean.
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=Inter:wght@300;400;500;600;700;800&display=swap"
        />
      </head>
      <body>
        {/* ── Google Analytics 4 ── loaded only when GA_ID env var is set ── */}
        {GA_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
              strategy="afterInteractive"
            />
            <Script id="ga4-init" strategy="afterInteractive">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_ID}', { page_path: window.location.pathname });
              `}
            </Script>
          </>
        )}
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
