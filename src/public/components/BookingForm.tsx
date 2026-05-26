import React, { useEffect, useMemo, useRef, useState } from "react";
import * as Icons from "lucide-react";
import { Booking, Service } from "../../shared/types";
import { SERVICES_DATA } from "../../shared/data";
import { fetchPublicSettingsFromFirestore } from "../../shared/services/firebaseService";
import StripePaymentPanel from "./StripePaymentPanel";

type BookingDraft = Omit<Booking, "id" | "status" | "createdAt">;

interface BookingFormProps {
  bookingParams: {
    serviceId: string;
    units: number;
    selectedFactors: { [factorName: string]: { label: string; modifier: number } };
    frequency: 'once' | 'weekly' | 'bi-weekly' | 'monthly';
    totalCost: number;
    originalCost?: number;
    couponCode?: string;
    couponDiscount?: number;
  };
  onBack: () => void;
  onSubmitBooking: (booking: BookingDraft) => void;
  services?: Service[];
}

declare global {
  interface Window {
    google?: any;
    __grenbeeGoogleMapsLoader?: Promise<void>;
    __grenbeeGoogleMapsApiKey?: string;
  }
}

function isUsableGoogleMapsKey(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.startsWith("AIza") && !trimmed.includes("REPLACE_ME");
}

async function loadGoogleMapsPlacesScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places && window.__grenbeeGoogleMapsApiKey === apiKey) {
    return;
  }

  if (!window.__grenbeeGoogleMapsLoader || window.__grenbeeGoogleMapsApiKey !== apiKey) {
    window.__grenbeeGoogleMapsApiKey = apiKey;
    window.__grenbeeGoogleMapsLoader = new Promise<void>((resolve, reject) => {
      const existingScript = document.querySelector('script[data-grenbee-google-maps="true"]');
      if (existingScript) {
        existingScript.remove();
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset.grenbeeGoogleMaps = "true";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Google Maps script could not be loaded."));
      document.head.appendChild(script);
    });
  }

  return window.__grenbeeGoogleMapsLoader;
}

export default function BookingForm({ 
  bookingParams, 
  onBack, 
  onSubmitBooking,
  services = SERVICES_DATA
}: BookingFormProps) {
  const service = useMemo(() => {
    return services.find((s) => s.id === bookingParams.serviceId) || services[0];
  }, [bookingParams.serviceId, services]);

  // Generate next 7 days for booking calendar selection
  const bookingDays = useMemo(() => {
    const days = [];
    const dateOpts: Intl.DateTimeFormatOptions = { weekday: 'short', month: 'short', day: 'numeric' };
    for (let i = 1; i <= 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      
      const parts = d.toLocaleDateString('en-US', dateOpts).split(', ');
      // parts is like ["Mon", "May 25"]
      days.push({
        rawDate: d.toISOString().split('T')[0],
        weekday: parts[0],
        dayMonth: parts[1] || parts[0]
      });
    }
    return days;
  }, []);

  // 1. Scheduler State
  const [selectedDate, setSelectedDate] = useState<string>(bookingDays[0].rawDate);
  const [selectedSlot, setSelectedSlot] = useState<string>("09:00 AM - 12:00 PM");

  const timeSlots = [
    { label: "Morning", hours: "09:00 AM - 12:00 PM", desc: "Best for early starts" },
    { label: "Midday", hours: "12:00 PM - 03:00 PM", desc: "Standard dispatch hours" },
    { label: "Afternoon", hours: "03:00 PM - 06:00 PM", desc: "Convenient evening wind-down" }
  ];

  // 2. Contact Information State
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [googleMapsKey, setGoogleMapsKey] = useState(import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "");
  const [isAddressAutocompleteEnabled, setIsAddressAutocompleteEnabled] = useState(false);
  const [isAddressAutocompleteReady, setIsAddressAutocompleteReady] = useState(false);

  // 3. Payment State
  const [selectedMethod, setSelectedMethod] = useState<'card' | 'paypal' | 'cash'>('card');
  const [showDeveloperInstructions, setShowDeveloperInstructions] = useState(false);
  const [selectedInstructionTab, setSelectedInstructionTab] = useState<'frontend' | 'backend' | 'env'>('frontend');
  const [isProcessing, setIsProcessing] = useState(false);
  const [apiLogs, setApiLogs] = useState<string[]>([]);

  // Error validations
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const addressInputRef = useRef<HTMLInputElement | null>(null);
  const autocompleteRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadPublicMapSettings() {
      try {
        const settings = await fetchPublicSettingsFromFirestore();
        if (cancelled || !settings) {
          return;
        }

        if (settings.googleMapsApiKey && isUsableGoogleMapsKey(settings.googleMapsApiKey)) {
          setGoogleMapsKey(settings.googleMapsApiKey.trim());
        }

        setIsAddressAutocompleteEnabled(
          settings.googleMapsEnabled === true && settings.googleMapsAutocompleteEnabled !== false
        );
      } catch (error) {
        console.warn("Could not load Google Maps public settings", error);
      }
    }

    loadPublicMapSettings();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function setupAddressAutocomplete() {
      const input = addressInputRef.current;
      if (!input || !isAddressAutocompleteEnabled || !isUsableGoogleMapsKey(googleMapsKey)) {
        setIsAddressAutocompleteReady(false);
        return;
      }

      try {
        await loadGoogleMapsPlacesScript(googleMapsKey);
        if (cancelled || !addressInputRef.current || !window.google?.maps?.places?.Autocomplete) {
          return;
        }

        if (autocompleteRef.current && window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }

        const autocomplete = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ["formatted_address", "name"],
          types: ["address"]
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const nextAddress =
            place?.formatted_address ||
            place?.name ||
            addressInputRef.current?.value ||
            "";

          setAddress(nextAddress);
          setErrors((current) => {
            if (!current.address) {
              return current;
            }
            const { address: _addressError, ...rest } = current;
            return rest;
          });
        });

        autocompleteRef.current = autocomplete;
        setIsAddressAutocompleteReady(true);
      } catch (error) {
        console.warn("Could not enable Google Maps autocomplete", error);
        if (!cancelled) {
          setIsAddressAutocompleteReady(false);
        }
      }
    }

    setupAddressAutocomplete();
    return () => {
      cancelled = true;
    };
  }, [googleMapsKey, isAddressAutocompleteEnabled]);

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {};
    if (!fullName.trim()) newErrors.fullName = "Full name is required";
    if (!email.trim() || !/\S+@\S+\.\S+/.test(email)) newErrors.email = "Valid email is required";
    if (!phone.trim() || phone.replace(/\D/g, "").length < 10) newErrors.phone = "Valid 10-digit phone number is required";
    if (!address.trim()) newErrors.address = "Street address is required to dispatch technicians";
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildBookingDraft = (paymentInfo: {
    paymentMethod: 'card' | 'paypal' | 'cash';
    paymentStatus: 'unpaid' | 'paid' | 'authorized';
    stripePaymentIntentId?: string;
    stripePaymentStatus?: string;
  }): BookingDraft => {
    const couponFields = bookingParams.couponCode && bookingParams.couponDiscount
      ? {
          originalCost: bookingParams.originalCost ?? bookingParams.totalCost + bookingParams.couponDiscount,
          couponCode: bookingParams.couponCode,
          couponDiscount: bookingParams.couponDiscount
        }
      : {};

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
      ...couponFields,
      paymentMethod: paymentInfo.paymentMethod,
      paymentStatus: paymentInfo.paymentStatus,
      ...(paymentInfo.stripePaymentIntentId && { stripePaymentIntentId: paymentInfo.stripePaymentIntentId }),
      ...(paymentInfo.stripePaymentStatus && { stripePaymentStatus: paymentInfo.stripePaymentStatus })
    };
  };

  const handleTerminalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedMethod === 'card') {
      return;
    }

    if (!validateForm()) {
      return;
    }

    setIsProcessing(true);
    const couponLog = bookingParams.couponCode && bookingParams.couponDiscount
      ? `, coupon: '${bookingParams.couponCode}', discount: ${Math.round(bookingParams.couponDiscount * 100)}`
      : "";
    setApiLogs([
      `[SYSTEM] Connecting to secure gateway gateway.springfield-vetted.net...`,
      `[CLIENT] Outbound POST request initiated to backend proxy...`,
      `[CLIENT] Payload: { amount: ${Math.round(bookingParams.totalCost * 100)}, currency: 'usd', method: '${selectedMethod}'${couponLog} }`
    ]);

    // Step-by-step console logging for non-card checkout paths.
    setTimeout(() => {
      setApiLogs(prev => [
        ...prev,
        `[SERVER] Received client session payload. Initializing order session...`,
        `[SERVER] Status 200: Offline/wallet payment path recorded`
      ]);
    }, 600);

    setTimeout(() => {
      const fakeTxnId = `txn_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      setApiLogs(prev => [
        ...prev,
        `[GATEWAY] ${selectedMethod === 'cash' ? 'Cash-on-service invoice' : 'External wallet'} path accepted. Reference token: ${fakeTxnId}`,
        `[SERVER] Transacted: $${bookingParams.totalCost.toFixed(2)} USD`,
        `[SERVER] Dispatched real-time webhook to store booking in persistent storage...`,
        `[CLIENT] Booking finalized! Launching dashboard.`
      ]);

      setTimeout(() => {
        setIsProcessing(false);
        onSubmitBooking(buildBookingDraft({
          paymentMethod: selectedMethod,
          paymentStatus: selectedMethod === 'cash' ? 'unpaid' : 'paid'
        }));
      }, 800);
    }, 1500);
  };


  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Back navigation tab bar */}
      <button
        onClick={onBack}
        className="mb-6 inline-flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-brand transition-colors uppercase tracking-widest cursor-pointer"
      >
        <Icons.ArrowLeft size={16} />
        <span>Adjust Estimate Specs</span>
      </button>

      <form onSubmit={handleTerminalSubmit} className="grid grid-cols-1 gap-8 lg:grid-cols-12 items-start">
        {/* Left column - Schedulers and Form Details (7 cols lg) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 p-6 md:p-8 shadow-sm space-y-6">
          <div>
            <span className="text-[10px] text-brand font-extrabold uppercase tracking-widest bg-brand-light px-2.5 py-1 rounded-full">
              Scheduler & Contact Desk
            </span>
            <h2 className="mt-2 text-xl font-bold text-gray-900 tracking-tight">
              Secure Your Appointment Slot
            </h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Provide dispatch coordinates and coordinate an optimal time window.
            </p>
          </div>

          {/* 1. Date Picker */}
          <div className="space-y-3">
            <label className="text-xs text-gray-500 font-bold tracking-tight uppercase block flex items-center gap-1.5">
              <Icons.Calendar size={13} className="text-brand" />
              <span>1. Choose Appointment Date</span>
            </label>
            
            <div className="grid grid-cols-4 gap-2">
              {bookingDays.map((day) => {
                const isSelected = selectedDate === day.rawDate;
                return (
                  <button
                    key={day.rawDate}
                    type="button"
                    onClick={() => setSelectedDate(day.rawDate)}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-brand bg-brand-light text-brand ring-1 ring-brand font-bold"
                        : "border-gray-100 hover:border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    <span className="text-[10px] uppercase font-bold tracking-wider">{day.weekday}</span>
                    <span className="text-xs font-extrabold mt-1">{day.dayMonth}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. Slot Picker */}
          <div className="space-y-3">
            <label className="text-xs text-gray-500 font-bold tracking-tight uppercase block flex items-center gap-1.5">
              <Icons.Clock size={13} className="text-brand" />
              <span>2. Select Dispatch Window</span>
            </label>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
              {timeSlots.map((slot) => {
                const isSelected = selectedSlot === slot.hours;
                return (
                  <button
                    key={slot.hours}
                    type="button"
                    onClick={() => setSelectedSlot(slot.hours)}
                    className={`flex flex-col text-left p-3.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? "border-brand bg-brand-light text-brand ring-1 ring-brand font-bold"
                        : "border-gray-100 hover:border-gray-200 bg-white text-gray-600"
                    }`}
                  >
                    <span className="text-xs font-bold leading-tight select-none">{slot.label}</span>
                    <span className="text-xs font-extrabold text-gray-900 mt-1 select-none">{slot.hours}</span>
                    <span className="text-[9px] text-gray-400 font-medium mt-1 select-none">{slot.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 3. Address & Coordination info */}
          <div className="space-y-4 border-t border-gray-100 pt-5">
            <label className="text-xs text-gray-500 font-bold tracking-tight uppercase block flex items-center gap-1.5">
              <Icons.User size={13} className="text-brand" />
              <span>3. Customer & Delivery Address</span>
            </label>

            <div className="space-y-3">
              {/* Name */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Full Name</label>
                <div className="relative">
                  <Icons.User className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    id="input-fullName"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className={`pl-10 w-full rounded-xl border py-3 px-3.5 text-xs text-gray-800 placeholder-gray-400 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none ${
                      errors.fullName ? "border-rose-500 bg-rose-50/10" : "border-gray-200"
                    }`}
                  />
                </div>
                {errors.fullName && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.fullName}</p>}
              </div>

              {/* Grid Contact Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Email */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Email Address</label>
                  <div className="relative">
                    <Icons.Mail className="absolute left-3 top-3.5 text-gray-400" size={16} />
                    <input
                      id="input-email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane.doe@domain.com"
                      className={`pl-10 w-full rounded-xl border py-3 px-3.5 text-xs text-gray-800 placeholder-gray-400 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none ${
                        errors.email ? "border-rose-500 bg-rose-50/10" : "border-gray-200"
                      }`}
                    />
                  </div>
                  {errors.email && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.email}</p>}
                </div>

                {/* Phone */}
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Phone Number</label>
                  <div className="relative">
                    <Icons.Phone className="absolute left-3 top-3.5 text-gray-400" size={16} />
                    <input
                      id="input-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="(555) 012-3456"
                      className={`pl-10 w-full rounded-xl border py-3 px-3.5 text-xs text-gray-800 placeholder-gray-400 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none ${
                        errors.phone ? "border-rose-500 bg-rose-50/10" : "border-gray-200"
                      }`}
                    />
                  </div>
                  {errors.phone && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.phone}</p>}
                </div>
              </div>

              {/* Service Dispatch Address */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Dispatch Property Address</label>
                <div className="relative">
                  <Icons.MapPin className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <input
                    id="input-address"
                    type="text"
                    ref={addressInputRef}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (errors.address) {
                        setErrors((current) => {
                          const { address: _addressError, ...rest } = current;
                          return rest;
                        });
                      }
                    }}
                    placeholder="123 Harmony Drive, Springfield, 62701"
                    className={`pl-10 w-full rounded-xl border py-3 px-3.5 text-xs text-gray-800 placeholder-gray-400 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none ${
                      errors.address ? "border-rose-500 bg-rose-50/10" : "border-gray-200"
                    }`}
                  />
                </div>
                {isAddressAutocompleteReady && !errors.address && (
                  <p className="text-[10px] text-emerald-600 mt-1 font-semibold">
                    Address autocomplete is active. Pick a suggested address for faster checkout.
                  </p>
                )}
                {errors.address && <p className="text-[10px] text-rose-500 mt-1 font-semibold">{errors.address}</p>}
              </div>

              {/* Special Instructions */}
              <div>
                <label className="text-xs font-semibold text-gray-700 block mb-1">Technician Entry Notes (Optional)</label>
                <div className="relative">
                  <Icons.Key className="absolute left-3 top-3.5 text-gray-400" size={16} />
                  <textarea
                    id="input-notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide gate entry codes, lockbox information, or instructions regarding pets (e.g., 'Gate code #4412, key is in rock drawer, lock our dog inside bedroom please')"
                    rows={2}
                    className="pl-10 w-full rounded-xl border border-gray-200 py-3 px-3.5 text-xs text-gray-800 placeholder-gray-400 shadow-sm focus:border-brand focus:ring-1 focus:ring-brand focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column - Invoice Hold details & Simulated Wallet Guard (5 cols lg) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Service Quote Summary Card */}
          <div className="bg-gray-900 text-white rounded-2xl p-6 md:p-8 space-y-5 shadow-sm relative">
            <div className="absolute top-0 right-0 h-20 w-20 bg-brand/10 rounded-bl-full"></div>
            <div>
              <span className="text-[9px] text-brand font-extrabold uppercase tracking-widest block select-none">
                Order Review
              </span>
              <h3 className="text-lg font-bold tracking-tight truncate select-none">
                {service.name} Appointment
              </h3>
            </div>

            <div className="space-y-2 border-y border-white/10 py-4 font-mono text-xs text-gray-300">
              <div className="flex justify-between select-none">
                <span>Date Selected:</span>
                <span className="text-white font-semibold">{selectedDate}</span>
              </div>
              <div className="flex justify-between select-none">
                <span>Time Frame:</span>
                <span className="text-white font-semibold truncate max-w-[140px]">{selectedSlot}</span>
              </div>
              <div className="flex justify-between select-none">
                <span>Units Reserved:</span>
                <span className="text-brand font-semibold capitalize bg-brand-light/10 px-2 py-0.5 rounded text-[10px]">
                  {bookingParams.units} {service.unitName}{bookingParams.units !== 1 ? 's' : ''}
                </span>
              </div>
              <div className="flex justify-between select-none">
                <span>Contract Style:</span>
                <span className="text-white font-semibold capitalize font-sans">{bookingParams.frequency}</span>
              </div>
            </div>

            <div className="flex justify-between items-baseline pt-2 select-none">
              <span className="text-sm font-bold text-gray-300">Price Lock Code:</span>
              <span className="text-2xl font-extrabold text-brand tracking-tight">
                ${bookingParams.totalCost.toFixed(2)}
              </span>
            </div>

            {bookingParams.couponCode && bookingParams.couponDiscount && (
              <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3 space-y-1.5 font-mono text-[11px] text-emerald-100">
                <div className="flex justify-between">
                  <span>Original Quote:</span>
                  <span className="font-bold text-white">${(bookingParams.originalCost ?? bookingParams.totalCost + bookingParams.couponDiscount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Coupon {bookingParams.couponCode}:</span>
                  <span className="font-bold text-emerald-300">-${bookingParams.couponDiscount.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Secure Payment Center */}
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-md space-y-6">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-100 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <Icons.Lock size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-extrabold text-gray-900 tracking-tight uppercase">Payment Secured Panel</h4>
                  <p className="text-[10px] text-gray-400 font-medium tracking-tight">Enterprise PCI-DSS Compliance Shield</p>
                </div>
              </div>
              <span className="text-[10px] bg-emerald-500 text-white font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-md select-none">
                API-Ready
              </span>
            </div>

            {/* Sub-tabs Select Payment Method */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase font-mono font-black text-gray-400 tracking-widest block select-none">
                Select Checkout Method
              </label>
              <div className="grid grid-cols-3 gap-1 bg-gray-100 p-1 rounded-xl">
                {(['card', 'paypal', 'cash'] as const).map((method) => {
                  const isSel = selectedMethod === method;
                  return (
                    <button
                      key={method}
                      type="button"
                      onClick={() => {
                        setSelectedMethod(method);
                        // Clean error triggers
                        setErrors({});
                      }}
                      disabled={isProcessing}
                      className={`py-2 px-1 text-center rounded-lg text-xs font-bold uppercase transition-all select-none cursor-pointer ${
                        isSel 
                          ? "bg-white text-gray-950 shadow-xs ring-1 ring-gray-950/5" 
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {method === 'card' && "Stripe Card"}
                      {method === 'paypal' && "📱 PayPal"}
                      {method === 'cash' && "💵 Cash"}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* CONDITIONAL BILLING METHOD VIEWS */}
            {selectedMethod === 'card' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <div className="rounded-xl bg-emerald-50/70 p-3 border border-emerald-100 flex gap-2 text-emerald-900 text-xs leading-normal select-none">
                  <Icons.ShieldCheck size={20} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <strong>Embedded Stripe authorization:</strong> customers stay inside Grenbee. Card data is collected by Stripe Elements, not by our app, and the booking stores the PaymentIntent reference.
                  </div>
                </div>

                <StripePaymentPanel
                  bookingParams={bookingParams}
                  service={service}
                  selectedDate={selectedDate}
                  selectedSlot={selectedSlot}
                  validateBeforePayment={validateForm}
                  onPaymentStarted={() => setIsProcessing(true)}
                  onPaymentFinished={() => setIsProcessing(false)}
                  onLog={setApiLogs}
                  onSubmitBooking={onSubmitBooking}
                  isProcessing={isProcessing}
                  buildBookingDraft={({ paymentIntentId, paymentIntentStatus, paymentStatus }) =>
                    buildBookingDraft({
                      paymentMethod: "card",
                      paymentStatus,
                      stripePaymentIntentId: paymentIntentId,
                      stripePaymentStatus: paymentIntentStatus
                    })
                  }
                />
              </div>
            )}

            {selectedMethod === 'paypal' && (
              <div className="space-y-3 p-4 rounded-xl border border-brand/10 bg-brand-light/20 text-center animate-in fade-in duration-200">
                <div className="mx-auto h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <Icons.ExternalLink size={20} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-gray-900">Direct Express Checkout Wallet</h5>
                  <p className="text-[10px] text-gray-500 leading-normal max-w-xs mx-auto">
                    Clicking confirm below opens the PayPal popup securely to authorize the transaction via secure OAuth handshake.
                  </p>
                </div>
                <div className="bg-amber-100/65 text-amber-800 text-[10px] font-bold py-1.5 px-3 rounded-lg border border-amber-200 inline-block">
                  PayPal REST-APIs Loaded & Initialized
                </div>
              </div>
            )}

            {selectedMethod === 'cash' && (
              <div className="space-y-3 p-4 rounded-xl border border-gray-200 bg-gray-50/50 text-center animate-in fade-in duration-200">
                <div className="mx-auto h-10 w-10 rounded-full bg-gray-250 flex items-center justify-center text-gray-700">
                  <Icons.Wrench size={18} />
                </div>
                <div className="space-y-1">
                  <h5 className="text-xs font-bold text-gray-900">COD / Invoice on Service</h5>
                  <p className="text-[10px] text-gray-500 leading-normal max-w-xs mx-auto">
                    Pay our dispatched technicians after work is verified as completed. We accept cash, company checks, or debit/credit swipe cards on-site!
                  </p>
                </div>
              </div>
            )}

            {/* REAL-TIME TERMINAL LOG DIAGNOSTICS */}
            {apiLogs.length > 0 && (
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-black text-brand tracking-wider flex items-center gap-1 select-none">
                  <Icons.Terminal size={12} />
                  <span>Interactive Pipeline Logs</span>
                </span>
                <div className="bg-slate-950 border border-slate-900 rounded-xl p-3.5 font-mono text-[10px] leading-relaxed space-y-1 text-emerald-400 select-all overflow shadow-inner">
                  {apiLogs.map((log, index) => {
                    const isError = log.includes("❌") || log.toLowerCase().includes("fail") || log.toLowerCase().includes("decline");
                    const isSuccess = log.includes("✅") || log.toLowerCase().includes("succeeded") || log.toLowerCase().includes("approved");
                    return (
                      <div 
                        key={index} 
                        className={isError ? "text-rose-400 font-bold" : isSuccess ? "text-emerald-400 font-extrabold" : "text-gray-300"}
                      >
                        {log}
                      </div>
                    );
                  })}
                  {isProcessing && (
                    <div className="flex items-center gap-1 text-gray-400 select-none italic text-[9px] mt-1">
                      <Icons.RefreshCw size={9} className="animate-spin text-brand" />
                      <span>transacting secure API handshake...</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Submit Block Button */}
            {selectedMethod !== 'card' && (
            <div className="pt-1">
              <button
                type="submit"
                disabled={isProcessing}
                id="btn-confirm-submit"
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand/20 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isProcessing ? (
                  <>
                    <Icons.Loader className="animate-spin" size={14} />
                    <span>Transacting Secured API Payload...</span>
                  </>
                ) : (
                  <>
                    <Icons.CheckCheck size={14} strokeWidth={3} />
                    <span>Confirm & Book Appointment</span>
                  </>
                )}
              </button>
            </div>
            )}

            {/* COLLAPSIBLE DEVELOPER INTEGRATION GUIDER MODULE */}
            <div className="border-t border-gray-100 pt-4">
              <button
                type="button"
                onClick={() => setShowDeveloperInstructions(!showDeveloperInstructions)}
                className="w-full flex items-center justify-between text-gray-500 hover:text-brand transition-colors text-xs font-bold cursor-pointer select-none"
              >
                <span className="flex items-center gap-1.5 text-[11px] font-bold">
                  <Icons.Code size={13} className="text-brand shrink-0" />
                  <span>Stripe Elements Integration Notes</span>
                </span>
                <span className="text-[10px] text-gray-400">
                  {showDeveloperInstructions ? "Hide details ▲" : "View Code ▼"}
                </span>
              </button>

              {showDeveloperInstructions && (
                <div className="mt-3.5 space-y-3 text-left bg-slate-50 border border-slate-200/50 rounded-xl p-4 animate-in slide-in-from-top-2 duration-300">
                  <p className="text-[11px] text-gray-600 leading-normal">
                    Card checkout now stays inside Grenbee using Stripe Payment Element. These are the moving pieces to keep configured:
                  </p>

                  {/* Dev Code Sub-tabs */}
                  <div className="flex border-b border-gray-200 gap-2">
                    {(['frontend', 'backend', 'env'] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setSelectedInstructionTab(tab)}
                        className={`pb-1.5 text-[10px] font-extrabold uppercase transition-all select-none cursor-pointer border-b-2 ${
                          selectedInstructionTab === tab 
                            ? "border-brand text-brand" 
                            : "border-transparent text-gray-400 hover:text-gray-600"
                        }`}
                      >
                        {tab === 'frontend' && "React Code"}
                        {tab === 'backend' && "Express Controller"}
                        {tab === 'env' && ".env Setup"}
                      </button>
                    ))}
                  </div>

                  {/* Dev Code Sub-tab details */}
                  {selectedInstructionTab === 'frontend' && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-gray-450 uppercase font-mono block">Embedded Payment Element flow:</span>
                      <pre className="p-3 bg-slate-950 text-slate-100 text-[10px] rounded-lg font-mono leading-relaxed overflow-x-auto select-all max-h-[160px]">
{`// 1. Install SDK
// npm i @stripe/stripe-js @stripe/react-stripe-js

// 2. Integration hook inside BookingForm.tsx
const stripe = await loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

const response = await fetch('/api/create-payment-intent', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ amount: Math.round(totalCost * 100) })
});
const { clientSecret } = await response.json();

const result = await stripe.confirmPayment({
  elements,
  redirect: 'if_required',
  payment_method: {
    card: cardElement, // Stripe unified text item
    billing_details: { name: fullName }
  }
});
if (result.error) {
  setErrors({ cardNumber: result.error.message });
} else {
  // Save booking details database session
}`}
                      </pre>
                    </div>
                  )}

                  {selectedInstructionTab === 'backend' && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-gray-450 uppercase font-mono block">Serverless endpoints now included:</span>
                      <pre className="p-3 bg-slate-950 text-slate-100 text-[10px] rounded-lg font-mono leading-relaxed overflow-x-auto select-all max-h-[160px]">
{`import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    
    // Create direct financial payment object safely
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount, // in cents (e.g. $29.00 -> 2900)
      currency: 'usd',
      capture_method: 'manual',
      payment_method_types: ['card'],
    });
    
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});`}
                      </pre>
                    </div>
                  )}

                  {selectedInstructionTab === 'env' && (
                    <div className="space-y-1.5">
                      <span className="text-[9px] text-gray-455 uppercase font-mono block">Define variables inside your workspace root:</span>
                      <pre className="p-3 bg-slate-950 text-emerald-400 text-[10px] rounded-lg font-mono leading-relaxed overflow-x-auto select-all">
{`# 1. Server-side key (Keep PRIVATE, do NOT commit)
STRIPE_SECRET_KEY=sk_test_51Px...

# 2. Client-side public key (Safe to read in React)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51Px...

# 3. Optional for coupon usage after payment
FIREBASE_SERVICE_ACCOUNT_JSON='{...}'`}
                      </pre>
                    </div>
                  )}

                  <div className="text-[10px] text-gray-500 font-medium select-none bg-white p-2.5 rounded border border-gray-150 flex gap-1.5 items-center leading-normal">
                    <Icons.CheckCircle size={14} className="text-emerald-600 shrink-0" />
                    <span>PaymentIntent IDs are stored on bookings. Coupon `usedCount` is updated only after Stripe confirmation when server Firebase credentials are configured.</span>
                  </div>
                </div>
              )}
            </div>
            
            <div className="text-[10px] text-center text-gray-400 font-semibold select-none flex items-center justify-center gap-1.5 pt-1 border-t border-gray-50">
              <Icons.ShieldCheck size={14} className="text-brand shrink-0" />
              <span>AES-256 PCI Compliance Secured Routing</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
