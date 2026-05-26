import React, { useState } from "react";
import { 
  Home, 
  Calendar, 
  ShieldCheck, 
  Sparkles, 
  Award,
  User,
  LogIn,
  X,
  Mail,
  Lock,
  CheckCircle2,
  Calculator,
  BookOpen,
  Settings,
  Truck
} from "lucide-react";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bookingsCount: number;
  activeMembership?: string | null;
  currentUser: { email: string; name: string } | null;
  onLogin: (name: string, email: string) => void;
  onLogout: () => void;
  onGoogleLogin?: () => Promise<void>;
}

export default function Navbar({ 
  activeTab, 
  setActiveTab, 
  bookingsCount, 
  activeMembership,
  currentUser,
  onLogin,
  onLogout,
  onGoogleLogin
}: NavbarProps) {
  // Navigation tabs for SEO structure
  const tabs: Array<{ id: string; label: string; icon: any; isPremium?: boolean; badge?: number }> = [
    { id: "services", label: "Nuestros Servicios", icon: Sparkles },
    { id: "estimator", label: "Cotizador Al Instante", icon: Calculator },
    { id: "membership", label: "Membresía", icon: Award, isPremium: !!activeMembership },
    { id: "bookings", label: "Operaciones", icon: Truck, badge: bookingsCount > 0 ? bookingsCount : undefined },
    { id: "about", label: "Nosotros & Eco", icon: ShieldCheck },
    { id: "blog", label: "Consejos Blog", icon: BookOpen },
  ];

  // Auth drawer control
  const [isAuthDrawerOpen, setIsAuthDrawerOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Input fields
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("••••••••");
  const [isDemoAuthing, setIsDemoAuthing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    if (authMode === 'signup' && !nameInput.trim()) {
      setErrorMsg("Por favor, ingresa tu nombre completo.");
      return;
    }

    setIsDemoAuthing(true);
    setErrorMsg("");
    
    setTimeout(() => {
      const finalName = authMode === 'signup' ? nameInput : (emailInput.includes("marko") ? "Marko" : emailInput.split("@")[0]);
      onLogin(finalName, emailInput);
      setIsDemoAuthing(false);
      setSuccessMsg(`¡Bienvenido de vuelta, ${finalName}! Sesión iniciada.`);
      
      // Auto close after success and switch to Account page
      setTimeout(() => {
        setIsAuthDrawerOpen(false);
        setSuccessMsg("");
        setEmailInput("");
        setNameInput("");
        setActiveTab("account"); // Redirect straight to account!
      }, 1200);
    }, 850);
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md">
        {/* Insured Security Top Banner */}
        <div className="bg-brand text-xs text-white font-medium py-2 px-4 flex flex-wrap sm:flex-nowrap justify-between items-start sm:items-center gap-y-1 select-none sm:px-6 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-300" />
            <span className="min-w-0 leading-tight break-words">Técnicos Certificados, Respaldo y Garantía de Satisfacción 100% Asegurada</span>
          </div>
          <div className="hidden sm:flex items-center gap-4 text-[11px]">
            <span className="opacity-90">⭐ Calificación de 4.9/5</span>
            <span className="w-1 h-1 bg-white/40 rounded-full"></span>
            <span className="opacity-90">Operando en Springfield e Illinois</span>
          </div>
        </div>

        {/* Main Bar with Premium Startup Layout Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[4.5rem] py-3 sm:py-0 sm:h-20 items-center justify-between gap-2 sm:gap-4">
            
            {/* LEFT: Elegant Logo */}
            <div className="flex min-w-0 items-center gap-2 cursor-pointer shrink-0" onClick={() => setActiveTab("services")}>
              <div className="flex items-center justify-center h-10 w-10 rounded-xl bg-brand-light text-brand shadow-sm">
                <Home size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <span className="text-base sm:text-lg font-extrabold text-gray-950 tracking-tight block leading-none whitespace-nowrap">
                  HomeServices<span className="text-brand">Hub</span>
                </span>
                <span className="hidden sm:block text-[9px] text-gray-400 font-bold tracking-wide uppercase mt-0.5">
                  Springfield Desk
                </span>
              </div>
            </div>

            {/* CENTER: Startup Style Navigation Links */}
            <nav className="hidden md:flex items-center space-x-1">
              {tabs.map((tab) => {
                const IconComp = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    id={`nav-tab-${tab.id}`}
                    onClick={() => setActiveTab(tab.id)}
                    className={`relative flex items-center gap-2 px-3 py-2 text-xs font-bold rounded-xl transition-all duration-200 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? "text-brand bg-brand-light"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50/70"
                    }`}
                  >
                    <IconComp size={14} className={isActive ? "text-brand animate-pulse" : "text-gray-400"} />
                    <span>{tab.label}</span>
                    
                    {tab.badge !== undefined && tab.badge > 0 && (
                      <span className="ml-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[9px] font-bold text-white ring-2 ring-white animate-bounce">
                        {tab.badge}
                      </span>
                    )}

                    {tab.isPremium && (
                      <span className="ml-1 inline-block text-amber-500 text-[10px]" title="Membresía Activa">
                        ★
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            {/* RIGHT ACTION CORNER: LOGIN / ACCOUNT (Complying exactly to spec) */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {currentUser ? (
                /* When the customer is logged in, show ONLY: "Hola, {nombre}" as a textual link button */
                <button
                  type="button"
                  id="btn-account-open"
                  onClick={() => setActiveTab("account")}
                  className={`flex items-center gap-2 bg-brand-light border border-brand/20 py-2 px-3.5 rounded-xl transition-all duration-200 hover:scale-[1.01] hover:bg-brand-light/95 cursor-pointer text-left focus:outline-none ${
                    activeTab === "account" ? "ring-2 ring-brand" : ""
                  }`}
                >
                  <div className="h-6 w-6 bg-brand text-white rounded-lg flex items-center justify-center font-black text-xs select-none shadow-xxs shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-black text-brand tracking-tight max-w-[96px] sm:max-w-none truncate">
                    Hola, {currentUser.name}
                  </span>
                </button>
              ) : (
                /* If Logged Out: Elegant CTA Triggers */
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-login-open"
                    onClick={() => {
                      setAuthMode('login');
                      setIsAuthDrawerOpen(true);
                      setErrorMsg("");
                    }}
                    className="hidden sm:inline-flex px-3.5 py-2 rounded-xl text-xs font-bold text-gray-700 hover:text-gray-900 hover:bg-gray-50/80 transition-all cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    id="btn-signup-open"
                    onClick={() => {
                      setAuthMode('signup');
                      setIsAuthDrawerOpen(true);
                      setErrorMsg("");
                    }}
                    className="px-3 sm:px-4 py-2 rounded-xl text-xs font-black text-white bg-brand hover:bg-brand-hover shadow-sm hover:shadow-md transition-all cursor-pointer hover:-translate-y-0.5"
                  >
                    <span className="sm:hidden">Acceder</span>
                    <span className="hidden sm:inline">Registrarse</span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>

        {/* MOBILE APP TABS NAVIGATOR BAR */}
        <div className="md:hidden flex items-center justify-around border-t border-gray-100 bg-white py-2 px-2">
          {tabs.map((tab) => {
            const IconComp = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex flex-col items-center gap-1 p-1 text-center cursor-pointer flex-1 relative ${
                  isActive ? "text-brand font-black" : "text-gray-400 hover:text-gray-600"
                }`}
              >
                <IconComp size={16} />
                <span className="text-[9px] tracking-tight">{tab.label.split(" ")[0]}</span>
                
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="absolute top-0 right-3 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
          {currentUser && (
            <button
              onClick={() => setActiveTab("account")}
              className={`flex flex-col items-center gap-1 p-1 text-center cursor-pointer flex-1 relative ${
                activeTab === "account" ? "text-brand font-black" : "text-gray-400 hover:text-gray-600"
              }`}
            >
              <User size={16} />
              <span className="text-[9px] tracking-tight">Mi Cuenta</span>
            </button>
          )}
        </div>
      </header>

      {/* ============================================================== */}
      {/* SLIDING LATERAL DRAWER: AUTHENTICATION PORTAL (LOGIN/SIGNUP)   */}
      {/* ============================================================== */}
      {isAuthDrawerOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsAuthDrawerOpen(false)}
          />

          {/* Sliding Panel Content */}
          <div className="relative w-full max-w-sm sm:max-w-md h-full bg-white shadow-2xl flex flex-col justify-between z-10 animate-in slide-in-from-right duration-250 ease-out border-l border-gray-100">
            
            {/* Drawer Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-brand-light text-brand flex items-center justify-center shadow-xs">
                  <Home size={15} strokeWidth={2.5} />
                </div>
                <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase block">
                  ACCESO SEGURO
                </span>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthDrawerOpen(false)}
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              
              <div className="space-y-1">
                <h3 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight font-sans text-left">
                  {authMode === 'login' ? 'Iniciar Sesión' : 'Crea tu Cuenta'}
                </h3>
                <p className="text-xs text-gray-500 text-left">
                  {authMode === 'login' 
                    ? 'Ingresa tus credenciales simuladas para administrar tus servicios.' 
                    : 'Regístrate hoy para asegurar un 10% adicional de descuento.'}
                </p>
              </div>

              {/* Status Alert logs */}
              {errorMsg && (
                <div className="p-3.5 text-xs bg-rose-50 border border-rose-100 text-rose-800 rounded-xl font-medium text-left">
                  ⚠️ {errorMsg}
                </div>
              )}

              {successMsg && (
                <div className="p-3.5 text-xs bg-emerald-50 border border-emerald-100 text-emerald-855 rounded-xl font-semibold flex items-center gap-2 text-left">
                  <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* Google Login Provider */}
              {onGoogleLogin && (
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={async () => {
                      setIsDemoAuthing(true);
                      setErrorMsg("");
                      try {
                        await onGoogleLogin();
                        setSuccessMsg("¡Sesión iniciada correctamente con Google!");
                        setTimeout(() => {
                          setIsAuthDrawerOpen(false);
                          setSuccessMsg("");
                          setActiveTab("account");
                        }, 1200);
                      } catch (err: any) {
                        setErrorMsg("Error al iniciar sesión con Google. Inténtalo de nuevo.");
                      } finally {
                        setIsDemoAuthing(false);
                      }
                    }}
                    disabled={isDemoAuthing}
                    className="w-full py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 text-gray-800 text-xs font-black shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span className="h-4 w-4 rounded-full bg-red-600 text-[9px] text-white flex items-center justify-center font-black">G</span>
                    <span className="font-extrabold text-gray-700">Continuar con Google</span>
                  </button>

                  <div className="relative flex py-1 items-center">
                    <div className="flex-grow border-t border-gray-150"></div>
                    <span className="flex-shrink mx-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">o con contraseña</span>
                    <div className="flex-grow border-t border-gray-150"></div>
                  </div>
                </div>
              )}

              {/* Authentication Form */}
              <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                {authMode === 'signup' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Nombre Completo</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-gray-400">
                        <User size={14} />
                      </span>
                      <input
                        type="text"
                        placeholder="Ej. Marko Šimić"
                        value={nameInput}
                        onChange={(e) => setNameInput(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-250 outline-none focus:border-brand transition-all font-semibold text-gray-800 bg-white"
                        required
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Correo Electrónico</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <Mail size={14} />
                    </span>
                    <input
                      type="email"
                      placeholder="ejemplo@correo.com"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-255 outline-none focus:border-brand transition-all font-semibold text-gray-800 bg-white"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Contraseña</label>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-400">
                      <Lock size={14} />
                    </span>
                    <input
                      type="password"
                      value={passwordInput}
                      onChange={(e) => setPasswordInput(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-255 outline-none focus:border-brand transition-all font-semibold text-gray-800 bg-white"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isDemoAuthing}
                  className="w-full py-3 rounded-xl bg-brand hover:bg-brand-hover disabled:bg-brand/60 text-white text-xs font-black shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  {isDemoAuthing ? (
                    <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                  ) : (
                    <LogIn size={13} />
                  )}
                  <span>{authMode === 'login' ? 'Iniciar Sesión Seguro' : 'Crear mi Cuenta Premium'}</span>
                </button>
              </form>

              {/* Toggle Mode */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === 'login' ? 'signup' : 'login');
                    setErrorMsg("");
                  }}
                  className="text-xs text-gray-500 hover:text-brand font-semibold cursor-pointer underline bg-transparent/0 border-none outline-none"
                >
                  {authMode === 'login' 
                    ? '¿No tienes cuenta? Regístrate aquí' 
                    : '¿Ya eres cliente? Inicia sesión'}
                </button>
              </div>

            </div>

          </div>
        </div>
      )}
    </>
  );
}
