"use client";
import { Suspense } from "react";
import PublicApp from "@/components/PublicApp";

export default function AccountPage() {
  return (
    <Suspense>
      <PublicApp />
    </Suspense>
  );
}
