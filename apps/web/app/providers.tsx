"use client";
import "@grenbee/i18n";
import { SiteSettingsProvider } from "@grenbee/firebase/contexts";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <SiteSettingsProvider>{children}</SiteSettingsProvider>;
}
