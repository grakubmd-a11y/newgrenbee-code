import React, { useState, useEffect } from "react";
import { Mail, Phone, Clock, MessageSquare, CheckCircle2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import PageShell from "./shared/PageShell";
import { fetchPageContent } from "../shared/services/firebaseService";
import { ContactPageContent } from "../shared/types";

export default function ContactPage() {
  const { t, i18n } = useTranslation();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [cms, setCms] = useState<ContactPageContent | null>(null);

  const commonQuestions = t("contact.commonQuestionsList", { returnObjects: true }) as string[];

  useEffect(() => {
    fetchPageContent("contact").then((d) => { if (d) setCms(d); }).catch(() => {});
  }, []);

  const lang = i18n.language?.startsWith("es") ? "es" : "en";
  const phone   = cms?.phone   || "(305) 555-0190";
  const email   = cms?.email   || "support@grenbee.com";
  const address = cms?.addressLine;
  const hours   = (lang === "es" ? cms?.hoursEs : cms?.hoursEn) || t("contact.hoursValue");

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Placeholder: real implementation would POST to a Firebase Cloud Function or email service
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <PageShell
      seo={{
        title: t("contact.pageTitle"),
        description: t("contact.metaDescription"),
        canonical: "https://grenbee.com/contact",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t("contact.heading")}</h1>
          <p className="text-gray-500 max-w-xl">
            {t("contact.subheading")}
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-10">
          {/* Info column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-emerald-50 rounded-2xl p-6 space-y-5">
              <InfoRow icon={<Mail className="w-5 h-5 text-emerald-600" />} label={t("contact.email")} value={email} />
              <InfoRow icon={<Phone className="w-5 h-5 text-emerald-600" />} label={t("contact.phone")} value={phone} />
              <InfoRow
                icon={<Clock className="w-5 h-5 text-emerald-600" />}
                label={t("contact.hours")}
                value={hours}
              />
              {address && (
                <InfoRow icon={<Mail className="w-5 h-5 text-emerald-600" />} label={t("contact.address") || "Address"} value={address} />
              )}
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                {t("contact.commonQuestions")}
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {commonQuestions.map((q) => (
                  <li key={q} className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">›</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Form column */}
          <div className="md:col-span-3">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center gap-4 p-8 bg-emerald-50 rounded-2xl">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                <h2 className="text-xl font-semibold text-gray-800">{t("contact.success.title")}</h2>
                <p className="text-gray-500 max-w-xs">
                  {t("contact.success.body")}
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="text-sm text-emerald-600 hover:underline mt-2"
                >
                  {t("contact.success.sendAnother")}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact.form.yourName")}</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder={t("contact.form.namePlaceholder")}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact.form.emailAddress")}</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder={t("contact.form.emailPlaceholder")}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact.form.subject")}</label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="">{t("contact.form.selectTopic")}</option>
                    <option value="quote">{t("contact.form.subjects.quote")}</option>
                    <option value="coverage">{t("contact.form.subjects.coverage")}</option>
                    <option value="provider">{t("contact.form.subjects.provider")}</option>
                    <option value="complaint">{t("contact.form.subjects.complaint")}</option>
                    <option value="corporate">{t("contact.form.subjects.corporate")}</option>
                    <option value="other">{t("contact.form.subjects.other")}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t("contact.form.message")}</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    placeholder={t("contact.form.messagePlaceholder")}
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? t("contact.form.sending") : t("contact.form.send")}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
