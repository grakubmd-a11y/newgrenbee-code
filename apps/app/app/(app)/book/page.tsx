"use client";
import { Suspense } from "react";
import PublicApp from "@/components/PublicApp";

// Suspense boundary is required because PublicApp uses useSearchParams().
// This shell renders instantly; the real content appears without blocking
// static generation of other pages.
export default function BookPage() {
  return (
    <Suspense>
      <PublicApp />
    </Suspense>
  );
}
