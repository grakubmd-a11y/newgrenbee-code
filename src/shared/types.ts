/**
 * Types definition for the Home Services Hub application
 */

export interface ServiceFactorOption {
  label: string;
  priceModifier: number; // Flat fee or cost multiplier
}

export interface ServiceFactor {
  name: string;
  label: string;
  options: ServiceFactorOption[];
}

export interface Service {
  id: string;
  name: string;
  iconName: string; // Used to match Lucide icons dynamically
  tagline: string;
  description: string;
  basePrice: number;
  unitName: string; // e.g., "room", "sq ft", "TV", "item"
  unitLabel: string; // e.g., "Number of Rooms", "Lawn Size"
  pricePerUnit: number;
  minUnits: number;
  maxUnits: number;
  stepUnits: number;
  estimatedMinutesPerUnit: number;
  includedSpecs: string[];
  factors: ServiceFactor[];
  popularUnitValue: number;
}

export type BookingStatus = 'scheduled' | 'dispatched' | 'in-progress' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  userId?: string;
  serviceId: string;
  serviceName: string;
  bookingDate: string;
  timeSlot: string;
  status: BookingStatus;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  units: number;
  selectedFactors: { [factorName: string]: { label: string; modifier: number } };
  frequency: 'once' | 'weekly' | 'bi-weekly' | 'monthly';
  notes: string;
  totalCost: number;
  originalCost?: number;
  couponCode?: string;
  couponDiscount?: number;
  createdAt: string;
  paymentMethod?: 'card' | 'paypal' | 'cash';
  paymentStatus?: 'unpaid' | 'paid' | 'authorized';
  stripePaymentIntentId?: string;
  stripePaymentStatus?: string;
  assignedStaffId?: string;
  assignedStaffName?: string;
  /** Admin-set payout override for this specific job (in $) */
  payoutOverride?: number;
  /** ISO date when this job's payout was marked as processed */
  payrollPaidAt?: string;
}

export interface Review {
  id: string;
  serviceId: string;
  authorName: string;
  rating: number;
  comment: string;
  date: string;
  helpfulCount: number;
  verified: boolean;
}

export type PayoutModel = 'percentage' | 'fixed_per_job' | 'hourly';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  active: boolean;
  serviceIds: string[];
  /** How this technician is paid */
  payoutModel?: PayoutModel;
  /**
   * Meaning depends on payoutModel:
   *   percentage    → 0–100 (e.g. 50 means 50% of job revenue)
   *   fixed_per_job → flat $ per completed job
   *   hourly        → hourly rate in $
   */
  payoutRate?: number;
}

export interface Coverage {
  zipCode: string;
  city: string;
  state: string;
  active: boolean;
}

export interface BusinessSettings {
  id: string;
  name: string;
  phone: string;
  email: string;
  timezone: string;
  bookingEnabled: boolean;
  stripeMode?: 'test' | 'live';
  stripePublishableKey?: string;
  googleMapsEnabled?: boolean;
  googleMapsApiKey?: string;
  googleMapsAutocompleteEnabled?: boolean;
  googleAuthEnabled?: boolean;
}

export type ActivitySeverity = 'info' | 'success' | 'warning' | 'error';

export interface AdminActivityEvent {
  id: string;
  type: string;
  entityType: 'booking' | 'service' | 'staff' | 'coverage' | 'review' | 'settings' | 'coupon' | 'system';
  entityId: string;
  title: string;
  detail: string;
  actorName: string;
  actorEmail: string;
  severity: ActivitySeverity;
  createdAt: string;
  metadata?: Record<string, string | number | boolean | null>;
}

// ── Recurring Plans ───────────────────────────────────────────────────────────

export type RecurringPlanStatus = 'active' | 'paused' | 'past_due' | 'cancelled';
export type RecurringPlanAction = 'pause' | 'resume' | 'cancel' | 'skip';

export interface RecurringPlan {
  id: string;
  userId: string;
  sourceBookingId: string;
  lastBookingId?: string;
  serviceId: string;
  serviceName: string;
  recurrence: 'weekly' | 'bi-weekly' | 'monthly';
  status: RecurringPlanStatus;
  amount: number;
  currency: string;
  stripePaymentIntentId: string;
  stripeCustomerId?: string;
  stripePaymentMethodId?: string;
  /** YYYY-MM-DD — date the next charge & job will be created */
  nextChargeAt: string;
  /** YYYY-MM-DD — date of the most recent charge */
  lastChargeAt: string;
  lastChargeStatus?: string;
  failureCount: number;
  pausedAt?: string | null;
  cancelledAt?: string | null;
  consentCapturedAt: string;
  /** Snapshot of booking details used to create each recurring job */
  templatePayload: {
    serviceId: string;
    serviceName: string;
    units: number;
    selectedFactors: Record<string, { label: string; modifier: number }>;
    address: string;
    timeSlot: string;
    notes: string;
    customerName: string;
    email: string;
    phone: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CouponRule {
  id: string;
  code: string;
  enabled: boolean;
  discountType: 'percent' | 'fixed';
  value: number;
  minimumOrderTotal: number;
  usageLimit: number;
  usedCount: number;
  serviceIds: string[];
  startsAt: string;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
}
