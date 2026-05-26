import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import * as Icons from "lucide-react";
import Navbar from "./components/Navbar";
import ServiceCard from "./components/ServiceCard";
import CostEstimator from "./components/CostEstimator";
import BookingWizard, { type WizardBookingParams } from "./components/BookingWizard";
import BookingsTracker from "./components/BookingsTracker";
import ReviewsSection from "./components/ReviewsSection";
import MembershipPlans from "./components/MembershipPlans";
import HeroSection from "./components/HeroSection";
import FeaturesSection from "./components/FeaturesSection";
import TestimonialsSection from "./components/TestimonialsSection";
import TrustSection from "./components/TrustSection";
import CTASection from "./components/CTASection";

// New page-level components for full-screen SEO structures
import AboutSection from "./components/AboutSection";
import BlogSection from "./components/BlogSection";
import MyAccount from "./components/MyAccount";

import { Service, Booking, Review, BookingStatus } from "../shared/types";
import { SERVICES_DATA, INITIAL_BOOKINGS, INITIAL_REVIEWS } from "../shared/data";
import { Language, getInitialLanguage } from "../shared/i18n";
import {
  validateFirestoreConnection,
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
  type UserProfile
} from "../shared/services/firebaseService";

const BEFORE_AFTER_DATA: Record<string, {
  title: string;
  beforeTitle: string;
  afterTitle: string;
  beforeDesc: string;
  afterDesc: string;
  beforeStyle: string;
  afterStyle: string;
  beforeGraphics: string;
  afterGraphics: string;
}> = {
  "house-cleaning": {
    title: "Limpieza de Casa",
    beforeTitle: "Antes (Estado Inicial)",
    afterTitle: "Después (Resplandor GreenServe)",
    beforeDesc: "Residuos de polvo fino en repisas, platos sucios en fregadero, rastros de mascotas en alfombras y grifos opacos.",
    afterDesc: "Encimeras con recubrimiento brillante, pisos higienizados al vacío, vajilla lavada y aroma fresco a pino silvestre.",
    beforeStyle: "from-amber-100 to-amber-200/60 text-stone-700",
    afterStyle: "from-emerald-50 to-emerald-100/70 text-emerald-950",
    beforeGraphics: "📦🍽️ 🕸️ 🏚️",
    afterGraphics: "✨🛁 🍽️ 💎 🏡"
  },
  "tv-installation": {
    title: "Instalación de TV",
    beforeTitle: "Antes (Soporte Manual)",
    afterTitle: "Después (Soporte Nivelado)",
    beforeDesc: "Cables expuestos tipo espagueti colgando, peligro de caída sísmica y ángulo de visión incómodo de cuello.",
    afterDesc: "Soporte ultrarresistente empotrado a postes internos, cables 100% canalizados detrás del muro y nivelación láser perfecta.",
    beforeStyle: "from-red-100 to-amber-100 text-stone-700",
    afterStyle: "from-blue-50 to-sky-100 text-blue-950",
    beforeGraphics: "📺 🔌 ⚠️ 🛠️",
    afterGraphics: "🖥️ ✨ 📡 🎭"
  },
  "lawn-mowing": {
    title: "Cuidado de Césped",
    beforeTitle: "Antes (Maleza Alta)",
    afterTitle: "Después (Perfilado de Precisión)",
    beforeDesc: "Césped de más de 15cm, tréboles invasores bloqueando los aspersores y bordes asimétricos.",
    afterDesc: "Corte uniforme de 5cm, perfilado de bordes sobre acera milimétrico y soplado libre de hojarasca.",
    beforeStyle: "from-yellow-105 to-amber-100 text-stone-700",
    afterStyle: "from-emerald-100 to-green-150 text-emerald-950",
    beforeGraphics: "🌿 🦗 🌾 🍂",
    afterGraphics: "🟢 🏡 ✂️ 🍂 💨"
  },
  "furniture-assembly": {
    title: "Armado de Muebles",
    beforeTitle: "Antes (Cajas Planas)",
    afterTitle: "Después (Estructura Lista)",
    beforeDesc: "140 herrajes metálicos mezclados, folletos de instrucciones sin texto y paneles pesados en el suelo.",
    afterDesc: "Cómoda de 6 cajoneras firme, cajones perfectamente alineados y anclajes discretos de seguridad anticaídas.",
    beforeStyle: "from-gray-150 to-gray-200 text-stone-700",
    afterStyle: "from-orange-50 to-orange-100/80 text-orange-950",
    beforeGraphics: "📦 🔩 📄 🪵",
    afterGraphics: "🧱 🪚 📚 🛠️ 💖"
  },
  "pressure-washing": {
    title: "Lavado a Presión",
    beforeTitle: "Antes (Calzada Negra)",
    afterTitle: "Después (Piedra Virgen)",
    beforeDesc: "Adoquines manchados con aceite de auto antiguo, lodo seco petrificado y moho verde resbaladizo.",
    afterDesc: "Lavado continuo a 3200 PSI con surfactantes biodegradables. Calzada blanca que parece recién pavimentada.",
    beforeStyle: "from-stone-300 to-stone-400/50 text-stone-800",
    afterStyle: "from-cyan-50 to-cyan-100 text-cyan-950",
    beforeGraphics: "🛣️ ⚙️ 🐾 🕸️",
    afterGraphics: "🛣️ ✨ 🧱 💦 💎"
  }
};

const FAQ_DATA = [
  {
    question: "¿Cómo funciona la garantía de satisfacción de GreenServe?",
    answer: "No cobramos nada por adelantado. Una vez finalizado el trabajo en tu domicilio, tu cuadrilla asignada te mostrará el resultado mediante una caminata de revisión final. Solo cuando nos indicas tu total conformidad se realiza el cobro seguro en nuestra pasarela. Si detectas algún detalle físico pendiente, lo corregimos de inmediato sin costo adicional."
  },
  {
    question: "¿Tengo que proporcionar mis propios productos o herramental?",
    answer: "Para nada. Todas nuestras cuadrillas GreenServe llegan en unidades equipadas con herramientas industriales de primer nivel (aspiradoras con filtros HEPA, soportes estructurales de alta gama certificados, detergentes amigables con mascotas e hidrolavadoras de alta presión). Relájate, nosotros nos encargamos."
  },
  {
    question: "¿Es requisito que me encuentre en casa para el servicio?",
    answer: "No es obligatorio. Puedes agendar indicando claves de acceso inteligente, buzones físicos de llaves o delegar la bienvenida al conserje de tu edificio. A través de nuestro Operative Desk, recibirás fotos en tiempo real e hitos de estatus automático para tu tranquilidad."
  },
  {
    question: "¿Cómo y cuándo se realiza el cobro de mi tarjeta?",
    answer: "Validamos tu tarjeta de manera 100% segura usando encriptación bancaria SSL AES-256 para reservar el bloque del técnico. No se cargará ningún centavo hasta que el estatus se marque como completado tras tu confirmación presencial o digital."
  },
  {
    question: "¿Cómo funcionan las suscripciones de mantenimiento?",
    answer: "Ofrecemos planes recurrentes: semanales (-20%), quincenales (-15%) o mensuales (-10%) que aplican el descuento de manera automática a tus cotizaciones instantáneas. Puedes suspender o reprogramar visitas fácilmente sin penalizaciones de permanencia."
  }
];

export default function App() {
  // 1. Core navigation states
  const [activeTab, setActiveTab ] = useState<string>("services");
  const [selectedEstimatorId, setSelectedEstimatorId] = useState<string>("house-cleaning");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('greenbee_language');
      if (stored === 'es' || stored === 'en') return stored;
    }
    return getInitialLanguage();
  });
  
  type AppUser = UserProfile & { isAdmin?: boolean };

  // User Authentication state
  const [currentUser, setCurrentUser] = useState<AppUser | null>(() => {
    try {
      const saved = localStorage.getItem("hsh_user");
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Active Membership State (Persisted)
  const [activeMembership, setActiveMembership] = useState<string | null>(() => {
    try {
      return localStorage.getItem("hsh_membership") || null;
    } catch {
      return null;
    }
  });

  const [bookings, setBookings] = useState<Booking[]>(INITIAL_BOOKINGS);
  const [reviews, setReviews] = useState<Review[]>(INITIAL_REVIEWS);
  const [services, setServices] = useState<Service[]>(SERVICES_DATA);
  const [wizardParams, setWizardParams] = useState<WizardBookingParams | null>(null);

  async function handleWizardSubmit(draft: Omit<Booking, "id" | "status" | "createdAt">) {
    const id = `BK-${Math.floor(Math.random() * 90000) + 10000}`;
    const fullBooking: Booking = {
      ...draft,
      id,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      userId: currentUser?.uid ?? currentUser?.email ?? "guest",
    };
    try {
      await createBookingInFirestore(fullBooking);
    } catch (err) {
      console.error("Failed to save booking to Firestore:", err);
    }
    setBookings((prev) => [fullBooking, ...prev]);
    setWizardParams(null);
    handleTabChange("bookings");
  }

  // Handle language change
  const handleLanguageChange = (newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem('greenbee_language', newLang);
  };

  // Initialize Firebase Connection, Listen to Auth, and load initial reviews
  useEffect(() => {
    // 1. Connection check
    validateFirestoreConnection();

    // 1.5 Check for Google redirect result (for mobile auth flow)
    const checkRedirectResult = async () => {
      try {
        const redirectUser = await getGoogleRedirectResult();
        if (redirectUser) {
          console.log("[v0] Redirect sign-in successful:", redirectUser.email);
          // Auth state change listener will handle the rest
        }
      } catch (err) {
        console.error("[v0] Google redirect error:", err);
      }
    };
    checkRedirectResult();

    // 2. Auth listener
    const unsubscribeAuth = subscribeToAuthChanges(async (firebaseUser) => {
      if (firebaseUser) {
        // Logged into Firebase Auth
        try {
          let hasAdminClaim = false;
          try {
            const tokenResult = await firebaseUser.getIdTokenResult();
            if (tokenResult?.claims && tokenResult.claims.admin === true) {
              hasAdminClaim = true;
            }
          } catch (tokError) {
            console.warn("Could not retrieve custom claims directly from token:", tokError);
          }
          const profile = await getUserProfile(firebaseUser.uid);
          if (profile) {
            hasAdminClaim = hasAdminClaim || profile.role === "admin" || profile.role === "manager";
            setIsAdmin(hasAdminClaim);
            const userObj = {
              uid: firebaseUser.uid,
              name: profile.name || firebaseUser.displayName || "Cliente",
              email: firebaseUser.email || "",
              isAdmin: hasAdminClaim,
              ...profile
            };
            setCurrentUser(userObj);
            localStorage.setItem("hsh_user", JSON.stringify(userObj));
            if (profile.activeMembership) {
              setActiveMembership(profile.activeMembership);
              localStorage.setItem("hsh_membership", profile.activeMembership);
            }
          } else {
            // Document does not exist in users collection, create it
            const newProfile = {
              uid: firebaseUser.uid,
              name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Cliente Premium",
              email: firebaseUser.email || "",
              activeMembership: null
            };
            await saveUserProfile(firebaseUser.uid, newProfile);
            setIsAdmin(hasAdminClaim);
            const userObj = {
              uid: firebaseUser.uid,
              name: newProfile.name,
              email: newProfile.email,
              isAdmin: hasAdminClaim
            };
            setCurrentUser(userObj);
            localStorage.setItem("hsh_user", JSON.stringify(userObj));
          }
        } catch (err) {
          console.error("Error loading user profile:", err);
        }
      } else {
        // Signed out from Firebase, keep only non-privileged local customer session.
        const saved = localStorage.getItem("hsh_user");
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

    // 3. Sync reviews and services on mount
    const loadReviews = async () => {
      try {
        const firestoreReviews = await fetchReviewsFromFirestore();
        if (firestoreReviews && firestoreReviews.length > 0) {
          setReviews(firestoreReviews);
        }
      } catch (err) {
        console.error("Failed to load initial reviews:", err);
      }
    };

    const loadServices = async () => {
      try {
        const firestoreServices = await fetchServicesFromFirestore();
        if (firestoreServices && firestoreServices.length > 0) {
          setServices(firestoreServices);
        }
      } catch (err) {
        console.error("Failed to load initial services:", err);
      }
    };

    loadReviews();
    loadServices();

    return () => {
      unsubscribeAuth();
    };
  }, []);

  // Sync Bookings whenever currentUser updates
  useEffect(() => {
    const loadBookings = async () => {
      if (currentUser?.email) {
        try {
          const realBookings = await fetchUserBookings(currentUser.email, currentUser.uid);
          if (realBookings && realBookings.length > 0) {
            setBookings(realBookings);
          } else {
            // Keep local bookings
            const saved = localStorage.getItem("hsh_bookings_db");
            if (saved) {
              setBookings(JSON.parse(saved));
            } else {
              setBookings(INITIAL_BOOKINGS);
            }
          }
        } catch (err) {
          console.error("Error loading bookings:", err);
        }
      } else {
        const saved = localStorage.getItem("hsh_bookings_db");
        if (saved) {
          setBookings(JSON.parse(saved));
        } else {
          setBookings(INITIAL_BOOKINGS);
        }
      }
    };
    loadBookings();
  }, [currentUser]);

  const handleEmailLogin = async (email: string, password: string): Promise<void> => {
    const firebaseUser = await signInWithEmail(email, password);
    // onAuthStateChanged se encarga del resto al detectar el cambio de sesión
    if (!firebaseUser) throw new Error("No se pudo iniciar sesión.");
  };

  const handleEmailSignup = async (name: string, email: string, password: string): Promise<void> => {
    const firebaseUser = await signUpWithEmail(email, password);
    await saveUserProfile(firebaseUser.uid, { uid: firebaseUser.uid, name, email });
    // onAuthStateChanged carga el perfil al detectar el nuevo usuario
  };

  const handleGoogleLogin = async () => {
    try {
      const firebaseUser = await signInWithGooglePopup();
      
      // If null, it means redirect flow was triggered (on mobile)
      // The auth state change listener will handle the rest after redirect completes
      if (!firebaseUser) {
        console.log("[v0] Redirect flow initiated, waiting for redirect...");
        return;
      }
      
      let hasAdminClaim = false;
      try {
        const tokenResult = await firebaseUser.getIdTokenResult();
        if (tokenResult?.claims && tokenResult.claims.admin === true) {
          hasAdminClaim = true;
        }
      } catch (tokError) {
        console.warn("Could not retrieve custom claims directly from token:", tokError);
      }
      const profile = await getUserProfile(firebaseUser.uid);
      hasAdminClaim = hasAdminClaim || profile?.role === "admin" || profile?.role === "manager";
      setIsAdmin(hasAdminClaim);
      const name = profile?.name || firebaseUser.displayName || firebaseUser.email?.split("@")[0] || "Usuario";
      const email = firebaseUser.email || "";

      const profileData = {
        uid: firebaseUser.uid,
        name,
        email,
        activeMembership: activeMembership || null
      };
      await saveUserProfile(firebaseUser.uid, profileData);

      const userObj = {
        uid: firebaseUser.uid,
        name,
        email,
        isAdmin: hasAdminClaim,
        ...profileData
      };
      setCurrentUser(userObj);
      localStorage.setItem("hsh_user", JSON.stringify(userObj));
    } catch (err) {
      console.error("Google Auth failed:", err);
      // Throw with user-friendly message
      const friendlyMessage = getFirebaseAuthErrorMessage(err);
      throw new Error(friendlyMessage);
    }
  };

  const handleLogout = async () => {
    setCurrentUser(null);
    setIsAdmin(false);
    setBookings(INITIAL_BOOKINGS);
    try {
      localStorage.removeItem("hsh_user");
      localStorage.removeItem("hsh_bookings_db");
      await signOutUser();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateProfile = async (updates: Partial<UserProfile>) => {
    if (currentUser) {
      const updated = { ...currentUser, ...updates };
      setCurrentUser(updated);
      try {
        localStorage.setItem("hsh_user", JSON.stringify(updated));
        if (currentUser.uid) {
          await saveUserProfile(currentUser.uid, updates);
        }
      } catch (e) {
        console.error(e);
        throw e;
      }
    }
  };

  const handleSelectMembership = async (planId: string) => {
    setActiveMembership(planId);
    try {
      localStorage.setItem("hsh_membership", planId);
      if (currentUser?.uid) {
        await saveUserProfile(currentUser.uid, { activeMembership: planId });
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelMembership = async () => {
    setActiveMembership(null);
    try {
      localStorage.removeItem("hsh_membership");
      if (currentUser?.uid) {
        await saveUserProfile(currentUser.uid, { activeMembership: null });
      }
    } catch (e) {
      console.error(e);
    }
  };
  
  // Transition parameters for intermediate booking flow state
  const [bookingParams, setBookingParams] = useState<{
    serviceId: string;
    units: number;
    selectedFactors: { [factorName: string]: { label: string; modifier: number } };
    frequency: 'once' | 'weekly' | 'bi-weekly' | 'monthly';
    totalCost: number;
    originalCost?: number;
    couponCode?: string;
    couponDiscount?: number;
  } | null>(null);

  // Startup before-after showcase category
  const [beforeAfterService, setBeforeAfterService] = useState<string>("house-cleaning");
  const [slidePercent, setSlidePercent] = useState<number>(50);
  // FAQ active index
  const [activeFaq, setActiveFaq] = useState<number | null>(null);

  // Scroll to top on tab change triggers
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    // When moving away or changing, clear intermediate booking form
    if (tabId !== "estimator") {
      setBookingParams(null);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Navigating directly from service card to active estimator pre-set
  const handleLaunchEstimator = (serviceId: string) => {
    setSelectedEstimatorId(serviceId);
    setBookingParams(null); // Reset form state if they start fresh
    setActiveTab("estimator");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Database operations linked to Firebase Firestore
  const handleCreateBooking = async (bookingData: Omit<Booking, "id" | "status" | "createdAt">) => {
    const refCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      ...bookingData,
      id: refCode,
      status: "scheduled",
      createdAt: new Date().toISOString()
    };
    if (currentUser?.uid) {
      newBooking.userId = currentUser.uid;
    }

    setBookings((prev) => [newBooking, ...prev]);
    
    try {
      await createBookingInFirestore(newBooking);
    } catch (e) {
      console.error("Firestore booking write error: ", e);
    }

    setBookingParams(null); // Clear billing state
    setActiveTab("bookings"); // Redirect to the active tracker!
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleUpdateBookingStatus = async (
    bookingId: string, 
    nextStatus: BookingStatus, 
    paymentStatus?: 'unpaid' | 'paid' | 'authorized',
    paymentMethod?: 'card' | 'paypal' | 'cash'
  ) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { 
        ...b, 
        status: nextStatus,
        paymentStatus: paymentStatus !== undefined ? paymentStatus : b.paymentStatus,
        paymentMethod: paymentMethod !== undefined ? paymentMethod : b.paymentMethod
      } : b))
    );

    try {
      await updateBookingInFirestore(bookingId, {
        status: nextStatus,
        ...(paymentStatus !== undefined && { paymentStatus }),
        ...(paymentMethod !== undefined && { paymentMethod }),
      });
    } catch (e) {
      console.error("Firestore booking status update error: ", e);
    }
  };

  const handleRescheduleBooking = async (bookingId: string, nextDate: string, nextSlot: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, bookingDate: nextDate, timeSlot: nextSlot } : b))
    );

    try {
      await updateBookingInFirestore(bookingId, {
        bookingDate: nextDate,
        timeSlot: nextSlot
      });
    } catch (e) {
      console.error("Firestore booking reschedule error: ", e);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    setBookings((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: "cancelled" } : b))
    );

    try {
      await updateBookingInFirestore(bookingId, {
        status: "cancelled"
      });
    } catch (e) {
      console.error("Firestore booking cancel error: ", e);
    }
  };

  const handleAddReview = async (reviewData: Omit<Review, "id" | "date" | "helpfulCount" | "verified">) => {
    const newReview: Review = {
      ...reviewData,
      id: `rev-${Date.now()}`,
      date: new Date().toISOString().split("T")[0],
      helpfulCount: 0,
      verified: true
    };
    setReviews((prev) => [newReview, ...prev]);

    try {
      await createReviewInFirestore(newReview);
    } catch (e) {
      console.error("Firestore review creation error: ", e);
    }
  };

  const handleIncrementHelpful = async (reviewId: string) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, helpfulCount: r.helpfulCount + 1 } : r))
    );

    try {
      await incrementReviewHelpfulCount(reviewId);
    } catch (e) {
      console.error("Firestore helpful increment error: ", e);
    }
  };

  const handleAddReviewDirect = (newReview: Review) => {
    setReviews((prev) => [newReview, ...prev]);
  };

  const handleDeleteReview = async (reviewId: string) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    try {
      await deleteReviewFromFirestore(reviewId);
    } catch (e) {
      console.error("Firestore review deletion error: ", e);
    }
  };

  const handleSynchronizeAll = async () => {
    try {
      const liveReviews = await fetchReviewsFromFirestore();
      if (liveReviews && liveReviews.length > 0) {
        setReviews(liveReviews);
      }
      const liveServices = await fetchServicesFromFirestore();
      if (liveServices && liveServices.length > 0) {
        setServices(liveServices);
      }
    } catch (err) {
      console.error("Failed to sync latest reviews or services: ", err);
    }
  };

  const handleReviewShortcut = (serviceId: string) => {
    setSelectedEstimatorId(serviceId);
    setActiveTab("services");
    // Scroll to the review block element
    setTimeout(() => {
      const el = document.getElementById("reviews-section-panel");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  // Helper arrays for calculating average score
  const serviceStats = (serviceId: string) => {
    const serviceReviews = reviews.filter((r) => r.serviceId === serviceId);
    const avg = serviceReviews.length > 0 
      ? serviceReviews.reduce((sum, r) => sum + r.rating, 0) / serviceReviews.length 
      : 5;
    return { avg, count: serviceReviews.length };
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-gray-50 flex flex-col font-sans antialiased text-gray-800">
      {/* Modern SaaS Operators Bar (Visible ONLY to verified admins) */}
      {isAdmin && (
        <div className="bg-[#0f172a] text-slate-300 text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800 sticky top-0 z-50 select-none shadow-sm transition-all animate-in slide-in-from-top duration-300">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold text-brand uppercase tracking-wider">
              <Icons.Server size={13} className="text-brand animate-pulse" />
              <span>Consola Operativa</span>
            </div>
            <div className="h-4 w-px bg-slate-800"></div>
            <a
              href="/admin"
              className="text-brand hover:text-brand-hover font-black text-[11px] transition-all hover:underline bg-transparent border-none p-0 cursor-pointer text-left flex items-center gap-1.5"
            >
              <Icons.LayoutDashboard size={12} />
              <span>Ingresar al Workspace de Administración</span>
            </a>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-350 hidden sm:inline">Modo Autorizado: <code className="text-brand font-mono">admin=true</code></span>
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-sm shadow-emerald-500/50"></span>
          </div>
        </div>
      )}

      {/* Dynamic Navigation Bar */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        bookingsCount={bookings.filter((b) => b.status !== "completed" && b.status !== "cancelled").length}
        activeMembership={activeMembership}
        currentUser={currentUser}
        onLogout={handleLogout}
        onGoogleLogin={handleGoogleLogin}
        language={language}
        onLanguageChange={handleLanguageChange}
        onEmailLogin={handleEmailLogin}
        onEmailSignup={handleEmailSignup}
        getAuthErrorMessage={getFirebaseAuthErrorMessage}
      />

      {/* Main Container Workspace */}
      <main className="flex-grow pb-16">
        {activeTab === "services" && (
          <div className="space-y-0 animate-in fade-in duration-300">
            {/* Professional Hero Section */}
            <HeroSection
              language={language}
              onBookService={() => handleTabChange("estimator")}
            />

            {/* Features Section */}
            <FeaturesSection language={language} />

            {/* Services Grid */}
            <section className="w-full py-20 md:py-32 bg-white">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="text-center mb-16">
                  <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-950 mb-4 text-balance">
                    {language === 'en' ? 'Our Services' : 'Nuestros Servicios'}
                  </h2>
                  <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
                    {language === 'en'
                      ? 'Choose from our comprehensive range of professional home services'
                      : 'Elige de nuestro completo rango de servicios profesionales para el hogar'}
                  </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                  {services.map((service) => (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onBookClick={() => {
                        setSelectedEstimatorId(service.id);
                        handleTabChange("estimator");
                      }}
                    />
                  ))}
                </div>
              </div>
            </section>

            {/* Testimonials Section */}
            <TestimonialsSection language={language} />

            {/* Trust Section */}
            <TrustSection language={language} />

            {/* CTA Section */}
            <CTASection
              language={language}
              onBrowse={() => handleTabChange("estimator")}
              onContact={() => handleTabChange("about")}
            />
          </div>
        )}


        {/* Tab "account" containing Customer authorized profile operations */}
        {activeTab === "account" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <MyAccount
              currentUser={currentUser}
              onLogout={handleLogout}
              bookings={bookings}
              activeMembership={activeMembership}
              onSelectTab={handleTabChange}
              onUpdateProfile={handleUpdateProfile}
              onEnterAdmin={() => {
                window.location.href = "/admin";
              }}
            />
          </section>
        )}


        {/* Tab "bookings" containing OperationsTracker or Rescheduling */}
        {activeTab === "bookings" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <BookingsTracker
              bookings={bookings}
              onUpdateStatus={handleUpdateBookingStatus}
              onReschedule={handleRescheduleBooking}
              onCancelBooking={handleCancelBooking}
              onWriteReview={handleReviewShortcut}
            />
          </section>
        )}

        {/* Estimator Tab */}
        {activeTab === "estimator" && !wizardParams && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            <div className="space-y-8">
              <div className="text-center space-y-2 mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-gray-950">Instant Cost Calculator</h2>
                <p className="text-gray-600 text-lg">Get accurate pricing for your home service needs</p>
              </div>
              <CostEstimator
                initialServiceId={selectedEstimatorId}
                activeMembership={activeMembership}
                onProceedToBook={(params) => setWizardParams(params)}
                services={services}
              />
            </div>
          </section>
        )}

        {/* Booking Wizard (shown when user proceeds from estimator) */}
        {activeTab === "estimator" && wizardParams && (
          <section className="max-w-7xl mx-auto pb-16">
            <BookingWizard
              bookingParams={wizardParams}
              services={services}
              currentUser={currentUser}
              activeMembership={activeMembership}
              onSubmitBooking={handleWizardSubmit}
              onBack={() => setWizardParams(null)}
            />
          </section>
        )}

        {/* Membership Tab */}
        {activeTab === "membership" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            <div className="space-y-8">
              <div className="text-center space-y-2 mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-gray-950">Premium Membership Plans</h2>
                <p className="text-gray-600 text-lg">Save up to 40% with annual membership</p>
              </div>
              <MembershipPlans 
                activeMembership={activeMembership || null}
                onSelectMembership={(plan) => {
                  setActiveMembership(plan);
                  localStorage.setItem("hsh_membership", plan);
                }}
                onCancelMembership={() => {
                  setActiveMembership(null);
                  localStorage.removeItem("hsh_membership");
                }}
              />
            </div>
          </section>
        )}

        {/* About Tab */}
        {activeTab === "about" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-4xl font-black text-gray-950">About Greenbee</h2>
                <p className="text-gray-600 leading-relaxed">
                  Greenbee is Springfield's trusted platform for professional home services. We connect homeowners with certified, vetted technicians for cleaning, lawn care, TV installation, furniture assembly, and pressure washing.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  With over 500 satisfied customers and a 4.9/5 rating, we're committed to making home service booking simple, transparent, and reliable.
                </p>
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="space-y-1 border-l-4 border-brand pl-4">
                    <p className="text-2xl font-black text-gray-950">500+</p>
                    <p className="text-sm text-gray-600">Happy Customers</p>
                  </div>
                  <div className="space-y-1 border-l-4 border-brand pl-4">
                    <p className="text-2xl font-black text-gray-950">4.9★</p>
                    <p className="text-sm text-gray-600">Average Rating</p>
                  </div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-brand-light to-brand/5 rounded-2xl p-12 text-center space-y-4">
                <div className="text-5xl">🏡</div>
                <p className="text-gray-600">Your home care, perfected</p>
              </div>
            </div>
          </section>
        )}

        {/* Blog Tab */}
        {activeTab === "blog" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            <div className="space-y-12">
              <div className="text-center space-y-2 mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-gray-950">Home Care Tips & Insights</h2>
                <p className="text-gray-600 text-lg">Expert advice for maintaining your home</p>
              </div>
              <div className="grid md:grid-cols-3 gap-8">
                {[
                  { title: "Spring Cleaning Checklist", desc: "Complete guide to preparing your home for spring" },
                  { title: "TV Installation Best Practices", desc: "Tips for safe and professional TV mounting" },
                  { title: "Lawn Care 101", desc: "Seasonal lawn maintenance and care tips" },
                ].map((post, i) => (
                  <div key={i} className="p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-all">
                    <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg mb-4 flex items-center justify-center text-4xl">📝</div>
                    <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
                    <p className="text-sm text-gray-600">{post.desc}</p>
                    <button className="mt-4 text-sm font-bold text-brand hover:text-brand-hover">Read More →</button>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-gray-50 border-t border-gray-100 py-12 text-xs text-gray-500">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 grid grid-cols-1 md:grid-cols-3 gap-10">
          {/* Brand */}
          <div className="space-y-3">
            <div className="flex items-center">
              <span className="text-base font-extrabold text-gray-950 tracking-tight leading-none">
                Green<span className="text-brand">bee</span>
              </span>
            </div>
            <p className="leading-relaxed">
              Professional home services — cleaning, lawn care, TV installation, furniture assembly, pressure washing, and wall mounting — booked in minutes.
            </p>
            <p className="text-[11px] text-gray-400">
              © {new Date().getFullYear()} Greenbee. All rights reserved.
            </p>
            {isAdmin && (
              <a
                href="/admin"
                className="inline-flex items-center gap-1 text-[11px] text-gray-400 hover:text-emerald-600 font-medium transition-colors"
              >
                <Icons.Settings size={10} />
                Admin Console
              </a>
            )}
          </div>

          {/* Services */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 uppercase tracking-widest text-[10px]">Services</h4>
            <ul className="space-y-1.5">
              {["House Cleaning", "Lawn Care", "TV Installation", "Furniture Assembly", "Pressure Washing", "Wall Mounting"].map((s) => (
                <li key={s} className="flex items-center gap-1.5">
                  <Icons.ChevronRight size={10} className="text-emerald-400 shrink-0" />
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Links */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-700 uppercase tracking-widest text-[10px]">Company</h4>
            <ul className="space-y-1.5">
              <li><Link to="/areas" className="hover:text-emerald-600 transition-colors">Coverage Areas</Link></li>
              <li><Link to="/faq" className="hover:text-emerald-600 transition-colors">FAQ</Link></li>
              <li><Link to="/contact" className="hover:text-emerald-600 transition-colors">Contact Us</Link></li>
            </ul>
            <h4 className="font-semibold text-gray-700 uppercase tracking-widest text-[10px] pt-2">Legal</h4>
            <ul className="space-y-1.5">
              <li><Link to="/terms" className="hover:text-emerald-600 transition-colors">Terms of Service</Link></li>
              <li><Link to="/privacy" className="hover:text-emerald-600 transition-colors">Privacy Policy</Link></li>
              <li><Link to="/cancellation" className="hover:text-emerald-600 transition-colors">Cancellation Policy</Link></li>
              <li><Link to="/guarantee" className="hover:text-emerald-600 transition-colors">Satisfaction Guarantee</Link></li>
              <li><Link to="/payment-policy" className="hover:text-emerald-600 transition-colors">Payment Policy</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
