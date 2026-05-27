import { TrendingUp, Users, CheckCircle2, Award, LucideIcon } from "lucide-react";
import { useTranslation } from "react-i18next";

const ICONS: LucideIcon[] = [Users, CheckCircle2, TrendingUp, Award];

export default function TrustSection() {
  const { t } = useTranslation();
  const stats = t("trust.stats", { returnObjects: true }) as { number: string; label: string }[];

  return (
    <section className="w-full py-20 md:py-32 bg-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-950 mb-4 text-balance">
            {t("trust.title")}
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
            {t("trust.subtitle")}
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          {stats.map((stat, idx) => {
            const Icon = ICONS[idx];
            return (
              <div
                key={idx}
                className="p-8 rounded-2xl bg-gradient-to-br from-brand-light to-transparent border border-brand/20 text-center hover:shadow-lg transition-all duration-300 hover:border-brand/40"
              >
                <div className="flex justify-center mb-4">
                  <div className="h-12 w-12 rounded-xl bg-brand/20 flex items-center justify-center">
                    <Icon size={24} className="text-brand" />
                  </div>
                </div>
                <div className="text-3xl md:text-4xl font-black text-brand mb-2">{stat.number}</div>
                <p className="font-semibold text-gray-950">{stat.label}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
