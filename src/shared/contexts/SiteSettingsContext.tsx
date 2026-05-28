/**
 * SiteSettingsContext.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Loads business settings (phone, email, name) from Firestore /settings/business
 * once at app mount and exposes them to all public components via context.
 *
 * Falls back to safe defaults so the site always renders even if Firestore
 * is slow or unreachable.
 *
 * Usage:
 *   const { phone, email, businessName } = useSiteSettings();
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase";

export interface SiteSettings {
  phone: string;
  email: string;
  businessName: string;
}

const DEFAULTS: SiteSettings = {
  phone: "(305) 555-0000",
  email: "support@grenbee.com",
  businessName: "Grenbee",
};

const SiteSettingsContext = createContext<SiteSettings>(DEFAULTS);

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>(DEFAULTS);

  useEffect(() => {
    getDoc(doc(db, "settings", "business"))
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        setSettings({
          phone:        data.phone        || DEFAULTS.phone,
          email:        data.email        || DEFAULTS.email,
          businessName: data.name         || DEFAULTS.businessName,
        });
      })
      .catch(() => { /* keep defaults on error */ });
  }, []);

  return (
    <SiteSettingsContext.Provider value={settings}>
      {children}
    </SiteSettingsContext.Provider>
  );
}

export function useSiteSettings(): SiteSettings {
  return useContext(SiteSettingsContext);
}
