"use client";
import React from "react";
import "@grenbee/i18n";
import { SiteSettingsProvider } from "@grenbee/firebase/contexts";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SiteSettingsProvider>
      <AuthProvider>{children}</AuthProvider>
    </SiteSettingsProvider>
  );
}
