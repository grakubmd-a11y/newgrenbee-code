"use client";
import React from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "react-i18next";
import PageShell from "@/components/layout/PageShell";
import ServiceCard from "@/components/ServiceCard";
import { SERVICES_DATA } from "@grenbee/config";
import { useSiteSettings } from "@grenbee/firebase/contexts";

export default function ServicesPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const { activeServiceIds } = useSiteSettings();

  // Consistent with estimator, home page, and footer — all use admin-controlled list
  const activeServices = SERVICES_DATA.filter(s => activeServiceIds.includes(s.id));

  function handleBookClick(serviceId: string) {
    router.push(`/book?service=${serviceId}`);
  }

  return (
    <PageShell>
      <section className="py-16 md:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          <div className="text-center mb-14">
            <p className="text-emerald-600 font-bold text-sm uppercase tracking-widest mb-2">
              {t("home.servicesSection.eyebrow")}
            </p>
            <h1 className="text-4xl md:text-5xl font-black text-gray-950 tracking-tight mb-4">
              {t("home.servicesSection.title")}
            </h1>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t("home.servicesSection.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeServices.map((service) => (
              <ServiceCard
                key={service.id}
                service={service}
                onBookClick={handleBookClick}
              />
            ))}
          </div>

        </div>
      </section>
    </PageShell>
  );
}
