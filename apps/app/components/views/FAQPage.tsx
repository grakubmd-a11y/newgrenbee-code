"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageShell from "../layout/PageShell";
import { fetchPageContent } from "@grenbee/firebase/services";
import { FaqPageContent } from "@grenbee/types";

interface FAQItem { q: string; a: string; }
interface FAQCategory { name: string; items: FAQItem[]; }

export default function FAQPage() {
  const { t, i18n } = useTranslation();
  const params = useParams();
  const base = `/${(params?.country as string) ?? "us"}`;
  const [openKey, setOpenKey]   = useState<string | null>(null);
  const [cms, setCms]           = useState<FaqPageContent | null>(null);

  useEffect(() => {
    fetchPageContent("faq").then((d) => { if (d) setCms(d); }).catch(() => {});
  }, []);

  const lang = i18n.language?.startsWith("es") ? "es" : "en";

  // If admin has set FAQ content in Firestore, use it; otherwise fall back to i18n
  const categories: FAQCategory[] = cms?.categories?.length
    ? cms.categories.map((cat) => ({
        name:  lang === "es" ? cat.nameEs : cat.nameEn,
        items: cat.items.map((item) => ({
          q: lang === "es" ? item.questionEs : item.questionEn,
          a: lang === "es" ? item.answerEs   : item.answerEn,
        })),
      }))
    : (t("faq.categories", { returnObjects: true }) as FAQCategory[]);

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <PageShell
      seo={{
        title: t("faq.pageTitle"),
        description: t("faq.metaDescription"),
        canonical: "https://grenbee.com/faq",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("faq.heading")}</h1>
          <p className="text-gray-500">{t("faq.subheading")}</p>
        </div>

        <div className="space-y-10">
          {categories.map((category) => (
            <div key={category.name}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4">
                {category.name}
              </h2>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {category.items.map((item, idx) => {
                  const key = `${category.name}-${idx}`;
                  const isOpen = openKey === key;
                  return (
                    <div key={key} className="bg-white">
                      <button
                        onClick={() => toggle(key)}
                        className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-800">{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50">
                          <p className="pt-3">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-emerald-50 rounded-2xl text-center">
          <p className="text-gray-700 font-medium mb-2">{t("faq.stillQuestion")}</p>
          <p className="text-sm text-gray-500 mb-4">{t("faq.teamAvailable")}</p>
          <Link
            href={`${base}/contact`}
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            {t("faq.contactUs")}
          </Link>
        </div>
      </div>
    </PageShell>
  );
}
