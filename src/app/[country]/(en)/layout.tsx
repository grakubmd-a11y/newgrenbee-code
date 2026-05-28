"use client";
import { useEffect } from "react";
import i18n from "@/src/shared/i18n";

export default function EnLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (i18n.language !== "en") i18n.changeLanguage("en");
  }, []);
  return <>{children}</>;
}
