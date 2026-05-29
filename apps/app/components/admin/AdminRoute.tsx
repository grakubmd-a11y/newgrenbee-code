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
    // Safety timeout: Firebase's onAuthStateChanged waits for any pending
    // signInWithRedirect to finish before firing. On custom domains this can
    // hang indefinitely due to cross-origin IndexedDB issues. After 6 s we
    // force the page out of the loading state so the login form shows.
    const safetyTimer = setTimeout(() => setCheckingAuth(false), 6000);

    getGoogleRedirectResult().catch((error) => {
      setAuthError(getFirebaseAuthErrorMessage(error));
    });

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
      await signInWithGooglePopup();
    } catch (error: any) {
      if (error?.code === "auth/popup-blocked" || error?.code === "auth/popup-closed-by-user") {
        // Popup was blocked — ask the user to allow popups rather than
        // falling back to signInWithRedirect, which causes onAuthStateChanged
        // to hang indefinitely on custom domains (cross-origin IndexedDB issue).
        setAuthError(
          "Tu navegador bloqueó la ventana de login. Permite los popups para control-room.grenbee.com en la barra de URL y vuelve a intentar."
        );
      } else {
        setAuthError(getFirebaseAuthErrorMessage(error));
      }
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
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={loginBusy}
          className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2"
        >
          {loginBusy ? <Icons.Loader2 className="animate-spin" size={16} /> : <Icons.LogIn size={16} />}
          <span>Entrar con Google</span>
        </button>
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
        window.location.href = "/";
      }}
      onUpdateBookingStatus={handleUpdateBookingStatus}
      onDeleteReview={handleDeleteReview}
      onAddReviewDirect={handleAddReviewDirect}
      onSynchronizeAll={loadAdminData}
      onExit={() => {
        window.location.href = "/";
      }}
    />
  );
}
