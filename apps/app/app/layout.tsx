import type { Metadata } from "next";
import Script from "next/script";
import "@/index.css";
import Providers from "./providers";

export const metadata: Metadata = {
  title: {
    default: "Grenbee — Home Cleaning Services",
    template: "%s | Grenbee",
  },
  description: "Professional home cleaning services in Utah. Book online in minutes.",
  metadataBase: new URL("https://grenbee.com"),
  openGraph: {
    type: "website",
    siteName: "Grenbee",
  },
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
