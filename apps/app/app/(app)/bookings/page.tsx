"use client";
import { Suspense } from "react";
import PublicApp from "@/components/PublicApp";

export default function BookingsPage() {
  return (
    <Suspense>
      <PublicApp />
    </Suspense>
  );
}
