"use client";

import "@/src/shared/i18n"; // Initialize i18n on client mount
import { SiteSettingsProvider } from "@/src/shared/contexts/SiteSettingsContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SiteSettingsProvider>{children}</SiteSettingsProvider>;
}
