import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HeroSectionProps {
  onBookService: () => void;
}

export default function HeroSection({ onBookService }: HeroSectionProps) {
  const { t } = useTranslation();

  return (
    <section className="relative w-full pt-24 pb-20 md:pt-40 md:pb-32 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-brand/5 via-transparent to-brand-hover/5" />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Text Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-gray-950 leading-tight text-balance">
                {t("hero.title")}
              </h1>
              <p className="text-lg md:text-xl text-gray-600 leading-relaxed text-balance">
                {t("hero.subtitle")}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-brand shrink-0" />
                <span className="text-gray-700">{t("hero.vettedProfessionals")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-brand shrink-0" />
                <span className="text-gray-700">{t("hero.securePayment")}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={18} className="text-brand shrink-0" />
                <span className="text-gray-700">{t("hero.support")}</span>
              </div>
            </div>

            <button
              onClick={onBookService}
              className="w-full sm:w-auto group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-brand hover:bg-brand-hover text-white font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
            >
              {t("hero.cta")}
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </button>
          </div>

          {/* Right: Visual */}
          <div className="relative h-96 md:h-full hidden md:flex items-center justify-center">
            <div className="absolute inset-0 bg-gradient-to-br from-brand-light to-brand/10 rounded-3xl" />
            <div className="absolute inset-0 rounded-3xl overflow-hidden">
              <div className="grid grid-cols-2 gap-4 p-8 h-full content-center">
                {[
                  { emoji: "🧹", key: "hero.cleaning" },
                  { emoji: "🌱", key: "hero.lawnCare" },
                  { emoji: "📺", key: "hero.tvInstall" },
                  { emoji: "🛋️", key: "hero.assembly" },
                ].map(({ emoji, key }) => (
                  <div
                    key={key}
                    className="bg-white rounded-2xl shadow-md p-4 text-center space-y-2 transform hover:scale-105 transition-transform"
                  >
                    <div className="text-3xl">{emoji}</div>
                    <p className="text-sm font-semibold text-gray-700">{t(key)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
