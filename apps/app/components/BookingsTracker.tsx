import React, { useState, useMemo } from "react";
import * as Icons from "lucide-react";
import { useTranslation } from "react-i18next";
import { Booking, BookingStatus } from "@grenbee/types";

interface BookingsTrackerProps {
  bookings: Booking[];
  onUpdateStatus: (
    bookingId: string,
    status: BookingStatus,
    paymentStatus?: 'unpaid' | 'paid' | 'authorized',
    paymentMethod?: 'card' | 'paypal' | 'cash'
  ) => void;
  onReschedule: (bookingId: string, newDate: string, newSlot: string) => void;
  onCancelBooking: (bookingId: string) => void;
  onWriteReview: (serviceId: string) => void;
  /** Called when the user wants to repeat a completed booking.
   *  Parent navigates to the estimator with the same service pre-selected. */
  onRebook?: (booking: Booking) => void;
}

export default function BookingsTracker({
  bookings,
  onUpdateStatus,
  onReschedule,
  onCancelBooking,
  onWriteReview,
  onRebook,
}: BookingsTrackerProps) {
  const { t } = useTranslation();
  const [expandedBookingId, setExpandedBookingId] = useState<string | null>(null);
  
  // State for automatic technician execution pipeline simulation
  const [autoProgress, setAutoProgress] = useState<boolean>(true);
  const [showStaffMode, setShowStaffMode] = useState<boolean>(false);
  
  // Automatic dispatch simulator loop
  React.useEffect(() => {
    if (!autoProgress) return;

    // Scan for any booking that is in an intermediate state
    const activeBooking = bookings.find(
      (b) => b.status === "scheduled" || b.status === "dispatched" || b.status === "in-progress"
    );

    if (!activeBooking) return;

    const currentStatus = activeBooking.status;
    let delay = 10000; // 10 seconds per transition for elegant testing
    let nextStatus: BookingStatus | null = null;

    if (currentStatus === "scheduled") {
      nextStatus = "dispatched";
    } else if (currentStatus === "dispatched") {
      nextStatus = "in-progress";
    } else if (currentStatus === "in-progress") {
      nextStatus = "completed";
      delay = 14000; // Giving the job execution slightly longer to feel realistic
    }

    if (!nextStatus) return;

    const timer = setTimeout(() => {
      onUpdateStatus(activeBooking.id, nextStatus!);
    }, delay);

    return () => clearTimeout(timer);
  }, [bookings, autoProgress, onUpdateStatus]);

  // Rescheduling modal state (associated with a specific booking ID)
  const [rescheduleData, setRescheduleData] = useState<{ id: string; date: string; slot: string } | null>(null);
  
  // Invoice billing modal state
  const [invoiceToView, setInvoiceToView] = useState<Booking | null>(null);

  // Online invoice payment gateway states
  const [payBookingData, setPayBookingData] = useState<Booking | null>(null);
  const [payCardNumber, setPayCardNumber] = useState("");
  const [payExpiry, setPayExpiry] = useState("");
  const [payCvv, setPayCvv] = useState("");
  const [payErrors, setPayErrors] = useState<{ [key: string]: string }>({});
  const [isPayProcessing, setIsPayProcessing] = useState(false);
  const [payApiLogs, setPayApiLogs] = useState<string[]>([]);
  const [payBehavior, setPayBehavior] = useState<'success' | 'decline'>('success');
  const [showPayDevGuides, setShowPayDevGuides] = useState(false);
  const [payDevTab, setPayDevTab] = useState<'fe' | 'be'>('fe');

  const handlePayCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\s+/g, "").replace(/[^0-9]/gi, "");
    const trimmed = raw.slice(0, 16);
    const formatted = trimmed.match(/.{1,4}/g)?.join(" ") || trimmed;
    setPayCardNumber(formatted);
  };

  const handlePayExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\//g, "").replace(/[^0-9]/gi, "");
    const trimmed = raw.slice(0, 4);
    if (trimmed.length >= 2) {
      setPayExpiry(`${trimmed.slice(0, 2)}/${trimmed.slice(2)}`);
    } else {
      setPayExpiry(trimmed);
    }
  };

  const handlePayCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/gi, "").slice(0, 3);
    setPayCvv(val);
  };

  const handleExecuteInvoicePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!payBookingData) return;

    const newErrors: { [key: string]: string } = {};
    if (payCardNumber.replace(/\s/g, "").length < 16) newErrors.card = "Requires full 16-digit card number";
    if (payExpiry.length < 5) newErrors.expiry = "Requires MM/YY expiration";
    if (payCvv.length < 3) newErrors.cvv = "Requires 3-digit CVV";

    if (Object.keys(newErrors).length > 0) {
      setPayErrors(newErrors);
      return;
    }

    setPayErrors({});
    setIsPayProcessing(true);
    setPayApiLogs([
      `[SYSTEM] Contacting Stripe Sandbox endpoint routing...`,
      `[CLIENT] POST /api/v1/payments/confirm payload started...`,
      `[CLIENT] Payload: { invoiceId: "${payBookingData.id}", transactedAmount: ${payBookingData.totalCost * 100} }`
    ]);

    setTimeout(() => {
      setPayApiLogs(prev => [
        ...prev,
        `[SERVER] Verification complete. Creating payment intent stream...`,
        `[SERVER] Gateway handshaking secure payload session token token_auth_${Math.floor(100 + Math.random() * 900)}`
      ]);
    }, 600);

    setTimeout(() => {
      if (payBehavior === 'decline') {
        setPayApiLogs(prev => [
          ...prev,
          `[GATEWAY] ❌ TRANSACTION DECLINED: Insufficient funds (card_declined)`,
          `[CLIENT] Terminating payment stream.`
        ]);
        setIsPayProcessing(false);
        setPayErrors({ card: "Insufficient funds. Please switch to 'Success' behavior rule to override." });
      } else {
        setPayApiLogs(prev => [
          ...prev,
          `[GATEWAY] ✅ TRANSACTION APPROVED. Secure authorization capture complete.`,
          `[SERVER] Status 200: Successfully synced balance sheets on ledger.`,
          `[CLIENT] Payment transaction completed!`
        ]);

        setTimeout(() => {
          onUpdateStatus(payBookingData.id, payBookingData.status, 'paid', 'card');
          setIsPayProcessing(false);
          setPayBookingData(null);
          // Clean modal variables
          setPayCardNumber("");
          setPayExpiry("");
          setPayCvv("");
          setPayApiLogs([]);
        }, 800);
      }
    }, 1500);
  };

  const toggleExpand = (id: string) => {
    setExpandedBookingId(expandedBookingId === id ? null : id);
  };

  const statusMeta = (status: BookingStatus) => {
    switch (status) {
      case "scheduled":
        return {
          label: "Confirmed & Scheduled",
          color: "text-blue-600 bg-blue-50 border-blue-100",
          icon: Icons.Clock,
          stepIndex: 0
        };
      case "dispatched":
        return {
          label: "Technician En Route",
          color: "text-amber-600 bg-amber-50 border-amber-100",
          icon: Icons.Truck,
          stepIndex: 1
        };
      case "in-progress":
        return {
          label: "Job Underway",
          color: "text-brand bg-brand-light border-brand/20",
          icon: Icons.Wrench,
          stepIndex: 2
        };
      case "completed":
        return {
          label: "Completed & Verified",
          color: "text-emerald-700 bg-emerald-50 border-emerald-100",
          icon: Icons.CheckCircle,
          stepIndex: 3
        };
      case "cancelled":
        return {
          label: "Cancelled",
          color: "text-gray-500 bg-gray-50 border-gray-100",
          icon: Icons.XCircle,
          stepIndex: -1
        };
      default:
        return { label: "Unknown", color: "text-gray-600 bg-gray-50", icon: Icons.HelpCircle, stepIndex: 0 };
    }
  };

  const steps = ["Scheduled", "Dispatched", "In Progress", "Completed"];

  // Generate 7 upcoming dates for rescheduling
  const rescheduleDates = useMemo(() => {
    const dates = [];
    for (let i = 1; i <= 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split('T')[0]);
    }
    return dates;
  }, []);

  const timeSlots = [
    "09:00 AM - 12:00 PM",
    "12:00 PM - 03:00 PM",
    "03:00 PM - 06:00 PM"
  ];

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-2">
        <div className="text-left">
          <h2 className="text-xl font-bold text-gray-900 tracking-tight font-sans">Tablero de Operaciones Activas</h2>
          <p className="text-xs text-gray-550 font-medium">
            Sigue en tiempo real a los técnicos coordinados, administra citas y revisa estados de pago.
          </p>
        </div>

        {/* Master Simulation Switcher */}
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-250/50 p-2.5 rounded-xl select-none">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${autoProgress ? "bg-emerald-400" : "bg-gray-400"}`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${autoProgress ? "bg-emerald-500" : "bg-gray-450"}`}></span>
            </span>
            <span className="text-[10px] font-extrabold uppercase text-gray-550 tracking-wider">
              {autoProgress ? "Simulación de Técnicos: Activo" : "Simulación de Técnicos: Pausado"}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setAutoProgress(!autoProgress)}
            className={`py-1 px-2.5 rounded-md text-[9px] font-black uppercase transition-all whitespace-nowrap cursor-pointer ${
              autoProgress 
                ? "bg-stone-900 border border-stone-900 text-white" 
                : "bg-white text-stone-700 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {autoProgress ? t("bookings.sim.toggle") : t("bookings.sim.toggleStart")}
          </button>
        </div>
      </div>

      {autoProgress && bookings.some(b => b.status !== 'completed' && b.status !== 'cancelled') && (
        <div className="bg-emerald-50 border border-emerald-100/60 p-3.5 rounded-xl flex items-center justify-between text-emerald-850 gap-3 text-xs animate-pulse select-none">
          <div className="flex items-center gap-2 font-medium leading-normal">
            <Icons.RefreshCw size={13} className="animate-spin text-emerald-600 shrink-0" />
            <span>{t("bookings.sim.hint")}</span>
          </div>
        </div>
      )}

      {bookings.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center shadow-sm space-y-4">
          <div className="mx-auto h-12 w-12 rounded-full bg-brand/5 text-brand flex items-center justify-center">
            <Icons.CalendarCheck size={24} />
          </div>
          <div>
            <h3 className="text-base font-bold text-gray-900">{t("bookings.empty.title")}</h3>
            <p className="text-xs text-gray-500 max-w-sm mx-auto mt-1">
              {t("bookings.empty.subtitle")}
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking) => {
            const meta = statusMeta(booking.status);
            const StatusIcon = meta.icon;
            const isExpanded = expandedBookingId === booking.id;

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-300 ${
                  isExpanded ? "ring-1 ring-brand/15 border-brand/20 shadow-md" : ""
                }`}
              >
                {/* Accordion Head Line */}
                <div
                  onClick={() => toggleExpand(booking.id)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none hover:bg-gray-50/40 transition-colors"
                >
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl border flex items-center justify-center ${meta.color}`}>
                      <StatusIcon size={20} />
                    </div>
                    <div>
                       <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-gray-950">
                          {booking.serviceName}
                        </span>
                        <span className="text-[10px] font-bold py-0.5 px-2 rounded-full bg-gray-100 text-gray-500 font-mono">
                          {booking.id}
                        </span>
                        <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded-md bg-brand-light text-brand uppercase tracking-wider">
                          {booking.frequency}
                        </span>

                        {/* Payment Status Badge */}
                        {(booking.paymentStatus || 'paid') === 'paid' ? (
                          <span className="text-[9px] font-extrabold py-0.5 px-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1 select-none">
                            <Icons.ShieldCheck size={11} className="shrink-0 text-emerald-600" />
                            <span className="uppercase tracking-wider">PAID ({booking.paymentMethod || 'card'})</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-extrabold py-0.5 px-2 rounded-md bg-amber-50 text-amber-800 border border-amber-100 flex items-center gap-1 select-none">
                            <Icons.Wallet size={11} className="shrink-0 text-amber-600" />
                            <span className="uppercase tracking-wider">COD / PAY ON SITE</span>
                          </span>
                        )}
                      </div>
                      
                      {/* Address & Booking details summary */}
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Icons.MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate max-w-[200px] sm:max-w-[400px]">{booking.address}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex md:flex-col items-baseline md:items-end justify-between md:justify-center border-t border-gray-50 md:border-t-0 pt-3 md:pt-0">
                    <span className="text-xs text-gray-400 font-medium">
                      Date: <b className="text-gray-900 font-semibold">{booking.bookingDate}</b>
                    </span>
                    <span className="text-xs text-gray-400 font-medium mt-0.5">
                      Cost booked: <b className="text-brand font-extrabold">${booking.totalCost}</b>
                    </span>
                  </div>

                  <div className="hidden md:block">
                    {isExpanded ? <Icons.ChevronUp size={20} className="text-gray-400" /> : <Icons.ChevronDown size={20} className="text-gray-400" />}
                  </div>
                </div>

                {/* Accordion Expanded Box */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/30 p-5 md:p-6 space-y-6">
                    {/* TIMELINE PROGRESS METER */}
                    {booking.status !== "cancelled" ? (
                      <div className="space-y-3.5">
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest block">
                          Operational Service Timeline
                        </span>
                        
                        <div className="relative flex items-center justify-between">
                          {/* Background alignment bar */}
                          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200 z-0"></div>
                          
                          {/* Blue/Green progress bar highlight and fill */}
                          <div 
                            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-brand z-0 transition-all duration-500"
                            style={{ width: `${(meta.stepIndex / 3) * 100}%` }}
                          ></div>

                          {steps.map((stLabel, idx) => {
                            const isPassed = idx <= meta.stepIndex;
                            const isActive = idx === meta.stepIndex;
                            return (
                              <div key={idx} className="relative z-10 flex flex-col items-center">
                                <div
                                  className={`h-7 w-7 rounded-full border-2 flex items-center justify-center transition-all duration-300 ${
                                    isPassed
                                      ? "bg-brand border-brand text-white"
                                      : "bg-white border-gray-300 text-gray-400"
                                  } ${isActive ? "ring-4 ring-brand/15" : ""}`}
                                >
                                  {isPassed ? (
                                    <Icons.Check size={14} strokeWidth={3} />
                                  ) : (
                                    <span className="text-[10px] font-bold">{idx + 1}</span>
                                  )}
                                </div>
                                <span className={`text-[10px] mt-1.5 font-bold ${isPassed ? "text-brand" : "text-gray-400"}`}>
                                  {stLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-100 p-4 rounded-xl text-rose-800 text-xs flex gap-2 font-medium">
                        <Icons.AlertCircle className="text-rose-600 mt-0.5 shrink-0" size={16} />
                        <span>{t("bookings.cancelledNote")}</span>
                      </div>
                    )}

                    {/* DYNAMIC CLIENT CONTROLIER: SIMULATION DESK */}
                    {booking.status !== "cancelled" && (
                      <div className="bg-slate-50 border border-gray-200 p-4 rounded-xl space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-1.5">
                            <Icons.Activity size={14} className="text-brand shrink-0 animate-pulse" />
                            <span className="text-[10px] text-gray-800 font-extrabold uppercase tracking-widest block font-sans">
                              {t("bookings.sim.title")}
                            </span>
                          </div>
                          <span className="text-[10px] bg-brand-light text-brand font-bold px-2 py-0.5 rounded">
                            {booking.status === 'scheduled' && t("bookings.sim.scheduled")}
                            {booking.status === 'dispatched' && t("bookings.sim.dispatched")}
                            {booking.status === 'in-progress' && t("bookings.sim.inProgress")}
                            {booking.status === 'completed' && t("bookings.sim.completed")}
                          </span>
                        </div>

                        {booking.status === 'completed' ? (
                          <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-xl text-emerald-850 text-xs flex gap-2 font-medium animate-in zoom-in-95 duration-200">
                            <Icons.CheckCircle className="text-emerald-600 shrink-0 mt-0.5" size={16} />
                            <div>
                              {t("bookings.sim.done")}
                            </div>
                          </div>
                        ) : autoProgress ? (
                          <p className="text-[11px] text-gray-500 font-semibold leading-relaxed flex items-center gap-1.5">
                            <Icons.Info size={13} className="text-brand shrink-0" />
                            <span>{t("bookings.sim.autoNote")}</span>
                          </p>
                        ) : (
                          <div className="space-y-2">
                            <p className="text-[11px] text-gray-500 leading-normal">
                              {t("bookings.sim.paused")}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                disabled={booking.status !== "scheduled"}
                                onClick={() => onUpdateStatus(booking.id, "dispatched")}
                                className="bg-white hover:bg-brand hover:text-white text-gray-750 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <span>{t("bookings.sim.dispatch")}</span>
                              </button>
                              
                              <button
                                type="button"
                                disabled={booking.status !== "dispatched"}
                                onClick={() => onUpdateStatus(booking.id, "in-progress")}
                                className="bg-white hover:bg-brand hover:text-white text-gray-755 disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-gray-700 border border-gray-200 px-3 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <span>{t("bookings.sim.start")}</span>
                              </button>
                              
                              <button
                                type="button"
                                disabled={booking.status !== "in-progress"}
                                onClick={() => onUpdateStatus(booking.id, "completed")}
                                className="bg-brand text-white hover:bg-brand-hover disabled:opacity-40 border border-brand px-3 px-3.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <span>{t("bookings.sim.markDone")}</span>
                              </button>
                            </div>
                          </div>
                        )}
                        
                        {/* Collapsible manual override panel */}
                        <div className="border-t border-gray-200/50 pt-2.5">
                          <button
                            type="button"
                            onClick={() => setShowStaffMode(!showStaffMode)}
                            className="text-[10px] text-gray-400 hover:text-brand font-semibold cursor-pointer underline flex items-center gap-1 bg-transparent border-none outline-none"
                          >
                            <Icons.Wrench size={11} />
                            <span>{showStaffMode ? "Cerrar herramientas de técnico" : "Fuerza manual: Abrir controles rápidos del personal técnico"}</span>
                          </button>
                          
                          {showStaffMode && (
                            <div className="mt-2.5 bg-white rounded-lg border border-gray-250/60 p-3 space-y-2 animate-in slide-in-from-top-1 duration-200">
                              <span className="text-[9px] font-mono text-gray-400 uppercase font-black block">Herramientas Forzadas (Dev staff panel):</span>
                              <div className="flex flex-wrap gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(booking.id, "scheduled")}
                                  className="px-2 py-0.5 text-[9px] font-black uppercase rounded border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100"
                                >
                                  Agendado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(booking.id, "dispatched")}
                                  className="px-2 py-0.5 text-[9px] font-black uppercase rounded border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
                                >
                                  Despachado
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(booking.id, "in-progress")}
                                  className="px-2 py-0.5 text-[9px] font-black uppercase rounded border border-yellow-250 bg-yellow-50 text-yellow-750 hover:bg-yellow-100"
                                >
                                  En Curso
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onUpdateStatus(booking.id, "completed")}
                                  className="px-2 py-0.5 text-[9px] font-black uppercase rounded border border-emerald-250 bg-emerald-50 text-emerald-850 hover:bg-emerald-100"
                                >
                                  Completado
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* APPOINTMENT SPEC DETAILS */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
                          {t("bookings.client")}
                        </span>
                        <div className="space-y-1.5 text-xs text-gray-600 font-medium">
                          <p className="flex items-center gap-2">
                            <Icons.User size={13} className="text-gray-400" />
                            <strong>{booking.customerName}</strong>
                          </p>
                          <p className="flex items-center gap-2">
                            <Icons.Mail size={13} className="text-gray-400" />
                            <a href={`mailto:${booking.email}`} className="text-gray-900 font-semibold underline">{booking.email}</a>
                          </p>
                          <p className="flex items-center gap-2">
                            <Icons.Phone size={13} className="text-gray-400" />
                            <b className="text-gray-900">{booking.phone}</b>
                          </p>
                          <p className="flex items-center gap-2">
                            <Icons.MapPin size={13} className="text-gray-400" />
                            <b className="text-gray-900">{booking.address}</b>
                          </p>
                        </div>
                      </div>

                      <div>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block mb-2">
                          Quote Specific Factors
                        </span>
                        
                        <div className="space-y-1 text-xs">
                          {(Object.entries(booking.selectedFactors) as [string, { label: string; modifier: number }][]).map(([name, detail]) => (
                            <div key={name} className="flex justify-between items-center bg-gray-100/50 p-2 rounded-lg font-medium">
                              <span className="text-gray-500 capitalize">{name.replace(/([A-Z])/g, ' $1').trim()}:</span>
                              <span className="text-gray-900 font-bold">{detail.label.split(' (+ ')[0]}</span>
                            </div>
                          ))}
                          {booking.notes && (
                            <div className="mt-3 bg-brand-light/30 border border-brand/5 p-2.5 rounded-lg text-[11px] text-gray-600 leading-normal">
                              <strong>{t("bookings.entryNote")}:</strong> "{booking.notes}"
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* OPERATIONS MANAGER ACTIONS FOOTER */}
                    <div className="border-t border-gray-100 pt-4 flex flex-wrap justify-between items-center gap-3">
                      <div className="flex gap-2 items-center flex-wrap">
                        {/* Direct Pay Invoice Option */}
                        {(booking.paymentStatus || 'paid') === 'unpaid' && booking.status !== "cancelled" && (
                          <button
                            type="button"
                            onClick={() => setPayBookingData(booking)}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold hover:scale-[1.01] px-3.5 py-1.5 rounded-lg text-xs inline-flex items-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-emerald-500/10"
                          >
                            <Icons.CreditCard size={13} />
                            <span>{t("bookings.payInvoice")}</span>
                          </button>
                        )}

                        {booking.status === "completed" ? (
                          <>
                            {/* Book Again — pre-selects same service in the estimator */}
                            {onRebook && (
                              <button
                                onClick={() => onRebook(booking)}
                                title={t("bookings.bookAgainTitle")}
                                className="bg-brand text-white hover:bg-brand-hover px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                              >
                                <Icons.RefreshCw size={13} />
                                <span>{t("bookings.bookAgain")}</span>
                              </button>
                            )}
                            <button
                              onClick={() => setInvoiceToView(booking)}
                              className="bg-white border border-gray-200 hover:border-brand text-gray-700 hover:text-brand px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Icons.Receipt size={14} />
                              <span>{t("bookings.viewReceipt")}</span>
                            </button>
                            <button
                              onClick={() => onWriteReview(booking.serviceId)}
                              className="bg-white border border-gray-200 hover:border-brand text-gray-700 hover:text-brand px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Icons.PenLine size={13} />
                              <span>{t("bookings.writeReview")}</span>
                            </button>
                          </>
                        ) : booking.status !== "cancelled" ? (
                          <>
                            <button
                              onClick={() => setRescheduleData({ id: booking.id, date: booking.bookingDate, slot: booking.timeSlot })}
                              className="bg-white border border-gray-200 hover:border-brand text-gray-700 hover:text-brand px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Icons.CalendarCog size={14} />
                              <span>{t("bookings.reschedule")}</span>
                            </button>

                            <button
                              onClick={() => {
                                if (confirm("Are you absolutely sure you want to cancel this booking reservation? There are zero cancellation charges.")) {
                                  onCancelBooking(booking.id);
                                }
                              }}
                              className="bg-white border border-gray-200 hover:border-rose-500 text-gray-600 hover:text-rose-600 px-3.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1.5 transition-all cursor-pointer"
                            >
                              <Icons.Trash2 size={13} />
                              <span>{t("bookings.cancel")}</span>
                            </button>
                          </>
                        ) : (
                          <div className="text-[11px] text-gray-400 italic font-medium">Ref No: {booking.id} has been deactivated.</div>
                        )}
                      </div>

                      {booking.status !== "cancelled" && booking.status !== "completed" && (
                        <div className="text-[11px] font-medium text-amber-600 flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-100">
                          <Icons.Clock size={12} />
                          <span>{t("bookings.dispatchSlot")}: {booking.timeSlot}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 2. RESCHEDULE DRAWER/MODAL POPUP */}
      {rescheduleData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="bg-white max-w-md w-full rounded-2xl border border-gray-100 p-6 md:p-8 space-y-5 animate-in fade-in zoom-in duration-200">
            <div>
              <h3 className="text-base font-bold text-gray-900 tracking-tight">Modify Appointment Coordinates</h3>
              <p className="text-xs text-gray-500 mt-0.5">Change dispatch date and optimal hours window below.</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">New Appointment Date</label>
                <select
                  value={rescheduleData.date}
                  onChange={(e) => setRescheduleData({ ...rescheduleData, date: e.target.value })}
                  className="w-full rounded-xl border border-gray-250 p-3 text-xs bg-white focus:ring-1 focus:ring-brand focus:border-brand focus:outline-none"
                >
                  {rescheduleDates.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-600 block mb-1">Optimal Dispatch Window</label>
                <div className="grid grid-cols-1 gap-2">
                  {timeSlots.map((slot) => {
                    const isSel = rescheduleData.slot === slot;
                    return (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => setRescheduleData({ ...rescheduleData, slot })}
                        className={`text-left p-3 rounded-lg border text-xs font-bold flex items-center justify-between cursor-pointer ${
                          isSel ? "border-brand bg-brand-light text-brand" : "border-gray-200 bg-white text-gray-700"
                        }`}
                      >
                        <span>{slot}</span>
                        {isSel && <Icons.Check size={14} strokeWidth={3} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3.5 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleData(null)}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-all cursor-pointer"
              >
                Go Back
              </button>
              
              <button
                type="button"
                onClick={() => {
                  onReschedule(rescheduleData.id, rescheduleData.date, rescheduleData.slot);
                  setRescheduleData(null);
                }}
                className="flex-1 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all cursor-pointer"
              >
                Apply Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DETAILED FORMAL INVOICE MODAL POPUP */}
      {invoiceToView && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="bg-white max-w-lg w-full rounded-2xl border border-gray-150 p-6 md:p-8 space-y-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            
            {/* Invoice Design */}
            <div className="border border-gray-100 p-5 rounded-xl bg-gray-50/55 space-y-5 relative">
              {/* Receipt cut accent lines */}
              <div className="absolute top-0 left-0 right-0 h-1 bg-brand"></div>
              
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="text-sm font-bold text-gray-900 tracking-tight">HomeServicesHub</h4>
                  <p className="text-[10px] text-gray-400">Springfield Dispatch Co.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-[0EAD6B] bg-emerald-50 text-emerald-700 px-2.5 py-0.5 rounded">
                    Paid Invoice
                  </span>
                  <p className="text-[10px] text-gray-400 font-mono mt-1">Ref ID: {invoiceToView.id}</p>
                </div>
              </div>

              {/* Customer summary */}
              <div className="text-[11px] text-gray-600 space-y-1 block border-t border-gray-150 pt-3">
                <p><strong>Customer:</strong> {invoiceToView.customerName}</p>
                <p><strong>Cell No:</strong> {invoiceToView.phone}</p>
                <p><strong>Ship to:</strong> {invoiceToView.address}</p>
              </div>

              {/* Items Table */}
              <table className="w-full text-xs font-mono border-t border-dashed border-gray-300 pt-3">
                <thead>
                  <tr className="text-gray-400 border-b border-gray-200">
                    <th className="py-2 text-left font-medium">Core Description</th>
                    <th className="py-2 text-right font-medium">Cost Item</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  <tr>
                    <td className="py-2">{invoiceToView.serviceName} Base Contract</td>
                    <td className="py-2 text-right">${invoiceToView.totalCost}.00</td>
                  </tr>
                  {/* Selected Factors details */}
                  {(Object.entries(invoiceToView.selectedFactors) as [string, { label: string; modifier: number }][]).map(([name, detail]) => (
                    <tr key={name} className="text-gray-500">
                      <td className="py-1 pl-3.5">• Add-on: {detail.label.split(' (+ ')[0]}</td>
                      <td className="py-1 text-right font-medium">{detail.modifier > 0 ? `+$${detail.modifier}.00` : "$0.00"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="border-t border-dashed border-gray-300 pt-3 flex justify-between font-bold text-gray-950 font-mono text-sm leading-tight">
                <span>Receipt Total Transacted:</span>
                <span className="text-brand font-sans text-lg font-extrabold">${invoiceToView.totalCost}.00</span>
              </div>

              <div className="text-[10px] text-center text-gray-400 leading-normal font-medium pt-3 border-t border-gray-200">
                Payment processed autonomously following client verification of work completion. Thank you for your business!
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex gap-3">
              <button
                id="btn-print-invoice"
                onClick={() => window.print()}
                className="flex-1 py-2.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-xs font-bold text-gray-600 transition-all cursor-pointer flex justify-center items-center gap-1.5"
              >
                <Icons.Printer size={14} />
                <span>Print Copy</span>
              </button>
              
              <button
                id="btn-close-invoice"
                onClick={() => setInvoiceToView(null)}
                className="flex-1 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white text-xs font-bold transition-all cursor-pointer text-center"
              >
                Close Ticket
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. ACTIVE PORTAL DISPATCH INVOICE GATEWAY SHEET */}
      {payBookingData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs select-none">
          <div className="bg-white max-w-md w-full rounded-2xl border border-gray-150 p-6 md:p-8 space-y-6 animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-3.5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="h-9 w-9 bg-emerald-50 text-emerald-600 rounded-lg flex items-center justify-center">
                  <Icons.CreditCard size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-gray-950">Pay Invoice Online</h4>
                  <p className="text-[10px] text-gray-400 font-medium">Ref No: {payBookingData.id}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setPayBookingData(null);
                  setPayErrors({});
                  setPayApiLogs([]);
                }}
                disabled={isPayProcessing}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <Icons.X size={18} />
              </button>
            </div>

            {/* Invoice Total visual info */}
            <div className="bg-gray-900 text-white rounded-xl p-4 flex justify-between items-center select-none shadow-sm">
              <div>
                <span className="text-[9px] text-brand font-extrabold uppercase tracking-widest block font-sans">Core Booking Service</span>
                <span className="text-xs font-bold text-gray-300 truncate max-w-[180px] block font-sans">{payBookingData.serviceName}</span>
              </div>
              <div className="text-right">
                <span className="text-[9px] text-gray-400 block uppercase font-extrabold font-mono">Invoice Total</span>
                <span className="text-xl font-extrabold text-brand tracking-tight font-sans">${payBookingData.totalCost.toFixed(2)}</span>
              </div>
            </div>

            <form onSubmit={handleExecuteInvoicePayment} className="space-y-4">
              <div className="space-y-3">
                {/* Credit card fields */}
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-500 tracking-tight block mb-1">Card Number</label>
                  <div className="relative">
                    <Icons.CreditCard className="absolute left-3 top-2.5 text-gray-400" size={15} />
                    <input
                      type="text"
                      disabled={isPayProcessing}
                      value={payCardNumber}
                      onChange={handlePayCardNumberChange}
                      placeholder="4111 2222 3333 4444"
                      className={`pl-10 w-full rounded-xl border py-2 px-3 text-xs text-gray-850 placeholder-gray-400 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand ${
                        payErrors.card ? "border-rose-500 bg-rose-50/10" : "border-gray-200"
                      }`}
                    />
                  </div>
                  {payErrors.card && <p className="text-[10px] text-rose-500 mt-1 font-bold">{payErrors.card}</p>}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-550 block mb-1">Exp Date</label>
                    <input
                      type="text"
                      disabled={isPayProcessing}
                      value={payExpiry}
                      onChange={handlePayExpiryChange}
                      placeholder="MM/YY"
                      className={`w-full rounded-xl border py-2 px-3 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand ${
                        payErrors.expiry ? "border-rose-500 bg-rose-50/10" : "border-gray-200"
                      }`}
                    />
                    {payErrors.expiry && <p className="text-[10px] text-rose-500 mt-1 font-bold">{payErrors.expiry}</p>}
                  </div>

                  <div>
                    <label className="text-[10px] uppercase font-bold text-gray-550 block mb-1">CVV / CVC</label>
                    <input
                      type="password"
                      disabled={isPayProcessing}
                      value={payCvv}
                      onChange={handlePayCvvChange}
                      placeholder="***"
                      className={`w-full rounded-xl border py-2 px-3 text-xs focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand ${
                        payErrors.cvv ? "border-rose-500 bg-rose-50/10" : "border-gray-200"
                      }`}
                    />
                    {payErrors.cvv && <p className="text-[10px] text-rose-500 mt-1 font-bold">{payErrors.cvv}</p>}
                  </div>
                </div>
              </div>

              {/* Behavior simulation configuration */}
              <div className="bg-gray-50 border border-gray-150 p-2.5 rounded-xl space-y-2">
                <div className="flex justify-between items-center bg-gray-100/50 p-1.5 rounded-lg select-none">
                  <span className="text-[10px] font-extrabold text-gray-550 uppercase flex items-center gap-1">
                    <Icons.Settings size={12} className="text-gray-400" />
                    <span>Mock Gateway Behavior</span>
                  </span>
                  <span className="text-[9px] bg-emerald-50 text-emerald-750 border border-emerald-100 px-1.5 py-0.2 rounded font-mono font-bold">API-Sim</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayBehavior('success')}
                    className={`py-1 text-[9px] font-bold rounded border transition-all cursor-pointer ${
                      payBehavior === 'success' ? "bg-slate-900 border-slate-900 text-white font-mono" : "bg-white border-gray-200 text-gray-650"
                    }`}
                  >
                    ✅ Simulated Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayBehavior('decline')}
                    className={`py-1 text-[9px] font-bold rounded border transition-all cursor-pointer ${
                      payBehavior === 'decline' ? "bg-slate-900 border-slate-900 text-white font-mono" : "bg-white border-gray-200 text-gray-650"
                    }`}
                  >
                    ⚠️ Simulated Insufficient
                  </button>
                </div>
              </div>

              {/* TERMINAL DIAGNOSTICS FOR INVOICE PAY */}
              {payApiLogs.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[9px] font-mono font-black text-emerald-600 block flex items-center gap-1 select-none">
                    <Icons.Terminal size={11} />
                    <span>Pipeline handshake logs</span>
                  </span>
                  <div className="bg-slate-950 border border-slate-900 rounded-xl p-3 font-mono text-[9px] text-emerald-400 leading-normal max-h-[140px] overflow-y-auto select-all shadow-inner">
                    {payApiLogs.map((log, index) => {
                      const isErr = log.includes("❌") || log.toLowerCase().includes("fail") || log.toLowerCase().includes("decline");
                      const isSucc = log.includes("✅") || log.toLowerCase().includes("succeeded") || log.toLowerCase().includes("approved");
                      return (
                        <div key={index} className={isErr ? "text-rose-450 font-bold" : isSucc ? "text-emerald-400 font-extrabold" : "text-gray-300"}>
                          {log}
                        </div>
                      );
                    })}
                    {isPayProcessing && (
                      <div className="flex items-center gap-1 text-gray-400 italic text-[8px] animate-pulse">
                        <Icons.RefreshCw size={8} className="animate-spin text-emerald-500" />
                        <span>running PCI auth sequence...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="space-y-2 pt-2">
                <button
                  type="submit"
                  disabled={isPayProcessing}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-750 text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-500/10 disabled:opacity-50 cursor-pointer"
                >
                  {isPayProcessing ? (
                    <>
                      <Icons.Loader className="animate-spin text-white" size={13} />
                      <span>Transacting direct API invoice pay...</span>
                    </>
                  ) : (
                    <>
                      <Icons.CheckCheck size={13} strokeWidth={3} />
                      <span>Authorize Secure Payment (${payBookingData.totalCost.toFixed(2)})</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={isPayProcessing}
                  onClick={() => {
                    setPayBookingData(null);
                    setPayErrors({});
                    setPayApiLogs([]);
                  }}
                  className="w-full py-2 bg-white border border-gray-200 rounded-xl text-xs font-bold text-gray-650 hover:bg-gray-50 transition-colors cursor-pointer"
                >
                  Cancel & Go Back
                </button>
              </div>

              {/* Live instructions button module */}
              <div className="border-t border-gray-100 pt-3">
                <button
                  type="button"
                  onClick={() => setShowPayDevGuides(!showPayDevGuides)}
                  className="w-full flex items-center justify-between text-gray-500 hover:text-brand transition-colors text-[10px] font-bold cursor-pointer select-none"
                >
                  <span className="flex items-center gap-1 select-none font-bold text-[11px]">
                    <Icons.Code size={11} className="text-brand shrink-0" />
                    <span>💻 Embed Gateway Checkout Sheet</span>
                  </span>
                  <span className="text-[10px] text-gray-400">{showPayDevGuides ? "Hide ▲" : "View Code ▼"}</span>
                </button>

                {showPayDevGuides && (
                  <div className="mt-2.5 space-y-2 bg-slate-50 border border-slate-200/50 rounded-xl p-3 animate-in slide-in-from-top-1.5 text-left text-[10px] leading-relaxed select-all">
                    <div className="flex border-b border-gray-200 gap-2 mb-1">
                      <button
                        type="button"
                        onClick={() => setPayDevTab('fe')}
                        className={`pb-1 text-[9px] font-black uppercase cursor-pointer border-b ${
                          payDevTab === 'fe' ? "border-brand text-brand" : "border-transparent text-gray-400"
                        }`}
                      >
                        Client Checkout Response
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayDevTab('be')}
                        className={`pb-1 text-[9px] font-black uppercase cursor-pointer border-b ${
                          payDevTab === 'be' ? "border-brand text-brand" : "border-transparent text-gray-405"
                        }`}
                      >
                        Node Express capture API
                      </button>
                    </div>

                    {payDevTab === 'fe' ? (
                      <div>
                        <span className="text-gray-400 block font-mono font-bold text-[8px] mb-1">Invoice pay event in BookingsTracker:</span>
                        <pre className="p-2.5 bg-slate-950 text-slate-100 rounded-lg overflow-x-auto font-mono max-h-[120px]">
{`const handlePaySubmit = async (cardData) => {
  const res = await fetch('/api/pay-invoice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      bookingId: booking.id,
      card: cardData
    })
  });
  if (res.ok) {
    onUpdateStatus(booking.id, 'scheduled', 'paid', 'card');
  }
};`}
                        </pre>
                      </div>
                    ) : (
                      <div>
                        <span className="text-gray-400 block font-mono font-bold text-[8px] mb-1">Backplane Invoice transaction Capture route:</span>
                        <pre className="p-2.5 bg-slate-950 text-emerald-400 rounded-lg overflow-x-auto font-mono max-h-[120px]">
{`app.post('/api/pay-invoice', async (req, res) => {
  const { bookingId, card } = req.body;
  // Initialize payment processor capture
  const charge = await stripe.charges.create({
    amount: booking.totalCost * 100,
    currency: 'usd',
    source: card.token,
    description: \`Invoice payment for #\${bookingId}\`
  });
  if (charge.status === 'succeeded') {
    res.json({ success: true, chargeId: charge.id });
  }
});`}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
