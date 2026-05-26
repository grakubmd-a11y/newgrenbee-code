import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  User,
  MapPin,
  CreditCard,
  ShieldAlert,
  Save,
  CheckCircle2,
  ArrowRight,
  LogOut,
  LockKeyhole,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Settings,
  ArrowLeft,
  Clock,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Truck,
  XCircle,
  CalendarClock,
  X,
  KeyRound,
  Eye,
  EyeOff,
} from "lucide-react";
import { Booking } from "../../shared/types";
import type { UserProfile } from "../../shared/services/firebaseService";
import { updateUserPassword, currentUserHasPasswordProvider, fetchPublicSettingsFromFirestore } from "../../shared/services/firebaseService";

declare global {
  interface Window {
    google?: any;
    __grenbeeGoogleMapsLoader?: Promise<void>;
    __grenbeeGoogleMapsApiKey?: string;
  }
}

// ── Google Maps helpers (shared with BookingForm via window globals) ───────────

function isUsableGoogleMapsKey(value: string) {
  const t = value.trim();
  return t.length > 0 && t.startsWith("AIza") && !t.includes("REPLACE_ME");
}

async function loadGoogleMapsPlacesScript(apiKey: string): Promise<void> {
  if (window.google?.maps?.places && window.__grenbeeGoogleMapsApiKey === apiKey) return;
  if (!window.__grenbeeGoogleMapsLoader || window.__grenbeeGoogleMapsApiKey !== apiKey) {
    window.__grenbeeGoogleMapsApiKey = apiKey;
    window.__grenbeeGoogleMapsLoader = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector('script[data-grenbee-google-maps="true"]');
      if (existing) existing.remove();
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places&v=weekly`;
      script.async = true;
      script.defer = true;
      script.dataset.grenbeeGoogleMaps = "true";
      script.onload  = () => resolve();
      script.onerror = () => reject(new Error("Google Maps script could not be loaded."));
      document.head.appendChild(script);
    });
  }
  return window.__grenbeeGoogleMapsLoader;
}

type AppUser = UserProfile & { isAdmin?: boolean };

interface MyAccountProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  bookings: Booking[];
  activeMembership?: string | null;
  onSelectTab: (tabId: string) => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onReschedule?: (bookingId: string, newDate: string, newSlot: string) => void;
  onCancelBooking?: (bookingId: string) => void;
  onEnterAdmin?: () => void;
}

type SubPage = "overview" | "profile" | "access" | "payment" | "bookings" | "security";

// ── helpers ──────────────────────────────────────────────────────────────────

function statusConfig(status: string) {
  switch (status) {
    case "scheduled":   return { label: "Agendada",    tone: "bg-brand/10 text-brand border-brand/20",            icon: Clock };
    case "dispatched":  return { label: "En Camino",   tone: "bg-blue-50 text-blue-700 border-blue-200",          icon: Truck };
    case "in-progress": return { label: "En Ejecución",tone: "bg-amber-50 text-amber-700 border-amber-200",       icon: Sparkles };
    case "completed":   return { label: "Finalizada",  tone: "bg-emerald-50 text-emerald-700 border-emerald-100", icon: CheckCircle };
    case "cancelled":   return { label: "Cancelada",   tone: "bg-rose-50 text-rose-700 border-rose-100",          icon: XCircle };
    default:            return { label: status,        tone: "bg-zinc-100 text-zinc-600 border-zinc-200",         icon: AlertCircle };
  }
}

function nextUpcomingBooking(bookings: Booking[]): Booking | null {
  const active = bookings
    .filter((b) => b.status === "scheduled" || b.status === "dispatched" || b.status === "in-progress")
    .sort((a, b) => {
      const da = new Date(a.bookingDate).getTime();
      const db = new Date(b.bookingDate).getTime();
      return da - db;
    });
  return active[0] ?? null;
}

function formatDate(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T00:00:00");
    return d.toLocaleDateString("es-MX", { weekday: "long", day: "numeric", month: "long" });
  } catch {
    return dateStr;
  }
}

// ── sub-page meta ─────────────────────────────────────────────────────────────

const PAGES = [
  { id: "profile"  as SubPage, label: "Mi Perfil",          desc: "Nombre, teléfono y dirección",           icon: User,        color: "text-brand",     bg: "bg-brand-light" },
  { id: "bookings" as SubPage, label: "Mis Pedidos",         desc: "Historial y estado de visitas",           icon: Calendar,    color: "text-amber-600", bg: "bg-amber-50"    },
  { id: "access"   as SubPage, label: "Pautas de Acceso",    desc: "Mascotas, llaves y notas de entrada",     icon: LockKeyhole, color: "text-violet-600",bg: "bg-violet-50"   },
  { id: "payment"  as SubPage, label: "Medios de Pago",      desc: "Tarjeta guardada y método predeterminado",icon: CreditCard,  color: "text-blue-600",  bg: "bg-blue-50"     },
  { id: "security" as SubPage, label: "Seguridad",           desc: "Cambiar contraseña de acceso",            icon: KeyRound,    color: "text-rose-600",  bg: "bg-rose-50"     },
];

// ── component ─────────────────────────────────────────────────────────────────

const TIME_SLOTS = [
  "09:00 AM – 12:00 PM",
  "12:00 PM – 03:00 PM",
  "03:00 PM – 06:00 PM",
];

export default function MyAccount({
  currentUser,
  onLogout,
  bookings,
  activeMembership,
  onSelectTab,
  onUpdateProfile,
  onReschedule,
  onCancelBooking,
  onEnterAdmin,
}: MyAccountProps) {

  if (!currentUser) {
    return (
      <div className="max-w-xl mx-auto py-24 text-center space-y-6 animate-in fade-in duration-350">
        <div className="h-14 w-14 bg-brand-light text-brand rounded-2xl flex items-center justify-center mx-auto border border-brand/20 shadow-sm">
          <ShieldAlert size={24} />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-extrabold text-zinc-900 tracking-tight">Acceso Clientes</h2>
          <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
            Inicia sesión para acceder a tu cuenta y configuraciones personales.
          </p>
        </div>
      </div>
    );
  }

  const [activePage, setActivePage] = useState<SubPage>("overview");

  // Profile fields — split firstName / lastName, fall back to parsing `name`
  const _nameParts = (currentUser.name ?? "").trim().split(/\s+/);
  const [profileFirstName, setProfileFirstName] = useState(
    currentUser.firstName || _nameParts[0] || ""
  );
  const [profileLastName, setProfileLastName] = useState(
    currentUser.lastName || _nameParts.slice(1).join(" ") || ""
  );
  const [profilePhone, setProfilePhone]     = useState(currentUser.phone ?? "");
  const [profileAddress, setProfileAddress] = useState(currentUser.address ?? "");
  const [petsStatus, setPetsStatus]         = useState<"none"|"dog"|"cat"|"both">((currentUser.petsStatus as any) ?? "none");
  const [keyPreferences, setKeyPreferences] = useState(currentUser.keyPreferences ?? "lockbox");
  const [lockboxCode, setLockboxCode]       = useState(currentUser.lockboxCode ?? "");
  const [specialNote, setSpecialNote]       = useState(currentUser.specialNote ?? "");

  // Google Maps autocomplete
  const [googleMapsKey,               setGoogleMapsKey]               = useState(
    (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_GOOGLE_MAPS_API_KEY) || ""
  );
  const [isAddressAutocompleteEnabled, setIsAddressAutocompleteEnabled] = useState(false);
  const [isAddressAutocompleteReady,   setIsAddressAutocompleteReady]   = useState(false);
  const addressInputRef  = useRef<HTMLInputElement | null>(null);
  const autocompleteRef  = useRef<any>(null);

  // Load Maps settings once
  useEffect(() => {
    let cancelled = false;
    fetchPublicSettingsFromFirestore().then((settings) => {
      if (cancelled || !settings) return;
      if (settings.googleMapsApiKey && isUsableGoogleMapsKey(settings.googleMapsApiKey)) {
        setGoogleMapsKey(settings.googleMapsApiKey.trim());
      }
      setIsAddressAutocompleteEnabled(
        settings.googleMapsEnabled === true && settings.googleMapsAutocompleteEnabled !== false
      );
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Setup autocomplete when profile page is open and key is ready
  useEffect(() => {
    let cancelled = false;
    async function setup() {
      const input = addressInputRef.current;
      if (!input || !isAddressAutocompleteEnabled || !isUsableGoogleMapsKey(googleMapsKey) || activePage !== "profile") {
        setIsAddressAutocompleteReady(false);
        return;
      }
      try {
        await loadGoogleMapsPlacesScript(googleMapsKey);
        if (cancelled || !addressInputRef.current || !window.google?.maps?.places?.Autocomplete) return;
        if (autocompleteRef.current && window.google?.maps?.event) {
          window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
        }
        const ac = new window.google.maps.places.Autocomplete(addressInputRef.current, {
          fields: ["formatted_address", "name"],
          types: ["address"],
        });
        ac.addListener("place_changed", () => {
          const place = ac.getPlace();
          const next = place?.formatted_address || place?.name || addressInputRef.current?.value || "";
          setProfileAddress(next);
        });
        autocompleteRef.current = ac;
        if (!cancelled) setIsAddressAutocompleteReady(true);
      } catch {
        if (!cancelled) setIsAddressAutocompleteReady(false);
      }
    }
    setup();
    return () => { cancelled = true; };
  }, [googleMapsKey, isAddressAutocompleteEnabled, activePage]);

  // Payment fields
  const [cardName, setCardName]         = useState(currentUser.cardName ?? currentUser.name ?? "");
  const [cardNumber]                    = useState(currentUser.cardNumber ?? "•••• •••• •••• ────");
  const [cardExpiry, setCardExpiry]     = useState(currentUser.cardExpiry ?? "");
  const [cardProvider, setCardProvider] = useState<"visa"|"mastercard">((currentUser.cardProvider as any) ?? "visa");

  // Feedback
  const [successMessage, setSuccessMessage] = useState("");
  const [saveError, setSaveError]           = useState("");
  const [isSaving, setIsSaving]             = useState(false);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setSaveError("");
    setTimeout(() => setSuccessMessage(""), 3500);
  };

  const handleProfileSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setSaveError("");
    const fullName = [profileFirstName.trim(), profileLastName.trim()].filter(Boolean).join(" ");
    try {
      await onUpdateProfile({
        firstName: profileFirstName.trim(),
        lastName:  profileLastName.trim(),
        name:      fullName,
        phone:     profilePhone,
        address:   profileAddress,
      });
      showSuccess("¡Perfil guardado!");
    }
    catch { setSaveError("No se pudieron guardar los cambios."); }
    finally { setIsSaving(false); }
  };

  const handleAccessSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true); setSaveError("");
    try   { await onUpdateProfile({ petsStatus, keyPreferences, lockboxCode, specialNote }); showSuccess("¡Pautas guardadas!"); }
    catch { setSaveError("No se pudieron guardar los cambios."); }
    finally { setIsSaving(false); }
  };

  const handlePaymentSave = async () => {
    setIsSaving(true); setSaveError("");
    try   { await onUpdateProfile({ cardName, cardExpiry, cardProvider }); showSuccess("¡Pago actualizado!"); }
    catch { setSaveError("No se pudo actualizar el medio de pago."); }
    finally { setIsSaving(false); }
  };

  const myBookings = bookings.filter(
    (b) =>
      b.email.toLowerCase() === currentUser.email.toLowerCase() ||
      (currentUser.uid ? b.userId === currentUser.uid : false)
  );
  const upcomingBookings = myBookings.filter((b) => b.status === "scheduled" || b.status === "dispatched" || b.status === "in-progress");
  const nextBooking      = nextUpcomingBooking(myBookings);

  // Reschedule state
  const [openRescheduleId, setOpenRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate]     = useState("");
  const [rescheduleSlot, setRescheduleSlot]     = useState(TIME_SLOTS[0]);
  const [isRescheduling, setIsRescheduling]     = useState(false);
  const [rescheduleError, setRescheduleError]   = useState("");

  // Next 8 available dates (starting tomorrow)
  const availableDates = useMemo(() => {
    const dates: string[] = [];
    for (let i = 1; i <= 8; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().split("T")[0]);
    }
    return dates;
  }, []);

  const openReschedule = (bookingId: string, currentDate: string, currentSlot: string) => {
    setOpenRescheduleId(bookingId);
    setRescheduleDate(currentDate || availableDates[0]);
    setRescheduleSlot(currentSlot || TIME_SLOTS[0]);
    setRescheduleError("");
  };

  const closeReschedule = () => {
    setOpenRescheduleId(null);
    setRescheduleError("");
    setIsRescheduling(false);
  };

  const submitReschedule = async () => {
    if (!rescheduleDate) { setRescheduleError("Elige una fecha."); return; }
    if (!rescheduleSlot) { setRescheduleError("Elige un horario."); return; }
    if (!openRescheduleId || !onReschedule) return;
    setIsRescheduling(true);
    setRescheduleError("");
    try {
      await onReschedule(openRescheduleId, rescheduleDate, rescheduleSlot);
      closeReschedule();
      showSuccess("¡Visita reagendada correctamente!");
    } catch {
      setRescheduleError("No se pudo reagendar. Inténtalo de nuevo.");
    } finally {
      setIsRescheduling(false);
    }
  };

  // Security / password-change state
  const [currentPwd,    setCurrentPwd]    = useState("");
  const [newPwd,        setNewPwd]        = useState("");
  const [confirmPwd,    setConfirmPwd]    = useState("");
  const [showCurrentPwd,setShowCurrentPwd]= useState(false);
  const [showNewPwd,    setShowNewPwd]    = useState(false);
  const [showConfirmPwd,setShowConfirmPwd]= useState(false);
  const [pwdError,      setPwdError]      = useState("");
  const [isSavingPwd,   setIsSavingPwd]   = useState(false);

  const handlePasswordSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdError("");
    if (newPwd.length < 6) { setPwdError("La nueva contraseña debe tener al menos 6 caracteres."); return; }
    if (newPwd !== confirmPwd) { setPwdError("Las contraseñas nuevas no coinciden."); return; }
    setIsSavingPwd(true);
    try {
      await updateUserPassword(currentPwd, newPwd);
      setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      showSuccess("¡Contraseña actualizada correctamente!");
    } catch (err: any) {
      setPwdError(err?.message ?? "No se pudo cambiar la contraseña. Inténtalo de nuevo.");
    } finally {
      setIsSavingPwd(false);
    }
  };

  const handleCancel = (bookingId: string) => {
    if (!window.confirm("¿Cancelar esta visita? Esta acción no se puede deshacer.")) return;
    onCancelBooking?.(bookingId);
    showSuccess("Visita cancelada.");
  };

  const goBack = () => {
    setActivePage("overview");
    setSuccessMessage("");
    setSaveError("");
    closeReschedule();
  };

  // ── DETAIL PAGES ────────────────────────────────────────────────────────────
  if (activePage !== "overview") {
    const meta   = PAGES.find((p) => p.id === activePage)!;
    const Icon   = meta.icon;

    return (
      <div className="max-w-2xl mx-auto py-6 animate-in fade-in slide-in-from-right-4 duration-250">

        {/* ← back + breadcrumb */}
        <div className="flex items-center gap-3 mb-6">
          <button type="button" onClick={goBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-gray-900 transition-colors cursor-pointer">
            <ArrowLeft size={16} />
            <span>Mi Cuenta</span>
          </button>
          <span className="text-gray-300">/</span>
          <span className="text-sm font-bold text-gray-900">{meta.label}</span>
        </div>

        {/* banners */}
        {successMessage && (
          <div className="mb-4 p-4 bg-brand text-white rounded-2xl flex items-center gap-3 animate-in zoom-in-95 shadow-md">
            <CheckCircle2 size={18} className="shrink-0" />
            <span className="text-xs font-bold">{successMessage}</span>
          </div>
        )}
        {saveError && (
          <div className="mb-4 p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl text-xs font-medium">
            ⚠️ {saveError}
          </div>
        )}

        {/* page header */}
        <div className="flex items-center gap-4 mb-6 p-5 bg-white border border-zinc-150 rounded-2xl shadow-xs">
          <div className={`h-12 w-12 ${meta.bg} rounded-xl flex items-center justify-center shrink-0`}>
            <Icon size={22} className={meta.color} />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-zinc-950">{meta.label}</h1>
            <p className="text-xs text-zinc-500">{meta.desc}</p>
          </div>
        </div>

        {/* ── Profile ── */}
        {activePage === "profile" && (
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs">
            <form onSubmit={handleProfileSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Nombre</label>
                  <input type="text" value={profileFirstName} onChange={(e) => setProfileFirstName(e.target.value)}
                    placeholder="Ej. Marco"
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Apellido</label>
                  <input type="text" value={profileLastName} onChange={(e) => setProfileLastName(e.target.value)}
                    placeholder="Ej. García"
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Teléfono</label>
                  <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase block">Dirección Principal</label>
                    {isAddressAutocompleteReady && (
                      <span className="text-[9px] text-zinc-400 font-semibold flex items-center gap-0.5 animate-in fade-in duration-300">
                        powered by
                        <span className="font-black">
                          <span className="text-[#4285F4]">G</span><span className="text-[#EA4335]">o</span><span className="text-[#FBBC05]">o</span><span className="text-[#4285F4]">g</span><span className="text-[#34A853]">l</span><span className="text-[#EA4335]">e</span>
                        </span>
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-3.5 text-zinc-400 pointer-events-none z-10" />
                    <input
                      ref={addressInputRef}
                      type="text"
                      value={profileAddress}
                      onChange={(e) => setProfileAddress(e.target.value)}
                      placeholder={isAddressAutocompleteReady ? "Escribe para buscar dirección..." : ""}
                      className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Correo Electrónico</label>
                  <input type="email" value={currentUser.email} disabled
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-100 bg-zinc-50 text-zinc-400 font-semibold cursor-not-allowed" />
                </div>
              </div>
              <button type="submit" disabled={isSaving}
                className="w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <Save size={15} />
                {isSaving ? "Guardando..." : "Guardar Cambios"}
              </button>
            </form>
          </div>
        )}

        {/* ── Access ── */}
        {activePage === "access" && (
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs">
            <form onSubmit={handleAccessSave} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Mascotas en Casa</label>
                  <select value={petsStatus} onChange={(e: any) => setPetsStatus(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 cursor-pointer transition-all">
                    <option value="none">No, ninguna mascota</option>
                    <option value="dog">Sí, perro</option>
                    <option value="cat">Sí, gato</option>
                    <option value="both">Perro y gato</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Acceso del Técnico</label>
                  <select value={keyPreferences} onChange={(e) => setKeyPreferences(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 cursor-pointer transition-all">
                    <option value="lockbox">Caja fuerte / Lockbox</option>
                    <option value="present">Estaré presente</option>
                    <option value="frontdesk">Llave en recepción</option>
                  </select>
                </div>
                {keyPreferences === "lockbox" && (
                  <div className="space-y-1.5 sm:col-span-2 animate-in slide-in-from-top-1 duration-150">
                    <label className="text-[11px] font-bold text-zinc-500 uppercase block flex items-center gap-1">
                      <LockKeyhole size={11} className="text-brand" /> Clave de Lockbox
                    </label>
                    <input type="text" value={lockboxCode} onChange={(e) => setLockboxCode(e.target.value)}
                      className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand font-semibold text-zinc-800 bg-zinc-50/50 focus:bg-white transition-all" />
                  </div>
                )}
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Notas de Entrada</label>
                  <textarea value={specialNote} onChange={(e) => setSpecialNote(e.target.value)} rows={3}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand font-semibold text-zinc-800 bg-zinc-50/50 focus:bg-white transition-all resize-none"
                    placeholder="Portones, alarma, timbre, horarios..." />
                </div>
              </div>
              <button type="submit" disabled={isSaving}
                className="w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <Save size={15} />
                {isSaving ? "Guardando..." : "Guardar Pautas"}
              </button>
            </form>
          </div>
        )}

        {/* ── Payment ── */}
        {activePage === "payment" && (
          <div className="space-y-4">
            <div className="w-full max-w-sm mx-auto aspect-[1.58/1] bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-5 flex flex-col justify-between text-white shadow-lg relative overflow-hidden select-none">
              <div className="absolute top-0 right-0 h-16 w-16 bg-brand/10 rounded-full filter blur-xl" />
              <div className="flex justify-between items-start">
                <span className="text-[10px] text-zinc-400 font-bold tracking-wider uppercase">Método Predeterminado</span>
                <span className="text-xs font-black italic text-white uppercase">{cardProvider === "visa" ? "VISA" : "Mastercard"}</span>
              </div>
              <div className="space-y-2">
                <div className="text-base font-medium tracking-widest text-zinc-100">{cardNumber}</div>
                <div className="flex justify-between items-end pt-2 border-t border-zinc-700/60">
                  <div>
                    <span className="text-[8px] text-zinc-400 uppercase block">Titular</span>
                    <span className="text-[10px] uppercase font-extrabold text-zinc-200 truncate max-w-[140px] block">{cardName}</span>
                  </div>
                  <div>
                    <span className="text-[8px] text-zinc-400 uppercase block">Expiración</span>
                    <span className="text-[10px] font-extrabold text-zinc-200">{cardExpiry || "──/──"}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-zinc-500 uppercase block">Titular de Tarjeta</label>
                <input type="text" value={cardName} onChange={(e) => setCardName(e.target.value)}
                  className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand font-semibold text-zinc-800 bg-zinc-50/50 focus:bg-white transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Red</label>
                  <select value={cardProvider} onChange={(e: any) => setCardProvider(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none font-semibold text-zinc-800 cursor-pointer bg-white">
                    <option value="visa">Visa</option>
                    <option value="mastercard">Mastercard</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Expiración</label>
                  <input type="text" value={cardExpiry} onChange={(e) => setCardExpiry(e.target.value)} placeholder="08/29" maxLength={5}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand font-semibold text-zinc-800 bg-zinc-50/50 focus:bg-white transition-all" />
                </div>
              </div>
              <button type="button" disabled={isSaving} onClick={handlePaymentSave}
                className="w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                <Save size={15} />
                {isSaving ? "Guardando..." : "Actualizar Pago"}
              </button>
            </div>
          </div>
        )}

        {/* ── Security ── */}
        {activePage === "security" && (
          <div className="bg-white border border-zinc-150 rounded-2xl p-6 shadow-xs">
            {currentUserHasPasswordProvider() ? (
              <form onSubmit={handlePasswordSave} className="space-y-5">
                {/* current password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Contraseña Actual</label>
                  <div className="relative">
                    <input
                      type={showCurrentPwd ? "text" : "password"}
                      value={currentPwd}
                      onChange={(e) => setCurrentPwd(e.target.value)}
                      autoComplete="current-password"
                      required
                      className="w-full px-3.5 pr-11 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all"
                      placeholder="Tu contraseña actual"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowCurrentPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                      {showCurrentPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* new password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showNewPwd ? "text" : "password"}
                      value={newPwd}
                      onChange={(e) => setNewPwd(e.target.value)}
                      autoComplete="new-password"
                      required
                      className="w-full px-3.5 pr-11 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowNewPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                      {showNewPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* strength hint */}
                  {newPwd.length > 0 && (
                    <div className="flex items-center gap-1.5 mt-1">
                      {[1,2,3,4].map((level) => (
                        <div key={level} className={`h-1 flex-1 rounded-full transition-all ${
                          newPwd.length >= level * 3
                            ? level <= 2 ? "bg-amber-400" : "bg-brand"
                            : "bg-zinc-200"
                        }`} />
                      ))}
                      <span className="text-[10px] text-zinc-400 font-bold">
                        {newPwd.length < 6 ? "Muy corta" : newPwd.length < 10 ? "Aceptable" : "Segura"}
                      </span>
                    </div>
                  )}
                </div>

                {/* confirm password */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Confirmar Nueva Contraseña</label>
                  <div className="relative">
                    <input
                      type={showConfirmPwd ? "text" : "password"}
                      value={confirmPwd}
                      onChange={(e) => setConfirmPwd(e.target.value)}
                      autoComplete="new-password"
                      required
                      className={`w-full px-3.5 pr-11 py-3 text-sm rounded-xl border outline-none bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all ${
                        confirmPwd.length > 0 && confirmPwd !== newPwd
                          ? "border-rose-300 focus:border-rose-400"
                          : "border-zinc-200 focus:border-brand"
                      }`}
                      placeholder="Repite la nueva contraseña"
                    />
                    <button type="button" tabIndex={-1}
                      onClick={() => setShowConfirmPwd((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer">
                      {showConfirmPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {confirmPwd.length > 0 && confirmPwd === newPwd && (
                    <p className="text-[11px] text-brand font-bold flex items-center gap-1 animate-in fade-in duration-200">
                      <CheckCircle2 size={11} /> Las contraseñas coinciden
                    </p>
                  )}
                </div>

                {/* error banner */}
                {pwdError && (
                  <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in duration-200">
                    <AlertCircle size={14} className="shrink-0" /> {pwdError}
                  </div>
                )}

                <button type="submit" disabled={isSavingPwd}
                  className="w-full py-3 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-sm font-extrabold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer">
                  {isSavingPwd
                    ? <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    : <KeyRound size={15} />}
                  {isSavingPwd ? "Actualizando..." : "Cambiar Contraseña"}
                </button>
              </form>
            ) : (
              /* Google-only user — no password provider */
              <div className="flex flex-col items-center text-center gap-4 py-4">
                <div className="h-14 w-14 bg-blue-50 rounded-2xl flex items-center justify-center">
                  <svg viewBox="0 0 24 24" className="h-7 w-7" xmlns="http://www.w3.org/2000/svg">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-extrabold text-zinc-900 mb-1">Cuenta vinculada con Google</p>
                  <p className="text-xs text-zinc-500 max-w-xs mx-auto leading-relaxed">
                    Tu contraseña es administrada directamente por Google. Para cambiarla, visita la configuración de seguridad de tu cuenta Google.
                  </p>
                </div>
                <a
                  href="https://myaccount.google.com/security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all">
                  Ir a Seguridad de Google <ArrowRight size={13} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* ── Bookings ── */}
        {activePage === "bookings" && (
          <div className="space-y-6">

            {/* Banners de reschedule */}
            {rescheduleError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-medium flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" /> {rescheduleError}
              </div>
            )}

            {/* Upcoming */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">Próximas visitas</h2>
                <span className="text-xs font-bold text-zinc-400">
                  {upcomingBookings.length} activa{upcomingBookings.length !== 1 ? "s" : ""}
                </span>
              </div>

              {upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((b) => (
                    <div key={b.id} className="bg-white border border-zinc-150 rounded-2xl shadow-xs overflow-hidden">
                      {/* Booking card */}
                      <BookingCard booking={b} />

                      {/* Action buttons — solo en bookings "scheduled" */}
                      {b.status === "scheduled" && onReschedule && (
                        <div className="px-4 pb-4 flex flex-wrap gap-2 border-t border-zinc-100 pt-3">
                          <button
                            type="button"
                            onClick={() =>
                              openRescheduleId === b.id
                                ? closeReschedule()
                                : openReschedule(b.id, b.bookingDate, b.timeSlot)
                            }
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                              openRescheduleId === b.id
                                ? "bg-zinc-100 text-zinc-700 border-zinc-200"
                                : "bg-brand-light text-brand border-brand/20 hover:bg-brand/10"
                            }`}
                          >
                            <CalendarClock size={13} />
                            {openRescheduleId === b.id ? "Cancelar cambio" : "Reagendar"}
                          </button>

                          {onCancelBooking && (
                            <button
                              type="button"
                              onClick={() => handleCancel(b.id)}
                              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-rose-600 border border-rose-100 hover:bg-rose-50 transition-all cursor-pointer"
                            >
                              <X size={13} />
                              Cancelar visita
                            </button>
                          )}
                        </div>
                      )}

                      {/* Inline reschedule form */}
                      {openRescheduleId === b.id && (
                        <div className="px-4 pb-5 space-y-4 border-t border-brand/10 bg-brand-light/30 animate-in slide-in-from-top-2 duration-200">
                          <p className="text-xs font-extrabold text-brand uppercase tracking-wider pt-4">
                            Nueva fecha y horario
                          </p>

                          {/* Date selector */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-500 uppercase block">Fecha</label>
                            <div className="grid grid-cols-4 gap-1.5">
                              {availableDates.map((d) => {
                                const dateObj = new Date(d + "T00:00:00");
                                const isSelected = rescheduleDate === d;
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={() => setRescheduleDate(d)}
                                    className={`flex flex-col items-center py-2 px-1 rounded-xl border text-[10px] font-bold transition-all cursor-pointer ${
                                      isSelected
                                        ? "bg-brand text-white border-brand shadow-sm"
                                        : "bg-white text-zinc-700 border-zinc-200 hover:border-brand/40"
                                    }`}
                                  >
                                    <span className="uppercase opacity-70">
                                      {dateObj.toLocaleDateString("es-MX", { weekday: "short" })}
                                    </span>
                                    <span className="text-sm font-extrabold leading-tight">
                                      {dateObj.getDate()}
                                    </span>
                                    <span className="opacity-70">
                                      {dateObj.toLocaleDateString("es-MX", { month: "short" })}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* Time slot selector */}
                          <div className="space-y-2">
                            <label className="text-[11px] font-bold text-zinc-500 uppercase block">Horario</label>
                            <div className="flex flex-col sm:flex-row gap-2">
                              {TIME_SLOTS.map((slot) => (
                                <button
                                  key={slot}
                                  type="button"
                                  onClick={() => setRescheduleSlot(slot)}
                                  className={`flex-1 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                                    rescheduleSlot === slot
                                      ? "bg-brand text-white border-brand shadow-sm"
                                      : "bg-white text-zinc-700 border-zinc-200 hover:border-brand/40"
                                  }`}
                                >
                                  {slot}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* Confirm */}
                          <div className="flex gap-2 pt-1">
                            <button
                              type="button"
                              onClick={submitReschedule}
                              disabled={isRescheduling}
                              className="flex-1 py-2.5 bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-xs font-extrabold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                            >
                              {isRescheduling ? (
                                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              ) : (
                                <CheckCircle2 size={13} />
                              )}
                              {isRescheduling ? "Guardando..." : "Confirmar reagendamiento"}
                            </button>
                            <button
                              type="button"
                              onClick={closeReschedule}
                              className="px-4 py-2.5 rounded-xl border border-zinc-200 text-zinc-600 text-xs font-bold hover:bg-zinc-50 transition-all cursor-pointer"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-8 text-center space-y-3">
                  <p className="text-sm text-zinc-400">No tienes visitas próximas.</p>
                  <button onClick={() => onSelectTab("estimator")}
                    className="text-sm bg-brand text-white px-5 py-2.5 rounded-xl font-bold hover:bg-brand-hover transition-all inline-flex items-center gap-1.5 cursor-pointer">
                    Nueva cotización <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* History */}
            {myBookings.filter((b) => b.status === "completed" || b.status === "cancelled").length > 0 && (
              <div>
                <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider mb-3">Historial</h2>
                <div className="space-y-3">
                  {myBookings
                    .filter((b) => b.status === "completed" || b.status === "cancelled")
                    .map((b) => <BookingCard key={b.id} booking={b} />)}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── OVERVIEW (default landing) ─────────────────────────────────────────────
  const sc = nextBooking ? statusConfig(nextBooking.status) : null;
  const NextIcon = sc?.icon ?? Clock;

  return (
    <div className="max-w-2xl mx-auto py-6 space-y-5 animate-in fade-in duration-300">

      {/* Welcome header */}
      <div className="bg-gradient-to-br from-brand-light via-white to-zinc-50 border border-brand/10 rounded-3xl p-6 relative overflow-hidden shadow-xs">
        <div className="absolute top-0 right-0 h-32 w-32 bg-brand/5 rounded-bl-[80px] pointer-events-none" />
        <div className="relative z-10 flex items-center gap-4">
          <div className="h-14 w-14 bg-brand text-white rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-sm select-none">
            {(currentUser.firstName || currentUser.name).charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-brand uppercase mb-0.5">Mi Cuenta</p>
            <h1 className="text-xl font-extrabold text-zinc-900 leading-tight">
              Hola, {currentUser.firstName || currentUser.name.split(" ")[0]} 👋
            </h1>
            <p className="text-xs text-zinc-500 mt-0.5">{currentUser.email}</p>
          </div>
        </div>

        {/* stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 relative z-10">
          <div className="bg-white border border-zinc-200/60 px-4 py-3 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">Pedidos activos</span>
            <span className="text-lg font-extrabold text-zinc-900 mt-0.5 block">{upcomingBookings.length}</span>
          </div>
          <div className="bg-white border border-zinc-200/60 px-4 py-3 rounded-xl">
            <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">Membresía</span>
            <span className="text-sm font-extrabold text-brand mt-0.5 block truncate">
              {activeMembership ? `★ ${activeMembership === "premium" ? "Gold VIP" : "Standard"}` : "Sin plan activo"}
            </span>
          </div>
        </div>
      </div>

      {/* Admin badge */}
      {currentUser.isAdmin === true && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between gap-3">
          <div>
            <span className="text-[9px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider inline-block mb-1">Administrador</span>
            <p className="text-xs text-amber-800 font-medium">Cuenta con privilegios de administrador.</p>
          </div>
          <button type="button" onClick={() => { if (onEnterAdmin) onEnterAdmin(); }}
            className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center gap-1.5 whitespace-nowrap shrink-0">
            <Settings size={12} /> Workspace Admin
          </button>
        </div>
      )}

      {/* ── Next visit spotlight ── */}
      <div>
        <h2 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider mb-3">Próxima visita</h2>

        {nextBooking && sc ? (
          <div className="bg-white border border-zinc-150 rounded-2xl p-5 shadow-xs space-y-4">
            {/* status + service */}
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold border ${sc.tone}`}>
                  <NextIcon size={12} />
                  {sc.label}
                </span>
                <h3 className="text-base font-extrabold text-zinc-950">{nextBooking.serviceName}</h3>
              </div>
              <span className="text-lg font-extrabold text-zinc-900 shrink-0">
                ${nextBooking.totalCost?.toFixed(0)}
              </span>
            </div>

            {/* date + time */}
            <div className="flex flex-wrap gap-4 text-sm text-zinc-600">
              <div className="flex items-center gap-1.5">
                <Calendar size={14} className="text-zinc-400 shrink-0" />
                <span className="font-semibold capitalize">{formatDate(nextBooking.bookingDate)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock size={14} className="text-zinc-400 shrink-0" />
                <span className="font-semibold">{nextBooking.timeSlot}</span>
              </div>
            </div>

            {/* booking id + action */}
            <div className="flex items-center justify-between pt-3 border-t border-zinc-100">
              <span className="text-[11px] text-zinc-400 font-mono">Ref: {nextBooking.id}</span>
              <button
                onClick={() => setActivePage("bookings")}
                className="text-xs font-bold text-brand hover:text-brand-hover flex items-center gap-1 cursor-pointer transition-colors"
              >
                Ver todos mis pedidos <ChevronRight size={13} />
              </button>
            </div>
          </div>
        ) : (
          /* empty state */
          <div className="bg-white border border-dashed border-zinc-200 rounded-2xl p-8 flex flex-col sm:flex-row items-center gap-5">
            <div className="h-14 w-14 bg-brand-light rounded-2xl flex items-center justify-center shrink-0">
              <Calendar size={24} className="text-brand" />
            </div>
            <div className="text-center sm:text-left flex-1">
              <p className="font-bold text-zinc-800 text-sm">No tienes visitas próximas</p>
              <p className="text-xs text-zinc-400 mt-0.5">Agenda tu primer servicio y aparecerá aquí.</p>
            </div>
            <button onClick={() => onSelectTab("estimator")}
              className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-sm font-bold rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shrink-0">
              Cotizar ahora <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* ── Quick links ── */}
      <div>
        <h2 className="text-xs font-extrabold text-zinc-400 uppercase tracking-wider mb-3">Mi cuenta</h2>
        <div className="space-y-2">
          {PAGES.map((item) => {
            const IconComp = item.icon;
            const badge = item.id === "bookings" && upcomingBookings.length > 0 ? upcomingBookings.length : undefined;
            return (
              <button key={item.id} type="button" onClick={() => setActivePage(item.id)}
                className="w-full flex items-center gap-4 p-4 bg-white border border-zinc-150 rounded-2xl hover:border-brand/30 hover:shadow-sm transition-all cursor-pointer text-left group">
                <div className={`h-10 w-10 ${item.bg} rounded-xl flex items-center justify-center shrink-0`}>
                  <IconComp size={18} className={item.color} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-900">{item.label}</p>
                  <p className="text-xs text-zinc-400 truncate">{item.desc}</p>
                </div>
                {badge !== undefined && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1.5 text-[10px] font-bold text-white shrink-0">
                    {badge}
                  </span>
                )}
                <ChevronRight size={15} className="text-zinc-300 group-hover:text-brand transition-colors shrink-0" />
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout */}
      <div className="pt-1">
        <button type="button" onClick={() => { onLogout(); onSelectTab("services"); }}
          className="w-full py-3 border border-rose-100 text-rose-600 hover:bg-rose-50 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 cursor-pointer">
          <LogOut size={15} />
          Cerrar Sesión
        </button>
        <div className="mt-4 flex items-center justify-center gap-1.5 text-[11px] text-zinc-400">
          <ShieldCheck size={12} className="text-brand" />
          <span>Conexión cifrada y segura</span>
        </div>
      </div>
    </div>
  );
}

// ── BookingCard sub-component ──────────────────────────────────────────────────

function BookingCard({ booking }: { booking: Booking; key?: string }) {
  const sc = statusConfig(booking.status);
  const StatusIcon = sc.icon;
  return (
    <div className="bg-white border border-zinc-150 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-extrabold text-zinc-900 text-sm">{booking.serviceName}</span>
          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded font-bold uppercase font-mono">
            {booking.id.slice(0, 7)}
          </span>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-zinc-500">
          <span>{booking.bookingDate}</span>
          <span>·</span>
          <span>{booking.timeSlot}</span>
          <span>·</span>
          <span className="text-brand font-extrabold">${booking.totalCost?.toFixed(0) || "0"}</span>
        </div>
      </div>
      <span className={`self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${sc.tone}`}>
        <StatusIcon size={11} />
        {sc.label}
      </span>
    </div>
  );
}
