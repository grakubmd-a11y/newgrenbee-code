import { Zap, Shield, Clock, HeadphonesIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS = [Zap, Shield, Clock, HeadphonesIcon];

export function FeaturesSection() {
  const { t } = useTranslation();
  const items = t("features.items", { returnObjects: true }) as { title: string; desc: string }[];

  return (
    <section className="w-full py-20 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-950 mb-4 text-balance">
            {t("features.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            {t("features.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {items.map((item, idx) => {
            const Icon = ICONS[idx];
            return (
              <div
                key={idx}
                className="group p-6 md:p-8 rounded-2xl bg-gray-50 hover:bg-brand-light border border-gray-100 hover:border-brand/20 transition-all duration-300 hover:shadow-lg hover:shadow-brand/10"
              >
                <div className="h-12 w-12 rounded-xl bg-brand/10 group-hover:bg-brand/20 flex items-center justify-center mb-4 transition-colors">
                  <Icon size={24} className="text-brand" />
                </div>
                <h3 className="text-lg font-bold text-gray-950 mb-2">{item.title}</h3>
                <p className="text-gray-600 text-sm leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default FeaturesSection;
