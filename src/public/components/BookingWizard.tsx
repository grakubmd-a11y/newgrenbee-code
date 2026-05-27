import React, { useEffect, useRef, useState, useMemo } from "react";
import {
  Calendar, Clock, User, MapPin, CreditCard, ArrowLeft, ArrowRight,
  CheckCircle2, AlertTriangle, Loader, ShieldCheck, MapPinOff, HelpCircle,
  Users, CalendarClock, ExternalLink
} from "lucide-react";
import { Booking, Service } from "../../shared/types";
import { db } from "../../shared/firebase";
import { collection, query, where, getDocs } from "firebase/firestore";
import { fetchPublicSettingsFromFirestore } from "../../shared/services/firebaseService";
import StripePaymentPanel from "./StripePaymentPanel";

type BookingDraft = Omit<Booking, "id" | "status" | "createdAt">;
type WizardStep = 1 | 2 | 3;
type CoverageStatus = "idle" | "checking" | "covered" | "not-covered" | "unknown";
type AvailabilityStatus = "idle" | "checking" | "available" | "full";
type SlotInfo = { available: boolean; slotsRemaining: number };
type SlotsMap  = Record<string, SlotInfo>;

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
  activeMembership?: string | null;
  onSubmitBooking: (draft: BookingDraft) => void;
  onBack: () => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function generateBookingDays() {
  const days = [];
  const opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" };
  for (let i = 1; i <= 8; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const parts = d.toLocaleDateString("en-US", opts).split(", ");
    days.push({ rawDate: d.toISOString().split("T")[0], weekday: parts[0], dayMonth: parts[1] || parts[0] });
  }
  return days;
}

const TIME_SLOTS = [
  { label: "Morning", hours: "09:00 AM – 12:00 PM", desc: "Early start" },
  { label: "Midday", hours: "12:00 PM – 03:00 PM", desc: "Standard window" },
  { label: "Afternoon", hours: "03:00 PM – 06:00 PM", desc: "Evening finish" },
];

const SAME_DAY_FEE = 35;
const TWO_TECH_FEE = 50;

function clientRequiresTwoTechs(serviceId: string, factors: WizardBookingParams["selectedFactors"]): boolean {
  if (serviceId === "furniture-assembly") return Number(factors?.furnitureComplexity?.modifier) === 50;
  if (serviceId === "wall-mounting") return Number(factors?.itemWeight?.modifier) === 30;
  return false;
}

function extractZip(address: string): string {
  const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : "";
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

// ─── Step Progress Header ─────────────────────────────────────────────────────

const STEP_LABELS = ["Schedule", "Your Details", "Review & Pay"];

function WizardProgress({ step }: { step: WizardStep }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {STEP_LABELS.map((label, i) => {
        const n = i + 1 as WizardStep;
        const done = n < step;
        const active = n === step;
        return (
          <React.Fragment key={n}>
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  done ? "bg-emerald-500 text-white" : active ? "bg-brand text-white ring-4 ring-brand/20" : "bg-gray-100 text-gray-400"
                }`}
              >
                {done ? <CheckCircle2 size={14} /> : n}
              </div>
              <span className={`text-[10px] font-semibold hidden sm:block ${active ? "text-brand" : done ? "text-emerald-600" : "text-gray-400"}`}>
                {label}
              </span>
            </div>
            {i < STEP_LABELS.length - 1 && (
              <div className={`w-12 sm:w-20 h-0.5 mb-5 transition-colors ${done ? "bg-emerald-400" : "bg-gray-100"}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

// ─── Order Summary Card ───────────────────────────────────────────────────────

function OrderSummary({ service, params, selectedDate, selectedSlot, isSameDay, isTwoTech }: {
  service: Service;
  params: WizardBookingParams;
  selectedDate: string;
  selectedSlot: string;
  isSameDay: boolean;
  isTwoTech: boolean;
}) {
  const displayTotal = params.totalCost
    + (isSameDay ? SAME_DAY_FEE : 0)
    + (isTwoTech ? TWO_TECH_FEE : 0);

  return (
    <div className="bg-gray-900 text-white rounded-2xl p-6 space-y-4 sticky top-24">
      <div>
        <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">Order Summary</p>
        <h3 className="text-base font-bold mt-1 truncate">{service.name}</h3>
      </div>
      <div className="space-y-2 text-xs text-gray-300 border-t border-white/10 pt-4 font-mono">
        <Row label="Date" value={selectedDate} />
        <Row label="Window" value={selectedSlot || "—"} />
        <Row label="Units" value={`${params.units} ${service.unitName}${params.units !== 1 ? "s" : ""}`} />
        <Row label="Frequency" value={params.frequency} capitalize />
      </div>
      {(params.couponCode && params.couponDiscount || isSameDay || isTwoTech) && (
        <div className="text-xs font-mono space-y-1.5 border-t border-white/10 pt-3">
          {params.couponCode && params.couponDiscount && (
            <>
              <Row label="Subtotal" value={`$${(params.originalCost ?? params.totalCost + params.couponDiscount).toFixed(2)}`} />
              <Row label={`Coupon ${params.couponCode}`} value={`-$${params.couponDiscount.toFixed(2)}`} valueClass="text-emerald-400" />
            </>
          )}
          {isSameDay && (
            <Row label="Same-Day Fee" value={`+$${SAME_DAY_FEE}.00`} valueClass="text-amber-400" />
          )}
          {isTwoTech && (
            <Row label="2nd Technician" value={`+$${TWO_TECH_FEE}.00`} valueClass="text-amber-400" />
          )}
        </div>
      )}
      <div className="flex justify-between items-baseline border-t border-white/10 pt-4">
        <span className="text-sm font-semibold text-gray-300">Total</span>
        <span className="text-2xl font-extrabold text-emerald-400">${displayTotal.toFixed(2)}</span>
      </div>
      {isTwoTech && (
        <div className="flex items-start gap-2 text-[10px] text-amber-300 bg-amber-900/30 rounded-lg px-3 py-2">
          <Users size={12} className="shrink-0 mt-0.5" />
          <span>This job requires 2 technicians — a second tech fee has been added.</span>
        </div>
      )}
      {isSameDay && (
        <div className="flex items-start gap-2 text-[10px] text-amber-300 bg-amber-900/30 rounded-lg px-3 py-2">
          <CalendarClock size={12} className="shrink-0 mt-0.5" />
          <span>Same-day booking — a priority scheduling fee applies.</span>
        </div>
      )}
      <div className="flex items-center gap-2 text-[10px] text-gray-400 pt-1">
        <ShieldCheck size={12} className="text-emerald-500 shrink-0" />
        <span>Card charged only after service completion</span>
      </div>
    </div>
  );
}

function Row({ label, value, capitalize, valueClass }: { label: string; value: string; capitalize?: boolean; valueClass?: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span>{label}:</span>
      <span className={`text-white font-semibold truncate max-w-[130px] ${capitalize ? "capitalize" : ""} ${valueClass || ""}`}>{value}</span>
    </div>
  );
}

// ─── Coverage Badge ───────────────────────────────────────────────────────────

function CoverageBadge({ status }: { status: CoverageStatus }) {
  if (status === "idle") return null;
  if (status === "checking") return (
    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
      <Loader size={12} className="animate-spin" /> Checking coverage…
    </div>
  );
  if (status === "covered") return (
    <div className="flex items-center gap-2 text-xs text-emerald-600 mt-1 font-medium">
      <CheckCircle2 size={12} /> This area is covered — we service your zip code.
    </div>
  );
  if (status === "not-covered") return (
    <div className="flex items-center gap-2 text-xs text-amber-600 mt-1 font-medium">
      <MapPinOff size={12} /> Your zip code isn't in our current coverage area. You can still submit and we'll confirm availability.
    </div>
  );
  return (
    <div className="flex items-center gap-2 text-xs text-gray-400 mt-1">
      <HelpCircle size={12} /> Coverage for this zip couldn't be verified — you can still proceed.
    </div>
  );
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

export default function BookingWizard({
  bookingParams,
  services,
  currentUser,
  activeMembership,
  onSubmitBooking,
  onBack,
}: BookingWizardProps) {
  const service = useMemo(
    () => services.find((s) => s.id === bookingParams.serviceId) || services[0],
    [services, bookingParams.serviceId]
  );

  const bookingDays = useMemo(() => generateBookingDays(), []);

  // ── Step ──
  const [step, setStep] = useState<WizardStep>(1);

  // ── Step 1: Schedule ──
  const [selectedDate, setSelectedDate] = useState(bookingDays[0].rawDate);
  const [selectedSlot, setSelectedSlot] = useState(TIME_SLOTS[0].hours);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityStatus>("idle");
  const [slotsMap, setSlotsMap] = useState<SlotsMap>({});
  const [slotsLoading, setSlotsLoading] = useState(false);

  // ── Same-day & 2-tech (computed, UI + pricing) ──
  const today = useMemo(() => new Date().toISOString().split("T")[0], []);
  const isSameDay = selectedDate === today;
  const isTwoTech = useMemo(
    () => clientRequiresTwoTechs(bookingParams.serviceId, bookingParams.selectedFactors),
    [bookingParams.serviceId, bookingParams.selectedFactors]
  );

  // ── Step 2: Details ──
  const [fullName, setFullName] = useState(currentUser?.name || "");
  const [email, setEmail] = useState(currentUser?.email || "");
  const [phone, setPhone] = useState(currentUser?.phone || "");
  const [address, setAddress] = useState(currentUser?.address || "");
  const [zip, setZip] = useState(() => extractZip(currentUser?.address || ""));
  const [notes, setNotes] = useState("");
  const [coverageStatus, setCoverageStatus] = useState<CoverageStatus>("idle");
  const [coverageConfirmed, setCoverageConfirmed] = useState(false); // user ticked "proceed anyway"
  const [showCoveragePrompt, setShowCoveragePrompt] = useState(false); // inline prompt visible
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Google Maps autocomplete ──
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<any>(null);
  const [mapsKey, setMapsKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");
  const [mapsEnabled, setMapsEnabled] = useState(false);
  const [mapsReady, setMapsReady] = useState(false);

  // ── Step 3: Pay ──
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiLogs, setApiLogs] = useState<string[]>([]);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [recurringConsent, setRecurringConsent] = useState(false);
  const [termsError, setTermsError] = useState("");
  const needsRecurringConsent = bookingParams.frequency !== "once";

  // Load Maps settings
  useEffect(() => {
    let cancelled = false;
    fetchPublicSettingsFromFirestore().then((settings) => {
      if (cancelled || !settings) return;
      if (settings.googleMapsApiKey && isUsableKey(settings.googleMapsApiKey)) {
        setMapsKey(settings.googleMapsApiKey.trim());
      }
      setMapsEnabled(settings.googleMapsEnabled === true && settings.googleMapsAutocompleteEnabled !== false);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Setup autocomplete
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      const input = addressInputRef.current;
      if (!input || !mapsEnabled || !isUsableKey(mapsKey)) { setMapsReady(false); return; }
      try {
        await loadMapsScript(mapsKey);
        if (cancelled || !addressInputRef.current || !(window as any).google?.maps?.places?.Autocomplete) return;
        if (autocompleteRef.current) (window as any).google?.maps?.event?.clearInstanceListeners(autocompleteRef.current);
        const ac = new (window as any).google.maps.places.Autocomplete(addressInputRef.current, { fields: ["formatted_address"], types: ["address"] });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const addr = place?.formatted_address || addressInputRef.current?.value || "";
          setAddress(addr);
          setZip(extractZip(addr));
          setErrors((prev) => { const { address: _a, ...rest } = prev; return rest; });
        });
        autocompleteRef.current = ac;
        setMapsReady(true);
      } catch { setMapsReady(false); }
    }
    setup();
    return () => { cancelled = true; };
  }, [mapsKey, mapsEnabled]);

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

        // If the currently-selected slot just became full, auto-pick first available
        const current = map[selectedSlot];
        if (current && !current.available) {
          const firstOk = TIME_SLOTS.find((s) => map[s.hours]?.available !== false);
          if (firstOk) setSelectedSlot(firstOk.hours);
        }
      })
      .catch(() => { /* fail open — no visual indicators */ })
      .finally(() => { if (!cancelled) setSlotsLoading(false); });

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, step]);

  // ── Validation ──
  function validate(): boolean {
    if (step !== 2) return true;
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) e.email = "Valid email required";
    if (phone.replace(/\D/g, "").length < 10) e.phone = "10-digit phone required";
    if (!address.trim()) e.address = "Address required to dispatch";
    if (!zip || zip.length < 5) e.zip = "5-digit ZIP code required";
    setErrors(e);
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
      setAvailabilityStatus("available"); // fail open
      return true;
    }
  }

  async function goNext() {
    if (!validate()) return;
    if (step === 1) {
      // Fast-path: if bulk check already says full, block immediately
      const cached = slotsMap[selectedSlot];
      if (cached && !cached.available) {
        setAvailabilityStatus("full");
        return;
      }
      // Otherwise do a fresh single-slot confirmation check
      const ok = await checkAvailability();
      if (!ok) return;
    }
    if (step === 2 && coverageStatus === "not-covered" && !coverageConfirmed) {
      // Surface the explicit confirmation prompt instead of proceeding silently
      setShowCoveragePrompt(true);
      return;
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
      email,
      phone,
      address,
      units: bookingParams.units,
      selectedFactors: bookingParams.selectedFactors,
      frequency: bookingParams.frequency,
      notes,
      totalCost: bookingParams.totalCost,
      ...(bookingParams.originalCost !== undefined && { originalCost: bookingParams.originalCost }),
      ...(bookingParams.couponCode && { couponCode: bookingParams.couponCode }),
      ...(bookingParams.couponDiscount && { couponDiscount: bookingParams.couponDiscount }),
      paymentMethod: paymentInfo.paymentMethod,
      paymentStatus: paymentInfo.paymentStatus,
      ...(paymentInfo.stripePaymentIntentId && { stripePaymentIntentId: paymentInfo.stripePaymentIntentId }),
      ...(paymentInfo.stripePaymentStatus && { stripePaymentStatus: paymentInfo.stripePaymentStatus }),
    };
  }

  // ── Render ──
  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* Back to estimator */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-gray-400 hover:text-brand transition-colors uppercase tracking-widest"
      >
        <ArrowLeft size={14} /> Back to Quote
      </button>

      <WizardProgress step={step} />

      <div className="grid lg:grid-cols-12 gap-8 items-start">
        {/* ─── Form Column ─── */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm p-6 md:p-8 space-y-6">
          {/* ── STEP 1: SCHEDULE ── */}
          {step === 1 && (
            <>
              <StepHeader icon={<Calendar size={18} />} title="Choose Date & Time" sub="Pick the best window for your appointment." />

              {/* Date picker */}
              <div className="space-y-3">
                <Label>Appointment Date</Label>
                <div className="grid grid-cols-4 gap-2">
                  {bookingDays.map((day) => (
                    <button
                      key={day.rawDate}
                      type="button"
                      onClick={() => { setSelectedDate(day.rawDate); setAvailabilityStatus("idle"); }}
                      className={`flex flex-col items-center py-3 rounded-xl border transition-all cursor-pointer ${
                        selectedDate === day.rawDate
                          ? "border-brand bg-brand-light text-brand ring-1 ring-brand font-bold"
                          : "border-gray-100 hover:border-gray-200 text-gray-600"
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold tracking-wider">{day.weekday}</span>
                      <span className="text-xs font-extrabold mt-1">{day.dayMonth}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Time slot picker */}
              <div className="space-y-3">
                <Label icon={<Clock size={13} className="text-brand" />}>
                  Arrival Window
                  {slotsLoading && <Loader size={11} className="animate-spin ml-1.5 text-gray-400 inline-block" />}
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  {TIME_SLOTS.map((slot) => {
                    const info      = slotsMap[slot.hours];
                    const isFull    = info ? !info.available : false;
                    const isAlmost  = info && info.available && info.slotsRemaining === 1;
                    const isSelected = selectedSlot === slot.hours;

                    return (
                      <button
                        key={slot.hours}
                        type="button"
                        disabled={isFull}
                        onClick={() => { setSelectedSlot(slot.hours); setAvailabilityStatus("idle"); }}
                        className={`relative flex flex-col text-left p-3.5 rounded-xl border transition-all ${
                          isFull
                            ? "border-gray-150 bg-gray-50 text-gray-300 cursor-not-allowed opacity-60"
                            : isSelected
                              ? "border-brand bg-brand-light text-brand ring-1 ring-brand font-bold cursor-pointer"
                              : "border-gray-100 hover:border-gray-200 text-gray-600 cursor-pointer"
                        }`}
                      >
                        <span className="text-xs font-bold">{slot.label}</span>
                        <span className="text-xs font-extrabold text-gray-900 mt-0.5">{slot.hours}</span>
                        <span className="text-[9px] text-gray-400 mt-1">{slot.desc}</span>

                        {/* Status badge */}
                        {isFull && (
                          <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600 border border-rose-200">
                            Full
                          </span>
                        )}
                        {isAlmost && !isFull && (
                          <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-600 border border-amber-200">
                            1 left
                          </span>
                        )}
                        {info && info.available && !isAlmost && (
                          <span className="absolute top-2 right-2 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                            Open
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Availability feedback (shown after clicking Next) */}
                {availabilityStatus === "checking" && (
                  <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                    <Loader size={12} className="animate-spin" /> Checking availability…
                  </div>
                )}
                {availabilityStatus === "full" && (
                  <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 font-semibold">
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <span>This window is fully booked. Please choose a different date or time.</span>
                  </div>
                )}
                {availabilityStatus === "available" && (
                  <div className="flex items-center gap-2 text-xs text-emerald-600 mt-1 font-medium">
                    <CheckCircle2 size={12} /> Slot available — proceed to confirm.
                  </div>
                )}
              </div>
            </>
          )}

          {/* ── STEP 2: DETAILS ── */}
          {step === 2 && (
            <>
              <StepHeader icon={<User size={18} />} title="Your Details" sub="We'll use this to dispatch your technician and send confirmations." />

              <Field label="Full Name" error={errors.fullName}>
                <Input icon={<User size={14} />} value={fullName} onChange={setFullName} placeholder="Jane Doe" />
              </Field>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Email" error={errors.email}>
                  <Input icon={<CheckCircle2 size={14} />} type="email" value={email} onChange={setEmail} placeholder="jane@example.com" />
                </Field>
                <Field label="Phone" error={errors.phone}>
                  <Input icon={<Clock size={14} />} type="tel" value={phone} onChange={setPhone} placeholder="(305) 555-0100" />
                </Field>
              </div>

              <Field label="Property Address" error={errors.address}>
                <div className="relative">
                  <span className="absolute left-3 top-3.5 text-gray-400"><MapPin size={14} /></span>
                  <input
                    ref={addressInputRef}
                    type="text"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setErrors((prev) => { const { address: _a, ...rest } = prev; return rest; });
                    }}
                    placeholder="123 Ocean Drive, Miami, FL 33139"
                    className={`pl-9 w-full rounded-xl border py-3 px-3.5 text-xs text-gray-800 placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none ${
                      errors.address ? "border-rose-400 bg-rose-50/10" : "border-gray-200"
                    }`}
                  />
                </div>
                {mapsReady && !errors.address && (
                  <p className="text-[10px] text-emerald-600 mt-1">Address autocomplete active.</p>
                )}
              </Field>

              {/* Zip + Coverage */}
              <Field label="Zip Code" error={errors.zip}>
                <div className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={zip}
                    onChange={(e) => {
                      setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
                      setErrors((prev) => { const { zip: _z, ...rest } = prev; return rest; });
                    }}
                    placeholder="33139"
                    maxLength={5}
                    className={`w-28 border rounded-xl px-3 py-2.5 text-xs font-mono focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none ${
                      errors.zip ? "border-rose-400 bg-rose-50/10" : "border-gray-200"
                    }`}
                  />
                  <CoverageBadge status={coverageStatus} />
                </div>
              </Field>

              {/* Out-of-coverage explicit confirmation prompt */}
              {showCoveragePrompt && coverageStatus === "not-covered" && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
                  <div className="flex items-start gap-2">
                    <MapPinOff size={15} className="text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-bold text-amber-800">ZIP {zip} is outside our current service area</p>
                      <p className="text-xs text-amber-700 mt-0.5 leading-relaxed">
                        You can still book — our team will review and confirm availability within your area before dispatching a technician.
                      </p>
                    </div>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={coverageConfirmed}
                      onChange={(e) => setCoverageConfirmed(e.target.checked)}
                      className="h-4 w-4 rounded border-amber-300 accent-amber-600 cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-amber-800">
                      I understand and want to proceed with this booking
                    </span>
                  </label>
                  {coverageConfirmed && (
                    <p className="text-[10px] text-amber-600">
                      ✓ Click <strong>Continue</strong> to proceed to payment.
                    </p>
                  )}
                </div>
              )}

              <Field label="Access Notes (optional)">
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  placeholder="Gate code, lockbox location, parking instructions, pets…"
                  className="w-full border border-gray-200 rounded-xl px-3.5 py-3 text-xs text-gray-800 placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none resize-none"
                />
              </Field>
            </>
          )}

          {/* ── STEP 3: REVIEW & PAY ── */}
          {step === 3 && (
            <>
              <StepHeader icon={<CreditCard size={18} />} title="Review & Pay" sub="Your card is only charged after the service is completed." />

              {/* Booking summary (inline for this step) */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-xs font-mono text-gray-600">
                <div className="flex justify-between"><span>Name:</span><span className="font-bold text-gray-900">{fullName}</span></div>
                <div className="flex justify-between"><span>Email:</span><span className="font-bold text-gray-900 truncate max-w-[180px]">{email}</span></div>
                <div className="flex justify-between"><span>Date:</span><span className="font-bold text-gray-900">{selectedDate}</span></div>
                <div className="flex justify-between"><span>Window:</span><span className="font-bold text-gray-900">{selectedSlot}</span></div>
                <div className="flex justify-between"><span>Address:</span><span className="font-bold text-gray-900 truncate max-w-[180px]">{address}</span></div>
              </div>

              {/* Out-of-area reminder in Step 3 */}
              {coverageStatus === "not-covered" && coverageConfirmed && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 flex gap-2 text-amber-800 text-xs leading-normal">
                  <MapPinOff size={15} className="text-amber-600 shrink-0 mt-0.5" />
                  <span>ZIP <strong>{zip}</strong> is outside our standard area. Our team will confirm before dispatching.</span>
                </div>
              )}

              <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 flex gap-2 text-emerald-800 text-xs leading-normal">
                <ShieldCheck size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>We authorize (hold) your card now but <strong>only charge after the technician completes the service</strong> and you confirm the work is done.</span>
              </div>

              {/* Terms & consent */}
              <div className="space-y-3 rounded-xl border border-gray-100 bg-gray-50 p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">Authorization & Consent</p>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={termsAccepted}
                    onChange={(e) => { setTermsAccepted(e.target.checked); setTermsError(""); }}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-brand cursor-pointer"
                  />
                  <span className="text-xs text-gray-700 leading-relaxed">
                    I have read and agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline inline-flex items-center gap-0.5">
                      Terms of Service <ExternalLink size={10} />
                    </a>{" "}
                    and{" "}
                    <a href="/cancellation" target="_blank" rel="noopener noreferrer" className="text-brand font-semibold hover:underline inline-flex items-center gap-0.5">
                      Cancellation Policy <ExternalLink size={10} />
                    </a>.{" "}
                    <span className="text-rose-500 font-bold">*</span>
                  </span>
                </label>

                {needsRecurringConsent && (
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={recurringConsent}
                      onChange={(e) => { setRecurringConsent(e.target.checked); setTermsError(""); }}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-brand cursor-pointer"
                    />
                    <span className="text-xs text-gray-700 leading-relaxed">
                      I authorize Greenbee to charge my card on a{" "}
                      <span className="font-semibold capitalize">{bookingParams.frequency}</span> basis
                      until I cancel. I understand I can cancel anytime with 24 hours' notice.{" "}
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
                  membership: activeMembership ?? null,
                  sameDayFee: isSameDay,
                  twoTechFee: isTwoTech,
                }}
                service={service}
                selectedDate={selectedDate}
                selectedSlot={selectedSlot}
                validateBeforePayment={() => {
                  if (!termsAccepted) {
                    setTermsError("Please accept the Terms of Service and Cancellation Policy to continue.");
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
                onLog={setApiLogs}
                onSubmitBooking={onSubmitBooking}
                buildBookingDraft={({ paymentIntentId, paymentIntentStatus, paymentStatus }) =>
                  buildDraft({ paymentMethod: "card", paymentStatus, stripePaymentIntentId: paymentIntentId, stripePaymentStatus: paymentIntentStatus })
                }
                isProcessing={isProcessing}
              />

              {apiLogs.length > 0 && (
                <div className="bg-slate-950 rounded-xl p-3 font-mono text-[10px] space-y-1 text-gray-400 max-h-32 overflow-y-auto">
                  {apiLogs.map((log, i) => (
                    <div key={i} className={log.toLowerCase().includes("fail") || log.toLowerCase().includes("error") ? "text-rose-400" : log.toLowerCase().includes("confirmed") || log.toLowerCase().includes("finalized") ? "text-emerald-400" : ""}>{log}</div>
                  ))}
                </div>
              )}
            </>
          )}

          {/* ─── Navigation Buttons ─── */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            <button
              onClick={goBack}
              className="inline-flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors"
            >
              <ArrowLeft size={15} /> {step === 1 ? "Back to Quote" : "Back"}
            </button>

            {step < 3 && (
              <button
                onClick={goNext}
                disabled={showCoveragePrompt && coverageStatus === "not-covered" && !coverageConfirmed}
                className="inline-flex items-center gap-2 bg-brand hover:bg-brand-hover text-white text-sm font-bold px-6 py-2.5 rounded-xl transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {showCoveragePrompt && coverageStatus === "not-covered"
                  ? "Confirm & Continue"
                  : "Continue"}
                <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>

        {/* ─── Summary Column ─── */}
        <div className="lg:col-span-5">
          <OrderSummary
            service={service}
            params={bookingParams}
            selectedDate={selectedDate}
            selectedSlot={selectedSlot}
            isSameDay={isSameDay}
            isTwoTech={isTwoTech}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

function StepHeader({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-9 h-9 rounded-lg bg-brand-light text-brand flex items-center justify-center shrink-0 mt-0.5">{icon}</div>
      <div>
        <h2 className="text-lg font-bold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-500 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function Label({ children, icon }: { children: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 mb-1.5">
      {icon}{children}
    </label>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs font-semibold text-gray-700 block mb-1.5">{label}</label>
      {children}
      {error && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{error}</p>}
    </div>
  );
}

function Input({ icon, type = "text", value, onChange, placeholder }: {
  icon?: React.ReactNode; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div className="relative">
      {icon && <span className="absolute left-3 top-3.5 text-gray-400">{icon}</span>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`${icon ? "pl-9" : "pl-3.5"} w-full rounded-xl border border-gray-200 py-3 pr-3.5 text-xs text-gray-800 placeholder-gray-400 focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none`}
      />
    </div>
  );
}
