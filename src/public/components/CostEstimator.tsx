import React, { useState, useEffect, useMemo } from "react";
import * as Icons from "lucide-react";
import { CouponRule, Service, ServiceFactor, ServiceFactorOption } from "../../shared/types";
import { SERVICES_DATA } from "../../shared/data";
import { fetchPublicCouponByCode } from "../../shared/services/firebaseService";
import {
  calculateQuote,
  RECURRENCE_DISCOUNT_RATES,
  MEMBERSHIP_DISCOUNT_RATES,
  type RecurrenceKey,
} from "../../shared/services/pricingService";

interface CostEstimatorProps {
  initialServiceId?: string;
  activeMembership?: string | null;
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
  activeMembership = null, 
  onProceedToBook,
  services = SERVICES_DATA
}: CostEstimatorProps) {
  // 1. Core State
  const [activeServiceId, setActiveServiceId] = useState<string>(initialServiceId);
  const activeService = useMemo(() => {
    return services.find((s) => s.id === activeServiceId) || services[0];
  }, [activeServiceId, services]);

  const [units, setUnits] = useState<number>(activeService.popularUnitValue);
  
  // Custom factors states: maps factor.name to selected ServiceFactorOption
  const [selectedOptions, setSelectedOptions] = useState<{ [factorName: string]: ServiceFactorOption }>({});
  
  const [frequency, setFrequency] = useState<'once' | 'weekly' | 'bi-weekly' | 'monthly'>('once');
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<CouponRule | null>(null);
  const [couponStatus, setCouponStatus] = useState<{ type: "idle" | "success" | "error"; message: string }>({ type: "idle", message: "" });
  const [isCheckingCoupon, setIsCheckingCoupon] = useState(false);

  // 2. Reset calculations when service changes
  useEffect(() => {
    const selectedSvc = services.find((s) => s.id === activeServiceId) || services[0];
    setUnits(selectedSvc.popularUnitValue);
    
    // Initialize default factors (first option for each factor)
    const defaults: { [factorName: string]: ServiceFactorOption } = {};
    selectedSvc.factors.forEach((f) => {
      defaults[f.name] = f.options[0];
    });
    setSelectedOptions(defaults);
  }, [activeServiceId, services]);

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
        membership: activeMembership,
        coupon: appliedCoupon,
      }),
    [activeService, units, selectedFactors, frequency, activeMembership, appliedCoupon]
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
    const memberDiscountRate = MEMBERSHIP_DISCOUNT_RATES[activeMembership ?? ""] ?? 0;

    // couponDiscount is negative in the quote (it's a deduction); bring to positive for display
    const couponDiscountAmount = Math.abs(quote.couponDiscount);
    // totalBeforeCoupon = total + |couponDiscount|  (since total = beforeCoupon + negativeDiscount)
    const totalBeforeCoupon = quote.total - quote.couponDiscount;

    const addonsList = quote.lineItems
      .filter((li) => li.type === "factor")
      .map((li) => ({ label: li.label.replace(/\(\+\s*\$\d+\)/, "").trim(), cost: li.amount }));

    const freqPct = Math.round(discountRate * 100);
    const frequencyLabels: Record<string, string> = {
      once:        "One-Time Service",
      weekly:      `Weekly Subscription (-${freqPct}%)`,
      "bi-weekly": `Bi-Weekly Subscription (-${freqPct}%)`,
      monthly:     `Monthly Subscription (-${freqPct}%)`,
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
      memberDiscountRate,
      membershipDiscountAmount: Math.abs(quote.membershipDiscount),
      totalBeforeCoupon,
      couponDiscountAmount,
      couponInvalidReason:      quote.couponError ?? "",
      finalTotal:               quote.total,
      estTimeStr,
    };
  }, [quote, activeMembership]);

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

  const handleFactorChange = (factorName: string, option: ServiceFactorOption) => {
    setSelectedOptions((prev) => ({
      ...prev,
      [factorName]: option
    }));
  };

const handleApplyCoupon = async () => {
    const code = couponInput.trim().toUpperCase();
    if (!code) {
      setCouponStatus({ type: "error", message: "Enter a coupon code." });
      return;
    }

    setIsCheckingCoupon(true);
    setCouponStatus({ type: "idle", message: "" });
    try {
      const coupon = await fetchPublicCouponByCode(code);
      if (!coupon) {
        setAppliedCoupon(null);
        setCouponStatus({ type: "error", message: "Coupon not found or unavailable." });
        return;
      }

      setAppliedCoupon(coupon);
      setCouponInput(coupon.code);
      setCouponStatus({ type: "success", message: `Coupon ${coupon.code} is applied.` });
    } catch (error) {
      setAppliedCoupon(null);
      setCouponStatus({ type: "error", message: error instanceof Error ? error.message : "Could not validate coupon." });
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
    <div className="w-full">
      {/* Services selector tabs */}
      <div className="mb-8 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:justify-center border-b border-gray-100 pb-4">
        {services.map((svc) => {
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
              Live Price Simulator
            </span>
            <h2 className="mt-2.5 text-xl font-bold text-gray-900 tracking-tight">
              Customize Your {activeService.name} Pack
            </h2>
            <p className="mt-1 text-xs text-gray-500">
              Adjust size, add premium add-ons, and select frequency to generate an instant quote.
            </p>
          </div>

          {/* Stepper Input or Slider depending on size */}
          <div className="bg-gray-50/50 rounded-xl p-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-sm font-bold text-gray-900 tracking-tight block">
                  {activeService.unitLabel}
                </label>
                <span className="text-[11px] text-gray-400 font-medium">
                  {activeService.id === "house-cleaning" && "* Bedrooms & bathrooms are set via the options below"}
                  {activeService.id === "tv-installation" && "* First TV bracket install covered in basic rate"}
                  {activeService.id === "lawn-mowing" && "* Rate is calculated per 1,000 sq ft block"}
                  {activeService.id === "furniture-assembly" && "* Select number of retail flat-pack boxes"}
                  {activeService.id === "pressure-washing" && "* Rate calculated per 500 sq ft area units"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-400 block font-medium">Current Selection</span>
                <span className="text-base font-extrabold text-brand tracking-tight">
                  {unitLabelValue}
                </span>
              </div>
            </div>

            {/* Layout Controls */}
            <div className="mt-4 flex items-center gap-4">
              <button
                type="button"
                onClick={decrementUnits}
                disabled={units <= activeService.minUnits}
                className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-all cursor-pointer"
              >
                <Icons.Minus size={18} />
              </button>
              
              {/* Range Slider for immediate tactile control */}
              <input
                type="range"
                min={activeService.minUnits}
                max={activeService.maxUnits}
                step={activeService.stepUnits}
                value={units}
                onChange={(e) => setUnits(Number(e.target.value))}
                className="flex-grow accent-brand h-1.5 bg-gray-200 rounded-lg cursor-pointer"
              />

              <button
                type="button"
                onClick={incrementUnits}
                disabled={units >= activeService.maxUnits}
                className="flex items-center justify-center w-11 h-11 rounded-lg border border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand disabled:opacity-40 disabled:hover:border-gray-200 disabled:hover:text-gray-600 transition-all cursor-pointer"
              >
                <Icons.Plus size={18} />
              </button>
            </div>
          </div>

          {/* Core Custom Factors */}
          <div className="space-y-4">
            {activeService.factors.map((factor) => {
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
                        // Display short label: "Studio", "1", "2", "3", "4", "5", "6+"
                        const shortLabel = idx === 0
                          ? (opt.label.toLowerCase().includes("studio") ? "Studio" : String(idx))
                          : opt.label.replace(/\s*(bedroom|bathroom|bath|br)s?/gi, "").trim();
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

          {/* Frequency & Subscriptions discounts */}
          <div className="border-t border-gray-100 pt-5 space-y-3">
            <div>
              <span className="text-xs text-gray-500 font-bold tracking-tight uppercase block flex items-center justify-between">
                <span>Service Frequency</span>
                <span className="text-[10px] text-brand font-extrabold normal-case bg-brand-light px-2 py-0.5 rounded">
                  Save on Repeat Contracts
                </span>
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {([
                { id: "once"      , label: "One-Time" , sub: "Standard" },
                { id: "weekly"    , label: "Weekly"   , sub: `Save ${Math.round(RECURRENCE_DISCOUNT_RATES.weekly      * 100)}%` },
                { id: "bi-weekly" , label: "Bi-Weekly", sub: `Save ${Math.round(RECURRENCE_DISCOUNT_RATES["bi-weekly"] * 100)}%` },
                { id: "monthly"   , label: "Monthly"  , sub: `Save ${Math.round(RECURRENCE_DISCOUNT_RATES.monthly     * 100)}%` },
              ] as const).map((freqItem) => {
                const isActive = frequency === freqItem.id;
                return (
                  <button
                    key={freqItem.id}
                    type="button"
                    onClick={() => setFrequency(freqItem.id as any)}
                    className={`flex flex-col items-center justify-center text-center p-3 rounded-xl border transition-all cursor-pointer ${
                      isActive
                        ? "border-brand bg-brand-light text-brand shadow-sm"
                        : "border-gray-100 hover:border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    <span className="text-xs font-bold leading-none">{freqItem.label}</span>
                    <span className={`text-[10px] mt-1.5 px-1.5 py-0.5 rounded font-extrabold leading-none ${
                      isActive ? "bg-brand text-white" : freqItem.id !== "once" ? "bg-brand-light text-brand" : "bg-gray-100 text-gray-400"
                    }`}>
                      {freqItem.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Dynamic Receipt Block (5 cols lg) */}
        <div className="lg:col-span-5">
          <div className="sticky top-24 bg-white rounded-2xl border border-gray-200 shadow-lg p-6 md:p-8 space-y-6 overflow-hidden">
            {/* Visual Header Graphic */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-brand"></div>
            
            <div className="flex justify-between items-start border-b border-gray-100 pb-4">
              <div>
                <h3 className="text-base font-bold text-gray-900 tracking-tight">Dynamic Estimate</h3>
                <span className="text-[10px] text-gray-400 font-medium">Springfield Dispatch Hub</span>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gray-50 text-gray-400">
                <Icons.Calculator size={18} />
              </div>
            </div>

            {/* Thermal Ticket Inner */}
            <div className="space-y-4 font-mono text-xs text-gray-600">
              {/* Row 1 */}
              <div className="flex justify-between">
                <span>{activeService.name} Base:</span>
                <span className="font-bold text-gray-900">${pricingBreakdown.basePrice}.00</span>
              </div>

              {/* Row 2 */}
              {pricingBreakdown.additionalUnitsCost > 0 && (
                <div className="flex justify-between">
                  <span>Additional Units:</span>
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
                <span>Service Subtotal:</span>
                <span>${pricingBreakdown.subtotal}.00</span>
              </div>

              {/* Frequency Discount */}
              {pricingBreakdown.discountAmount > 0 && (
                <div className="flex justify-between text-emerald-600 bg-emerald-50 p-2 rounded text-[11px] font-bold">
                  <span>{pricingBreakdown.frequencyText}:</span>
                  <span>-${pricingBreakdown.discountAmount.toFixed(2)}</span>
                </div>
              )}

              {/* Membership Discount */}
              {pricingBreakdown.membershipDiscountAmount > 0 && (
                <div className="flex justify-between text-brand bg-brand-light/60 p-2 rounded text-[11px] font-bold border border-brand/15">
                  <span className="capitalize">{activeMembership} Member Savings (-{(pricingBreakdown.memberDiscountRate * 100).toFixed(0)}%):</span>
                  <span>-${pricingBreakdown.membershipDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/60 p-3 font-sans space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-widest text-gray-500">
                    Promo Code
                  </span>
                  {appliedCoupon && (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[10px] font-bold text-gray-400 hover:text-rose-500 transition-colors cursor-pointer"
                    >
                      Remove
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
                    placeholder="SAVE20"
                    className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold uppercase tracking-wide text-gray-800 placeholder:text-gray-300 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCoupon}
                    disabled={isCheckingCoupon}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[10px] font-extrabold uppercase tracking-wider text-white transition-colors hover:bg-brand disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isCheckingCoupon && <Icons.Loader size={12} className="animate-spin" />}
                    <span>{isCheckingCoupon ? "Checking" : "Apply"}</span>
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
                  <span>Coupon {appliedCoupon.code}:</span>
                  <span>-${pricingBreakdown.couponDiscountAmount.toFixed(2)}</span>
                </div>
              )}

              <div className="border-t-2 border-double border-gray-300 pt-4 flex justify-between items-baseline">
                <span className="font-sans text-sm font-extrabold text-gray-900">Estimated Total:</span>
                <span className="font-sans text-2xl font-extrabold text-brand tracking-tight">
                  ${pricingBreakdown.finalTotal.toFixed(2)}
                </span>
              </div>

              {/* Time Indicator */}
              <div className="flex items-center gap-2 bg-brand-light text-brand p-2.5 rounded-xl font-sans font-semibold text-xs">
                <Icons.Clock size={14} className="flex-shrink-0" />
                <span>Completion Window: approx. {pricingBreakdown.estTimeStr}</span>
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
                <span>Proceed to Scheduling</span>
                <Icons.ArrowRight size={16} />
              </button>
              
              <div className="flex justify-center items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                <Icons.ShieldCheck size={14} className="text-emerald-500" />
                <span>No pre-payment. Cancel anytime.</span>
              </div>
            </div>

            {/* Specifications Summary */}
            <div className="border-t border-gray-100 pt-4">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">Included In This Service Quote:</span>
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
    </div>
  );
}
