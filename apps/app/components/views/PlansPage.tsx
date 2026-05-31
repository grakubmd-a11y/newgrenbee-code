"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { useTranslation } from "react-i18next";
import type { HomePlan, MembershipPlan } from "@grenbee/types";
import { HOME_PLANS } from "@grenbee/config";
import { fetchMembershipPlans, HOME_SIZE_LABELS } from "@grenbee/firebase/services";
import PageShell from "@/components/layout/PageShell";
import MembershipCheckoutModal from "@/components/plans/MembershipCheckoutModal";

// Default home size used when the user starts checkout straight from a plan
// card (the marketing cards don't ask for home size). The checkout modal still
// shows the resolved price and the server re-validates everything.
const DEFAULT_HOME_SIZE = "medium" as const;

// ─── Lead capture modal ────────────────────────────────────────────────────────
function LeadModal({ plan, onClose }: { plan: HomePlan; onClose: () => void }) {
  const { t } = useTranslation();
  const tier = t(`plans.tiers.${plan.id}`, { returnObjects: true }) as { name: string };

  const [name,    setName]    = useState("");
  const [email,   setEmail]   = useState("");
  const [phone,   setPhone]   = useState("");
  const [address, setAddress] = useState("");
  const [sent,    setSent]    = useState(false);
  const [busy,    setBusy]    = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await fetch("/api/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          email,
          phone,
          address,
          serviceName: `${tier.name} Home Care Plan`,
          serviceId: `plan-${plan.id}`,
          estimatedValue: plan.priceMonthly,
          source: "membership_plans",
          notes: `Plan: ${tier.name} · ${plan.priceLabel}/mo · ${plan.minCommitmentMonths}-month minimum`,
        }),
      });
      setSent(true);
    } catch {
      setSent(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {sent ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
              <Icons.CheckCircle2 size={32} className="text-brand" />
            </div>
            <h3 className="text-xl font-black text-gray-900">{t("plans.modal.successTitle")}</h3>
            <p
              className="text-sm text-gray-500 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: t("plans.modal.successBody", { planName: tier.name }) }}
            />
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 rounded-xl bg-brand text-white font-bold text-sm border-none cursor-pointer hover:bg-brand/90 transition-colors"
            >
              {t("plans.modal.close")}
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">
                  {t("plans.modal.title", { planName: tier.name })}
                </h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {plan.priceLabel}{t("plans.perMonth")} · {t("plans.card.commitment", { months: plan.minCommitmentMonths })}
                </p>
              </div>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1">
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">{t("plans.modal.fullName")}</label>
                <input required value={name} onChange={e => setName(e.target.value)} placeholder={t("plans.modal.namePlaceholder")}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">{t("plans.modal.emailLabel")}</label>
                <input required type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("plans.modal.emailPlaceholder")}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">{t("plans.modal.phoneLabel")}</label>
                <input value={phone} onChange={e => setPhone(e.target.value)} placeholder={t("plans.modal.phonePlaceholder")}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">{t("plans.modal.addressLabel")}</label>
                <input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("plans.modal.addressPlaceholder")}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand" />
              </div>
              <button
                type="submit" disabled={busy}
                className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm border-none cursor-pointer hover:bg-brand/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {busy ? <Icons.Loader2 size={16} className="animate-spin" /> : <Icons.Send size={15} />}
                {t("plans.modal.getStarted")}
              </button>
              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                {t("plans.modal.noPaymentNote")}
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Plan card ─────────────────────────────────────────────────────────────────
function PlanCard({ plan, onSelect }: { plan: HomePlan; onSelect: () => void }) {
  const { t } = useTranslation();
  const tier = t(`plans.tiers.${plan.id}`, { returnObjects: true }) as {
    name: string;
    tagline: string;
    freq: string;
    features: string[];
  };

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all ${
        plan.highlight
          ? "border-brand shadow-xl shadow-brand/10 bg-white ring-2 ring-brand"
          : "border-gray-200 bg-white shadow-sm hover:shadow-md"
      }`}
    >
      {plan.highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-brand text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
            {t("plans.card.mostPopular")}
          </span>
        </div>
      )}

      <div className="p-6 space-y-4 flex-1">
        {/* Header */}
        <div>
          <h3 className="text-xl font-black text-gray-900">{tier.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{tier.tagline}</p>
        </div>

        {/* Price */}
        <div>
          <span className="text-3xl font-black text-brand">{plan.priceLabel}</span>
          <span className="text-sm font-normal text-gray-400 ml-1">{t("plans.perMonth")}</span>
        </div>

        {/* Frequency badge */}
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/8 px-2.5 py-1 rounded-full">
          <Icons.Repeat2 size={12} />
          {tier.freq}
        </span>

        {/* Commitment */}
        <p className="text-[11px] text-gray-400 flex items-center gap-1">
          <Icons.Clock size={11} className="shrink-0" />
          {t("plans.card.commitment", { months: plan.minCommitmentMonths })}
        </p>

        {/* Features */}
        <ul className="space-y-2 pt-1">
          {tier.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Icons.Check size={14} className="text-brand mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Pressure washing perk badge */}
        {plan.includesPressureWashing && (
          <div className="flex items-start gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2">
            <Icons.Sparkles size={13} className="text-brand mt-0.5 shrink-0" />
            <span className="text-[11px] font-bold text-emerald-800">
              {t("plans.card.discount", { pct: plan.discountPct })}
            </span>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="p-6 pt-2">
        <button
          onClick={onSelect}
          className={`w-full py-3 rounded-xl text-sm font-bold border-none cursor-pointer transition-colors ${
            plan.highlight
              ? "bg-brand text-white hover:bg-brand/90"
              : "bg-brand/10 text-brand hover:bg-brand hover:text-white"
          }`}
        >
          {t("plans.card.getStarted")}
        </button>
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const { t } = useTranslation();
  const [modalPlan, setModalPlan]       = useState<HomePlan | null>(null);
  const [checkoutPlan, setCheckoutPlan] = useState<MembershipPlan | null>(null);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);

  // Load the real (Firestore-backed) membership plans so the "Get Started"
  // button can open the live checkout. Falls back to the lead-capture modal
  // when a matching plan hasn't been seeded.
  useEffect(() => {
    let cancelled = false;
    fetchMembershipPlans()
      .then((plans) => { if (!cancelled) setMembershipPlans(plans); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  const handleSelect = (plan: HomePlan) => {
    const match = membershipPlans.find((p) => p.id === plan.id);
    if (match) {
      setCheckoutPlan(match);
    } else {
      // Plan not available for self-serve checkout yet — capture the lead.
      setModalPlan(plan);
    }
  };

  const alwaysItems  = t("plans.included.alwaysItems", { returnObjects: true }) as string[];
  const notItems     = t("plans.included.notItems",    { returnObjects: true }) as string[];
  const policyItems  = t("plans.policies.items",       { returnObjects: true }) as { q: string; a: string }[];

  return (
    <PageShell
      seo={{
        title:       t("plans.pageTitle"),
        description: t("plans.metaDescription"),
      }}
    >
      <div className="bg-[#f0faf4]">

        {/* ── Hero ──────────────────────────────────────────────────────────── */}
        <section className="bg-[#0a2e1e] text-white py-16 px-4 text-center">
          <div className="max-w-2xl mx-auto space-y-4">
            <span className="inline-block bg-brand/20 text-brand text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-brand/30">
              {t("plans.hero.badge")}
            </span>
            <h1 className="text-3xl sm:text-4xl font-black leading-tight">
              {t("plans.hero.title")}
            </h1>
            <p className="text-white/60 text-base leading-relaxed">
              {t("plans.hero.subtitle")}
            </p>
          </div>
        </section>

        {/* ── Plan cards ────────────────────────────────────────────────────── */}
        <section className="max-w-6xl mx-auto px-4 py-14">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
            {HOME_PLANS.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                onSelect={() => handleSelect(plan)}
              />
            ))}
          </div>
        </section>

        {/* ── What's included ───────────────────────────────────────────────── */}
        <section className="bg-white border-t border-gray-100 py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-xl font-black text-gray-900 text-center mb-8">
              {t("plans.included.sectionTitle")}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-brand flex items-center gap-2">
                  <Icons.CheckCircle2 size={14} /> {t("plans.included.alwaysTitle")}
                </h4>
                {alwaysItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <Icons.Check size={14} className="text-brand shrink-0" />
                    {item}
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Icons.XCircle size={14} /> {t("plans.included.notTitle")}
                </h4>
                {notItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                    <Icons.Minus size={14} className="text-gray-300 shrink-0" />
                    {item}
                  </div>
                ))}
                <p className="text-[11px] text-gray-400 pt-1">{t("plans.included.addOnsNote")}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ── FAQ / Policies ────────────────────────────────────────────────── */}
        <section className="py-12 px-4">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-xl font-black text-gray-900 text-center mb-8">
              {t("plans.policies.title")}
            </h2>
            <div className="space-y-4">
              {policyItems.map((item, i) => (
                <details key={i} className="bg-white border border-gray-100 rounded-xl overflow-hidden group">
                  <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-sm text-gray-800 list-none">
                    {item.q}
                    <Icons.ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
                  </summary>
                  <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                    {item.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
        <section className="bg-[#0a2e1e] py-12 px-4 text-center">
          <div className="max-w-md mx-auto space-y-4">
            <h2 className="text-2xl font-black text-white">{t("plans.bottomCta.title")}</h2>
            <p className="text-white/50 text-sm">{t("plans.bottomCta.subtitle")}</p>
            <Link
              href="/book?service=house-cleaning"
              className="inline-block bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors"
            >
              {t("plans.bottomCta.button")}
            </Link>
          </div>
        </section>

      </div>

      {modalPlan && (
        <LeadModal plan={modalPlan} onClose={() => setModalPlan(null)} />
      )}

      {checkoutPlan && (
        <MembershipCheckoutModal
          plan={checkoutPlan}
          homeSize={DEFAULT_HOME_SIZE}
          homeSizeLabel={HOME_SIZE_LABELS[DEFAULT_HOME_SIZE] ?? DEFAULT_HOME_SIZE}
          onClose={() => setCheckoutPlan(null)}
        />
      )}
    </PageShell>
  );
}
