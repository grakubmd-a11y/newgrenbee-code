"use client";
/**
 * AuthContext — global auth + data state for the Grenbee app.
 *
 * Mounted once in app/providers.tsx so every page (marketing AND app routes)
 * can read the current user, membership, bookings, etc.
 *
 * SiteNavbar, PublicApp, and all (app)/* pages consume this via useAuth().
 */
import React, { createContext, useContext, useState, useEffect } from "react";
import { Service, Booking, Review, BookingStatus } from "@grenbee/types";
import { createRecurringPlanFromBooking, autoAssignStaff } from "@grenbee/firebase/services";
import { SERVICES_DATA, INITIAL_BOOKINGS, INITIAL_REVIEWS } from "@grenbee/config";
import {
  subscribeToAuthChanges,
  getUserProfile,
  saveUserProfile,
  fetchUserBookings,
  createBookingInFirestore,
  updateBookingInFirestore,
  fetchReviewsFromFirestore,
  fetchServicesFromFirestore,
  createReviewInFirestore,
  incrementReviewHelpfulCount,
  deleteReviewFromFirestore,
  signInWithGooglePopup,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  getGoogleRedirectResult,
  getFirebaseAuthErrorMessage,
  type UserProfile,
} from "@grenbee/firebase/services";

// ── Types ────────────────────────────────────────────────────────────────────

export type AppUser = UserProfile & { isAdmin?: boolean };

export interface AuthContextValue {
  // State
  currentUser: AppUser | null;
  isAdmin: boolean;
  bookings: Booking[];
  reviews: Review[];
  services: Service[];

  // Auth
  handleEmailLogin(email: string, password: string): Promise<void>;
  handleEmailSignup(name: string, email: string, password: string): Promise<void>;
  handleGoogleLogin(): Promise<void>;
  handleLogout(): Promise<void>;
  handleUpdateProfile(updates: Partial<UserProfile>): Promise<void>;

  // Bookings — setBookings exposed so PublicApp can optimistically add new ones
  setBookings: React.Dispatch<React.SetStateAction<Booking[]>>;
  handleWizardSubmit(draft: Omit<Booking, "id" | "status" | "createdAt">): Promise<void>;
  handleUpdateBookingStatus(
    id: string,
    status: BookingStatus,
    paymentStatus?: "unpaid" | "paid" | "authorized",
    paymentMethod?: "card" | "paypal" | "cash",
  ): Promise<void>;
  handleRescheduleBooking(id: string, date: string, slot: string): Promise<void>;
  handleCancelBooking(id: string): Promise<void>;

  // Reviews — setReviews exposed for direct review injection
  setReviews: React.Dispatch<React.SetStateAction<Review[]>>;
  setServices: React.Dispatch<React.SetStateAction<Service[]>>;
  handleAddReview(data: Omit<Review, "id" | "date" | "helpfulCount" | "verified">): Promise<void>;
  handleAddReviewDirect(review: Review): void;
  handleIncrementHelpful(id: string): Promise<void>;
  handleDeleteReview(id: string): Promise<void>;
  handleSynchronizeAll(): Promise<void>;

  // Utility
  getAuthErrorMessage(err: unknown): string;
}

// ── Context ───────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

/** Safely read auth context. Returns null when outside <AuthProvider>. */
export function useAuth(): AuthContextValue | null {
  return useContext(AuthContext);
}

// ── Provider ──────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // ── Core state ───────────────────────────────────────────────────────────

  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);

  const [isAdmin, setIsAdmin] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [services, setServices] = useState<Service[]>(SERVICES_DATA);

  // ── Auth listener ─────────────────────────────────────────────────────────
  // Intentionally lean: we only subscribe to auth changes here.
  // validateFirestoreConnection(), fetchReviews, and fetchServices are
  // deferred to PublicApp (the only place that actually needs them) so
  // marketing pages don't trigger unnecessary Firestore reads on every load.

  useEffect(() => {
    // Handle Google redirect result (mobile flow)
    getGoogleRedirectResult().catch((err) =>
      console.error("[Auth] Redirect result error:", err),
    );

    const unsubscribeAuth = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Check custom claims
          let hasAdminClaim = false;
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            if (tokenResult?.claims?.admin === true) hasAdminClaim = true;
          } catch { /* claims unavailable, continue */ }

          const profile = await getUserProfile(firebaseUser.uid);

          if (profile) {
            hasAdminClaim =
              hasAdminClaim ||
              profile.role === "admin" ||
              profile.role === "manager";
            setIsAdmin(hasAdminClaim);

            const userObj: AppUser = {
              uid: firebaseUser.uid,
              name: profile.name || firebaseUser.displayName || "Cliente",
              email: firebaseUser.email || "",
              isAdmin: hasAdminClaim,
              ...profile,
            };
            setCurrentUser(userObj);
            localStorage.setItem("hsh_user", JSON.stringify(userObj));

          } else {
            // New user — create Firestore profile
            const newProfile = {
              uid: firebaseUser.uid,
              name:
                firebaseUser.displayName ||
                firebaseUser.email?.split("@")[0] ||
                "Cliente Premium",
              email: firebaseUser.email || "",
            };
            await saveUserProfile(firebaseUser.uid, newProfile);
            setIsAdmin(hasAdminClaim);

            const userObj: AppUser = {
              uid: firebaseUser.uid,
              name: newProfile.name,
              email: newProfile.email,
              isAdmin: hasAdminClaim,
            };
            setCurrentUser(userObj);
            localStorage.setItem("hsh_user", JSON.stringify(userObj));
          }
        } catch (err) {
          console.error("[Auth] Profile load error:", err);
        }
      } else {
        // Signed out — preserve non-privileged local session
        const saved =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("hsh_user")
            : null;
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setCurrentUser({ ...parsed, isAdmin: false });
            setIsAdmin(false);
          } catch {
            setCurrentUser(null);
            setIsAdmin(false);
          }
        } else {
          setCurrentUser(null);
          setIsAdmin(false);
        }
      }
    });

    return () => unsubscribeAuth();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync bookings whenever the logged-in user changes
  useEffect(() => {
    const load = async () => {
      if (currentUser?.email) {
        try {
          const real = await fetchUserBookings(currentUser.email, currentUser.uid);
          if (real?.length) {
            setBookings(real);
            return;
          }
        } catch (err) {
          console.error("[Auth] Bookings load:", err);
        }
      }
      try {
        const saved =
          typeof localStorage !== "undefined"
            ? localStorage.getItem("hsh_bookings_db")
            : null;
        setBookings(saved ? JSON.parse(saved) : INITIAL_BOOKINGS);
      } catch {
        setBookings(INITIAL_BOOKINGS);
      }
    };
    load();
  }, [currentUser]);

  // ── Auth handlers ─────────────────────────────────────────────────────────

  const handleEmailLogin = async (email: string, password: string) => {
    const user = await signInWithEmail(email, password);
    if (!user) throw new Error("No se pudo iniciar sesión.");
  };

  const handleEmailSignup = async (
    name: string,
    email: string,
    password: string,
  ) => {
    const user = await signUpWithEmail(email, password);
    await saveUserProfile(user.uid, { uid: user.uid, name, email });
  };

  const handleGoogleLogin = async () => {
    try {
      const firebaseUser = await signInWithGooglePopup();
      if (!firebaseUser) return; // redirect flow — auth listener handles it

      let hasAdminClaim = false;
      try {
        const tok = await firebaseUser.getIdTokenResult();
        if (tok?.claims?.admin === true) hasAdminClaim = true;
      } catch { /* ignore */ }

      const profile = await getUserProfile(firebaseUser.uid);
      hasAdminClaim =
        hasAdminClaim ||
        profile?.role === "admin" ||
        profile?.role === "manager";
      setIsAdmin(hasAdminClaim);

      const name =
        profile?.name ||
        firebaseUser.displayName ||
        firebaseUser.email?.split("@")[0] ||
        "Usuario";
      const email = firebaseUser.email || "";
      const profileData = {
        uid: firebaseUser.uid,
        name,
        email,
      };
      await saveUserProfile(firebaseUser.uid, profileData);

      const userObj: AppUser = {
        uid: firebaseUser.uid,
        name,
        email,
        isAdmin: hasAdminClaim,
        ...profileData,
      };
      setCurrentUser(userObj);
      localStorage.setItem("hsh_user", JSON.stringify(userObj));
    } catch (err) {
      throw new Error(getFirebaseAuthErrorMessage(err));
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setBookings(INITIAL_BOOKINGS);
    if (typeof localStorage !== "undefined") {
      localStorage.removeItem("hsh_user");
      localStorage.removeItem("hsh_bookings_db");
    }
    await signOutUser().catch(console.error);
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (!currentUser) return;
    const updated = { ...currentUser, ...updates };
    setCurrentUser(updated);
    localStorage.setItem("hsh_user", JSON.stringify(updated));
    if (currentUser.uid) {
      await saveUserProfile(currentUser.uid, updates);
    }
  };

  // ── Booking handlers ──────────────────────────────────────────────────────

  const handleWizardSubmit = async (
    draft: Omit<Booking, "id" | "status" | "createdAt">,
  ) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ext = draft as any;
    const id = ext._bookingId || `BK-${Math.floor(Math.random() * 90000) + 10000}`;
    const serverSaved: boolean = ext._serverSaved === true;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { _bookingId: _bid, _serverSaved: _ss, ...cleanDraft } = ext;

    const fullBooking: Booking = {
      ...cleanDraft,
      id,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid ?? currentUser?.email ?? "guest",
    };

    if (!serverSaved) {
      await createBookingInFirestore(fullBooking).catch((err) =>
        console.error("[Bookings] Wizard save:", err),
      );
    }

    // Confirmation email (fire-and-forget)
    if (currentUser?.uid) {
      (async () => {
        const { auth } = await import("@grenbee/firebase");
        const firebaseUser = auth.currentUser;
        if (!firebaseUser) return;
        const idToken = await firebaseUser.getIdToken();
        await fetch("/api/notify", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            event: "booking_confirmed",
            bookingId: fullBooking.id,
          }),
        });
      })().catch((err) =>
        console.warn("[Notify] Confirmation email:", err?.message ?? err),
      );
    }

    // Auto-assign staff (fire-and-forget)
    if (currentUser?.uid) {
      autoAssignStaff(fullBooking.id).catch((err) =>
        console.warn("[AutoAssign] Staff:", err?.message ?? err),
      );
    }

    // Recurring plan
    if (
      fullBooking.frequency !== "once" &&
      currentUser?.uid &&
      fullBooking.bookingDate
    ) {
      createRecurringPlanFromBooking({
        bookingId: fullBooking.id,
        userId: currentUser.uid,
        serviceId: fullBooking.serviceId,
        serviceName: fullBooking.serviceName,
        units: fullBooking.units,
        selectedFactors: fullBooking.selectedFactors,
        frequency: fullBooking.frequency as "weekly" | "bi-weekly" | "monthly",
        bookingDate: fullBooking.bookingDate,
        timeSlot: fullBooking.timeSlot,
        address: fullBooking.address,
        notes: fullBooking.notes,
        totalCost: fullBooking.totalCost,
        stripePaymentIntentId: fullBooking.stripePaymentIntentId ?? "",
        customerName: fullBooking.customerName,
        email: fullBooking.email,
        phone: fullBooking.phone,
      }).catch((err) =>
        console.warn("[RecurringPlan] Create:", err?.message ?? err),
      );
    }

    // Lead recovery
    fetch("/api/capture-lead", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: fullBooking.email,
        customerName: fullBooking.customerName,
        _recovered: true,
        _bookingId: fullBooking.id,
      }),
    }).catch(() => { /* non-fatal */ });

    setBookings((prev) => [fullBooking, ...prev]);
  };

  const handleUpdateBookingStatus = async (
    id: string,
    status: BookingStatus,
    paymentStatus?: "unpaid" | "paid" | "authorized",
    paymentMethod?: "card" | "paypal" | "cash",
  ) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id
          ? {
              ...b,
              status,
              ...(paymentStatus !== undefined && { paymentStatus }),
              ...(paymentMethod !== undefined && { paymentMethod }),
            }
          : b,
      ),
    );
    await updateBookingInFirestore(id, {
      status,
      ...(paymentStatus !== undefined && { paymentStatus }),
      ...(paymentMethod !== undefined && { paymentMethod }),
    }).catch((e) => console.error("[Bookings] Status update:", e));
  };

  const handleRescheduleBooking = async (
    id: string,
    date: string,
    slot: string,
  ) => {
    setBookings((prev) =>
      prev.map((b) =>
        b.id === id ? { ...b, bookingDate: date, timeSlot: slot } : b,
      ),
    );
    await updateBookingInFirestore(id, { bookingDate: date, timeSlot: slot }).catch(
      (e) => console.error("[Bookings] Reschedule:", e),
    );
  };

  const handleCancelBooking = async (id: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === id ? { ...b, status: "cancelled" } : b)),
    );
    await updateBookingInFirestore(id, { status: "cancelled" }).catch((e) =>
      console.error("[Bookings] Cancel:", e),
    );
  };

  // ── Review handlers ───────────────────────────────────────────────────────

  const handleAddReview = async (
    data: Omit<Review, "id" | "date" | "helpfulCount" | "verified">,
  ) => {
    const newReview: Review = {
      ...data,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      helpfulCount: 0,
      verified: true,
    };
    setReviews((prev) => [newReview, ...prev]);
    await createReviewInFirestore(newReview).catch((e) =>
      console.error("[Reviews] Create:", e),
    );
  };

  const handleAddReviewDirect = (review: Review) =>
    setReviews((prev) => [review, ...prev]);

  const handleIncrementHelpful = async (id: string) => {
    setReviews((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, helpfulCount: r.helpfulCount + 1 } : r,
      ),
    );
    await incrementReviewHelpfulCount(id).catch((e) =>
      console.error("[Reviews] Helpful:", e),
    );
  };

  const handleDeleteReview = async (id: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== id));
    await deleteReviewFromFirestore(id).catch((e) =>
      console.error("[Reviews] Delete:", e),
    );
  };

  const handleSynchronizeAll = async () => {
    const [liveReviews, liveServices] = await Promise.all([
      fetchReviewsFromFirestore().catch(() => null),
      fetchServicesFromFirestore().catch(() => null),
    ]);
    if (liveReviews?.length) setReviews(liveReviews);
    if (liveServices?.length) setServices(liveServices);
  };

  // ── Context value ─────────────────────────────────────────────────────────

  const value: AuthContextValue = {
    currentUser,
    isAdmin,
    bookings,
    reviews,
    services,
    handleEmailLogin,
    handleEmailSignup,
    handleGoogleLogin,
    handleLogout,
    handleUpdateProfile,
    setBookings,
    handleWizardSubmit,
    handleUpdateBookingStatus,
    handleRescheduleBooking,
    handleCancelBooking,
    setReviews,
    setServices,
    handleAddReview,
    handleAddReviewDirect,
    handleIncrementHelpful,
    handleDeleteReview,
    handleSynchronizeAll,
    getAuthErrorMessage: getFirebaseAuthErrorMessage,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
