import type { Metadata } from "next";
import Script from "next/script";
import dynamic from "next/dynamic";
import "@/index.css";
import Providers from "./providers";
import { getAdminDb } from "@/lib/firebaseAdmin";

const ChatWidget = dynamic(() => import("@/components/chat/ChatWidget"), { ssr: false });

// Revalidate every hour so og:image / tagline changes in admin are reflected.
export const revalidate = 3600;


// GA4 Measurement ID — set NEXT_PUBLIC_GA_MEASUREMENT_ID in Vercel env vars.
// The script is only injected when the var is present so local dev stays clean.
const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

/** Fetch og:image URL and tagline from Firestore settings (server-side, cached 1h). */
async function getSiteSettings(): Promise<{ ogImageUrl?: string; siteTagline?: string }> {
  try {
    const db = getAdminDb();
    if (!db) return {};
    const snap = await db.collection("settings").doc("business").get();
    const data = snap.data() ?? {};
    return {
      ogImageUrl:  data.ogImageUrl  ?? undefined,
      siteTagline: data.siteTagline ?? undefined,
    };
  } catch {
    return {};
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const { ogImageUrl, siteTagline } = await getSiteSettings();

  const description = siteTagline ??
    "Professional home cleaning, lawn mowing, TV installation and more in Utah County. Book vetted, insured technicians online in minutes. Transparent pricing.";

  const ogImage = ogImageUrl ?? "/og-image.jpg";

  return {
    title: {
      default:  "Grenbee — Home Cleaning & Home Services in Utah",
      template: "%s | Grenbee",
    },
    description,
    metadataBase: new URL("https://grenbee.com"),
    openGraph: {
      type:        "website",
      siteName:    "Grenbee",
      title:       "Grenbee — Home Services in Utah",
      description,
      images: [{ url: ogImage, width: 1200, height: 630, alt: "Grenbee — Professional Home Services in Utah" }],
    },
    twitter: {
      card:        "summary_large_image",
      title:       "Grenbee — Home Services in Utah",
      description,
      images:      [ogImage],
    },
    keywords: ["home cleaning Utah", "house cleaning Utah County", "lawn mowing Utah", "TV installation Utah", "home services Utah", "Grenbee"],
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
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
        <ChatWidget />
      </body>
    </html>
  );
}
