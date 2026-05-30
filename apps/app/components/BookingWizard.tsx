import React, { useEffect, useRef, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import {
  Calendar, Clock, User, MapPin, CreditCard, ArrowLeft, ArrowRight,
  CheckCircle2, AlertTriangle, Loader, ShieldCheck, MapPinOff, HelpCircle,
  Users, CalendarClock, ExternalLink, Check,
} from "lucide-react";
import { Booking, Service } from "@grenbee/types";
import { db } from "@grenbee/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { fetchPublicSettingsFromFirestore } from "@grenbee/firebase/services";
import StripePaymentPanel from "./StripePaymentPanel";
import SchedulePicker, { HOUR_SLOTS, SlotInfo } from "./SchedulePicker";

type BookingDraft = Omit<Booking, "id" | "status" | "createdAt">;
type WizardStep = 1 | 2 | 3 | 4;
type CoverageStatus = "idle" | "checking" | "covered" | "not-covered" | "unknown";
type AvailabilityStatus = "idle" | "checking" | "available" | "full";
type SlotsMap = Record<string, SlotInfo>;

export interface WizardBookingParams {
  serviceId: string;
  units: number;
  selectedFactors: { [k: string]: { label: string; modifier: number } };
  frequency: "once" | "weekly" | "bi-weekly" | "monthly";
  totalCost: number;
  originalCost?: number;
  couponCode?: string;
  couponDiscount?: number;
}

interface BookingWizardProps {
  bookingParams: WizardBookingParams;
  services: Service[];
  currentUser?: { name?: string; email?: string; phone?: string; address?: string } | null;
  onSubmitBooking: (draft: BookingDraft) => void;
  onBack: () => void;
  /** Called when the user clicks "View my bookings" on the confirmation screen */
  onComplete?: () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const DEFAULT_sameDayFee = 35;
const TWO_TECH_FEE = 50;

// Step labels are rendered via t() inside StepLabels component

/** Convert "09:00" → "9:00 AM" using the HOUR_SLOTS lookup */
function formatTimeSlot(slot: string): string {
  return HOUR_SLOTS.find((s) => s.value === slot)?.label ?? slot;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function clientRequiresTwoTechs(serviceId: string, factors: WizardBookingParams["selectedFactors"]): boolean {
  if (serviceId === "furniture-assembly") return Number(factors?.furnitureComplexity?.modifier) === 50;
  if (serviceId === "wall-mounting") return Number(factors?.itemWeight?.modifier) === 30;
  return false;
}

function extractZip(address: string): string {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : "";
}

/** Parse Google address_components to extract ZIP, city and state reliably. */
function parseAddressComponents(components: any[]): { zip: string; city: string; state: string } {
  let zip = "", city = "", state = "";
  for (const c of components || []) {
    const types: string[] = c.types || [];
    if (types.includes("postal_code"))                       zip   = c.long_name || "";
    if (types.includes("locality") || types.includes("sublocality")) city  = c.long_name || "";
    if (types.includes("administrative_area_level_1"))       state = c.short_name || "";
  }
  return { zip, city, state };
}

/** Scroll smoothly to the first element with [data-field-error] attribute. */
function scrollToFirstError() {
  requestAnimationFrame(() => {
    const el = document.querySelector<HTMLElement>("[data-field-error]");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  });
}

function isUsableKey(v: string) {
  const t = v.trim();
  return t.length > 0 && t.startsWith("AIza") && !t.includes("REPLACE_ME");
}

async function loadMapsScript(apiKey: string): Promise<void> {
  if ((window as any).google?.maps?.places && (window as any).__gbMapsKey === apiKey) return;
  if (!(window as any).__gbMapsLoader || (window as any).__gbMapsKey !== apiKey) {
    (window as any).__gbMapsKey = apiKey;
    (window as any).__gbMapsLoader = new Promise<void>((resolve, reject) => {
      document.querySelector('script[data-gb-maps="true"]')?.remove();
      const s = document.createElement("script");
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
      s.async = s.defer = true;
      s.dataset.gbMaps = "true";
      s.onload = () => resolve();
      s.onerror = () => reject();
      document.head.appendChild(s);
    });
  }
  return (window as any).__gbMapsLoader;
}

async function checkZipCoverage(zip: string): Promise<CoverageStatus> {
  try {
    const q = query(collection(db, "coverage"), where("zipCode", "==", zip));
    const snap = await getDocs(q);
    if (snap.empty) {
      const allSnap = await getDocs(collection(db, "coverage"));
      return allSnap.empty ? "unknown" : "not-covered";
    }
    const active = snap.docs.some((d) => d.data().active === true);
    return active ? "covered" : "not-covered";
  } catch {
    return "unknown";
  }
}

function formatDate(raw: string): string {
  if (!raw) return "";
  const d = new Date(raw + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Thin linear progress bar at the very top */
function ProgressBar({ step }: { step: WizardStep }) {
  const pct = step >= 4 ? 100 : Math.round(((step - 1) / 3) * 100);
  return (
    <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden">
      <div
        className="h-full bg-brand rounded-full transition-all duration-500 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

/** Step label row below the progress bar */
function StepLabels({ step }: { step: WizardStep }) {
  const { t } = useTranslation();
  const STEP_LABELS = [t("wizard.steps.schedule"), t("wizard.steps.details"), t("wizard.steps.pay")];
  if (step >= 4) return null;
  return (
    <div className="flex justify-between mt-2 px-0.5">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1;
        const done   = n < step;
        const active = n === step;
        return (
          <div key={n} className="flex items-center gap-1.5">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 transition-all ${
              done   ? "bg-brand text-white"
              : active ? "bg-brand text-white ring-2 ring-brand/25"
              : "bg-gray-100 text-gray-400"
            }`}>
              {done ? <Check size={10} strokeWidth={3} /> : n}
            </div>
            <span className={`text-[11px] font-semibold hidden sm:block ${
              active ? "text-brand" : done ? "text-brand/70" : "text-gray-400"
            }`}>{label}</span>
          </div>
        );
      })}
    </div>
  );
}

/** Price sidebar — live line-item breakdown */
function PriceSidebar({ service, params, selectedDate, selectedSlot, isSameDay, isTwoTech, sameDayFee }: {
  service: Service;
  params: WizardBookingParams;
  selectedDate: string;
  selectedSlot: string;
  isSameDay: boolean;
  isTwoTech: boolean;
  sameDayFee: number;
}) {
  const { t } = useTranslation();
  const discountTotal = (params.couponDiscount ?? 0);
  const sameDayAmt    = isSameDay ? sameDayFee : 0;
  const twoTechAmt    = isTwoTech ? TWO_TECH_FEE : 0;
  const base          = params.originalCost ?? params.totalCost + discountTotal;
  const grandTotal    = params.totalCost + sameDayAmt + twoTechAmt;

  return (
    <aside className="lg:col-span-5">
      <div className="bg-[#0d1117] text-white rounded-2xl p-6 space-y-5 lg:sticky lg:top-24">
        {/* Service */}
        <div>
          <p className="text-[10px] font-extrabold text-brand uppercase tracking-widest mb-1">{t("wizard.sidebar.orderSummary")}</p>
          <p className="text-base font-bold truncate">{service.name}</p>
          {selectedDate && (
            <p className="text-xs text-gray-400 mt-0.5 font-medium">
              {formatDate(selectedDate)}{selectedSlot ? ` · ${formatTimeSlot(selectedSlot)}` : ""}
            </p>
          )}
        </div>

        {/* Line items */}
        <div className="space-y-2.5 border-t border-white/8 pt-4 text-xs font-mono">
          <LineItem label={`${params.units} ${service.unitName}${params.units !== 1 ? "s" : ""}`}
                    value={`$${base.toFixed(2)}`} />
          {params.frequency !== "once" && (
            <LineItem label={`${params.frequency} plan`} value="" valueClass="text-brand/80 capitalize" />
          )}
          {discountTotal > 0 && params.couponCode && (
            <LineItem label={`${t("wizard.sidebar.coupon")} · ${params.couponCode}`} value={`-$${discountTotal.toFixed(2)}`}
                      valueClass="text-emerald-400" />
          )}
          {sameDayAmt > 0 && (
            <LineItem label={t("wizard.sidebar.sameDayFee")} value={`+$${sameDayAmt.toFixed(2)}`} valueClass="text-amber-400" />
          )}
          {twoTechAmt > 0 && (
            <LineItem label={t("wizard.sidebar.technicianFee")} value={`+$${twoTechAmt.toFixed(2)}`} valueClass="text-amber-400" />
          )}
        </div>

        {/* Total */}
        <div className="border-t border-white/8 pt-4 flex items-baseline justify-between">
          <span className="text-sm font-semibold text-gray-400">{t("wizard.sidebar.total")}</span>
          <span className="text-3xl font-extrabold text-brand">${grandTotal.toFixed(2)}</span>
        </div>

        {/* Alerts */}
        {isTwoTech && (
          <div className="flex items-start gap-2 bg-amber-900/25 text-amber-300 text-[11px] rounded-xl px-3 py-2.5">
            <Users size={13} className="shrink-0 mt-0.5" />
            <span>{t("wizard.sidebar.twoTechNote")}</span>
          </div>
        )}
        {isSameDay && (
          <div className="flex items-start gap-2 bg-amber-900/25 text-amber-300 text-[11px] rounded-xl px-3 py-2.5">
            <CalendarClock size={13} className="shrink-0 mt-0.5" />
            <span>{t("wizard.sidebar.sameDayNote")}</span>
          </div>
        )}

        {/* Trust badge */}
        <div className="flex items-center gap-2 text-[11px] text-gray-500 border-t border-white/8 pt-4">
          <ShieldCheck size={13} className="text-brand shrink-0" />
          <span>{t("wizard.sidebar.paymentNote")} <strong className="text-gray-400">{t("wizard.sidebar.paymentNoteStrong")}</strong></span>
        </div>
      </div>
    </aside>
  );
}

function LineItem({ label, value, valueClass = "text-white" }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-400 truncate">{label}</span>
      <span className={`font-bold shrink-0 ${valueClass}`}>{value}</span>
    </div>
  );
}

/** Mobile floating price bar */
function MobileTotal({
  total, isSameDay, isTwoTech, sameDayFee, step, onContinue, isLoading,
}: {
  total: number; isSameDay: boolean; isTwoTech: boolean; sameDayFee: number;
  step: WizardStep; onContinue?: () => void; isLoading?: boolean;
}) {
  const { t } = useTranslation();
  const grand = total + (isSameDay ? sameDayFee : 0) + (isTwoTech ? TWO_TECH_FEE : 0);
  // Only show on steps 1–2 (step 3 has Stripe's own UI, step 4 is confirmation)
  if (step >= 3) return null;
  return (
    <div className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-200 px-4 py-3 shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="flex items-center gap-3">
        {/* Price */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide">
            {t("wizard.sidebar.estimatedTotal")}
          </p>
          <p className="text-xl font-black text-gray-900 leading-tight">
            ${grand.toFixed(2)}
            {isSameDay && <span className="text-xs font-semibold text-amber-500 ml-1">+same-day</span>}
          </p>
        </div>
        {/* Continue button */}
        {onContinue && (
          <button
            type="button"
            onClick={onContinue}
            disabled={isLoading}
            className="shrink-0 flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 text-white text-sm font-bold px-5 py-3 rounded-xl transition-all shadow-sm active:scale-95 cursor-pointer border-none"
          >
            {isLoading
              ? <><Loader size={14} className="animate-spin" /> Checking…</>
              : <>{step === 1 ? t("wizard.steps_header.step1Title").split(" ")[0] === "Schedule" ? "Continue" : "Continue" : "Continue"} <ArrowRight size={14} /></>
            }
          </button>
        )}
      </div>
    </div>
  );
}

/** Step section header */
function StepHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-center gap-3 pb-2">
      <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center shrink-0">{icon}</div>
      <div>
        <h2 className="text-lg font-black text-gray-900 leading-tight">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

/** Coverage badge */
function CoverageBadge({ status }: { status: CoverageStatus }) {
  const { t } = useTranslation();
  if (status === "idle") return null;
  if (status === "checking") return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
      <Loader size={11} className="animate-spin" /> {t("wizard.coverage.checking")}
    </div>
  );
  if (status === "covered") return (
    <div className="flex items-center gap-1.5 text-[11px] text-emerald-600 mt-1 font-semibold">
      <CheckCircle2 size={11} /> {t("wizard.coverage.covered")}
    </div>
  );
  if (status === "not-covered") return (
    <div className="flex items-center gap-1.5 text-[11px] text-amber-600 mt-1 font-semibold">
      <MapPinOff size={11} /> {t("wizard.coverage.notCovered")}
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 text-[11px] text-gray-400 mt-1">
      <HelpCircle size={11} /> {t("wizard.coverage.unknown")}
    </div>
  );
}

/** Booking confirmation screen (step 4) */
function ConfirmationScreen({
  draft,
  bookingId,
  onViewBookings,
  onBookAnother,
}: {
  draft: BookingDraft;
  bookingId?: string;
  onViewBookings: () => void;
  onBookAnother: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div className="max-w-xl mx-auto px-4 py-12 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mx-auto w-20 h-20 rounded-full bg-brand/10 flex items-center justify-center mb-6">
        <div className="w-14 h-14 rounded-full bg-brand flex items-center justify-center shadow-lg shadow-brand/30">
          <Check size={28} className="text-white" strokeWidth={3} />
        </div>
      </div>

      <h2 className="text-2xl font-black text-gray-900 mb-2">{t("wizard.confirmation.title")}</h2>
      <p className="text-gray-500 text-sm mb-8">
        {t("wizard.confirmation.subtitle")} <strong>{draft.email}</strong>.
      </p>

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 text-left space-y-3 mb-6">
        <p className="text-[10px] font-extrabold uppercase tracking-widest text-gray-400 mb-3">{t("wizard.confirmation.detailsTitle")}</p>
        <DetailRow icon={<Calendar size={14} />} label={t("wizard.confirmation.labelService")} value={draft.serviceName} />
        <DetailRow icon={<Calendar size={14} />} label={t("wizard.confirmation.labelDate")} value={formatDate(draft.bookingDate)} />
        <DetailRow icon={<Clock size={14} />} label={t("wizard.confirmation.labelTime")} value={formatTimeSlot(draft.timeSlot)} />
        <DetailRow icon={<MapPin size={14} />} label={t("wizard.confirmation.labelAddress")} value={draft.address} />
        <DetailRow icon={<User size={14} />} label={t("wizard.confirmation.labelContact")} value={`${draft.customerName} · ${draft.email}`} />
        {bookingId && (
          <DetailRow icon={<ShieldCheck size={14} />} label={t("wizard.confirmation.labelReference")} value={bookingId}
                     valueClass="font-mono text-brand" />
        )}
      </div>

      <div className="bg-gray-50 rounded-2xl p-5 text-left mb-8">
        <p className="text-xs font-bold text-gray-700 mb-3">{t("wizard.confirmation.nextTitle")}</p>
        <ul className="space-y-2.5">
          {[
            t("wizard.confirmation.nextStep1"),
            t("wizard.confirmation.nextStep2"),
            t("wizard.confirmation.nextStep3"),
          ].map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-xs text-gray-600">
              <div className="w-4 h-4 rounded-full bg-brand/10 text-brand flex items-center justify-center shrink-0 mt-0.5 text-[9px] font-black">
                {i + 1}
              </div>
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <button onClick={onViewBookings} className="flex-1 h-12 bg-brand hover:bg-brand-hover text-white font-bold text-sm rounded-xl transition-all shadow-md shadow-brand/20 hover:scale-[1.01]">
          {t("wizard.confirmation.viewBookings")}
        </button>
        <button onClick={onBookAnother} className="flex-1 h-12 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-sm rounded-xl transition-all">
          {t("wizard.confirmation.bookAnother")}
        </button>
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value, valueClass = "" }: {
  icon: React.ReactNode; label: string; value: string; valueClass?: string;
}) {
  return (
    <div className="flex items-start gap-2.5 text-xs">
      <span className="text-gray-400 mt-0.5 shrink-0">{icon}</span>
      <span className="text-gray-500 w-16 shrink-0">{label}:</span>
      <span className={`text-gray-900 font-semibold leading-snug ${valueClass}`}>{value}</span>
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function BookingWizard({
  bookingParams,
  services,
  currentUser,
  onSubmitBooking,
  onBack,
  onComplete,
}: BookingWizardProps) {
  const service = useMemo(
    () => services.find((s) => s.id === bookingParams.serviceId) || services[0],
    [services, bookingParams.serviceId]
  );

  // ── Step ──
  const { t } = useTranslation();
  const [step, setStep] = useState<WizardStep>(1);

  // ── Step 1: Schedule ──
  // Default to tomorrow (skip today to avoid same-day fee surprises)
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [selectedSlot, setSelectedSlot] = useState("09:00");
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("idle");
  const [slotsMap, setSlotsMap] = useState<SlotsMap>({});
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [busyDates, setBusyDates] = useState<Set<string>>(new Set());
  const [sameDayFee, setSameDayFee] = useState(DEFAULT_sameDayFee);

  // ── Same-day & 2-tech ──
  const today   = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isSameDay = selectedDate === today;
  const isTwoTech = useMemo(
    () => clientRequiresTwoTechs(bookingParams.serviceId, bookingParams.selectedFactors),
    [bookingParams.serviceId, bookingParams.selectedFactors]
  );

  // ── Step 2: Details ──
  const [fullName, setFullName] = useState(currentUser?.name || "");
  const [email,    setEmail]    = useState(currentUser?.email || "");
  const [phone,    setPhone]    = useState(currentUser?.phone || "");
  const [address,  setAddress]  = useState(currentUser?.address || "");
  const [zip,      setZip]      = useState(() => extractZip(currentUser?.address || ""));
  const [notes,    setNotes]    = useState("");
  const [coverageStatus,    setCoverageStatus]    = useState<CoverageStatus>("idle");
  const [coverageConfirmed, setCoverageConfirmed] = useState(false);
  const [showCoveragePrompt,setShowCoveragePrompt]= useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // (C) Track whether address was selected from autocomplete dropdown
  // vs typed manually — used for validation feedback
  const [addrFromAutocomplete, setAddrFromAutocomplete] = useState(false);
  // (B) Show brief feedback when ZIP is auto-filled from address components
  const [zipAutoFilled, setZipAutoFilled] = useState(false);

  // ── Google Maps autocomplete ──
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [mapsKey,     setMapsKey]     = useState(process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "");
  const [mapsEnabled, setMapsEnabled] = useState(false);
  const [mapsReady,   setMapsReady]   = useState(false);

  // ── Step 3: Pay ──
  const [isProcessing,     setIsProcessing]     = useState(false);
  const [termsAccepted,    setTermsAccepted]    = useState(false);
  const [recurringConsent, setRecurringConsent] = useState(false);
  const [termsError,       setTermsError]       = useState("");
  const needsRecurringConsent = bookingParams.frequency !== "once";

  // ── Step 4: Confirmation ──
  const [confirmedDraft,     setConfirmedDraft]     = useState<BookingDraft | null>(null);
  const [confirmedBookingId, setConfirmedBookingId] = useState<string | undefined>();

  // Load Maps settings + same-day fee
  useEffect(() => {
    let cancelled = false;
    fetchPublicSettingsFromFirestore().then((settings) => {
      if (cancelled || !settings) return;
      if (settings.googleMapsApiKey && isUsableKey(settings.googleMapsApiKey)) {
        setMapsKey(settings.googleMapsApiKey.trim());
      }
      setMapsEnabled(settings.googleMapsEnabled === true && settings.googleMapsAutocompleteEnabled !== false);
      if (typeof settings.sameDayFee === "number") setSameDayFee(settings.sameDayFee);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Setup autocomplete — re-runs when step changes so it can attach to the
  // address input that only exists when step === 2.
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      const input = addressInputRef.current;
      if (!input || !mapsEnabled || !isUsableKey(mapsKey)) { setMapsReady(false); return; }
      try {
        await loadMapsScript(mapsKey);
        if (cancelled || !addressInputRef.current || !(window as any).google?.maps?.places?.Autocomplete) return;
        if (autocompleteRef.current) (window as any).google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        const ac = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, {
          // Request address_components for reliable ZIP/city/state extraction
          fields: ["formatted_address", "address_components"],
          types: ["address"],
          componentRestrictions: { country: "us" },
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          if (!place?.formatted_address) return; // user didn't pick from list
          const addr = place.formatted_address;
          const parsed = parseAddressComponents(place?.address_components || []);
          const extractedZip = parsed.zip || extractZip(addr);

          setAddress(addr);
          setAddrFromAutocomplete(true); // (C) mark as autocomplete-selected

          // (B) ZIP mismatch feedback — if ZIP changed, briefly show confirmation
          if (extractedZip && extractedZip !== zip) {
            setZipAutoFilled(true);
            setTimeout(() => setZipAutoFilled(false), 3000);
          }
          setZip(extractedZip);

          // (D) Trigger coverage check immediately when address selected
          // (the useEffect on [zip] will also fire, but this makes the UX
          //  feel more responsive by clearing the prompt right away)
          setShowCoveragePrompt(false);
          setCoverageConfirmed(false);

          setErrors((prev) => {
            const next = { ...prev };
            delete next.address;
            delete next.zip;
            return next;
          });
        });
        autocompleteRef.current = ac;
        setMapsReady(true);
      } catch { setMapsReady(false); }
    }
    setup();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsKey, mapsEnabled, step]);

  // Auto-extract zip from address
  useEffect(() => {
    const z = extractZip(address);
    if (z) setZip(z);
  }, [address]);

  // Coverage check on zip change
  useEffect(() => {
    if (!zip || zip.length < 5) { setCoverageStatus("idle"); return; }
    setCoverageConfirmed(false);
    setShowCoveragePrompt(false);
    let cancelled = false;
    setCoverageStatus("checking");
    checkZipCoverage(zip).then((r) => { if (!cancelled) setCoverageStatus(r); });
    return () => { cancelled = true; };
  }, [zip]);

  // Fetch busy dates for a given month (called from SchedulePicker's onMonthChange)
  function handleMonthChange(year: number, month: number) {
    fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ year, month }),
    })
      .then((r) => r.json())
      .then((data: { busyDates?: string[] }) => {
        if (data.busyDates) setBusyDates(new Set(data.busyDates));
      })
      .catch(() => {});
  }

  // Bulk slot-availability check when date changes (step 1 only)
  useEffect(() => {
    if (step !== 1) return;
    let cancelled = false;
    setSlotsMap({});
    setSlotsLoading(true);
    setAvailabilityStatus("idle");
    fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate }),
    })
      .then((r) => r.json())
      .then((data: { slots?: SlotsMap }) => {
        if (cancelled) return;
        const map: SlotsMap = data.slots || {};
        setSlotsMap(map);
        const current = map[selectedSlot];
        if (current && !current.available) {
          const firstOk = HOUR_SLOTS.find((s) => map[s.value]?.available !== false);
          if (firstOk) setSelectedSlot(firstOk.value);
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setSlotsLoading(false); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, step]);

  // ── Validation ──
  function validate(): boolean {
    if (step !== 2) return true;
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = t("wizard.form.errorRequired");
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = t("wizard.form.errorEmail");
    if (phone.replace(/\D/g, "").length < 10) e.phone = t("wizard.form.errorPhone");
    if (!address.trim()) e.address = t("wizard.form.errorAddress");
    if (!zip || zip.length < 5) e.zip = t("wizard.form.errorZip");
    setErrors(e);
    if (Object.keys(e).length > 0) scrollToFirstError();
    return Object.keys(e).length === 0;
  }

  async function checkAvailability(): Promise<boolean> {
    setAvailabilityStatus("checking");
    try {
      const resp = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, timeSlot: selectedSlot }),
      });
      const data = await resp.json().catch(() => ({}));
      const ok = data.available !== false;
      setAvailabilityStatus(ok ? "available" : "full");
      return ok;
    } catch {
      setAvailabilityStatus("available");
      return true;
    }
  }

  async function goNext() {
    if (!validate()) return;
    if (step === 1) {
      const cached = slotsMap[selectedSlot];
      if (cached && !cached.available) { setAvailabilityStatus("full"); return; }
      const ok = await checkAvailability();
      if (!ok) return;
    }
    if (step === 2 && coverageStatus === "not-covered" && !coverageConfirmed) {
      setShowCoveragePrompt(true);
      return;
    }
    // Capture lead on move to payment
    if (step === 2) {
      fetch("/api/capture-lead", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email, customerName: fullName, phone,
          serviceId: bookingParams.serviceId, serviceName: service.name,
          address, estimatedValue: bookingParams.totalCost,
        }),
      }).catch(() => {});
    }
    setStep((s) => (s + 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function goBack() {
    if (step === 1) { onBack(); return; }
    setStep((s) => (s - 1) as WizardStep);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── Build Draft ──
  function buildDraft(paymentInfo: {
    paymentMethod: "card";
    paymentStatus: "paid" | "authorized";
    stripePaymentIntentId?: string;
    stripePaymentStatus?: string;
  }): BookingDraft {
    return {
      serviceId: bookingParams.serviceId,
      serviceName: service.name,
      bookingDate: selectedDate,
      timeSlot: selectedSlot,
      customerName: fullName,
      email, phone, address,
      units: bookingParams.units,
      selectedFactors: bookingParams.selectedFactors,
      frequency: bookingParams.frequency,
      notes,
      totalCost: bookingParams.totalCost,
      ...(bookingParams.originalCost !== undefined && { originalCost: bookingParams.originalCost }),
      ...(bookingParams.couponCode    && { couponCode: bookingParams.couponCode }),
      ...(bookingParams.couponDiscount && { couponDiscount: bookingParams.couponDiscount }),
      paymentMethod: paymentInfo.paymentMethod,
      paymentStatus: paymentInfo.paymentStatus,
      ...(paymentInfo.stripePaymentIntentId && { stripePaymentIntentId: paymentInfo.stripePaymentIntentId }),
      ...(paymentInfo.stripePaymentStatus   && { stripePaymentStatus: paymentInfo.stripePaymentStatus }),
    };
  }

  // ── Render ──

  // Confirmation screen (step 4) — full width, no sidebar
  if (step === 4 && confirmedDraft) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-4">
        <ProgressBar step={4} />
        <ConfirmationScreen
          draft={confirmedDraft}
          bookingId={confirmedBookingId}
          onViewBookings={() => onComplete?.()}
          onBookAnother={() => { onBack(); }}
        />
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6">
      {/* Progress */}
      <div className="mb-6">
        <ProgressBar step={step} />
        <StepLabels step={step} />
      </div>

      <div className="grid lg:grid-cols-12 gap-6 lg:gap-8 items-start pb-20 lg:pb-0">
        {/* ─── Form Column ─── */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
            {/* Header strip */}
            <div className="px-6 pt-6 pb-5 border-b border-gray-50">
              {step === 1 && <StepHeader icon={<Calendar size={20} />} title={t("wizard.steps_header.step1Title")} sub={t("wizard.steps_header.step1Sub")} />}
              {step === 2 && <StepHeader icon={<User size={20} />} title={t("wizard.steps_header.step2Title")} sub={t("wizard.steps_header.step2Sub")} />}
              {step === 3 && <StepHeader icon={<CreditCard size={20} />} title={t("wizard.steps_header.step3Title")} sub={t("wizard.steps_header.step3Sub")} />}
            </div>

            <div className="px-6 py-6 space-y-6">
              {/* ── STEP 1: SCHEDULE ── */}
              {step === 1 && (
                <>
                  <SchedulePicker
                    selectedDate={selectedDate}
                    selectedTime={selectedSlot}
                    onDateChange={(d) => { setSelectedDate(d); setAvailabilityStatus("idle"); }}
                    onTimeChange={(t) => { setSelectedSlot(t); setAvailabilityStatus("idle"); }}
                    slotsMap={slotsMap}
                    slotsLoading={slotsLoading}
                    busyDates={busyDates}
                    sameDayFee={sameDayFee}
                    onMonthChange={handleMonthChange}
                  />

                  {availabilityStatus === "checking" && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 pt-1">
                      <Loader size={12} className="animate-spin" /> {t("wizard.availability.checking")}
                    </div>
                  )}
                  {availabilityStatus === "full" && (
                    <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                      <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                      {t("wizard.availability.full")}
                    </div>
                  )}
                  {availabilityStatus === "available" && (
                    <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold pt-1">
                      <CheckCircle2 size={12} /> {t("wizard.availability.available")}
                    </div>
                  )}
                </>
              )}

              {/* ── STEP 2: DETAILS ── */}
              {step === 2 && (
                <>
                  <FormField label={t("wizard.form.fullName")} error={errors.fullName}>
                    <TextInput icon={<User size={14} />} value={fullName} onChange={setFullName}
                      placeholder="Jane Doe" hasError={!!errors.fullName} />
                  </FormField>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <FormField label={t("wizard.form.email")} error={errors.email}>
                      <TextInput icon={<CheckCircle2 size={14} />} type="email" value={email} onChange={setEmail}
                        placeholder="jane@example.com" hasError={!!errors.email} />
                    </FormField>
                    <FormField label={t("wizard.form.phone")} error={errors.phone}>
                      <TextInput icon={<Clock size={14} />} type="tel" value={phone} onChange={setPhone}
                        placeholder="(801) 555-0100" hasError={!!errors.phone} />
                    </FormField>
                  </div>

                  <FormField label={t("wizard.form.address")} error={errors.address}>
                    <div className="relative">
                      <span className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none"><MapPin size={14} /></span>
                      <input
                        ref={addressInputRef}
                        type="text"
                        value={address}
                        onChange={(e) => {
                          setAddress(e.target.value);
                          setAddrFromAutocomplete(false); // (C) user typed manually
                          setErrors((prev) => { const { address: _a, ...rest } = prev; return rest; });
                        }}
                        placeholder="123 Main St, Mapleton, UT 84664"
                        className={`pl-9 w-full rounded-xl border py-3 px-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none transition-all ${
                          errors.address ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
                        }`}
                      />
                    </div>
                    {mapsReady && !errors.address && !addrFromAutocomplete && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-medium">
                        {t("wizard.form.addressAutoComplete")}
                      </p>
                    )}
                    {/* (C) Confirmed autocomplete selection */}
                    {addrFromAutocomplete && !errors.address && (
                      <p className="text-[10px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                        <CheckCircle2 size={10} /> Address confirmed from Google Maps
                      </p>
                    )}
                  </FormField>

                  <div className="grid sm:grid-cols-2 gap-4 items-end">
                    <FormField label={t("wizard.form.zip")} error={errors.zip}>
                      <input
                        type="text"
                        value={zip}
                        onChange={(e) => {
                          setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                          setAddrFromAutocomplete(false);
                          setErrors((prev) => { const { zip: _z, ...rest } = prev; return rest; });
                        }}
                        placeholder="84664"
                        maxLength={5}
                        className={`w-full border rounded-xl px-3.5 py-3 text-sm font-mono focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none transition-all ${
                          errors.zip ? "border-rose-400 bg-rose-50/20"
                          : zipAutoFilled ? "border-emerald-400 bg-emerald-50/30"
                          : "border-gray-200"
                        }`}
                      />
                      {/* (B) Brief feedback when ZIP was auto-filled from address */}
                      {zipAutoFilled && (
                        <p className="text-[10px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
                          <CheckCircle2 size={10} /> ZIP auto-filled from address
                        </p>
                      )}
                      <CoverageBadge status={coverageStatus} />
                    </FormField>
                    <div className="pb-0.5">
                      {/* spacer */}
                    </div>
                  </div>

                  {showCoveragePrompt && coverageStatus === "not-covered" && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                      <div className="flex items-start gap-2">
                        <MapPinOff size={15} className="text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-bold text-amber-800">{t("wizard.coverage_prompt.title", { zip })}</p>
                          <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                            {t("wizard.coverage_prompt.body")}
                          </p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={coverageConfirmed}
                          onChange={(e) => setCoverageConfirmed(e.target.checked)}
                          className="h-4 w-4 rounded border-amber-300 accent-amber-600 cursor-pointer" />
                        <span className="text-xs font-semibold text-amber-800">{t("wizard.coverage_prompt.confirm")}</span>
                      </label>
                    </div>
                  )}

                  <FormField label={t("wizard.form.notes")}>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      placeholder={t("wizard.form.notesPlaceholder")}
                      className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-sm text-gray-800 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none resize-none transition-all"
                    />
                  </FormField>
                </>
              )}

              {/* ── STEP 3: REVIEW & PAY ── */}
              {step === 3 && (
                <>
                  {/* Inline recap */}
                  <div className="bg-gray-50 rounded-xl p-4 grid sm:grid-cols-2 gap-2 text-xs">
                    {[
                      { l: t("wizard.recap.service"),  v: service.name },
                      { l: t("wizard.recap.date"),     v: formatDate(selectedDate) },
                      { l: t("wizard.recap.window"),   v: formatTimeSlot(selectedSlot) },
                      { l: t("wizard.recap.address"),  v: address },
                      { l: t("wizard.recap.contact"),  v: `${fullName} · ${email}` },
                    ].map(({ l, v }) => (
                      <div key={l} className="flex gap-1.5">
                        <span className="text-gray-400 w-14 shrink-0">{l}:</span>
                        <span className="font-semibold text-gray-800 truncate">{v}</span>
                      </div>
                    ))}
                  </div>

                  {coverageStatus === "not-covered" && coverageConfirmed && (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-xs text-amber-800">
                      <MapPinOff size={14} className="text-amber-600 shrink-0 mt-0.5" />
                      ZIP <strong className="mx-1">{zip}</strong> {t("wizard.outside_area.note")}
                    </div>
                  )}

                  <div className="rounded-xl border border-brand/20 bg-brand/5 p-3.5 flex gap-2.5 text-xs text-brand leading-relaxed">
                    <ShieldCheck size={15} className="shrink-0 mt-0.5" />
                    <span>{t("wizard.payment.holdNote")} <strong>{t("wizard.payment.holdNoteStrong")}</strong>.</span>
                  </div>

                  {/* Terms */}
                  <div className="rounded-xl border border-gray-100 bg-gray-50/50 p-4 space-y-3">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{t("wizard.terms.sectionTitle")}</p>
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input type="checkbox" checked={termsAccepted}
                        onChange={(e) => { setTermsAccepted(e.target.checked); setTermsError(""); }}
                        className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-brand cursor-pointer" />
                      <span className="text-xs text-gray-700 leading-relaxed">
                        {t("wizard.terms.agree")}{" "}
                        <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline inline-flex items-center gap-0.5">
                          {t("wizard.terms.termsLink")} <ExternalLink size={10} />
                        </a>{" "}{t("wizard.terms.and")}{" "}
                        <a href="/cancellation" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline inline-flex items-center gap-0.5">
                          {t("wizard.terms.cancellationLink")} <ExternalLink size={10} />
                        </a>. <span className="text-rose-500 font-bold">*</span>
                      </span>
                    </label>
                    {needsRecurringConsent && (
                      <label className="flex items-start gap-3 cursor-pointer">
                        <input type="checkbox" checked={recurringConsent}
                          onChange={(e) => { setRecurringConsent(e.target.checked); setTermsError(""); }}
                          className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-brand cursor-pointer" />
                        <span className="text-xs text-gray-700 leading-relaxed">
                          I authorize recurring <strong className="capitalize">{bookingParams.frequency}</strong> charges until I cancel.{" "}
                          <span className="text-rose-500 font-bold">*</span>
                        </span>
                      </label>
                    )}
                    {termsError && (
                      <div className="flex items-center gap-2 text-xs text-rose-600 font-semibold">
                        <AlertTriangle size={13} /> {termsError}
                      </div>
                    )}
                  </div>

                  <StripePaymentPanel
                    bookingParams={{
                      ...bookingParams,
                      sameDayFee: isSameDay,
                      twoTechFee: isTwoTech,
                    }}
                    service={service}
                    selectedDate={selectedDate}
                    selectedSlot={selectedSlot}
                    validateBeforePayment={() => {
                      if (!termsAccepted) {
                        setTermsError(t("wizard.terms.termsError"));
                        return false;
                      }
                      if (needsRecurringConsent && !recurringConsent) {
                        setTermsError("Please authorize recurring charges for your subscription.");
                        return false;
                      }
                      setTermsError("");
                      return true;
                    }}
                    onPaymentStarted={() => setIsProcessing(true)}
                    onPaymentFinished={() => setIsProcessing(false)}
                    onLog={() => {/* logs intentionally suppressed in production UI */}}
                    onSubmitBooking={(draft) => {
                      // Extract the pre-generated booking ID set by StripePaymentPanel
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const ext = draft as any;
                      setConfirmedBookingId(ext._bookingId);
                      setConfirmedDraft(draft);
                      setStep(4);
                      window.scrollTo({ top: 0, behavior: "smooth" });
                      onSubmitBooking(draft); // triggers Firestore save, emails, etc.
                    }}
                    buildBookingDraft={({ paymentIntentId, paymentIntentStatus, paymentStatus }) =>
                      buildDraft({ paymentMethod: "card", paymentStatus, stripePaymentIntentId: paymentIntentId, stripePaymentStatus: paymentIntentStatus })
                    }
                    isProcessing={isProcessing}
                  />
                </>
              )}
            </div>

            {/* ─── Navigation ─── */}
            {step < 4 && (
              <div className="px-6 py-4 border-t border-gray-50 flex justify-between items-center">
                <button
                  onClick={goBack}
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-400 hover:text-gray-700 transition-colors"
                >
                  <ArrowLeft size={15} />
                  {step === 1 ? "Back to Quote" : "Back"}
                </button>

                {step < 3 && (
                  <button
                    onClick={goNext}
                    disabled={availabilityStatus === "checking" || (showCoveragePrompt && coverageStatus === "not-covered" && !coverageConfirmed)}
                    className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md hover:shadow-brand/20 hover:scale-[1.01]"
                  >
                    {availabilityStatus === "checking"
                      ? <><Loader size={14} className="animate-spin" /> Checking…</>
                      : (showCoveragePrompt && coverageStatus === "not-covered")
                        ? <>Confirm & Continue <ArrowRight size={14} /></>
                        : <>Continue <ArrowRight size={14} /></>
                    }
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* ─── Price Sidebar ─── */}
        <PriceSidebar
          service={service}
          params={bookingParams}
          selectedDate={selectedDate}
          selectedSlot={selectedSlot}
          isSameDay={isSameDay}
          isTwoTech={isTwoTech}
          sameDayFee={sameDayFee}
        />
      </div>

      {/* Mobile sticky bottom bar — price + Continue button (steps 1-2 only) */}
      <MobileTotal
        total={bookingParams.totalCost}
        isSameDay={isSameDay}
        isTwoTech={isTwoTech}
        sameDayFee={sameDayFee}
        step={step}
        onContinue={step < 3 ? goNext : undefined}
        isLoading={availabilityStatus === "checking"}
      />
    </div>
  );
}

// ─── Reusable form components ─────────────────────────────────────────────────

function FormField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5" {...(error ? { "data-field-error": "true" } : {})}>
      <label className="block text-xs font-bold text-gray-700 tracking-wide">{label}</label>
      {children}
      {error && (
        <p className="text-[11px] text-rose-500 font-semibold flex items-center gap-1">
          <span aria-hidden>⚠</span> {error}
        </p>
      )}
    </div>
  );
}

function TextInput({ icon, type = "text", value, onChange, placeholder, hasError = false }: {
  icon?: React.ReactNode;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  hasError?: boolean;
}) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3.5 top-3.5 text-gray-400 pointer-events-none">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${icon ? "pl-9" : "pl-3.5"} w-full rounded-xl border py-3 px-3.5 text-sm text-gray-800 placeholder-gray-400 focus:border-brand focus:ring-2 focus:ring-brand/15 focus:outline-none transition-all ${
          hasError ? "border-rose-400 bg-rose-50/20" : "border-gray-200"
        }`}
      />
    </div>
  );
}
