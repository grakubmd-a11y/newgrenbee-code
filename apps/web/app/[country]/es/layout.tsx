"use client";
import { useEffect } from "react";
import i18n from "@grenbee/i18n";

export default function EsLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (i18n.language !== "es") i18n.changeLanguage("es");
  }, []);
  return <>{children}</>;
}
