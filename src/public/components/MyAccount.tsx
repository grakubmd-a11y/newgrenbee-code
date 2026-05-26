import React, { useState } from "react";
import { 
  User, 
  MapPin, 
  Phone, 
  Mail, 
  Calendar, 
  CreditCard, 
  Award, 
  ShieldAlert, 
  Save, 
  CheckCircle2, 
  ArrowRight, 
  LogOut, 
  LockKeyhole, 
  Home, 
  Clock, 
  Lock,
  Sliders,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Settings,
  HelpCircle,
  Sparkle
} from "lucide-react";
import { Booking } from "../../shared/types";

interface MyAccountProps {
  currentUser: { email: string; name: string; isAdmin?: boolean } | null;
  onLogout: () => void;
  bookings: Booking[];
  activeMembership?: string | null;
  onSelectTab: (tabId: string) => void;
  onUpdateUser: (updatedName: string) => void;
  onEnterAdmin?: () => void;
}

type SubTab = "profile" | "access" | "payment" | "bookings";

export default function MyAccount({ 
  currentUser, 
  onLogout, 
  bookings, 
  activeMembership,
  onSelectTab,
  onUpdateUser,
  onEnterAdmin
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
            Inicia sesión en la parte superior para acceder de forma segura a tus configuraciones personales de servicio.
          </p>
        </div>
      </div>
    );
  }

  // Sub-tab selection state inside the MyAccount portal
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("profile");

  // Profile fields state
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profilePhone, setProfilePhone] = useState("+1 (555) 0192-384");
  const [profileAddress, setProfileAddress] = useState("742 Evergreen Terrace, Springfield, IL");
  const [petsStatus, setPetsStatus] = useState<"none" | "dog" | "cat" | "both">("dog");
  const [keyPreferences, setKeyPreferences] = useState("lockbox"); // "lockbox", "present", "frontdesk"
  const [lockboxCode, setLockboxCode] = useState("4821");
  const [specialNote, setSpecialNote] = useState("Tener cuidado al entrar por el jardín frontal, el portón rechina un poco.");
  
  // Payment simulated state
  const [cardName, setCardName] = useState(currentUser.name);
  const [cardNumber, setCardNumber] = useState("•••• •••• •••• 9840");
  const [cardExpiry, setCardExpiry] = useState("08/29");
  const [cardProvider, setCardProvider] = useState<"visa" | "mastercard">("visa");

  // Success alert
  const [successMessage, setSuccessMessage] = useState("");

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateUser(profileName);
    setSuccessMessage("¡Tus configuraciones de cuenta han sido salvadas con éxito!");
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  const myActiveBookings = bookings.filter(b => 
    b.email.toLowerCase() === currentUser.email.toLowerCase() || 
    b.customerName.toLowerCase() === currentUser.name.toLowerCase()
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-6 text-left animate-in fade-in duration-300">
      
      {/* 1. Welcoming Light-Themed Elegant Hero Banner (No dark tech-grenbee elements, no monospace) */}
      <div className="bg-gradient-to-br from-brand-light via-white to-zinc-50 border border-brand/10 rounded-3xl p-6 md:p-8 relative overflow-hidden shadow-xs">
        {/* Abstract elegant design element */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-brand/5 rounded-bl-[120px] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-brand/15 rounded-full shadow-xxs">
              <Sparkle size={12} className="text-brand animate-spin" style={{ animationDuration: '4s' }} />
              <span className="text-[10px] font-extrabold tracking-wider text-brand uppercase">
                Panel Remoto del Cliente
              </span>
            </div>
            <h1 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight text-zinc-900">
              ¡Hola, {profileName}! 👋
            </h1>
            <p className="text-xs text-zinc-600 max-w-xl leading-relaxed">
              Consola unificada para adecuar los datos del hogar, actualizar pautas de entrada de operarios autorizados de Springfield, y dar seguimiento a cotizaciones.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="bg-white border border-zinc-200/80 px-4 py-3 rounded-2xl text-left shadow-2xs min-w-[150px]">
              <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">Suscripción</span>
              <span className="text-xs font-extrabold text-brand mt-1 block">
                {activeMembership ? `★ Club ${activeMembership === "premium" ? "Gold VIP" : "Standard"}` : "Ninguna Activa"}
              </span>
            </div>
            <div className="bg-white border border-zinc-200/80 px-4 py-3 rounded-2xl text-left shadow-2xs min-w-[140px]">
              <span className="text-[10px] text-zinc-400 uppercase font-extrabold tracking-wider block">Visitas</span>
              <span className="text-xs font-extrabold text-zinc-800 mt-1 block">
                {myActiveBookings.length} Solicitudes
              </span>
            </div>
          </div>
        </div>
      </div>

      {successMessage && (
        <div className="p-4 bg-brand text-white rounded-2xl flex items-center gap-3 animate-in zoom-in-95 shadow-md">
          <CheckCircle2 className="text-white shrink-0" size={18} />
          <span className="text-xs font-bold leading-none">{successMessage}</span>
        </div>
      )}

      {/* 2. Sub-tab Selection and Layout Core */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Navigation Control Sidebar (3 Columns) */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white border border-zinc-150 rounded-2xl p-4 space-y-1.5 shadow-2xs">
            <span className="text-[10px] text-zinc-400 uppercase tracking-wider block px-3 mb-2 font-extrabold">
              Panel de Control
            </span>
            
            {[
              { id: "profile", label: "Mi Cuenta", icon: User },
              { id: "access", label: "Pautas de Acceso", icon: LockKeyhole },
              { id: "payment", label: "Medios de Pago", icon: CreditCard },
              { id: "bookings", label: "Mis Visitas", icon: Calendar, count: myActiveBookings.length },
            ].map((tab) => {
              const IconComp = tab.icon;
              const isSelected = activeSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveSubTab(tab.id as SubTab)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer text-left ${
                    isSelected
                      ? "bg-brand text-white shadow-sm"
                      : "text-zinc-650 hover:text-zinc-950 hover:bg-zinc-50"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <IconComp size={15} className={isSelected ? "text-white" : "text-zinc-400"} />
                    <span>{tab.label}</span>
                  </div>
                  {tab.count !== undefined && (
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      isSelected ? "bg-white/25 text-white" : "bg-zinc-100 text-zinc-600"
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {currentUser.isAdmin === true && (
            <div className="bg-amber-50/75 border border-amber-200 rounded-2xl p-4 space-y-2 text-left animate-in zoom-in-95 duration-200">
              <span className="text-[9px] bg-amber-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider block w-max">
                Administrador Detectado
              </span>
              <p className="text-[10px] text-amber-800 leading-normal font-medium">
                Hemos detectado tu cuenta con privilegios de administrador mediante Firebase Custom Claims.
              </p>
              <button
                type="button"
                onClick={() => {
                  if (onEnterAdmin) onEnterAdmin();
                }}
                className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 border-none"
              >
                <Settings size={12} strokeWidth={2.5} />
                <span>Ingresar al Workspace de Administración</span>
              </button>
            </div>
          )}

          {/* Quick Support Badge Card */}
          <div className="bg-zinc-50/70 border border-zinc-150 rounded-2xl p-5 space-y-3.5 text-left">
            <h4 className="text-xs font-bold text-zinc-950 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-brand" />
              <span>Garantía de Confianza</span>
            </h4>
            <p className="text-[11px] text-zinc-650 leading-relaxed font-normal">
              Las autorizaciones mecánicas y claves temporales expiran de forma dinámica una vez finalizado el trabajo de limpieza o reparación.
            </p>
            <div className="pt-2 border-t border-zinc-200/80 flex justify-between items-center text-[10px]">
              <span className="text-zinc-400 font-bold">Asistencia Directa</span>
              <a href="mailto:support@homeserviceshub.com" className="font-extrabold text-brand hover:underline">support@hsh.com</a>
            </div>
          </div>
        </div>

        {/* Dynamic Display Board Area (9 Columns) */}
        <div className="lg:col-span-9 bg-white border border-zinc-150 rounded-3xl p-6 md:p-8 shadow-xs text-left min-h-[440px] flex flex-col justify-between">
          
          <div>
            {/* SUB-TAB 1: Personal profile & account parameters */}
            {activeSubTab === "profile" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-zinc-100 pb-4 space-y-1">
                  <h3 className="text-lg font-bold text-zinc-950">Datos del Propietario</h3>
                  <p className="text-xs text-zinc-500">Actualiza tus detalles simulados de contacto inmediato y dirección fiscal de operaciones.</p>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase block">Nombre Completo</label>
                      <input 
                        type="text" 
                        value={profileName}
                        onChange={(e) => setProfileName(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-bold text-zinc-800 transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase block">Teléfono de Enlace</label>
                      <input 
                        type="text" 
                        value={profilePhone}
                        onChange={(e) => setProfilePhone(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-bold text-zinc-800 transition-all"
                        required
                      />
                    </div>

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase block">Dirección Principal Registrada</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-3.5 text-zinc-400">
                          <MapPin size={14} />
                        </span>
                        <input 
                          type="text" 
                          value={profileAddress}
                          onChange={(e) => setProfileAddress(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-zinc-200 outline-none focus:border-brand bg-zinc-50/50 focus:bg-white font-bold text-zinc-800 transition-all"
                          required
                        />
                      </div>
                    </div>

                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-extrabold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Guardar Cambios</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-TAB 2: Special instructions (Lockbox and keys) */}
            {activeSubTab === "access" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-zinc-100 pb-4 space-y-1">
                  <h3 className="text-lg font-bold text-zinc-950">Pautas de Entrada & Mascotas</h3>
                  <p className="text-xs text-zinc-500">Configure las directrices físicas y de seguridad para los operarios despachados.</p>
                </div>

                <form onSubmit={handleProfileSave} className="space-y-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase block">¿Habrá Mascotas en Casa?</label>
                      <select
                        value={petsStatus}
                        onChange={(e: any) => setPetsStatus(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 outline-none bg-zinc-50/50 focus:bg-white font-bold text-zinc-800 cursor-pointer transition-all"
                      >
                        <option value="none">No, ninguna mascota</option>
                        <option value="dog">Sí, perro (avisar al llegar)</option>
                        <option value="cat">Sí, gato tímido (mantener puertas cerradas)</option>
                        <option value="both font-sans">Perro y Gato presentes</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase block">Acceso del Técnico Springfield</label>
                      <select
                        value={keyPreferences}
                        onChange={(e) => setKeyPreferences(e.target.value)}
                        className="w-full px-3 py-2.5 text-xs rounded-xl border border-zinc-200 outline-none bg-zinc-50/50 focus:bg-white font-bold text-zinc-800 cursor-pointer transition-all"
                      >
                        <option value="lockbox">Clave de Lockbox / Caja fuerte física</option>
                        <option value="present">Estaré presente para abrir personalmente</option>
                        <option value="frontdesk">Dejaré llave en recepción o administración</option>
                      </select>
                    </div>

                    {keyPreferences === "lockbox" && (
                      <div className="space-y-1.5 md:col-span-2 animate-in slide-in-from-top-1 duration-150">
                        <label className="text-[11px] font-bold text-zinc-800 uppercase block flex items-center gap-1">
                          <LockKeyhole size={11} className="text-brand" /> Clave Temporal de Caja Fuerte (Lockbox)
                        </label>
                        <input 
                          type="text" 
                          value={lockboxCode}
                          onChange={(e) => setLockboxCode(e.target.value)}
                          className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-zinc-200 outline-none focus:border-brand font-bold text-zinc-800 bg-zinc-50/50 focus:bg-white transition-all"
                          required
                        />
                        <span className="text-[10px] text-zinc-400 block leading-normal">
                          Por seguridad, este pin dinámico únicamente se le activa en pantalla al operario asignado al iniciar la ruta.
                        </span>
                      </div>
                    )}

                    <div className="space-y-1.5 md:col-span-2">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase block">Notas Críticas de Entrada (Portones, Alarma, etc.)</label>
                      <textarea 
                        value={specialNote}
                        onChange={(e) => setSpecialNote(e.target.value)}
                        rows={3}
                        className="w-full px-3.5 py-2 text-xs rounded-xl border border-zinc-200 outline-none focus:border-brand font-bold text-zinc-800 bg-zinc-50/50 focus:bg-white transition-all"
                        placeholder="Escribe detalles sobre rejas, timbres, horarios etc."
                      />
                    </div>

                  </div>

                  <div className="pt-4 border-t border-zinc-100 flex justify-end">
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-extrabold rounded-xl transition-all inline-flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Save size={14} />
                      <span>Guardar Pautas de Entrada</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* SUB-TAB 3: Payment security representation (Clean light design, no typewriter look) */}
            {activeSubTab === "payment" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-zinc-100 pb-4 space-y-1">
                  <h3 className="text-lg font-bold text-zinc-950">Medios de Pago Guardados</h3>
                  <p className="text-xs text-zinc-500">Inspecciona y actualiza tus tokens bancarios. El cobro seguro se realiza exclusivamente posterior a culminar los servicios.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  
                  {/* Ultra modern light aesthetic gradient bank card representation */}
                  <div className="space-y-4">
                    <div className="w-full aspect-[1.58/1] bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-3xl p-5 flex flex-col justify-between text-white shadow-md relative overflow-hidden select-none">
                      <div className="absolute top-0 right-0 h-14 w-14 bg-brand/10 rounded-full filter blur-xl" />
                      
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-[10px] text-zinc-350 block font-bold tracking-wider">MÉTODO PREDETERMINADO</span>
                          <span className="text-[9px] text-zinc-500 block">Soporte Local Springfield</span>
                        </div>
                        <span className="text-xs font-black italic text-white uppercase">
                          {cardProvider === "visa" ? "VISA" : "Mastercard"}
                        </span>
                      </div>

                      <div className="space-y-2">
                        <div className="text-base font-medium tracking-widest text-zinc-100">
                          {cardNumber}
                        </div>
                        <div className="flex justify-between items-end pt-2 border-t border-zinc-700/60">
                          <div>
                            <span className="text-[7px] text-zinc-400 uppercase block">Titular</span>
                            <span className="text-[9px] uppercase font-extrabold text-zinc-200 truncate max-w-[140px] block">
                              {cardName}
                            </span>
                          </div>
                          <div>
                            <span className="text-[7px] text-zinc-400 uppercase block">Expiración</span>
                            <span className="text-[9px] font-extrabold text-zinc-200">
                              {cardExpiry}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-[10px] text-zinc-450 leading-normal text-center">
                      🔐 Encriptación simétrica local autorizada por Springfield Desk.
                    </p>
                  </div>

                  {/* Form to update simulation card face */}
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold text-zinc-500 uppercase block">Titular de Tarjeta</label>
                      <input 
                        type="text" 
                        value={cardName}
                        onChange={(e) => setCardName(e.target.value)}
                        className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 outline-none focus:border-brand font-bold text-zinc-800 bg-zinc-50/50 focus:bg-white"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase block">Red Financiera</label>
                        <select
                          value={cardProvider}
                          onChange={(e: any) => setCardProvider(e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 outline-none font-bold text-zinc-800 cursor-pointer bg-white"
                        >
                          <option value="visa">Visa Platinum</option>
                          <option value="mastercard">Mastercard Gold</option>
                        </select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-zinc-500 uppercase block">Fecha Expiración</label>
                        <input 
                          type="text" 
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="08/29"
                          maxLength={5}
                          className="w-full px-3 py-2 text-xs rounded-xl border border-zinc-200 outline-none focus:border-brand font-bold text-zinc-800 bg-zinc-50/50 focus:bg-white"
                          required
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        setSuccessMessage("¡Médio de cobro predeterminado actualizado!");
                        setTimeout(() => setSuccessMessage(""), 2000);
                      }}
                      className="w-full py-2.5 bg-brand hover:bg-brand-hover text-white rounded-xl text-xs font-extrabold transition-all cursor-pointer shadow-sm text-center"
                    >
                      Actualizar Medio de Pago
                    </button>
                  </div>

                </div>
              </div>
            )}

            {/* SUB-TAB 4: Flight board list of simulated bookings */}
            {activeSubTab === "bookings" && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="border-b border-zinc-100 pb-4 flex justify-between items-center">
                  <div className="space-y-1">
                    <h3 className="text-lg font-bold text-zinc-950">Historial de Visitas</h3>
                    <p className="text-xs text-zinc-500">Visualiza el historial y agendamientos activos asociados a este perfil.</p>
                  </div>

                  <button
                    onClick={() => onSelectTab("bookings")}
                    className="text-xs text-brand font-extrabold hover:underline flex items-center gap-0.5"
                  >
                    <span>Ir a Tracking Activo</span>
                    <ChevronRight size={13} />
                  </button>
                </div>

                {myActiveBookings.length > 0 ? (
                  <div className="space-y-3">
                    {myActiveBookings.map((booking) => (
                      <div 
                        key={booking.id} 
                        className="p-4 border border-zinc-150 rounded-2xl hover:border-brand/20 hover:bg-brand-light/10 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-zinc-900 text-sm">{booking.serviceName}</span>
                            <span className="text-[10px] bg-zinc-100 text-zinc-600 px-2 py-0.5 rounded font-bold uppercase">
                              ID: {booking.id.slice(0, 5)}
                            </span>
                          </div>
                          
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-zinc-500">
                            <span>{booking.bookingDate}</span>
                            <span>•</span>
                            <span>{booking.timeSlot}</span>
                            <span>•</span>
                            <span className="text-brand font-extrabold">${booking.totalCost?.toFixed(0) || "0"} USD</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2.5 self-start sm:self-auto">
                          <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border ${
                            booking.status === "completed" ? "bg-emerald-50 text-emerald-805 border-emerald-100" :
                            booking.status === "cancelled" ? "bg-rose-50 text-rose-805 border-rose-100" :
                            "bg-brand/10 text-brand border-brand/20 shadow-xxs"
                          }`}>
                            {booking.status === "scheduled" ? "Agendada" :
                             booking.status === "dispatched" ? "En Camino" :
                             booking.status === "in-progress" ? "Ejecutando" :
                             booking.status === "completed" ? "Finalizada" : "Cancelada"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 bg-zinc-50/50 border border-dashed border-zinc-200 rounded-2xl">
                    <p className="text-xs text-zinc-400 font-medium">No cuentas con visitas simuladas en curso bajo esta sesión de cliente.</p>
                    <button
                      onClick={() => onSelectTab("estimator")}
                      className="mt-3.5 text-xs bg-zinc-950 text-white px-4 py-2 rounded-xl font-bold hover:bg-zinc-800 shadow-sm inline-flex items-center gap-1 cursor-pointer"
                    >
                      <span>Nueva cotización express</span>
                      <ArrowRight size={10} />
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 3. Account view dynamic footer inside the card container */}
          <div className="mt-8 pt-5 border-t border-zinc-150 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-1.5 text-zinc-500 font-medium">
              <span className="h-1.5 w-1.5 rounded-full bg-brand animate-pulse" />
              <span>Conexión cifrada local autorizada</span>
            </div>

            <button
              type="button"
              id="btn-account-logout"
              onClick={() => {
                onLogout();
                onSelectTab("services");
              }}
              className="text-zinc-500 hover:text-rose-600 font-bold tracking-tight inline-flex items-center gap-1 hover:underline cursor-pointer bg-transparent border-none p-0 outline-none"
            >
              <LogOut size={13} />
              <span>Cerrar mi Cuenta Segura</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
