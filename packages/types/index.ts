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
  /** When set to "stepper", renders a +/− counter instead of radio cards */
  displayType?: "radio" | "stepper";
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

export type BookingStatus = 'scheduled' | 'dispatched' | 'in-progress' | 'completed' | 'cancelled' | 'needs_assignment';

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
  /** Two-tech jobs — primary technician */
  primaryStaffId?: string;
  primaryStaffName?: string;
  /** Two-tech jobs — helper technician */
  helperStaffId?: string;
  helperStaffName?: string;
  /** When true, auto-assign will find and assign two staff members */
  requiresTwoStaff?: boolean;
  /** Explicit ZIP code for zone matching (extracted from address if absent) */
  zipCode?: string;
  /** Overrides the service-level duration estimate (minutes) */
  estimatedDurationMinutes?: number;
  /** Staff member preferred by this customer or booking */
  preferredStaffId?: string;
  /** Notes left by the technician when closing the job */
  completionNotes?: string;
  /** Admin-set payout override for this specific job (in $) */
  payoutOverride?: number;
  /** ISO date when this job's payout was marked as processed */
  payrollPaidAt?: string;
  /** Before/after photos uploaded by the assigned technician */
  photos?: JobPhoto[];
}

export interface JobPhoto {
  url: string;
  phase: 'before' | 'after';
  fileName: string;
  uploadedAt: string;
  uploadedBy: string; // staffId
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
  /** ZIP codes this staff member serves. Empty = all zones. */
  zipCodes?: string[];
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
  /** City slug — Firestore document ID (e.g. "mapleton") */
  id: string;
  city: string;
  state: string;
  /** County or region label shown on marketing pages (e.g. "Utah County") */
  county?: string;
  /** ZIP codes served in this city */
  zipCodes: string[];
  /** Bookable now */
  active: boolean;
  /** Show on marketing pages as "Coming Soon" — not yet bookable */
  comingSoon: boolean;
  /** Controls display order in AreasPage / footer */
  sortOrder?: number;
  /** @deprecated Legacy field — kept for backward compat during migration */
  zipCode?: string;
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
  /** Outgoing webhook URL for CRM integrations (Zapier, Make, HubSpot, etc.) */
  crmWebhookUrl?: string;
  /** Extra fee charged when the customer books for today (same-day booking). Default 35. */
  sameDayFee?: number;
}

// ── Leads ─────────────────────────────────────────────────────────────────────

export type LeadStatus = 'new' | 'contacted' | 'recovered' | 'lost';
export type LeadSource = 'abandoned_checkout' | 'manual';

export interface Lead {
  id: string;
  email: string;
  customerName: string;
  phone?: string;
  serviceId?: string;
  serviceName?: string;
  address?: string;
  estimatedValue?: number;
  status: LeadStatus;
  source: LeadSource;
  /** bookingId if this lead was converted into a completed booking */
  convertedBookingId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  lastContactedAt?: string;
  recoveryEmailSentAt?: string;
  crmWebhookSentAt?: string;
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

// ── Membership Plans ──────────────────────────────────────────────────────────

export type MembershipPlanType = 'lawn' | 'cleaning' | 'bundle';
export type YardSizeTier = 'small' | 'medium' | 'large' | 'xl';

export interface MembershipPriceTier {
  /** Display label shown on the page, e.g. "$59–$79" or "$69" */
  priceLabel: string;
  /** Numeric price used for billing when Stripe is wired up */
  price: number;
  /** If true, show "Custom Quote" instead of priceLabel */
  customQuote?: boolean;
}

export interface MembershipFirstVisit {
  required: boolean;
  /** Label shown to the customer, e.g. "First Cut Reset" */
  label: string;
  description: string;
  pricing: {
    small:  MembershipPriceTier;
    medium: MembershipPriceTier;
    large: MembershipPriceTier;
    xl:     MembershipPriceTier;
  };
}

export interface MembershipCredits {
  /** Dollars earned per billing month */
  monthlyAmount: number;
  /** Maximum balance the member can accumulate */
  maxBalance: number;
  /** Days after issuance before credits expire */
  expiryDays: number;
}

export interface MembershipPlan {
  id: string;
  type: MembershipPlanType;
  name: string;
  tagline: string;
  /** Visits per month (1, 2, 4…) */
  visitsPerMonth: number;
  frequencyLabel: string;
  features: string[];
  notIncluded: string[];
  pricing: {
    small:  MembershipPriceTier;
    medium: MembershipPriceTier;
    large:  MembershipPriceTier;
    xl:     MembershipPriceTier;
  };
  firstVisit?: MembershipFirstVisit;
  /** Service credits earned monthly (Home Care and above) */
  credits?: MembershipCredits;
  /** Lower = shown first */
  order: number;
  active: boolean;
  /** If true, shown as contact-us card — no price displayed */
  byQuote?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MembershipSizeGuide {
  tier: YardSizeTier;
  label: string;
  description: string;
  examples: string;
}

// ── Media Library ─────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  url: string;            // Firebase Storage public download URL
  storagePath: string;    // e.g. "media/areas/miami-hero.jpg"
  filename: string;
  alt: string;
  /** Free-form tags: "hero", "service", "team", "area", service id, area slug… */
  tags: string[];
  sizeBytes: number;
  mimeType: string;
  uploadedAt: string;
  uploadedBy: string;     // admin email
}

// ── Contact Submissions ────────────────────────────────────────────────────────

export interface ContactSubmission {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  createdAt: string;
  read: boolean;
}

// ── Page CMS ──────────────────────────────────────────────────────────────────

/** Hero section of the Home page (admin-editable overrides) */
export interface HomePageContent {
  pageId: "home";
  // Hero
  heroPhotoUrl?: string;
  heroHeadlineEn?: string;
  heroHeadlineEs?: string;
  heroSubtitleEn?: string;
  heroSubtitleEs?: string;
  heroCtaEn?: string;
  heroCtaEs?: string;
  // Service card photos (serviceId → photoUrl)
  servicePhotos: Record<string, string>;
  // Coverage region photos (area1 = active region, area2 = coming-soon region)
  coverageArea1PhotoUrl?: string;
  coverageArea2PhotoUrl?: string;
  // CTA banner background
  ctaBannerPhotoUrl?: string;
  updatedAt: string;
  updatedBy?: string;
}

export interface FaqItemContent {
  id: string;
  questionEn: string;
  questionEs: string;
  answerEn: string;
  answerEs: string;
}

export interface FaqCategoryContent {
  id: string;
  nameEn: string;
  nameEs: string;
  items: FaqItemContent[];
}

export interface FaqPageContent {
  pageId: "faq";
  categories: FaqCategoryContent[];
  updatedAt: string;
  updatedBy?: string;
}

export interface ContactPageContent {
  pageId: "contact";
  phone?: string;
  email?: string;
  addressLine?: string;
  hoursEn?: string;
  hoursEs?: string;
  introEn?: string;
  introEs?: string;
  updatedAt: string;
  updatedBy?: string;
}

// ── Area Landing Pages ────────────────────────────────────────────────────────

export interface AreaTestimonial {
  name: string;
  location: string;       // e.g. "Brickell, Miami"
  text: string;
  rating: number;
}

export interface AreaFaq {
  question: string;
  answer: string;
}

export interface AreaServiceBlock {
  serviceId: string;
  serviceName: string;
  localDescription: string;   // city-specific copy
  photoId?: string;           // MediaItem.id
  photoUrl?: string;          // resolved at render time
}

export interface AreaContent {
  /** Matches the /coverage doc ID (e.g. "miami") */
  id: string;
  slug: string;
  city: string;
  state: string;
  active: boolean;

  // Hero
  heroPhotoId?: string;
  heroPhotoUrl?: string;
  heroHeadline: string;        // "Professional Home Services in Miami, FL"
  heroSubtitle: string;

  // Body copy
  introParagraph: string;

  // Services shown on this landing
  serviceBlocks: AreaServiceBlock[];

  // Social proof
  testimonials: AreaTestimonial[];

  // SEO neighborhood links
  neighborhoods: string[];

  // FAQ
  faqs: AreaFaq[];

  // SEO
  seoTitle: string;
  seoDescription: string;

  updatedAt: string;
}
