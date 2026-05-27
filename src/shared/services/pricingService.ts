/**
 * pricingService.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Canonical client-side pricing engine — ported from the WP plugin's
 * BookingServicePricingModelTrait + BookingServiceRecurrenceTrait.
 *
 * Must stay in sync with api/_pricing.js (server-side validation).
 * The server always re-calculates before charging; client uses this for preview.
 */

import type { Service, CouponRule } from '../types';

// ── Types ─────────────────────────────────────────────────────────────────────

export type RecurrenceKey = 'once' | 'weekly' | 'bi-weekly' | 'monthly';

export type LineItemType =
  | 'base'
  | 'unit'
  | 'factor'
  | 'same_day'
  | 'two_tech'
  | 'minimum_adjustment'
  | 'recurrence_discount'
  | 'membership_discount'
  | 'coupon_discount';

export interface LineItem {
  type: LineItemType;
  key: string;
  label: string;
  /** Positive = charge, negative = discount */
  amount: number;
  amountCents: number;
  durationMin?: number;
}

export interface PriceQuote {
  serviceId: string;
  // Subtotals
  basePrice: number;
  unitsCost: number;
  factorsCost: number;
  subtotal: number;
  minimumAdjustment: number;
  // Discounts
  recurrenceDiscount: number;
  membershipDiscount: number;
  couponDiscount: number;
  // Surcharges
  sameDayFee: number;
  twoTechFee: number;
  // Final
  total: number;
  totalCents: number;
  // Meta
  recurrence: RecurrenceKey;
  isSameDay: boolean;
  requiresTwoTechs: boolean;
  estimatedDurationMin: number;
  // Breakdown (one entry per price component)
  lineItems: LineItem[];
  // Coupon
  couponApplied?: string;
  couponError?: string;
}

export interface QuoteInput {
  service: Service;
  units: number;
  selectedFactors: Record<string, { label: string; modifier: number }>;
  recurrence: RecurrenceKey;
  bookingDate?: string;
  membership?: string | null;
  /** Full CouponRule object — fetch from Firestore before calling */
  coupon?: CouponRule | null;
  /** Override same-day detection (e.g. server-side where date math may differ) */
  forceSameDay?: boolean;
  /** Override two-tech detection */
  forceTwoTech?: boolean;
}

// ── Constants — keep in sync with api/_pricing.js ────────────────────────────

/** Recurring discount rates — matches WP plugin BookingServiceRecurrenceTrait */
export const RECURRENCE_DISCOUNT_RATES: Record<RecurrenceKey, number> = {
  once:        0,
  weekly:      0.15, // 15%
  'bi-weekly': 0.10, // 10%
  monthly:     0.05, //  5%
};

export const MEMBERSHIP_DISCOUNT_RATES: Record<string, number> = {
  essential: 0.05, //  5%
  preferred: 0.10, // 10%
  premium:   0.15, // 15%
};

export const SAME_DAY_FEE = 35;  // USD
export const TWO_TECH_FEE = 50;  // USD

/** Only these service IDs support recurring plans */
const RECURRING_SERVICES = new Set(['house-cleaning', 'lawn-mowing']);

// ── Helpers ───────────────────────────────────────────────────────────────────

export function isSameDayBooking(bookingDate: string): boolean {
  if (!bookingDate) return false;
  const today = new Date().toISOString().split('T')[0];
  return bookingDate === today;
}

export function serviceSupportsRecurrence(serviceId: string): boolean {
  return RECURRING_SERVICES.has(serviceId);
}

export function effectiveRecurrence(serviceId: string, recurrence: RecurrenceKey): RecurrenceKey {
  return serviceSupportsRecurrence(serviceId) ? recurrence : 'once';
}

export function checkRequiresTwoTechs(
  serviceId: string,
  selectedFactors: Record<string, { label: string; modifier: number }>
): boolean {
  if (serviceId === 'furniture-assembly') {
    return Number(selectedFactors?.furnitureComplexity?.modifier) === 50;
  }
  if (serviceId === 'wall-mounting') {
    return Number(selectedFactors?.itemWeight?.modifier) === 30;
  }
  return false;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ── Main engine ───────────────────────────────────────────────────────────────

export function calculateQuote(input: QuoteInput): PriceQuote {
  const {
    service,
    units,
    selectedFactors,
    recurrence: rawRecurrence,
    bookingDate = '',
    membership,
    coupon,
    forceSameDay,
    forceTwoTech,
  } = input;

  const lineItems: LineItem[] = [];

  // ── 1. Base price ────────────────────────────────────────────────────────────
  const basePrice = service.basePrice;
  lineItems.push({
    type: 'base',
    key: 'base',
    label: `${service.name} — visita base`,
    amount: basePrice,
    amountCents: Math.round(basePrice * 100),
    durationMin: service.estimatedMinutesPerUnit,
  });

  // ── 2. Units (additional) ────────────────────────────────────────────────────
  let unitsCost = 0;
  let unitsDurationMin = 0;

  if (service.id === 'house-cleaning') {
    // Additional rooms — all units are billable
    unitsCost = units * service.pricePerUnit;
    unitsDurationMin = units * service.estimatedMinutesPerUnit;
  } else if (service.id === 'tv-installation') {
    // First TV is base; each additional is pricePerUnit
    const additional = Math.max(0, units - 1);
    unitsCost = additional * service.pricePerUnit;
    unitsDurationMin = additional * service.estimatedMinutesPerUnit;
  } else {
    // Default: first unit included in base, rest are additional
    const additional = Math.max(0, units - 1);
    unitsCost = additional * service.pricePerUnit;
    unitsDurationMin = additional * service.estimatedMinutesPerUnit;
  }

  if (unitsCost > 0) {
    lineItems.push({
      type: 'unit',
      key: 'units',
      label: `${units} ${service.unitName}${units !== 1 ? 's' : ''} (+${units} ${service.unitLabel})`,
      amount: unitsCost,
      amountCents: Math.round(unitsCost * 100),
      durationMin: unitsDurationMin,
    });
  }

  // ── 3. Factor modifiers ──────────────────────────────────────────────────────
  let factorsCost = 0;
  for (const [, opt] of Object.entries(selectedFactors)) {
    const modifier = Number(opt?.modifier ?? 0);
    if (modifier === 0) continue;
    factorsCost += modifier;
    lineItems.push({
      type: 'factor',
      key: opt.label,
      label: opt.label,
      amount: modifier,
      amountCents: Math.round(modifier * 100),
    });
  }

  let subtotal = round2(basePrice + unitsCost + factorsCost);

  // ── 4. Minimum order adjustment ──────────────────────────────────────────────
  // TODO: read minimumTotal from Firestore BusinessSettings when wired up
  const minimumTotal = 0;
  let minimumAdjustment = 0;
  if (minimumTotal > 0 && subtotal < minimumTotal) {
    minimumAdjustment = round2(minimumTotal - subtotal);
    subtotal = round2(subtotal + minimumAdjustment);
    lineItems.push({
      type: 'minimum_adjustment',
      key: 'minimum_total',
      label: 'Ajuste por mínimo de pedido',
      amount: minimumAdjustment,
      amountCents: Math.round(minimumAdjustment * 100),
    });
  }

  // ── 5. Recurrence discount ───────────────────────────────────────────────────
  const recurrence = effectiveRecurrence(service.id, rawRecurrence);
  const recurrenceRate = RECURRENCE_DISCOUNT_RATES[recurrence];
  let recurrenceDiscount = 0;

  if (recurrenceRate > 0 && subtotal > 0) {
    recurrenceDiscount = -round2(subtotal * recurrenceRate);
    const labels: Partial<Record<RecurrenceKey, string>> = {
      weekly:      'semanal',
      'bi-weekly': 'quincenal',
      monthly:     'mensual',
    };
    lineItems.push({
      type: 'recurrence_discount',
      key: recurrence,
      label: `Descuento plan ${labels[recurrence]} (${Math.round(recurrenceRate * 100)}%)`,
      amount: recurrenceDiscount,
      amountCents: Math.round(recurrenceDiscount * 100),
    });
  }

  const postRecurrenceTotal = Math.max(0, round2(subtotal + recurrenceDiscount));

  // ── 6. Membership discount ───────────────────────────────────────────────────
  const memberRate = MEMBERSHIP_DISCOUNT_RATES[membership ?? ''] ?? 0;
  let membershipDiscount = 0;

  if (memberRate > 0 && postRecurrenceTotal > 0) {
    membershipDiscount = -round2(postRecurrenceTotal * memberRate);
    lineItems.push({
      type: 'membership_discount',
      key: 'membership',
      label: `Descuento membresía ${membership} (${Math.round(memberRate * 100)}%)`,
      amount: membershipDiscount,
      amountCents: Math.round(membershipDiscount * 100),
    });
  }

  const postMembershipTotal = Math.max(0, round2(postRecurrenceTotal + membershipDiscount));

  // ── 7. Same-day surcharge ────────────────────────────────────────────────────
  const isSameDay = forceSameDay ?? isSameDayBooking(bookingDate);
  let sameDayFee = 0;

  if (isSameDay) {
    sameDayFee = SAME_DAY_FEE;
    lineItems.push({
      type: 'same_day',
      key: 'same_day',
      label: 'Cargo por servicio el mismo día',
      amount: sameDayFee,
      amountCents: Math.round(sameDayFee * 100),
    });
  }

  // ── 8. Two-technician surcharge ──────────────────────────────────────────────
  const requiresTwoTechs = forceTwoTech ?? checkRequiresTwoTechs(service.id, selectedFactors);
  let twoTechFee = 0;

  if (requiresTwoTechs) {
    twoTechFee = TWO_TECH_FEE;
    lineItems.push({
      type: 'two_tech',
      key: 'two_tech',
      label: 'Cargo por dos técnicos',
      amount: twoTechFee,
      amountCents: Math.round(twoTechFee * 100),
    });
  }

  const totalBeforeCoupon = Math.max(0, round2(postMembershipTotal + sameDayFee + twoTechFee));

  // ── 9. Coupon discount ───────────────────────────────────────────────────────
  let couponDiscount = 0;
  let couponApplied: string | undefined;
  let couponError: string | undefined;

  if (coupon) {
    const now = new Date().toISOString();
    if (!coupon.enabled) {
      couponError = 'El cupón no está activo.';
    } else if (coupon.expiresAt && coupon.expiresAt < now) {
      couponError = 'El cupón ha expirado.';
    } else if (coupon.startsAt && coupon.startsAt > now) {
      couponError = 'El cupón aún no está vigente.';
    } else if (coupon.minimumOrderTotal > 0 && totalBeforeCoupon < coupon.minimumOrderTotal) {
      couponError = `El pedido mínimo para este cupón es $${coupon.minimumOrderTotal}.`;
    } else if (coupon.usageLimit > 0 && coupon.usedCount >= coupon.usageLimit) {
      couponError = 'Este cupón ha alcanzado su límite de usos.';
    } else if (coupon.serviceIds.length > 0 && !coupon.serviceIds.includes(service.id)) {
      couponError = 'Este cupón no aplica para este servicio.';
    } else {
      const rawDiscount = coupon.discountType === 'percent'
        ? totalBeforeCoupon * (coupon.value / 100)
        : coupon.value;
      couponDiscount = -round2(Math.min(rawDiscount, totalBeforeCoupon));
      couponApplied = coupon.code;
      lineItems.push({
        type: 'coupon_discount',
        key: coupon.code,
        label: `Cupón ${coupon.code}${coupon.discountType === 'percent' ? ` (${coupon.value}%)` : ''}`,
        amount: couponDiscount,
        amountCents: Math.round(couponDiscount * 100),
      });
    }
  }

  // ── 10. Final total ──────────────────────────────────────────────────────────
  const total = Math.max(0, round2(totalBeforeCoupon + couponDiscount));

  // ── 11. Estimated duration ───────────────────────────────────────────────────
  const estimatedDurationMin = Math.max(
    30,
    service.estimatedMinutesPerUnit + unitsDurationMin
  );

  return {
    serviceId: service.id,
    basePrice,
    unitsCost,
    factorsCost,
    subtotal,
    minimumAdjustment,
    recurrenceDiscount,
    membershipDiscount,
    couponDiscount,
    sameDayFee,
    twoTechFee,
    total,
    totalCents: Math.round(total * 100),
    recurrence,
    isSameDay,
    requiresTwoTechs,
    estimatedDurationMin,
    lineItems,
    couponApplied,
    couponError,
  };
}
