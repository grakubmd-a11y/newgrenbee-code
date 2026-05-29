"use client";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import PageShell from "../layout/PageShell";
import { Home, Search } from "lucide-react";

export default function NotFoundPage() {
  const { t } = useTranslation();
  return (
    <PageShell
      seo={{
        title: t("notFound.pageTitle"),
        description: t("notFound.metaDescription"),
      }}
    >
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
        <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center mb-6">
          <Search className="w-12 h-12 text-emerald-400" />
        </div>
        <h1 className="text-6xl font-bold text-gray-200 mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-3">{t("notFound.title")}</h2>
        <p className="text-gray-500 mb-8 max-w-md">{t("notFound.body")}</p>
        <Link href="/"
          className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
        >
          <Home className="w-4 h-4" />
          {t("notFound.cta")}
        </Link>
      </div>
    </PageShell>
  );
}
