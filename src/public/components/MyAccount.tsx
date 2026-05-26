import React, { useState } from "react";
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
} from "lucide-react";
import { Booking } from "../../shared/types";
import type { UserProfile } from "../../shared/services/firebaseService";

type AppUser = UserProfile & { isAdmin?: boolean };

interface MyAccountProps {
  currentUser: AppUser | null;
  onLogout: () => void;
  bookings: Booking[];
  activeMembership?: string | null;
  onSelectTab: (tabId: string) => void;
  onUpdateProfile: (updates: Partial<UserProfile>) => Promise<void>;
  onEnterAdmin?: () => void;
}

type SubPage = "overview" | "profile" | "access" | "payment" | "bookings";

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
  { id: "profile"  as SubPage, label: "Mi Perfil",          desc: "Nombre, teléfono y dirección",           icon: User,        color: "text-brand",    bg: "bg-brand-light" },
  { id: "bookings" as SubPage, label: "Mis Pedidos",         desc: "Historial y estado de visitas",           icon: Calendar,    color: "text-amber-600",bg: "bg-amber-50"   },
  { id: "access"   as SubPage, label: "Pautas de Acceso",    desc: "Mascotas, llaves y notas de entrada",     icon: LockKeyhole, color: "text-violet-600",bg: "bg-violet-50" },
  { id: "payment"  as SubPage, label: "Medios de Pago",      desc: "Tarjeta guardada y método predeterminado",icon: CreditCard,  color: "text-blue-600", bg: "bg-blue-50"   },
];

// ── component ─────────────────────────────────────────────────────────────────

export default function MyAccount({
  currentUser,
  onLogout,
  bookings,
  activeMembership,
  onSelectTab,
  onUpdateProfile,
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

  // Profile fields
  const [profileName, setProfileName]       = useState(currentUser.name ?? "");
  const [profilePhone, setProfilePhone]     = useState(currentUser.phone ?? "");
  const [profileAddress, setProfileAddress] = useState(currentUser.address ?? "");
  const [petsStatus, setPetsStatus]         = useState<"none"|"dog"|"cat"|"both">((currentUser.petsStatus as any) ?? "none");
  const [keyPreferences, setKeyPreferences] = useState(currentUser.keyPreferences ?? "lockbox");
  const [lockboxCode, setLockboxCode]       = useState(currentUser.lockboxCode ?? "");
  const [specialNote, setSpecialNote]       = useState(currentUser.specialNote ?? "");

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
    try   { await onUpdateProfile({ name: profileName, phone: profilePhone, address: profileAddress }); showSuccess("¡Perfil guardado!"); }
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

  const goBack = () => {
    setActivePage("overview");
    setSuccessMessage("");
    setSaveError("");
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
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Nombre Completo</label>
                  <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all" required />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Teléfono</label>
                  <input type="text" value={profilePhone} onChange={(e) => setProfilePhone(e.target.value)}
                    className="w-full px-3.5 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all" />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-[11px] font-bold text-zinc-500 uppercase block">Dirección Principal</label>
                  <div className="relative">
                    <MapPin size={14} className="absolute left-3.5 top-3.5 text-zinc-400" />
                    <input type="text" value={profileAddress} onChange={(e) => setProfileAddress(e.target.value)}
                      className="w-full pl-9 pr-4 py-3 text-sm rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-semibold text-zinc-800 transition-all" />
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

        {/* ── Bookings ── */}
        {activePage === "bookings" && (
          <div className="space-y-6">
            {/* Upcoming */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-zinc-900 uppercase tracking-wider">Próximas visitas</h2>
                <span className="text-xs font-bold text-zinc-400">{upcomingBookings.length} activa{upcomingBookings.length !== 1 ? "s" : ""}</span>
              </div>
              {upcomingBookings.length > 0 ? (
                <div className="space-y-3">
                  {upcomingBookings.map((b) => <BookingCard key={b.id} booking={b} />)}
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
            {currentUser.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="text-[10px] font-extrabold tracking-wider text-brand uppercase mb-0.5">Mi Cuenta</p>
            <h1 className="text-xl font-extrabold text-zinc-900 leading-tight">
              Hola, {currentUser.name.split(" ")[0]} 👋
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
