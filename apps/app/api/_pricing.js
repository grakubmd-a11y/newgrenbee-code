/**
 * Canonical server-side pricing engine.
 * All service prices here are the authoritative source for PaymentIntent creation.
 * Must stay in sync with src/shared/data.ts — or replace with Firestore fetch for dynamic pricing.
 */

export const SERVICE_PRICING = {
  "house-cleaning":     { basePrice: 85,  pricePerUnit: 25, unitCalc: "cleaning" },
  "tv-installation":    { basePrice: 95,  pricePerUnit: 40, unitCalc: "tv"       },
  "lawn-mowing":        { basePrice: 45,  pricePerUnit: 15, unitCalc: "standard" },
  "furniture-assembly": { basePrice: 60,  pricePerUnit: 25, unitCalc: "standard" },
  "pressure-washing":   { basePrice: 95,  pricePerUnit: 30, unitCalc: "standard" },
  "wall-mounting":      { basePrice: 55,  pricePerUnit: 20, unitCalc: "standard" },
};

/**
 * Allowed factor modifiers per service.
 * Any modifier not in this set for its factor is rejected as tampered input.
 */
export const ALLOWED_MODIFIERS = {
  "house-cleaning": {
    cleanType:  new Set([0, 45, 75]),
    petFactor:  new Set([0, 25]),
  },
  "tv-installation": {
    mountType:    new Set([0, 20, 48]),
    wallMaterial: new Set([0, 25, 30]),
    wireHiding:   new Set([0, 45]),
  },
  "lawn-mowing": {
    grassHeight:      new Set([0, 25, 65]),
    baggingClippings: new Set([0, 10]),
  },
  "furniture-assembly": {
    furnitureComplexity: new Set([0, 25, 50]),
    wallAnchor:          new Set([0, 15]),
  },
  "pressure-washing": {
    surfaceMaterial: new Set([0, 25, 40]),
    oilTreatment:    new Set([0, 35]),
  },
  "wall-mounting": {
    wallSurface: new Set([0, 20, 30]),
    itemWeight:  new Set([0, 15, 30]),
  },
};

/** Recurring discount rates — matches WP plugin BookingServiceRecurrenceTrait & pricingService.ts */
export const FREQUENCY_DISCOUNTS = {
  once:        0,
  weekly:      0.15, // 15%
  "bi-weekly": 0.10, // 10%
  monthly:     0.05, //  5%
};

export const MEMBERSHIP_DISCOUNTS = {
  essential: 0.05,
  preferred: 0.10,
  premium:   0.15,
};

export const SAME_DAY_FEE  = 35;  // USD — booking for today
export const TWO_TECH_FEE  = 50;  // USD — jobs requiring 2 technicians

/**
 * Determines if a booking requires 2 technicians based on selected factors.
 * @param {string} serviceId
 * @param {Record<string, { modifier: number }>} selectedFactors
 * @returns {boolean}
 */
export function requiresTwoTechs(serviceId, selectedFactors = {}) {
  if (serviceId === "furniture-assembly") {
    // Highly Complex tier (wardrobe, L-desk, etc.)
    return Number(selectedFactors?.furnitureComplexity?.modifier) === 50;
  }
  if (serviceId === "wall-mounting") {
    // Heavy items (60+ lbs)
    return Number(selectedFactors?.itemWeight?.modifier) === 30;
  }
  return false;
}

/**
 * Calculate canonical booking price.
 * Throws ValidationError if any input is out of range or contains a tampered modifier.
 *
 * @param {{
 *   serviceId: string,
 *   units: number,
 *   selectedFactors?: Record<string, { modifier: number }>,
 *   frequency?: string,
 *   membership?: string | null,
 *   couponDiscount?: number,
 *   sameDayFee?: boolean,
 *   sameDayFeeAmount?: number,  — override the default $35; read from Firestore settings
 *   twoTechFee?: boolean,
 * }} params
 * @returns {{ totalCents: number, breakdown: object }}
 */
export function calculatePrice({
  serviceId,
  units,
  selectedFactors = {},
  frequency = "once",
  membership = null,
  couponDiscount = 0,
  sameDayFee = false,
  sameDayFeeAmount = SAME_DAY_FEE,
  twoTechFee = false,
}) {
  const svc = SERVICE_PRICING[serviceId];
  if (!svc) {
    throw new Error(`Unknown service: "${serviceId}"`);
  }

  const unitCount = Number(units);
  if (!Number.isFinite(unitCount) || unitCount < 0 || unitCount > 20) {
    throw new Error(`Invalid units value: ${units}`);
  }

  // ── Unit cost ──────────────────────────────────────────────────────────────
  let additionalUnitsCost = 0;
  if (svc.unitCalc === "tv") {
    additionalUnitsCost = Math.max(0, unitCount - 1) * svc.pricePerUnit;
  } else if (svc.unitCalc === "cleaning") {
    additionalUnitsCost = unitCount * svc.pricePerUnit;
  } else {
    additionalUnitsCost = Math.max(0, unitCount - 1) * svc.pricePerUnit;
  }

  // ── Factor modifiers ───────────────────────────────────────────────────────
  const allowedByService = ALLOWED_MODIFIERS[serviceId] || {};
  let factorsCost = 0;
  for (const [factorName, opt] of Object.entries(selectedFactors)) {
    const modifier = Number(opt?.modifier ?? 0);
    const allowedSet = allowedByService[factorName];
    if (allowedSet && !allowedSet.has(modifier)) {
      throw new Error(`Tampered modifier ${modifier} for factor "${factorName}" (service: ${serviceId})`);
    }
    factorsCost += modifier;
  }

  const subtotal = svc.basePrice + additionalUnitsCost + factorsCost;

  // ── Frequency discount ─────────────────────────────────────────────────────
  const discountRate   = FREQUENCY_DISCOUNTS[frequency] ?? 0;
  const discountAmount = Math.round(subtotal * discountRate * 100) / 100;

  // ── Membership discount ────────────────────────────────────────────────────
  const memberRate    = MEMBERSHIP_DISCOUNTS[membership] ?? 0;
  const memberDiscount = Math.round((subtotal - discountAmount) * memberRate * 100) / 100;

  let priceAfterDiscounts = Math.max(0, subtotal - discountAmount - memberDiscount);

  // ── Surcharges ─────────────────────────────────────────────────────────────
  const sameDayAmount = sameDayFee  ? sameDayFeeAmount : 0;
  const twoTechAmount = twoTechFee  ? TWO_TECH_FEE     : 0;
  const totalBeforeCoupon = priceAfterDiscounts + sameDayAmount + twoTechAmount;

  // ── Coupon ─────────────────────────────────────────────────────────────────
  const couponDiscountAmount = Math.min(Math.max(0, Number(couponDiscount) || 0), totalBeforeCoupon);
  const finalTotal = Math.max(0, totalBeforeCoupon - couponDiscountAmount);

  return {
    totalCents: Math.round(finalTotal * 100),
    breakdown: {
      basePrice:          svc.basePrice,
      additionalUnitsCost,
      factorsCost,
      subtotal,
      discountAmount,
      memberDiscount,
      sameDayAmount,
      twoTechAmount,
      totalBeforeCoupon,
      couponDiscountAmount,
      finalTotal,
    },
  };
}
