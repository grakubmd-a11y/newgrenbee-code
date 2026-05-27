import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import StaffPortal from "./components/StaffPortal";
import {
  subscribeToAuthChanges,
  signInWithGoogleRedirect,
  getGoogleRedirectResult,
  getFirebaseAuthErrorMessage,
  signOutUser,
  getUserProfile,
} from "../shared/services/firebaseService";

// ─── Types ────────────────────────────────────────────────────────────────────

interface StaffUser {
  uid: string;
  email: string;
  name: string;
  staffId: string;
  staffName: string;
}

// ─── Auth shell (reused from AdminRoute pattern) ──────────────────────────────

function Shell({ children, title, subtitle }: { children: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="min-h-screen bg-[#0a2e1e] flex items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white/5 border border-white/10 rounded-2xl shadow-xl p-6 space-y-5 backdrop-blur">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-brand/20 text-brand flex items-center justify-center">
            <Icons.HardHat size={22} />
          </div>
          <h1 className="text-xl font-black tracking-tight text-white">{title}</h1>
          <p className="text-sm text-white/50 leading-relaxed">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function StaffRoute() {
  const [checking, setChecking]       = useState(true);
  const [currentUser, setCurrentUser] = useState<StaffUser | null>(null);
  const [authEmail, setAuthEmail]     = useState("");
  const [authUid, setAuthUid]         = useState("");
  const [authError, setAuthError]     = useState("");
  const [loginBusy, setLoginBusy]     = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    getGoogleRedirectResult().catch((err) => setAuthError(getFirebaseAuthErrorMessage(err)));

    const unsub = subscribeToAuthChanges(async (firebaseUser) => {
      setChecking(true);
      setAuthError("");
      setAccessDenied(false);

      if (!firebaseUser) {
        setCurrentUser(null);
        setAuthEmail("");
        setAuthUid("");
        setChecking(false);
        return;
      }

      setAuthEmail(firebaseUser.email || "");
      setAuthUid(firebaseUser.uid);

      try {
        const [tokenResult, profile] = await Promise.all([
          firebaseUser.getIdTokenResult(true),
          getUserProfile(firebaseUser.uid).catch(() => null),
        ]);

        const role = profile?.role;
        const hasAccess =
          tokenResult.claims.admin === true ||
          role === "admin" ||
          role === "manager" ||
          role === "staff";

        if (!hasAccess) {
          setAccessDenied(true);
          setCurrentUser(null);
          setChecking(false);
          return;
        }

        // Resolve staff doc ID by email (server-side, via staff-jobs endpoint)
        // We do a minimal fetch just to confirm the staff link exists
        const idToken = await firebaseUser.getIdToken();
        const resp = await fetch("/api/staff-jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({}),
        });
        const data = await resp.json().catch(() => ({}));

        if (!resp.ok) {
          // If it's 404 they have a role but no staff doc linked
          setAuthError(data.error || "Could not load your staff profile.");
          setCurrentUser(null);
          setChecking(false);
          return;
        }

        setCurrentUser({
          uid:       firebaseUser.uid,
          email:     firebaseUser.email || "",
          name:      profile?.name || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Technician",
          staffId:   data.staffId || "",
          staffName: data.staffName || profile?.name || "",
        });
      } catch (err) {
        setAuthError(getFirebaseAuthErrorMessage(err) || "Auth check failed.");
        setCurrentUser(null);
      } finally {
        setChecking(false);
        setLoginBusy(false);
      }
    });

    return unsub;
  }, []);

  const handleLogout = async () => {
    await signOutUser();
    setCurrentUser(null);
    setAuthEmail("");
    setAuthUid("");
  };

  // ── Loading ────────────────────────────────────────────────────────────────
  if (checking) {
    return (
      <Shell title="Staff Portal" subtitle="Verificando acceso…">
        <div className="flex items-center justify-center gap-2 text-sm text-white/60">
          <Icons.Loader2 className="animate-spin" size={16} />
          <span>Cargando…</span>
        </div>
      </Shell>
    );
  }

  // ── Not signed in ──────────────────────────────────────────────────────────
  if (!authEmail) {
    return (
      <Shell title="Staff Portal" subtitle="Inicia sesión con tu cuenta de Greenbee para ver tus trabajos asignados.">
        {authError && (
          <p className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/20 rounded-xl p-3">{authError}</p>
        )}
        <button
          type="button"
          onClick={async () => {
            setAuthError("");
            setLoginBusy(true);
            try { await signInWithGoogleRedirect(); }
            catch (e) { setAuthError(getFirebaseAuthErrorMessage(e)); setLoginBusy(false); }
          }}
          disabled={loginBusy}
          className="w-full bg-brand hover:bg-brand-hover disabled:opacity-60 text-white rounded-xl py-3 text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2 transition-colors"
        >
          {loginBusy
            ? <Icons.Loader2 className="animate-spin" size={16} />
            : <Icons.LogIn size={16} />}
          Entrar con Google
        </button>
        <a href="/" className="block text-center text-xs text-white/40 hover:text-white/70 transition-colors">
          ← Volver al sitio
        </a>
      </Shell>
    );
  }

  // ── Access denied ──────────────────────────────────────────────────────────
  if (accessDenied || (!currentUser && !checking)) {
    return (
      <Shell title="Acceso denegado" subtitle="Tu cuenta no tiene rol de staff asignado.">
        <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl p-3 text-xs text-rose-200 space-y-1">
          <p>Cuenta: <span className="font-mono">{authEmail}</span></p>
          <p className="text-white/40">Pide a un admin que te asigne el rol <span className="font-mono">staff</span> en Firestore.</p>
        </div>
        {authError && (
          <p className="text-xs text-amber-300 bg-amber-500/10 border border-amber-500/20 rounded-xl p-3">{authError}</p>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className="w-full bg-white/10 hover:bg-white/20 text-white rounded-xl py-3 text-sm font-bold border-none cursor-pointer flex items-center justify-center gap-2"
        >
          <Icons.LogOut size={16} /> Cerrar sesión
        </button>
        <a href="/" className="block text-center text-xs text-white/40 hover:text-white/70">
          ← Volver al sitio
        </a>
      </Shell>
    );
  }

  // ── Authenticated staff ────────────────────────────────────────────────────
  return <StaffPortal currentUser={currentUser!} onLogout={handleLogout} />;
}
