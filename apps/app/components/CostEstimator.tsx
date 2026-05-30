import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import * as Icons from "lucide-react";
import { useTranslation } from "react-i18next";
import { CouponRule, Service, ServiceFactor, ServiceFactorOption } from "@grenbee/types";
import { SERVICES_DATA } from "@grenbee/config";
import { useTranslatedServices } from "@/hooks/useTranslatedService";
import { fetchPublicCouponByCode } from "@grenbee/firebase/services";
import {
  calculateQuote,
  RECURRENCE_DISCOUNT_RATES,
  type RecurrenceKey,
} from "@grenbee/firebase/services";

interface CostEstimatorProps {
  initialServiceId?: string;
  onProceedToBook: (bookingParams: {
    serviceId: string;
    units: number;
    selectedFactors: { [factorName: string]: { label: string; modifier: number } };
    frequency: 'once' | 'weekly' | 'bi-weekly' | 'monthly';
    totalCost: number;
    originalCost?: number;
    couponCode?: string;
    couponDiscount?: number;
  }) => void;
  services?: Service[];
}

export default function CostEstimator({
  initialServiceId = "house-cleaning",
  onProceedToBook,
  services = SERVICES_DATA
}: CostEstimatorProps) {
  const { t } = useTranslation();
  // Translate service text (name, tagline, factor labels) for current language
  const translatedServices = useTranslatedServices(services);
  const activeServices = useMemo(() => translatedServices.filter((s) => s.active !== false), [translatedServices]);

  // 1. Core State
  const [activeServiceId, setActiveServiceId] = useState<string>(initialServiceId);

  // Sync if parent changes the initialServiceId prop after mount
  useEffect(() => {
    if (initialServiceId && initialServiceId !== activeServiceId) {
      setActiveServiceId(initialServiceId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialServiceId]);

  const activeService = useMemo(() => {
    return activeServices.find((s) => s.id === activeServiceId) || activeServices[0];
  }, [activeServiceId, activeServices]);

  const [units, setUnits] = useState<number>(activeService.popularUnitValue);
  
  // Custom factors states: maps factor.name to selected ServiceFactorOption
  const [selectedOptions, setSelectedOptions] = useState<{ [factorName: string]: ServiceFactorOption }>({});
  
  // Frequency is always one-time — recurring plans live on /plans
  const frequency = 'once' as const;
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRule | null>(null);
  const [couponStatus, setCouponStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  // 2. Reset calculations when service changes
  useEffect(() => {
    const selectedSvc = activeServices.find((s) => s.id === activeServiceId) || activeServices[0];
    setUnits(selectedSvc.popularUnitValue);

    // Initialize default factors (first option for each factor)
    const defaults: { [factorName: string]: ServiceFactorOption } = {};
    selectedSvc.factors.forEach((f) => {
      defaults[f.name] = f.options[0];
    });
    setSelectedOptions(defaults);
  }, [activeServiceId, activeServices]);

  // ── Transform selectedOptions → selectedFactors (format expected by pricingService) ──
  const selectedFactors = useMemo(() => {
    const result: Record<string, { label: string; modifier: number }> = {};
    for (const [name, opt] of Object.entries(selectedOptions) as [string, ServiceFactorOption][]) {
      result[name] = { label: opt.label, modifier: opt.priceModifier };
    }
    return result;
  }, [selectedOptions]);

  // ── Canonical pricing engine ──────────────────────────────────────────────────
  const quote = useMemo(
    () =>
      calculateQuote({
        service: activeService,
        units,
        selectedFactors,
        recurrence: frequency as RecurrenceKey,
        coupon: appliedCoupon,
      }),
    [activeService, units, selectedFactors, frequency, appliedCoupon]
  );

  // 3. Calculation Helpers
  const unitLabelValue = useMemo(() => {
    if (activeService.id === "lawn-mowing") {
      return `${units * 1000} sq ft`;
    }
    if (activeService.id === "pressure-washing") {
      return `${units * 500} sq ft`;
    }
    return `${units} ${activeService.unitName}${units !== 1 ? 's' : ''}`;
  }, [units, activeService]);

  // ── pricingBreakdown shim — maps canonical quote to legacy UI field names ──────
  const pricingBreakdown = useMemo(() => {
    const discountRate    = RECURRENCE_DISCOUNT_RATES[quote.recurrence];

    // couponDiscount is negative in the quote (it's a deduction); bring to positive for display
    const couponDiscountAmount = Math.abs(quote.couponDiscount);
    // totalBeforeCoupon = total + |couponDiscount|  (since total = beforeCoupon + negativeDiscount)
    const totalBeforeCoupon = quote.total - quote.couponDiscount;

    const addonsList = quote.lineItems
      .filter((li) => li.type === "factor")
      .map((li) => ({ label: li.label.replace(/\(\+\s*\$\d+\)/, "").trim(), cost: li.amount }));

    const freqPct = Math.round(discountRate * 100);
    const frequencyLabels: Record<string, string> = {
      once:        t("estimator.frequency.receiptOnce"),
      weekly:      t("estimator.frequency.receiptWeekly",   { pct: freqPct }),
      "bi-weekly": t("estimator.frequency.receiptBiWeekly", { pct: freqPct }),
      monthly:     t("estimator.frequency.receiptMonthly",  { pct: freqPct }),
    };

    const estimatedMinutes = quote.estimatedDurationMin;
    const estHours = Math.floor(estimatedMinutes / 60);
    const estMins  = estimatedMinutes % 60;
    const estTimeStr = estHours > 0
      ? `${estHours} hr${estMins > 0 ? ` ${estMins} min` : ""}`
      : `${estMins} mins`;

    return {
      basePrice:                quote.basePrice,
      additionalUnitsCost:      quote.unitsCost,
      factorsCost:              quote.factorsCost,
      addonsList,
      subtotal:                 quote.subtotal,
      discountAmount:           Math.abs(quote.recurrenceDiscount),
      discountRate,
      frequencyText:            frequencyLabels[quote.recurrence] ?? "One-Time Service",
      totalBeforeCoupon,
      couponDiscountAmount,
      couponInvalidReason:      quote.couponError ?? "",
      finalTotal:               quote.total,
      estTimeStr,
    };
  }, [quote]);

  // Adjust units
  const incrementUnits = () => {
    if (units < activeService.maxUnits) {
      setUnits(units + activeService.stepUnits);
    }
  };

  const decrementUnits = () => {
    if (units > activeService.minUnits) {
      setUnits(units - activeService.stepUnits);
    }
  };

  // ── Bedroom factor helpers (promoted to primary slider for house-cleaning) ──
  const bedroomFactor = useMemo(
    () => activeService.factors.find((f) => f.name === "bedroomCount") ?? null,
    [activeService]
  );
  const bedroomIdx = useMemo(() => {
    if (!bedroomFactor) return 0;
    const sel = selectedOptions["bedroomCount"];
    if (!sel) return 0;
    return bedroomFactor.options.findIndex((o) => o.label === sel.label);
  }, [bedroomFactor, selectedOptions]);

  const setBedroomIdx = (idx: number) => {
    if (!bedroomFactor) return;
    const opt = bedroomFactor.options[idx];
    if (opt) handleFactorChange("bedroomCount", opt);
  };

  /** Computed track fill % for any range input */
  const rangePct = (val: number, min: number, max: number) =>
    max > min ? Math.round(((val - min) / (max - min)) * 100) : 0;

  const handleFactorChange = (factorName: string, option: ServiceFactorOption) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [factorName]: option
    }));
  };

const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponStatus({ type: "error", message: t("estimator.coupon.enterCode") });
      return;
    }

    setIsCheckingCoupon(true);
    setCouponStatus({ type: "idle", message: "" });
    try {
      const coupon = await fetchPublicCouponByCode(code);
      if (!coupon) {
        setAppliedCoupon(null);
        setCouponStatus({ type: "error", message: t("estimator.coupon.notFound") });
        return;
      }

      setAppliedCoupon(coupon);
      setCouponInput(coupon.code);
      setCouponStatus({ type: "success", message: t("estimator.coupon.applied", { code: coupon.code }) });
    } catch (error) {
      setAppliedCoupon(null);
      setCouponStatus({ type: "error", message: error instanceof Error ? error.message : t("estimator.coupon.error") });
    } finally {
      setIsCheckingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponStatus({ type: "idle", message: "" });
  };

  // Dispatch details
  const triggerProceed = () => {
    if (appliedCoupon && pricingBreakdown.couponInvalidReason) {
      setCouponStatus({ type: "error", message: pricingBreakdown.couponInvalidReason });
      return;
    }

    // Collect factors representation
    const factorsFinal: { [factorName: string]: { label: string; modifier: number } } = {};
    (Object.entries(selectedOptions) as [string, ServiceFactorOption][]).forEach(([name, opt]) => {
      factorsFinal[name] = {
        label: opt.label,
        modifier: opt.priceModifier
      };
    });

    onProceedToBook({
      serviceId: activeServiceId,
      units,
      selectedFactors: factorsFinal,
      frequency,
      totalCost: pricingBreakdown.finalTotal,
      originalCost: pricingBreakdown.totalBeforeCoupon,
      couponCode: appliedCoupon && pricingBreakdown.couponDiscountAmount > 0 ? appliedCoupon.code : undefined,
      couponDiscount: pricingBreakdown.couponDiscountAmount > 0 ? pricingBreakdown.couponDiscountAmount : undefined
    });
  };

  return (
    <div className="w-full pb-20 lg:pb-0">
      {/* Services selector tabs */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center border-b border-gray-100 pb-4">
        {activeServices.map((svc) => {
          const SvcIcon = (Icons as any)[svc.iconName] || Icons.HelpCircle;
          const isActive = svc.id === activeServiceId;
          return (
            <button
              id={`estimator-tab-${svc.id}`}
              key={svc.id}
              onClick={() => setActiveServiceId(svc.id)}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-xs font-bold transition-all duration-200 border cursor-pointer ${
                isActive
                  ? "bg-brand text-white border-brand shadow-sm shadow-brand/20"
                  : "bg-white text-gray-600 border-gray-200 hover:border-brand/40 hover:text-brand"
              }`}
            >
              <SvcIcon size={14} />
              <span>{svc.name}</span>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start lg:items-stretch">
        {/* Left Interactive Calculator (8 cols lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[10px] text-brand font-extrabold uppercase tracking-widest bg-brand-light px-2.5 py-1 rounded-full">
              {t("estimator.badge")}
            </span>
            <h2 className="mt-2.5 text-xl font-bold text-gray-900 tracking-tight">
              {t("estimator.title", { service: activeService.name })}
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              {t("estimator.subtitle")}
            </p>
          </div>

          {/* ── PRIMARY: Bedroom slider (house-cleaning) or unit slider (other services) ── */}
          {bedroomFactor ? (
            /* ── BEDROOM COUNT — promoted primary slider ── */
            <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-gray-900 tracking-tight block">
                    {bedroomFactor.label}
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {t(`estimator.serviceNotes.${activeService.id}` as any)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium">{t("estimator.currentSelection")}</span>
                  <span className="text-base font-extrabold text-brand tracking-tight">
                    {bedroomFactor.options[bedroomIdx]?.label ?? "—"}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setBedroomIdx(Math.max(0, bedroomIdx - 1))}
                  disabled={bedroomIdx <= 0}
                  className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Icons.Minus size={18} />
                </button>
                <input
                  type="range"
                  min={0}
                  max={bedroomFactor.options.length - 1}
                  step={1}
                  value={bedroomIdx}
                  onChange={(e) => setBedroomIdx(Number(e.target.value))}
                  className="estimator-range flex-grow"
                  style={{
                    background: `linear-gradient(to right, #0EAD6B ${rangePct(bedroomIdx, 0, bedroomFactor.options.length - 1)}%, #e5e7eb ${rangePct(bedroomIdx, 0, bedroomFactor.options.length - 1)}%)`,
                  }}
                />
                <button
                  type="button"
                  onClick={() => setBedroomIdx(Math.min(bedroomFactor.options.length - 1, bedroomIdx + 1))}
                  disabled={bedroomIdx >= bedroomFactor.options.length - 1}
                  className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Icons.Plus size={18} />
                </button>
              </div>
            </div>
          ) : activeService.maxUnits > activeService.minUnits ? (
            /* ── UNIT SLIDER — for other services (lawn, pressure-washing, etc.) ── */
            <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-bold text-gray-900 tracking-tight block">
                    {activeService.unitLabel}
                  </label>
                  <span className="text-[11px] text-gray-400 font-medium">
                    {t(`estimator.serviceNotes.${activeService.id}` as any)}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-gray-400 block font-medium">{t("estimator.currentSelection")}</span>
                  <span className="text-base font-extrabold text-brand tracking-tight">
                    {unitLabelValue}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="button"
                  onClick={decrementUnits}
                  disabled={units <= activeService.minUnits}
                  className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Icons.Minus size={18} />
                </button>
                <input
                  type="range"
                  min={activeService.minUnits}
                  max={activeService.maxUnits}
                  step={activeService.stepUnits}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="estimator-range flex-grow"
                  style={{
                    background: `linear-gradient(to right, #0EAD6B ${rangePct(units, activeService.minUnits, activeService.maxUnits)}%, #e5e7eb ${rangePct(units, activeService.minUnits, activeService.maxUnits)}%)`,
                  }}
                />
                <button
                  type="button"
                  onClick={incrementUnits}
                  disabled={units >= activeService.maxUnits}
                  className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Icons.Plus size={18} />
                </button>
              </div>
            </div>
          ) : null}

          {/* Core Custom Factors */}
          {/* Bathrooms + extra rooms for house-cleaning, rendered after the bedroom primary slider */}
          {bedroomFactor && activeService.maxUnits > activeService.minUnits && (
            <div className="bg-gray-50/30 rounded-xl p-4 border border-gray-100/80 space-y-1">
              <label className="text-xs text-gray-500 font-bold tracking-tight uppercase block">
                {activeService.unitLabel}
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={decrementUnits}
                  disabled={units <= activeService.minUnits}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 transition-all cursor-pointer text-sm"
                >
                  <Icons.Minus size={14} />
                </button>
                <input
                  type="range"
                  min={activeService.minUnits}
                  max={activeService.maxUnits}
                  step={activeService.stepUnits}
                  value={units}
                  onChange={(e) => setUnits(Number(e.target.value))}
                  className="estimator-range flex-grow"
                  style={{
                    background: `linear-gradient(to right, #0EAD6B ${rangePct(units, activeService.minUnits, activeService.maxUnits)}%, #e5e7eb ${rangePct(units, activeService.minUnits, activeService.maxUnits)}%)`,
                  }}
                />
                <button
                  type="button"
                  onClick={incrementUnits}
                  disabled={units >= activeService.maxUnits}
                  className="flex items-center justify-center w-8 h-8 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 transition-all cursor-pointer"
                >
                  <Icons.Plus size={14} />
                </button>
                <span className="text-sm font-bold text-brand min-w-[3rem] text-right">
                  {unitLabelValue}
                </span>
              </div>
            </div>
          )}

          <div className="space-y-4">
            {activeService.factors.map((factor) => {
              // bedroomCount is now the primary slider above — skip it here
              if (factor.name === "bedroomCount" && bedroomFactor) return null;

              if (factor.displayType === "stepper") {
                // ── Button-group (numbered pill) UI ──────────────────────
                const currentOpt = selectedOptions[factor.name] ?? factor.options[0];
                const currentIdx = factor.options.findIndex((o) => o.label === currentOpt.label);
                return (
                  <div key={factor.name} className="space-y-2">
                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-gray-500 font-bold tracking-tight uppercase">
                        {factor.label}
                      </span>
                      <span className="text-xs font-semibold text-brand">
                        {currentOpt.label}
                        {currentOpt.priceModifier > 0 && ` · +$${currentOpt.priceModifier}`}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {factor.options.map((opt, idx) => {
                        const isSelected = currentIdx === idx;
                        // Fix: extract the number from the label instead of using idx
                        // "1 Bathroom" → "1", "2 Bedrooms" → "2", "Studio" → "Studio", "6+" → "6+"
                        const stripped = opt.label.replace(/\s*(bedroom|bathroom|bath|br)s?/gi, "").trim();
                        const shortLabel = stripped || String(idx);
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleFactorChange(factor.name, opt)}
                            className={`h-10 min-w-[2.75rem] px-3 rounded-xl text-sm font-bold border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-brand text-white border-brand shadow-sm"
                                : "bg-white text-gray-600 border-gray-200 hover:border-brand hover:text-brand"
                            }`}
                          >
                            {shortLabel}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              }

              // ── Default radio-card UI ─────────────────────────────────
              return (
                <div key={factor.name} className="space-y-2">
                  <span className="text-xs text-gray-500 font-bold tracking-tight uppercase block">
                    {factor.label}
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {factor.options.map((opt, idx) => {
                      const isSelected = selectedOptions[factor.name]?.label === opt.label;
                      return (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleFactorChange(factor.name, opt)}
                          className={`flex items-start text-left gap-3 p-3.5 rounded-xl border transition-all cursor-pointer ${
                            isSelected
                              ? "border-brand bg-brand-light text-brand ring-1 ring-brand"
                              : "border-gray-100 hover:border-gray-200 bg-white text-gray-700"
                          }`}
                        >
                          <div className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full border border-gray-300">
                            {isSelected && (
                              <span className="h-2 w-2 rounded-full bg-brand"></span>
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-semibold block leading-tight">
                              {opt.label.replace(/\(\+\s*\$\d+\)/, "").trim()}
                            </span>
                            <span className="text-[10px] text-gray-400 block font-medium mt-0.5">
                              {opt.priceModifier === 0 ? "Standard Base Rate" : `+$${opt.priceModifier} service fee`}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Plans upsell — recurring → /plans */}
          <div className="border-t border-gray-100 pt-4">
            <Link
              href="/us/plans"
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors group"
            >
              <div>
                <p className="text-xs font-extrabold text-amber-700">{t("estimator.plansUpsell.title")}</p>
                <p className="text-[11px] text-amber-600/80 mt-0.5">{t("estimator.plansUpsell.sub")}</p>
              </div>
              <span className="text-amber-500 group-hover:translate-x-0.5 transition-transform text-sm">→</span>
            </Link>
          </div>
        </div>

        {/* Right Dynamic Receipt Block (5 cols lg) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-lg p-6 md:p-8 space-y-6 overflow-hidden">
            {/* Visual Header Graphic */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand"></div>
            
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">{t("estimator.receipt.title")}</h3>
                <span className="text-[10px] text-gray-400 font-medium">Grenbee</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <Icons.Calculator size={18} />
              </div>
            </div>

            {/* Thermal Ticket Inner */}
            <div className="space-y-4 font-mono text-xs text-gray-600">
              {/* Row 1 */}
              <div className="flex justify-between">
                <span>{t("estimator.receipt.base", { service: activeService.name })}</span>
                <span className="font-bold text-gray-900">${pricingBreakdown.basePrice}.00</span>
              </div>

              {/* Row 2 */}
              {pricingBreakdown.additionalUnitsCost > 0 && (
                <div className="flex justify-between">
                  <span>{t("estimator.receipt.additionalUnits")}</span>
                  <span className="font-bold text-gray-900">+${pricingBreakdown.additionalUnitsCost}.00</span>
                </div>
              )}

              {/* Add-ons Factor Breakdown */}
              {pricingBreakdown.addonsList.map((addon, idx) => (
                <div key={idx} className="flex justify-between text-gray-500">
                  <span className="truncate max-w-[180px]">• {addon.label}:</span>
                  <span className="font-semibold text-gray-900">+${addon.cost}.00</span>
                </div>
              ))}

              <div className="border-t border-dashed border-gray-200 pt-3 flex justify-between font-bold text-gray-800">
                <span>{t("estimator.receipt.subtotal")}</span>
                <span>${pricingBreakdown.subtotal}.00</span>
              </div>

              {/* Frequency Discount */}
              {pricingBreakdown.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 bg-emerald-50 p-2 rounded text-[11px] font-bold">
                  <span>{pricingBreakdown.frequencyText}:</span>
                  <span>-${pricingBreakdown.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 font-sans space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                    {t("estimator.coupon.label")}
                  </span>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[10px] font-bold text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      {t("estimator.coupon.remove")}
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => {
                      setCouponInput(e.target.value.toUpperCase());
                      if (!e.target.value.trim()) {
                        setCouponStatus({ type: "idle", message: "" });
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleApplyCoupon();
                      }
                    }}
                    placeholder={t("estimator.coupon.placeholder")}
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-800 placeholder:text-gray-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isCheckingCoupon}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white transition-colors hover:bg-brand disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCheckingCoupon && <Icons.Loader size={12} className="animate-spin" />}
                    <span>{isCheckingCoupon ? t("estimator.coupon.checking") : t("estimator.coupon.apply")}</span>
                  </button>
                </div>

                {(couponStatus.message || pricingBreakdown.couponInvalidReason) && (
                  <div className={`flex items-start gap-1.5 rounded-lg px-2.5 py-2 text-[10px] font-bold leading-normal ${
                    pricingBreakdown.couponInvalidReason || couponStatus.type === "error"
                      ? "bg-rose-50 text-rose-600"
                      : "bg-emerald-50 text-emerald-700"
                  }`}>
                    {pricingBreakdown.couponInvalidReason || couponStatus.type === "error" ? (
                      <Icons.AlertCircle size={12} className="mt-0.5 shrink-0" />
                    ) : (
                      <Icons.BadgeCheck size={12} className="mt-0.5 shrink-0" />
                    )}
                    <span>{pricingBreakdown.couponInvalidReason || couponStatus.message}</span>
                  </div>
                )}
              </div>

              {pricingBreakdown.couponDiscountAmount > 0 && appliedCoupon && (
                <div className="flex justify-between text-emerald-700 bg-emerald-50 p-2 rounded text-[11px] font-bold border border-emerald-100">
                  <span>{t("estimator.receipt.coupon", { code: appliedCoupon.code })}</span>
                  <span>-${pricingBreakdown.couponDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t-2 border-double border-gray-300 pt-4 flex justify-between items-baseline">
                <span className="font-sans text-sm font-extrabold text-gray-900">{t("estimator.receipt.estimatedTotal")}</span>
                <span className="font-sans text-2xl font-extrabold text-brand tracking-tight">
                  ${pricingBreakdown.finalTotal.toFixed(2)}
                </span>
              </div>

              {/* Time Indicator */}
              <div className="flex items-center gap-2 bg-brand-light text-brand p-2.5 rounded-xl font-sans font-semibold text-xs">
                <Icons.Clock size={14} className="flex-shrink-0" />
                <span>{t("estimator.receipt.completionWindow", { time: pricingBreakdown.estTimeStr })}</span>
              </div>
            </div>

            {/* Action booking block */}
            <div className="space-y-3">
              <button
                type="button"
                id="btn-proceed-estimate"
                onClick={triggerProceed}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md shadow-brand/10 transition-all hover:scale-[1.01] cursor-pointer"
              >
                <span>{t("estimator.cta.proceed")}</span>
                <Icons.ArrowRight size={16} />
              </button>
              
              <div className="flex justify-center items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                <Icons.ShieldCheck size={14} className="text-emerald-500" />
                <span>{t("estimator.cta.trust")}</span>
              </div>
            </div>

            {/* Specifications Summary */}
            <div className="border-t border-gray-100 pt-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">{t("estimator.included")}</span>
              <ul className="space-y-1.5 text-xs text-gray-500">
                {activeService.includedSpecs.map((spec, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <Icons.CheckCircle size={12} className="text-brand flex-shrink-0 mt-0.5" />
                    <span>{spec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* ── Mobile sticky price bar ─────────────────────────────────────────
           Visible only below lg breakpoint. Floats at the bottom of the screen
           so users can see the live price and proceed without scrolling down
           to the receipt sidebar (which is hidden on mobile).               */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/95 backdrop-blur-sm px-4 py-3 flex items-center gap-3 shadow-lg">
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">
            {activeService.name}
          </p>
          <p className="text-xl font-extrabold text-brand leading-none">
            ${pricingBreakdown.finalTotal.toFixed(2)}
          </p>
        </div>
        <button
          type="button"
          onClick={triggerProceed}
          className="shrink-0 flex items-center gap-2 py-2.5 px-5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md shadow-brand/20 transition-all cursor-pointer"
        >
          <span>{t("estimator.cta.proceed")}</span>
          <Icons.ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
