import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
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
  Truck,
  Menu,
  MapPin,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { Language } from "../../shared/i18n";

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  bookingsCount: number;
  activeMembership?: string | null;
  currentUser: { email: string; name: string } | null;
  onLogout: () => void;
  onGoogleLogin?: () => Promise<void>;
  language: Language;
  onLanguageChange: (lang: Language) => void;
  onEmailLogin?: (email: string, password: string) => Promise<void>;
  onEmailSignup?: (name: string, email: string, password: string) => Promise<void>;
  getAuthErrorMessage?: (error: unknown) => string;
}

export default function Navbar({
  activeTab,
  setActiveTab,
  bookingsCount,
  activeMembership,
  currentUser,
  onLogout,
  onGoogleLogin,
  language,
  onLanguageChange,
  onEmailLogin,
  onEmailSignup,
  getAuthErrorMessage
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Input fields
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isDemoAuthing, setIsDemoAuthing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailInput.trim()) {
      setErrorMsg("Por favor, ingresa un correo electrónico válido.");
      return;
    }
    if (authMode === "signup" && !nameInput.trim()) {
      setErrorMsg("Por favor, ingresa tu nombre completo.");
      return;
    }
    if (!passwordInput) {
      setErrorMsg("Por favor, ingresa tu contraseña.");
      return;
    }

    setIsDemoAuthing(true);
    setErrorMsg("");

    try {
      if (authMode === "signup") {
        if (onEmailSignup) await onEmailSignup(nameInput.trim(), emailInput.trim(), passwordInput);
      } else {
        if (onEmailLogin) await onEmailLogin(emailInput.trim(), passwordInput);
      }
      const label = authMode === "signup" ? "¡Cuenta creada! Bienvenido." : "¡Sesión iniciada correctamente!";
      setSuccessMsg(label);
      setTimeout(() => {
        setIsAuthDrawerOpen(false);
        setSuccessMsg("");
        setEmailInput("");
        setNameInput("");
        setPasswordInput("");
        setActiveTab("account");
      }, 1200);
    } catch (err: unknown) {
      setErrorMsg(getAuthErrorMessage ? getAuthErrorMessage(err) : "No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setIsDemoAuthing(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b border-gray-100 bg-white/95 backdrop-blur-md">

        {/* Main Bar - Simplified Startup Style */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-[3.5rem] items-center justify-between gap-4">
            
            {/* LEFT: Logo */}
            <div 
              className="flex items-center cursor-pointer shrink-0" 
              onClick={() => setActiveTab("services")}
            >
              <span className="text-xl sm:text-2xl font-extrabold text-gray-950 tracking-tight leading-none">
                Green<span className="text-brand">bee</span>
              </span>
            </div>

            {/* CENTER: Navigation (Desktop only) */}
            <div className="hidden md:flex items-center gap-1">
              <button
                onClick={() => setActiveTab("estimator")}
                className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                {language === 'en' ? 'Get Quote' : 'Cotizar'}
              </button>
              <Link
                to="/areas"
                className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                {language === 'en' ? 'Coverage' : 'Cobertura'}
              </Link>
              <Link
                to="/faq"
                className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                FAQ
              </Link>
              <Link
                to="/contact"
                className="px-3 py-2 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
              >
                {language === 'en' ? 'Contact' : 'Contacto'}
              </Link>
            </div>

            {/* RIGHT: Primary CTA + Auth */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {/* Book Service CTA - Primary Action */}
              {!currentUser && (
                <button
                  onClick={() => setActiveTab("estimator")}
                  className="hidden sm:inline-flex px-4 py-2 rounded-lg text-sm font-bold text-white bg-brand hover:bg-brand-hover transition-all cursor-pointer"
                >
                  Book Service
                </button>
              )}

              {currentUser ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("bookings")}
                  className={`flex items-center gap-2 bg-brand-light border border-brand/20 px-3 py-2 rounded-lg transition-all hover:scale-105 cursor-pointer ${
                    activeTab === "bookings" ? "ring-2 ring-brand" : ""
                  }`}
                >
                  <div className="h-6 w-6 bg-brand text-white rounded-md flex items-center justify-center font-bold text-xs shrink-0">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="text-xs font-bold text-brand max-w-[60px] sm:max-w-none truncate hidden sm:inline">
                    {currentUser.name}
                  </span>
                  {bookingsCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ml-auto">
                      {bookingsCount}
                    </span>
                  )}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('signup');
                    setIsAuthDrawerOpen(true);
                  }}
                  className="px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-bold text-white bg-brand hover:bg-brand-hover transition-all cursor-pointer"
                >
                  <span className="sm:hidden">Sign Up</span>
                  <span className="hidden sm:inline">Get Started</span>
                </button>
              )}

              {/* Language Toggle */}
              <button
                type="button"
                onClick={() => onLanguageChange(language === 'en' ? 'es' : 'en')}
                className="h-9 w-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all cursor-pointer text-xs font-bold"
              >
                {language.toUpperCase()}
              </button>

              {/* Mobile Hamburger */}
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                className="md:hidden h-9 w-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 transition-all cursor-pointer"
              >
                <Menu size={18} />
              </button>
            </div>

          </div>
        </div>


      </header>

      {/* ============================================================== */}
      {/* MOBILE SIDEBAR MENU (HAMBURGER) - FROM RIGHT                    */}
      {/* ============================================================== */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex justify-end md:hidden">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-xs transition-opacity duration-300"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          {/* Sliding Panel from Right */}
          <div className="relative w-full max-w-[300px] h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 ease-out border-l border-gray-100">
            
            {/* Drawer Header */}
            <div className="p-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-lg font-extrabold text-gray-950 tracking-tight">
                Green<span className="text-brand">bee</span>
              </span>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
                aria-label="Cerrar menú"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Items */}
            <nav className="flex-1 overflow-y-auto py-4 px-3">
              <ul className="space-y-1">
                {tabs.map((tab) => {
                  const IconComp = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <li key={tab.id}>
                      <button
                        onClick={() => {
                          setActiveTab(tab.id);
                          setIsMobileMenuOpen(false);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                          isActive
                            ? "text-brand bg-brand-light"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                        }`}
                      >
                        <IconComp size={18} className={isActive ? "text-brand" : "text-gray-400"} />
                        <span className="flex-1 text-left">{tab.label}</span>
                        
                        {tab.badge !== undefined && tab.badge > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                            {tab.badge}
                          </span>
                        )}

                        {tab.isPremium && (
                          <span className="text-amber-500 text-sm" title="Membresía Activa">
                            ★
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
                
                {/* Account option if logged in */}
                {currentUser && (
                  <li>
                    <button
                      onClick={() => {
                        setActiveTab("account");
                        setIsMobileMenuOpen(false);
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold transition-all cursor-pointer ${
                        activeTab === "account"
                          ? "text-brand bg-brand-light"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                      }`}
                    >
                      <User size={18} className={activeTab === "account" ? "text-brand" : "text-gray-400"} />
                      <span className="flex-1 text-left">Mi Cuenta</span>
                    </button>
                  </li>
                )}
              </ul>

              {/* Page links separator */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-3 mb-2">
                  {language === 'en' ? 'Info' : 'Info'}
                </p>
                <ul className="space-y-1">
                  {[
                    { to: "/areas", label: language === 'en' ? 'Coverage Areas' : 'Áreas de Cobertura', icon: MapPin },
                    { to: "/faq", label: "FAQ", icon: HelpCircle },
                    { to: "/contact", label: language === 'en' ? 'Contact Us' : 'Contacto', icon: MessageSquare },
                  ].map(({ to, label, icon: Icon }) => (
                    <li key={to}>
                      <Link
                        to={to}
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-bold text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all"
                      >
                        <Icon size={18} className="text-gray-400" />
                        <span>{label}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </nav>

            {/* Footer with Auth */}
            <div className="p-4 border-t border-gray-100 bg-slate-50/30">
              {currentUser ? (
                <div className="flex items-center gap-3 p-3 bg-brand-light rounded-xl">
                  <div className="h-9 w-9 bg-brand text-white rounded-lg flex items-center justify-center font-black text-sm">
                    {currentUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setAuthMode('signup');
                      setIsAuthDrawerOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold transition-all cursor-pointer"
                  >
                    Registrarse
                  </button>
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      setAuthMode('login');
                      setIsAuthDrawerOpen(true);
                    }}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold transition-all cursor-pointer"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
              <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase block">
                ACCESO SEGURO
              </span>

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
                        // If we get here without redirect, show success
                        // On mobile, redirect happens and this won't execute
                        setSuccessMsg("¡Sesión iniciada correctamente con Google!");
                        setTimeout(() => {
                          setIsAuthDrawerOpen(false);
                          setSuccessMsg("");
                          setEmailInput("");
                          setNameInput("");
                          setPasswordInput("");
                          setActiveTab("account");
                        }, 1200);
                      } catch (err: unknown) {
                        setErrorMsg(getAuthErrorMessage ? getAuthErrorMessage(err) : "Error al iniciar sesión con Google. Inténtalo de nuevo.");
                      } finally {
                        setIsDemoAuthing(false);
                      }
                    }}
                    disabled={isDemoAuthing}
                    className="w-full py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 text-gray-800 text-xs font-black shadow-xs hover:shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {isDemoAuthing ? (
                      <span className="font-extrabold text-gray-500">Conectando...</span>
                    ) : (
                      <>
                        <span className="h-4 w-4 rounded-full bg-red-600 text-[9px] text-white flex items-center justify-center font-black">G</span>
                        <span className="font-extrabold text-gray-700">Continuar con Google</span>
                      </>
                    )}
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
