import { useTranslation } from "react-i18next";
import PageShell from "./PageShell";

export interface LegalSection {
  title: string;
  content: string | string[];
}

interface LegalPageProps {
  title: string;
  pageTitle?: string;
  metaDescription?: string;
  lastUpdated: string;
  intro?: string;
  sections: LegalSection[];
  disclaimer?: string;
}

export default function LegalPage({
  title,
  pageTitle,
  metaDescription,
  lastUpdated,
  intro,
  sections,
  disclaimer,
}: LegalPageProps) {
  const { t } = useTranslation();
  const seoTitle = pageTitle ?? `${title} | Grenbee`;
  const seoDesc = metaDescription ?? `${title} — Grenbee home services. Last updated ${lastUpdated}.`;

  return (
    <PageShell seo={{ title: seoTitle, description: seoDesc }}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
          <p className="text-sm text-gray-400">{t("legal.lastUpdated")} {lastUpdated}</p>
          {intro && <p className="mt-4 text-gray-600 leading-relaxed">{intro}</p>}
        </div>

        <div className="space-y-8">
          {sections.map((section, i) => (
            <section key={i}>
              <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <span className="text-emerald-500 font-mono text-sm">{String(i + 1).padStart(2, "0")}.</span>
                {section.title}
              </h2>
              {Array.isArray(section.content) ? (
                <ul className="space-y-2 text-gray-600 text-sm leading-relaxed list-none">
                  {section.content.map((item, j) => (
                    <li key={j} className="flex gap-2">
                      <span className="text-emerald-400 mt-0.5 shrink-0">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-gray-600 text-sm leading-relaxed">{section.content}</p>
              )}
            </section>
          ))}
        </div>

        {disclaimer && (
          <div className="mt-12 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-xs text-amber-700 leading-relaxed">
              <span className="font-semibold">{t("legal.legalNotice")}</span>{disclaimer}
            </p>
          </div>
        )}
      </div>
    </PageShell>
  );
}
