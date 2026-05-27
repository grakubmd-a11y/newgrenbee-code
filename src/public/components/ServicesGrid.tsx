import React from "react";
import { useTranslation } from "react-i18next";
import { Service } from "../../shared/types";
import { CheckCircle2, Zap } from "lucide-react";

interface ServicesGridProps {
  services: Service[];
  onServiceClick: (service: Service) => void;
}

export default function ServicesGrid({ services, onServiceClick }: ServicesGridProps) {
  const { t } = useTranslation();

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-black text-gray-900 mb-4">
            {t("servicesGrid.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t("servicesGrid.subtitle")}
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {services.map((service) => (
            <button
              key={service.id}
              onClick={() => onServiceClick(service)}
              className="group relative bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 hover:scale-105 cursor-pointer overflow-hidden border border-gray-100 text-left"
            >
              {/* Background accent */}
              <div className="absolute inset-0 bg-gradient-to-br from-brand/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              {/* Content */}
              <div className="relative z-10 space-y-4">
                {/* Icon */}
                <div className="w-14 h-14 rounded-xl bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
                  <Zap size={28} className="text-brand" />
                </div>

                {/* Title and Description */}
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {service.name}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {service.description}
                  </p>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-brand">
                    ${service.basePrice}
                  </span>
                  <span className="text-gray-500">{t("servicesGrid.taxes")}</span>
                </div>

                {/* Features */}
                <div className="space-y-2 pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-brand flex-shrink-0" />
                    <span>{t("servicesGrid.certifiedPros")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <CheckCircle2 size={16} className="text-brand flex-shrink-0" />
                    <span>{t("servicesGrid.satisfactionGuarantee")}</span>
                  </div>
                </div>

                {/* CTA Button */}
                <button className="w-full mt-6 py-3 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold transition-all duration-200">
                  {t("servicesGrid.bookService")}
                </button>
              </div>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
