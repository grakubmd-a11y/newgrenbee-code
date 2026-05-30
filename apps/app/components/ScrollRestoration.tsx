"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Scrolls to the top of the page on every route change.
 * Next.js App Router does not restore scroll position automatically
 * when navigating between pages within the same layout.
 */
export default function ScrollRestoration() {
  const pathname = usePathname();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);
  return null;
}
