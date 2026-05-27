import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";

interface CTASectionProps {
  onBrowse: () => void;
  onContact: () => void;
}

export function CTASection({ onBrowse, onContact }: CTASectionProps) {
  const { t } = useTranslation();

  return (
    <section className="w-full py-20 md:py-32 bg-gradient-to-r from-brand to-brand-hover relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 width=%22100%22 height=%22100%22><circle cx=%2250%22 cy=%2250%22 r=%2230%22 fill=%22white%22 opacity=%220.1%22/></svg>')] bg-repeat" />
      </div>

      <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-white mb-4 text-balance">
          {t("cta.title")}
        </h2>
        <p className="text-lg md:text-xl text-white/90 mb-8 max-w-2xl mx-auto text-balance">
          {t("cta.subtitle")}
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onBrowse}
            className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white text-brand font-bold text-lg shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95"
          >
            {t("cta.browse")}
            <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
          </button>
          <button
            onClick={onContact}
            className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-white/20 border border-white text-white font-bold text-lg hover:bg-white/30 transition-all duration-200"
          >
            {t("cta.contact")}
          </button>
        </div>

        <div className="mt-12 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm">
          <div className="flex gap-1">
            {[...Array(5)].map((_, i) => (
              <span key={i} className="text-yellow-300">★</span>
            ))}
          </div>
          <span className="text-sm font-semibold text-white/90">{t("cta.rating")}</span>
        </div>
      </div>
    </section>
  );
}

export default CTASection;
