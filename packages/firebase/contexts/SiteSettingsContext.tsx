/**
 * SiteSettingsContext.tsx
 * Loads business settings from Firestore /settings/business once at app mount
 * and exposes them to all public components via context.
 * Falls back to safe defaults if Firestore is slow or unreachable.
 */

import React, { createContext, useContext, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { db } from "@grenbee/firebase";

// Default active service IDs — matches SERVICES_DATA active: true entries.
// Kept in sync manually; the real source of truth is Firestore settings/business.activeServiceIds.
const DEFAULT_ACTIVE_SERVICE_IDS = [
  "house-cleaning",
  "lawn-mowing",
  "tv-installation",
  "vacation-rental-turnover",
];

export interface SiteSettings {
  phone: string;
  email: string;
  businessName: string;
  /** Service IDs shown in the public estimator. Controlled from admin Settings. */
  activeServiceIds: string[];
}

const DEFAULTS: SiteSettings = {
  phone: "",
  email: "support@grenbee.com",
  businessName: "Grenbee",
  activeServiceIds: DEFAULT_ACTIVE_SERVICE_IDS,
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
          phone:             data.phone        || "",
          email:             data.email        || DEFAULTS.email,
          businessName:      data.name         || DEFAULTS.businessName,
          activeServiceIds:  Array.isArray(data.activeServiceIds) && data.activeServiceIds.length > 0
                               ? data.activeServiceIds
                               : DEFAULTS.activeServiceIds,
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
