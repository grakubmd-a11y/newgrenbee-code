import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import Navbar from "./components/Navbar";
import ServiceCard from "./components/ServiceCard";
import CostEstimator from "./components/CostEstimator";
import BookingForm from "./components/BookingForm";
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
  signOutUser,
  getGoogleRedirectResult,
  getFirebaseAuthErrorMessage
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
  
  // User Authentication state
  const [currentUser, setCurrentUser] = useState<{ uid?: string; email: string; name: string; isAdmin?: boolean } | null>(() => {
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

  // Fallback direct update for mock or email-only sign-in
  const handleLogin = (name: string, email: string) => {
    const user = { name, email, isAdmin: false };
    setCurrentUser(user);
    setIsAdmin(false);
    try {
      localStorage.setItem("hsh_user", JSON.stringify(user));
    } catch (e) {
      console.error(e);
    }
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
    try {
      localStorage.removeItem("hsh_user");
      await signOutUser();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateUser = async (updatedName: string) => {
    if (currentUser) {
      const updated = { ...currentUser, name: updatedName };
      setCurrentUser(updated);
      try {
        localStorage.setItem("hsh_user", JSON.stringify(updated));
        if (currentUser.uid) {
          await saveUserProfile(currentUser.uid, { name: updatedName });
        }
      } catch (e) {
        console.error(e);
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
        onLogin={handleLogin}
        onLogout={handleLogout}
        onGoogleLogin={handleGoogleLogin}
        language={language}
        onLanguageChange={handleLanguageChange}
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
                      onSelectService={() => {
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
        {activeTab === "estimator" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
            <div className="space-y-8">
              <div className="text-center space-y-2 mb-12">
                <h2 className="text-3xl md:text-4xl font-black text-gray-950">Instant Cost Calculator</h2>
                <p className="text-gray-600 text-lg">Get accurate pricing for your home service needs</p>
              </div>
              <CostEstimator
                selectedEstimatorId={selectedEstimatorId}
                onSelectEstimatorId={setSelectedEstimatorId}
                onBook={(estimatorId, params) => {
                  const newBooking: Booking = {
                    id: `booking-${Date.now()}`,
                    serviceId: estimatorId,
                    customerName: currentUser?.name || "Guest",
                    customerEmail: currentUser?.email || "",
                    bookingDate: new Date(),
                    status: "pending",
                    notes: `Service: ${params.service}, Area: ${params.sqft}`,
                    totalCost: params.cost,
                  };
                  setBookings([newBooking, ...bookings]);
                  setActiveTab("bookings");
                }}
              />
            </div>
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
              <MembershipPlans onSelectPlan={(plan) => {
                setActiveMembership(plan);
                localStorage.setItem("hsh_membership", plan);
              }} />
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

      {/* Structured Footer */}
      <footer className="bg-white border-t border-gray-100 py-12 text-xs text-gray-500 relative select-none">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          <div className="md:col-span-4 space-y-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-brand-light text-brand">
                <Icons.Home size={16} strokeWidth={2.5} />
              </div>
              <span className="text-base font-bold text-gray-900 tracking-tight">
                HomeServices<span className="text-brand">Hub</span>
              </span>
            </div>
            <p className="leading-relaxed">
              Springfield's premier localized operations platform providing high-integrity house cleaning, commercial pressure washing, electrical tv alignment mounting, landscaping garden care, and furniture assembly technicians.
            </p>
            <p className="text-[10px] text-gray-400">
              © {new Date().getFullYear()} Home Services Hub Springfield. All rights reserved.
            </p>
            {isAdmin && (
              <div className="pt-2">
                <a
                  href="/admin"
                  className="text-[10px] text-gray-400 hover:text-brand font-medium transition-colors cursor-pointer flex items-center gap-1 bg-transparent border-none p-0 outline-none animate-in fade-in duration-200"
                >
                  <Icons.Settings size={10} />
                  <span>Acceso Consola de Administración</span>
                </a>
              </div>
            )}
          </div>

          <div className="md:col-span-4 space-y-3">
            <h4 className="font-bold text-gray-900 tracking-wider text-[10px] uppercase">Service Offerings Code list</h4>
            <ul className="space-y-1.5 font-medium">
              <li>• Residential House Dusting & Deep Sanitize Cleaning</li>
              <li>• Wall bracket placement & electrical wire concealment</li>
              <li>• Side-cutter edge trimming and power weed mowing</li>
              <li>• Heavy wood dresser and bunk-bed flat-pack assembly</li>
              <li>• Commercial hot water driveway oil stains extraction</li>
            </ul>
          </div>

          <div className="md:col-span-4 space-y-3">
            <h4 className="font-bold text-gray-900 tracking-wider text-[10px] uppercase">Springfield Operations Office</h4>
            <div className="space-y-1">
              <p className="font-bold text-gray-800">Springfield HQ Office block:</p>
              <p>744 Concord Boulevard, Suite 500, Springfield, IL</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-800">Support Hours:</p>
              <p>Monday - Sunday (7:00 AM - 9:00 PM CST)</p>
            </div>
            <div className="space-y-1">
              <p className="font-bold text-gray-800 flex items-center gap-1">
                <Icons.Sparkles size={11} className="text-brand" />
                <span>PCI Security Guarantee</span>
              </p>
              <p>Fully compliant SSL 256-Bit e-cart validation routing.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
