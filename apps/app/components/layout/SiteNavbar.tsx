"use client";
/**
 * SiteNavbar — navegación principal de Grenbee.
 *
 * Usada en:
 *   • PageShell   → páginas de marketing (/us/*, /us/es/*)
 *   • (app)/layout → páginas de app (/book, /account, /bookings, /estimate)
 *
 * Cuando AuthProvider está montado (siempre, desde providers.tsx) muestra el
 * avatar/dropdown del usuario. Si no hay usuario, muestra "Iniciar Sesión".
 */

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter, useParams } from "next/navigation";
import {
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  ClipboardList,
  Award,
  User,
  LogIn,
  Mail,
  Lock,
  CheckCircle2,
  ArrowLeft,
  KeyRound,
  Phone,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useSiteSettings } from "@grenbee/firebase/contexts";
import { useAuth } from "@/contexts/AuthContext";
import { sendPasswordReset } from "@grenbee/firebase/services";

export default function SiteNavbar() {
  const { t, i18n } = useTranslation();
  const { phone } = useSiteSettings();
  const auth = useAuth();
  const router = useRouter();
  const _params = useParams();
  const country = _params?.country as string | undefined;
  const pathname = usePathname();

  const currentUser = auth?.currentUser ?? null;
  const bookings = auth?.bookings ?? [];
  const activeBookingsCount = bookings.filter(
    (b) => b.status !== "completed" && b.status !== "cancelled",
  ).length;

  // Language toggle only makes sense on [country]/* routes that have ES equivalents
  const isInternationalRoute = !!country;

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Auth drawer state
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | "forgot">("login");
  const [emailInput, setEmailInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [isAuthing, setIsAuthing] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [isSendingReset, setIsSendingReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const base = `/${country ?? "us"}`;
  const NAV_LINKS = [
    { label: t("siteNav.services"), href: "/#services" },
    { label: t("siteNav.plans"), href: `${base}/plans` },
    { label: t("siteNav.areas"), href: `${base}/areas` },
    { label: t("siteNav.forHosts"), href: `${base}/hosts` },
    { label: t("siteNav.faq"), href: `${base}/faq` },
    { label: t("siteNav.contact"), href: `${base}/contact` },
  ];

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close user menu on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function handleHashLink(href: string) {
    if (!href.startsWith("/#")) return;
    const id = href.slice(2);
    if (pathname === "/" || pathname?.endsWith("/us") || pathname?.endsWith("/us/")) {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    } else {
      window.location.href = href;
    }
  }

  function switchLanguage() {
    const countryPrefix = `/${country ?? "us"}`;
    if (i18n.language === "en") {
      const pathAfterCountry = pathname.slice(countryPrefix.length);
      router.push(`${countryPrefix}/es${pathAfterCountry || "/"}`);
    } else {
      const pathAfterCountry = pathname.slice(countryPrefix.length);
      const withoutEs = pathAfterCountry.replace(/^\/es/, "") || "/";
      router.push(`${countryPrefix}${withoutEs}`);
    }
  }

  function openAuthDrawer(mode: "login" | "signup") {
    setAuthMode(mode);
    setErrorMsg("");
    setSuccessMsg("");
    setEmailInput("");
    setPasswordInput("");
    setNameInput("");
    setIsAuthOpen(true);
  }

  function closeAuthDrawer() {
    setIsAuthOpen(false);
    setAuthMode("login");
    setResetSent(false);
    setErrorMsg("");
    setSuccessMsg("");
  }

  // ── Auth drawer handlers ───────────────────────────────────────────────────

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setErrorMsg("Ingresa tu correo electrónico.");
      return;
    }
    setIsSendingReset(true);
    setErrorMsg("");
    try {
      await sendPasswordReset(forgotEmail.trim());
      setResetSent(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error al enviar. Inténtalo de nuevo.";
      setErrorMsg(msg);
    } finally {
      setIsSendingReset(false);
    }
  };

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

    setIsAuthing(true);
    setErrorMsg("");

    try {
      if (authMode === "signup") {
        await auth?.handleEmailSignup(nameInput.trim(), emailInput.trim(), passwordInput);
      } else {
        await auth?.handleEmailLogin(emailInput.trim(), passwordInput);
      }
      const label =
        authMode === "signup"
          ? "¡Cuenta creada! Bienvenido."
          : "¡Sesión iniciada correctamente!";
      setSuccessMsg(label);
      setTimeout(() => {
        closeAuthDrawer();
        router.push("/account");
      }, 1200);
    } catch (err: unknown) {
      const getMsg = auth?.getAuthErrorMessage;
      setErrorMsg(
        getMsg ? getMsg(err) : "No se pudo iniciar sesión. Inténtalo de nuevo.",
      );
    } finally {
      setIsAuthing(false);
    }
  };

  const handleGoogleClick = async () => {
    setIsAuthing(true);
    setErrorMsg("");
    try {
      await auth?.handleGoogleLogin();
      setSuccessMsg("¡Sesión iniciada con Google!");
      setTimeout(() => {
        closeAuthDrawer();
        router.push("/account");
      }, 1200);
    } catch (err: unknown) {
      const getMsg = auth?.getAuthErrorMessage;
      setErrorMsg(
        getMsg ? getMsg(err) : "Error al iniciar sesión con Google.",
      );
    } finally {
      setIsAuthing(false);
    }
  };

  const handleLogout = async () => {
    setIsUserMenuOpen(false);
    await auth?.handleLogout();
    router.push("/");
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <header
        className={`sticky top-0 z-50 w-full bg-white transition-shadow duration-200 ${
          scrolled ? "shadow-md" : "border-b border-gray-100"
        }`}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-20">

            {/* Logo */}
            <Link href="/" className="flex items-center shrink-0">
              <span className="text-xl font-extrabold text-gray-950 tracking-tight leading-none">
                Gren<span className="text-emerald-500">bee</span>
              </span>
            </Link>

            {/* Desktop nav links */}
            <nav className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map((link) =>
                link.href.startsWith("/#") ? (
                  <button
                    key={link.label}
                    onClick={() => handleHashLink(link.href)}
                    className="px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      pathname === link.href
                        ? "text-emerald-600 bg-emerald-50"
                        : "text-gray-600 hover:text-emerald-600 hover:bg-emerald-50"
                    }`}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </nav>

            {/* Right section */}
            <div className="hidden md:flex items-center gap-4">
              {/* Phone */}
              <a
                href={`tel:${phone.replace(/\D/g, "")}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-emerald-600 transition-colors"
              >
                <Phone className="w-4 h-4" />
                {phone}
              </a>

              {/* Separador */}
              <span className="w-px h-5 bg-gray-200" />

              {/* Membresía — siempre visible, botón destacado amber */}
              <Link
                href={`${base}/plans`}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl transition-all shadow-sm ${
                  pathname === `${base}/plans`
                    ? "bg-amber-500 text-white shadow-amber-200"
                    : "bg-amber-50 text-amber-700 hover:bg-amber-500 hover:text-white hover:shadow-amber-200"
                }`}
              >
                <Award size={14} className="shrink-0" />
                {t("siteNav.membership")}
              </Link>

              {/* En Progreso — solo para usuarios logueados */}
              {currentUser && (
                <Link
                  href="/bookings"
                  className={`relative flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold rounded-xl transition-all ${
                    pathname === "/bookings"
                      ? "bg-emerald-500 text-white"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-500 hover:text-white"
                  }`}
                >
                  <ClipboardList size={14} className="shrink-0" />
                  {t("siteNav.inProgress")}
                  {activeBookingsCount > 0 && (
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                      {activeBookingsCount}
                    </span>
                  )}
                </Link>
              )}

              {/* Auth area */}
              {currentUser ? (
                /* ── Logged in: avatar dropdown ── */
                <div className="relative" ref={userMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-4 py-2.5 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer select-none"
                  >
                    <div className="h-7 w-7 bg-emerald-500 text-white rounded-lg flex items-center justify-center font-black text-xs shrink-0">
                      {(currentUser.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="hidden sm:flex flex-col items-start leading-none">
                      <span className="text-[10px] font-semibold text-emerald-600/70 uppercase tracking-wide">
                        {t("siteNav.myAccount")}
                      </span>
                      <span className="text-xs font-bold text-gray-900 max-w-[90px] truncate">
                        {t("siteNav.hello")}, {currentUser.name?.split(" ")[0] || "Usuario"}
                      </span>
                    </div>
                    {activeBookingsCount > 0 && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
                        {activeBookingsCount}
                      </span>
                    )}
                    <ChevronDown
                      size={13}
                      className={`text-emerald-600/60 transition-transform duration-200 ${
                        isUserMenuOpen ? "rotate-180" : ""
                      }`}
                    />
                  </button>

                  {/* Dropdown */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                      <div className="px-4 py-3 border-b border-gray-100">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {currentUser.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                      </div>

                      <div className="py-1">
                        <Link
                          href="/account"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          <Settings size={15} className="text-gray-400 shrink-0" />
                          {t("siteNav.myAccount")}
                        </Link>
                        <Link
                          href="/bookings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                        >
                          <ClipboardList size={15} className="text-gray-400 shrink-0" />
                          {t("siteNav.inProgress")}
                          {activeBookingsCount > 0 && (
                            <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                              {activeBookingsCount}
                            </span>
                          )}
                        </Link>
                        <Link
                          href={`${base}/plans`}
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-amber-600 hover:bg-amber-50 transition-colors"
                        >
                          <Award size={15} className="text-amber-500 shrink-0" />
                          {t("siteNav.membership")}
                        </Link>
                      </div>

                      <div className="border-t border-gray-100 pt-1">
                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors text-left cursor-pointer"
                        >
                          <LogOut size={15} className="shrink-0" />
                          {t("siteNav.signOut")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* ── Not logged in: sign in + CTA ── */
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openAuthDrawer("login")}
                    className="px-4 py-2 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all cursor-pointer"
                  >
                    {t("siteNav.signIn")}
                  </button>
                  <Link
                    href="/#estimate"
                    onClick={() => handleHashLink("/#estimate")}
                    className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors shadow-sm"
                  >
                    {t("siteNav.getFreeQuote")}
                  </Link>
                </div>
              )}

              {/* Language toggle — only on [country]/* routes */}
              {isInternationalRoute && (
                <button
                  type="button"
                  onClick={switchLanguage}
                  className="h-9 w-9 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-600 hover:text-gray-900 transition-all cursor-pointer text-xs font-bold"
                >
                  {i18n.language === "en" ? "ES" : "EN"}
                </button>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              className="md:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              onClick={() => setMobileOpen(!mobileOpen)}
              aria-label={t("siteNav.toggleMenu")}
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden bg-white border-t border-gray-100 shadow-lg">
            {/* Nav links */}
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map((link) =>
                link.href.startsWith("/#") ? (
                  <button
                    key={link.label}
                    onClick={() => {
                      handleHashLink(link.href);
                      setMobileOpen(false);
                    }}
                    className="w-full text-left px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors cursor-pointer"
                  >
                    {link.label}
                  </button>
                ) : (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="block px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-emerald-50 hover:text-emerald-600 rounded-xl transition-colors"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ),
              )}
            </div>

            {/* Phone + auth */}
            <div className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-2">
              {/* Membresía — siempre visible en mobile */}
              <Link
                href={`${base}/plans`}
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold rounded-xl transition-all"
              >
                <Award size={15} />
                {t("siteNav.membership")}
              </Link>

              {currentUser ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 p-3 bg-emerald-50 rounded-xl">
                    <div className="h-9 w-9 bg-emerald-500 text-white rounded-lg flex items-center justify-center font-black text-sm">
                      {(currentUser.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">
                        {currentUser.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{currentUser.email}</p>
                    </div>
                  </div>
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-xl"
                  >
                    <User size={15} className="text-gray-400" />
                    {t("siteNav.myAccount")}
                  </Link>
                  <Link
                    href="/bookings"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 px-4 py-2.5 text-sm font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl"
                  >
                    <ClipboardList size={15} className="text-emerald-500" />
                    {t("siteNav.inProgress")}
                    {activeBookingsCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1.5 text-[10px] font-bold text-white">
                        {activeBookingsCount}
                      </span>
                    )}
                  </Link>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 rounded-xl cursor-pointer"
                  >
                    <LogOut size={15} />
                    {t("siteNav.signOut")}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      openAuthDrawer("signup");
                    }}
                    className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-bold transition-all cursor-pointer"
                  >
                    {t("siteNav.createAccount")}
                  </button>
                  <button
                    onClick={() => {
                      setMobileOpen(false);
                      openAuthDrawer("login");
                    }}
                    className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 hover:bg-gray-50 text-sm font-bold transition-all cursor-pointer"
                  >
                    {t("siteNav.signIn")}
                  </button>
                </div>
              )}

              {/* Language toggle — only on [country]/* routes */}
              {isInternationalRoute && (
                <button
                  type="button"
                  onClick={() => {
                    setMobileOpen(false);
                    switchLanguage();
                  }}
                  className="w-full py-2.5 rounded-xl border border-gray-200 text-gray-700 text-sm font-bold transition-all cursor-pointer"
                >
                  {i18n.language === "en" ? "Español" : "English"}
                </button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* ── Auth Drawer ───────────────────────────────────────────────────────── */}
      {isAuthOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm transition-opacity duration-300"
            onClick={closeAuthDrawer}
          />
          <div className="relative w-full max-w-sm sm:max-w-md h-full bg-white shadow-2xl flex flex-col z-10 animate-in slide-in-from-right duration-250 ease-out border-l border-gray-100">

            {/* Header */}
            <div className="p-5 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <span className="text-[10px] font-black text-gray-400 tracking-widest uppercase">
                ACCESO SEGURO
              </span>
              <button
                type="button"
                onClick={closeAuthDrawer}
                className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">

              {/* ── Forgot password ── */}
              {authMode === "forgot" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode("login");
                        setErrorMsg("");
                        setResetSent(false);
                      }}
                      className="h-8 w-8 rounded-full hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-all cursor-pointer shrink-0"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <div>
                      <h3 className="text-xl font-black text-gray-950 tracking-tight">
                        Recuperar Contraseña
                      </h3>
                      <p className="text-xs text-gray-500">
                        Te enviaremos un enlace para restablecer tu acceso.
                      </p>
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 text-xs bg-rose-50 border border-rose-100 text-rose-800 rounded-xl font-medium">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  {resetSent ? (
                    <div className="flex flex-col items-center text-center gap-4 py-6 animate-in fade-in duration-300">
                      <div className="h-14 w-14 bg-emerald-50 rounded-2xl flex items-center justify-center">
                        <KeyRound size={26} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-extrabold text-gray-900 mb-1">
                          ¡Correo enviado!
                        </p>
                        <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
                          Revisa tu bandeja de entrada (y spam) en{" "}
                          <span className="font-bold text-gray-700">{forgotEmail}</span>.
                          El enlace expira en 1 hora.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setAuthMode("login");
                          setResetSent(false);
                          setForgotEmail("");
                          setErrorMsg("");
                        }}
                        className="text-xs font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                      >
                        Volver a Iniciar Sesión
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={handleForgotSubmit} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-400">
                            <Mail size={14} />
                          </span>
                          <input
                            type="email"
                            value={forgotEmail}
                            onChange={(e) => setForgotEmail(e.target.value)}
                            placeholder="ejemplo@correo.com"
                            required
                            autoFocus
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-emerald-500 transition-all font-semibold text-gray-800 bg-white"
                          />
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={isSendingReset}
                        className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        {isSendingReset ? (
                          <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Mail size={13} />
                        )}
                        {isSendingReset ? "Enviando..." : "Enviar enlace"}
                      </button>
                    </form>
                  )}
                </div>
              )}

              {/* ── Login / Signup ── */}
              {authMode !== "forgot" && (
                <>
                  <div className="space-y-1">
                    <h3 className="text-xl sm:text-2xl font-black text-gray-950 tracking-tight">
                      {authMode === "login" ? "Iniciar Sesión" : "Crea tu Cuenta"}
                    </h3>
                    <p className="text-xs text-gray-500">
                      {authMode === "login"
                        ? "Accede para gestionar tus servicios y reservas."
                        : "Regístrate hoy y obtén un 10% adicional de descuento."}
                    </p>
                  </div>

                  {errorMsg && (
                    <div className="p-3.5 text-xs bg-rose-50 border border-rose-100 text-rose-800 rounded-xl font-medium">
                      ⚠️ {errorMsg}
                    </div>
                  )}

                  {successMsg && (
                    <div className="p-3.5 text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 rounded-xl font-semibold flex items-center gap-2">
                      <CheckCircle2 size={14} className="text-emerald-600 shrink-0" />
                      {successMsg}
                    </div>
                  )}

                  {/* Google */}
                  <div className="space-y-3">
                    <button
                      type="button"
                      onClick={handleGoogleClick}
                      disabled={isAuthing}
                      className="w-full py-3.5 rounded-xl border border-gray-200 bg-white hover:bg-slate-50 disabled:bg-slate-50 text-gray-800 text-xs font-black shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isAuthing ? (
                        <span className="font-extrabold text-gray-500">Conectando...</span>
                      ) : (
                        <>
                          <span className="h-4 w-4 rounded-full bg-red-600 text-[9px] text-white flex items-center justify-center font-black">
                            G
                          </span>
                          <span className="font-extrabold text-gray-700">
                            Continuar con Google
                          </span>
                        </>
                      )}
                    </button>

                    <div className="relative flex py-1 items-center">
                      <div className="flex-grow border-t border-gray-200" />
                      <span className="flex-shrink mx-3 text-[9px] font-black text-gray-400 uppercase tracking-widest">
                        o con contraseña
                      </span>
                      <div className="flex-grow border-t border-gray-200" />
                    </div>
                  </div>

                  {/* Email form */}
                  <form onSubmit={handleFormSubmit} className="space-y-4 text-left">
                    {authMode === "signup" && (
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Nombre Completo
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-gray-400">
                            <User size={14} />
                          </span>
                          <input
                            type="text"
                            placeholder="Ej. María García"
                            value={nameInput}
                            onChange={(e) => setNameInput(e.target.value)}
                            required
                            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-emerald-500 transition-all font-semibold text-gray-800 bg-white"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                        Correo Electrónico
                      </label>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400">
                          <Mail size={14} />
                        </span>
                        <input
                          type="email"
                          placeholder="ejemplo@correo.com"
                          value={emailInput}
                          onChange={(e) => setEmailInput(e.target.value)}
                          required
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-emerald-500 transition-all font-semibold text-gray-800 bg-white"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Contraseña
                        </label>
                        {authMode === "login" && (
                          <button
                            type="button"
                            onClick={() => {
                              setAuthMode("forgot");
                              setForgotEmail(emailInput);
                              setErrorMsg("");
                              setResetSent(false);
                            }}
                            className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 underline cursor-pointer"
                          >
                            ¿Olvidaste tu contraseña?
                          </button>
                        )}
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-2.5 text-gray-400">
                          <Lock size={14} />
                        </span>
                        <input
                          type="password"
                          value={passwordInput}
                          onChange={(e) => setPasswordInput(e.target.value)}
                          required
                          className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 outline-none focus:border-emerald-500 transition-all font-semibold text-gray-800 bg-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={isAuthing}
                      className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white text-xs font-black shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      {isAuthing ? (
                        <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <LogIn size={13} />
                      )}
                      {authMode === "login" ? "Iniciar Sesión" : "Crear Cuenta Premium"}
                    </button>
                  </form>

                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode(authMode === "login" ? "signup" : "login");
                        setErrorMsg("");
                      }}
                      className="text-xs text-gray-500 hover:text-emerald-600 font-semibold cursor-pointer underline"
                    >
                      {authMode === "login"
                        ? "¿No tienes cuenta? Regístrate aquí"
                        : "¿Ya eres cliente? Inicia sesión"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
