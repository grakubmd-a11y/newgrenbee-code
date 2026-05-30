import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import AdminPanel from "./AdminPanel";
import { Booking, BookingStatus, Review, Service } from "@grenbee/types";
import { INITIAL_BOOKINGS, INITIAL_REVIEWS, SERVICES_DATA } from "@grenbee/config";
import {
  subscribeToAuthChanges,
  signInWithGooglePopup,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
  getFirebaseAuthErrorMessage,
  signInWithEmail,
  signOutUser,
  getUserProfile,
  fetchAllBookingsForAdmin,
  fetchReviewsFromFirestore,
  fetchServicesFromFirestore,
  updateBookingInFirestore,
  deleteReviewFromFirestore
} from "@grenbee/firebase/services";

type AdminUser = {
  uid: string;
  email: string;
  name: string;
  isAdmin: true;
};

function AdminShell({
  children,
  title,
  subtitle
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-xl p-6 space-y-5">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <Icons.ShieldCheck size={22} />
          </div>
          <h1 className="text-2xl font-black tracking-tight">{title}</h1>
          <p className="text-sm text-slate-400 leading-relaxed">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function AdminRoute() {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [currentUser, setCurrentUser] = useState<AdminUser | null>(null);
  const [authUserEmail, setAuthUserEmail] = useState<string>("");
  const [authUserUid, setAuthUserUid] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [emailInput, setEmailInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [services, setServices] = useState<Service[]>(SERVICES_DATA);

  const loadAdminData = async () => {
    const [adminBookings, liveReviews, liveServices] = await Promise.all([
      fetchAllBookingsForAdmin(),
      fetchReviewsFromFirestore(),
      fetchServicesFromFirestore()
    ]);
    setBookings(adminBookings || []);
    setReviews(liveReviews || []);
    setServices(liveServices || []);
  };

  useEffect(() => {
    // Safety timeout: if Firebase auth state takes too long, show the login form.
    const safetyTimer = setTimeout(() => setCheckingAuth(false), 6000);

    // Only call getGoogleRedirectResult() when we KNOW we triggered a redirect.
    // Calling it unconditionally causes Firebase to throw:
    // "INTERNAL ASSERTION FAILED: Pending promise was never set"
    // when no redirect was pending (especially when signInWithPopup is also used).
    const hadPendingRedirect = sessionStorage.getItem("admin_pending_redirect");
    if (hadPendingRedirect) {
      sessionStorage.removeItem("admin_pending_redirect");
      getGoogleRedirectResult().catch((err) => {
        setAuthError(getFirebaseAuthErrorMessage(err));
      });
    }

    const unsubscribe = subscribeToAuthChanges(async (firebaseUser) => {
      clearTimeout(safetyTimer);
      setCheckingAuth(true);
      setAuthError("");

      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthUserEmail("");
        setAuthUserUid("");
        setCheckingAuth(false);
        return;
      }

      setAuthUserEmail(firebaseUser.email || "");
      setAuthUserUid(firebaseUser.uid);

      try {
        const tokenResult = await firebaseUser.getIdTokenResult(true);
        const profile = await getUserProfile(firebaseUser.uid).catch(() => null);
        const role = profile?.role;
        const hasAdminAccess =
          tokenResult.claims.admin === true ||
          role === "owner" ||   // highest privilege tier
          role === "admin" ||
          role === "manager";   // legacy role — kept for backward compatibility

        if (!hasAdminAccess) {
          setCurrentUser(null);
          setCheckingAuth(false);
          return;
        }

        const adminUser: AdminUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || "",
          name: profile?.name || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Admin",
          isAdmin: true
        };
        setCurrentUser(adminUser);
        await loadAdminData();
      } catch (error) {
        console.error("Admin auth check failed:", error);
        setAuthError(getFirebaseAuthErrorMessage(error) || "No se pudo verificar tu acceso administrativo.");
        setCurrentUser(null);
      } finally {
        setCheckingAuth(false);
        setLoginBusy(false);
      }
    });

    return () => {
      clearTimeout(safetyTimer);
      unsubscribe();
    };
  }, []);

  const handleGoogleLogin = async () => {
    setAuthError("");
    setLoginBusy(true);
    try {
      // Try popup first — no COOP issues on most browsers.
      await signInWithGooglePopup();
    } catch (error: any) {
      if (error?.code === "auth/popup-blocked") {
        // Popup was blocked — fall back to redirect and mark it so we can
        // call getRedirectResult() when the user returns to this page.
        try {
          sessionStorage.setItem("admin_pending_redirect", "1");
          await signInWithGoogleRedirect();
          // Page reloads after redirect — auth picked up in subscribeToAuthChanges.
        } catch (redirectError: any) {
          sessionStorage.removeItem("admin_pending_redirect");
          setAuthError(getFirebaseAuthErrorMessage(redirectError));
          setLoginBusy(false);
        }
      } else if (error?.code === "auth/popup-closed-by-user") {
        // User closed the popup voluntarily — just reset the button state.
        setLoginBusy(false);
      } else {
        setAuthError(getFirebaseAuthErrorMessage(error));
        setLoginBusy(false);
      }
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setLoginBusy(true);
    try {
      await signInWithEmail(emailInput.trim(), passwordInput);
    } catch (error: any) {
      setAuthError(getFirebaseAuthErrorMessage(error));
      setLoginBusy(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
  };

  const handleUpdateBookingStatus = async (
    bookingId: string,
    status: BookingStatus,
    paymentStatus?: "unpaid" | "paid" | "authorized",
    paymentMethod?: "card" | "paypal" | "cash"
  ) => {
    const updates = {
      status,
      ...(paymentStatus !== undefined && { paymentStatus }),
      ...(paymentMethod !== undefined && { paymentMethod })
    };
    await updateBookingInFirestore(bookingId, updates);
    setBookings((prev) =>
      prev.map((booking) => (booking.id === bookingId ? { ...booking, ...updates } : booking))
    );
  };

  const handleDeleteReview = async (reviewId: string) => {
    await deleteReviewFromFirestore(reviewId);
    setReviews((prev) => prev.filter((review) => review.id !== reviewId));
  };

  const handleAddReviewDirect = (review: Review) => {
    setReviews((prev) => [review, ...prev]);
  };

  if (checkingAuth) {
    return (
      <AdminShell title="Verificando acceso" subtitle="Validando Firebase Auth y permisos administrativos.">
        <div className="flex items-center justify-center gap-2 text-sm text-slate-300">
          <Icons.Loader2 className="animate-spin" size={16} />
          <span>Cargando admin...</span>
        </div>
      </AdminShell>
    );
  }

  if (!authUserEmail) {
    return (
      <AdminShell title="Admin Grenbee" subtitle="Inicia sesion con una cuenta autorizada para administrar el sitio.">
        {authError && <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{authError}</p>}

        {/* ── Email / Password form ── */}
        {showEmailForm ? (
          <form onSubmit={handleEmailLogin} className="space-y-3">
            <input
              type="email"
              placeholder="Correo electrónico"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
            <input
              type="password"
              placeholder="Contraseña"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              required
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={loginBusy}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2"
            >
              {loginBusy ? <Icons.Loader2 className="animate-spin" size={16} /> : <Icons.LogIn size={16} />}
              <span>Entrar</span>
            </button>
            <button
              type="button"
              onClick={() => { setShowEmailForm(false); setAuthError(""); }}
              className="w-full text-xs text-slate-400 hover:text-white py-1 bg-transparent border-none cursor-pointer"
            >
              ← Volver a opciones de login
            </button>
          </form>
        ) : (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loginBusy}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2"
            >
              {loginBusy ? <Icons.Loader2 className="animate-spin" size={16} /> : <Icons.LogIn size={16} />}
              <span>Entrar con Google</span>
            </button>
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-700" />
              <span className="text-xs text-slate-500">o</span>
              <div className="flex-1 h-px bg-slate-700" />
            </div>
            <button
              type="button"
              onClick={() => { setShowEmailForm(true); setAuthError(""); }}
              className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl py-3 text-sm font-bold border border-slate-700 cursor-pointer flex items-center justify-center gap-2"
            >
              <Icons.Mail size={16} />
              <span>Entrar con correo y contraseña</span>
            </button>
          </>
        )}

        <a href="/" className="block text-center text-xs text-slate-400 hover:text-white">
          Volver al sitio publico
        </a>
      </AdminShell>
    );
  }

  if (!currentUser) {
    return (
      <AdminShell title="Acceso denegado" subtitle="Tu cuenta esta autenticada, pero no tiene rol admin o manager.">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-sm text-rose-200 space-y-2">
          <p>Cuenta actual: <span className="font-mono">{authUserEmail}</span></p>
          <p>UID: <span className="font-mono break-all">{authUserUid}</span></p>
        </div>
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-slate-300 leading-relaxed">
          En Firestore crea o edita este documento: <span className="font-mono">users/{authUserUid}</span> y agrega <span className="font-mono">role: "admin"</span>.
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-slate-800 hover:bg-slate-700 text-white rounded-xl py-3 text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2"
        >
          <Icons.LogOut size={16} />
          <span>Cerrar sesion</span>
        </button>
        <a href="/" className="block text-center text-xs text-slate-400 hover:text-white">
          Volver al sitio publico
        </a>
      </AdminShell>
    );
  }

  return (
    <AdminPanel
      bookings={bookings}
      reviews={reviews}
      services={services}
      currentUser={currentUser}
      onNavigateToAccount={() => {
        window.location.href = "https://app.grenbee.com/";
      }}
      onUpdateBookingStatus={handleUpdateBookingStatus}
      onDeleteReview={handleDeleteReview}
      onAddReviewDirect={handleAddReviewDirect}
      onSynchronizeAll={loadAdminData}
      onExit={() => {
        window.location.href = "https://app.grenbee.com/";
      }}
    />
  );
}
