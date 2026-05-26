import React, { useState, useEffect } from "react";
import * as Icons from "lucide-react";
import Navbar from "./components/Navbar";
import ServiceCard from "./components/ServiceCard";
import CostEstimator from "./components/CostEstimator";
import BookingForm from "./components/BookingForm";
import BookingsTracker from "./components/BookingsTracker";
import ReviewsSection from "./components/ReviewsSection";
import MembershipPlans from "./components/MembershipPlans";

// New page-level components for full-screen SEO structures
import AboutSection from "./components/AboutSection";
import BlogSection from "./components/BlogSection";
import MyAccount from "./components/MyAccount";

import { Service, Booking, Review, BookingStatus } from "../shared/types";
import { SERVICES_DATA, INITIAL_BOOKINGS, INITIAL_REVIEWS } from "../shared/data";
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
  signOutUser
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

  // Initialize Firebase Connection, Listen to Auth, and load initial reviews
  useEffect(() => {
    // 1. Connection check
    validateFirestoreConnection();

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
      if (firebaseUser) {
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
      }
    } catch (err) {
      console.error("Google Auth failed:", err);
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
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans antialiased text-gray-800">
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
      />

      {/* Main Container Workspace */}
      <main className="flex-grow pb-16">
        {activeTab === "services" && (
          <div className="space-y-16 animate-in fade-in duration-300">
            {/* Stunning High-Contrast Hero Header Section with Dotted Grid Pattern */}
            <section className="relative overflow-hidden bg-white border-b border-gray-100 py-16 md:py-24 bg-grid-pattern">
              {/* Premium Background Vector Gradients */}
              <div className="absolute inset-0 bg-radial-gradient(at 100% 0%, #0EAD6B/5 0px, transparent 50%) opacity-80 pointer-events-none"></div>
              <div className="absolute -top-12 -left-12 h-80 w-80 rounded-full bg-brand-light/40 filter blur-3xl pointer-events-none"></div>
              
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center space-y-7">
                <span className="text-[10px] text-brand font-black tracking-widest uppercase bg-brand-light px-3.5 py-1.5 rounded-full select-none inline-flex items-center gap-1.5 border border-brand/20">
                  <Icons.Sparkles size={12} className="text-brand animate-pulse" />
                  <span>Red Operativa N°1 en Springfield e Illinois</span>
                </span>
                
                <h1 className="text-4xl sm:text-6xl font-black text-gray-950 tracking-tight leading-none max-w-4xl mx-auto font-sans">
                  Servicios de Hogar Premium <span className="text-brand relative inline-block">
                    en Tiempo Real
                    <span className="absolute bottom-1.5 left-0 w-full h-1 bg-brand-200/60 -z-10 rounded-full"></span>
                  </span> y Cotización Inmediata
                </h1>
                
                <p className="text-sm sm:text-lg text-gray-600 max-w-2xl mx-auto leading-relaxed font-medium">
                  Obtén tarifas exactas y asiste de forma simulada al avance automático de tu cuadrilla. Limpieza, montaje de TV, mantenimiento de césped y lavado a presión reservado en 90 segundos. Sin depósitos previos.
                </p>

                {/* Short action CTA buttons */}
                <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-3">
                  <button
                    onClick={() => handleTabChange("estimator")}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-lg shadow-brand/10 hover:shadow-brand/20 transition-all hover:-translate-y-0.5 cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span>Cotizador Inteligente Al Instante</span>
                    <Icons.Calculator size={16} />
                  </button>
                  <button
                    onClick={() => handleTabChange("bookings")}
                    className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white hover:bg-gray-50 text-gray-800 text-sm font-semibold border border-gray-250 shadow-sm hover:shadow-md transition-all hover:-translate-y-0.5 cursor-pointer inline-flex items-center justify-center gap-2"
                  >
                    <span>Tablero de Operaciones Activas</span>
                    <Icons.Truck size={16} className="text-brand" />
                  </button>
                </div>

                {/* Company trust stats bar */}
                <div className="pt-10 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-5xl mx-auto border-t border-gray-150/50 mt-12 bg-white/60 p-5 rounded-2xl backdrop-blur-xs shadow-xs">
                  <div className="text-center font-semibold">
                    <span className="text-2xl sm:text-3xl font-black text-gray-950">90 Seg</span>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider mt-1">Reserva Completada</p>
                  </div>
                  <div className="text-center font-semibold border-l border-gray-100">
                    <span className="text-2xl sm:text-3xl font-black text-brand">4.9/5 ★</span>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider mt-1">Puntuación Clientes</p>
                  </div>
                  <div className="text-center font-semibold border-l border-gray-100">
                    <span className="text-2xl sm:text-3xl font-black text-gray-950">100%</span>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider mt-1">Técnicos Certificados</p>
                  </div>
                  <div className="text-center font-semibold border-l border-gray-100">
                    <span className="text-2xl sm:text-3xl font-black text-emerald-600">0%</span>
                    <p className="text-[10px] text-gray-400 uppercase font-black tracking-wider mt-1">Anticipos Exigidos</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Elite Startup Brand Trust Section */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-4">
              <p className="text-xxs font-black tracking-widest uppercase text-gray-400">
                La Plataforma de Confianza en las Mejores Comunidades de Springfield
              </p>
              <div className="flex flex-wrap justify-center items-center gap-x-8 gap-y-4 opacity-50 select-none pb-4">
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-gray-700 text-sm">
                  <Icons.Home size={16} className="text-gray-400" />
                  <span>Aurora Crest Residia</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-gray-700 text-sm">
                  <Icons.Sparkles size={16} className="text-gray-400" />
                  <span>Grand Plaza Club</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-gray-700 text-sm">
                  <Icons.MapPin size={16} className="text-gray-400" />
                  <span>Lincoln Park Estates</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-gray-700 text-sm">
                  <Icons.Anchor size={16} className="text-gray-400" />
                  <span>Springfield North Association</span>
                </div>
                <div className="flex items-center gap-1.5 font-bold tracking-tight text-gray-700 text-sm">
                  <Icons.Building2 size={16} className="text-gray-400" />
                  <span>Covenant Tower Properties</span>
                </div>
              </div>
            </section>

            {/* Core Services Grid Row */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100/60 pt-12">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10 text-left">
                <div>
                  <h2 className="text-2xl font-extrabold text-gray-950 tracking-tight font-sans">Nuestros Cinco Sectores Premium</h2>
                  <p className="text-xs text-gray-500 mt-1 max-w-xl">
                    Especificaciones detalladas, tarifas por unidad y cálculos transparentes al instante. Elige una de nuestras áreas de especialidad para iniciar.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 font-bold px-3 py-1 rounded-lg flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span>Reservas En Línea Disponibles</span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {services.map((service) => {
                  const stats = serviceStats(service.id);
                  return (
                    <ServiceCard
                      key={service.id}
                      service={service}
                      onBookClick={handleLaunchEstimator}
                      avgRating={stats.avg}
                      reviewsCount={stats.count}
                    />
                  );
                })}
              </div>
            </section>

            {/* Interactive Before & After Showcase Tool (The Ultimate Startup Feature) */}
            <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
              <div className="bg-slate-900 text-white rounded-3xl p-6 md:p-10 shadow-xl relative overflow-hidden">
                {/* Visual Accent */}
                <div className="absolute -right-20 -bottom-20 h-72 w-72 rounded-full bg-brand/10 filter blur-[90px] pointer-events-none"></div>
                <div className="absolute top-0 left-0 bg-grid-pattern opacity-5 w-full h-full pointer-events-none"></div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
                  <div className="lg:col-span-5 text-left space-y-5">
                    <div className="inline-flex items-center gap-1.5 bg-brand/10 border border-brand/20 text-brand text-[9px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                      <Icons.TrendingUp size={11} />
                      <span>Estándar GreenServe Verified</span>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-black tracking-tight font-sans">
                      Compara Nuestra Calidad Visual
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed font-normal">
                      Sabemos que un trabajo perfecto marca la diferencia en tu felicidad de vuelta a casa. Haz clic en las categorías abajo y arrastra el slider interactivo para ver con qué dedicación trabajan nuestros técnicos autorizados.
                    </p>

                    {/* Selector Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {Object.entries(BEFORE_AFTER_DATA).map(([id, item]) => (
                        <button
                          key={id}
                          type="button"
                          onClick={() => {
                            setBeforeAfterService(id);
                            setSlidePercent(50);
                          }}
                          className={`px-3 py-1.5 rounded-xl text-[11px] font-black transition-all cursor-pointer ${
                            beforeAfterService === id
                              ? "bg-brand text-white shadow-sm shadow-brand/20"
                              : "bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white"
                          }`}
                        >
                          {item.title}
                        </button>
                      ))}
                    </div>
                    
                    <div className="pt-2">
                      <p className="text-[10px] text-slate-400 italic">
                        * Representación visual simplificada de los reportes entregados en el panel de control.
                      </p>
                    </div>
                  </div>

                  {/* The interactive sliding card */}
                  <div className="lg:col-span-7 flex flex-col items-center">
                    <span className="text-[10px] text-brand font-bold mb-2 flex items-center gap-1 font-mono uppercase">
                      Desliza a la izquierda o derecha <Icons.ArrowRight size={10} className="animate-pulse" />
                    </span>
                    
                    {(() => {
                      const data = BEFORE_AFTER_DATA[beforeAfterService];
                      if (!data) return null;
                      return (
                        <div className="w-full max-w-md space-y-4">
                          <div className="w-full aspect-video rounded-2xl relative overflow-hidden border border-slate-800 shadow-2xl bg-slate-950 select-none">
                            
                            {/* BEFORE LAYER (Background) */}
                            <div className={`absolute inset-0 bg-gradient-to-br ${data.beforeStyle} p-6 flex flex-col justify-between text-left`}>
                              <div className="text-stone-500 font-mono text-[9px] font-extrabold uppercase tracking-widest bg-white/50 px-2 py-0.5 rounded-md inline-block self-start">
                                {data.beforeTitle}
                              </div>
                              <div className="text-center text-4xl py-4 select-none filter blur-[0.5px]">
                                {data.beforeGraphics}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-xs select-none">Detalles del Desgaste:</h4>
                                <p className="text-[10px] leading-relaxed opacity-90">{data.beforeDesc}</p>
                              </div>
                            </div>

                            {/* AFTER LAYER (Clip-pathed Foreground) */}
                            <div 
                              className={`absolute inset-0 bg-gradient-to-br ${data.afterStyle} p-6 flex flex-col justify-between text-left transition-all duration-75`}
                              style={{ clipPath: `inset(0 ${100 - slidePercent}% 0 0)` }}
                            >
                              <div className="text-brand font-mono text-[9px] font-extrabold uppercase tracking-widest bg-brand-light px-2 py-0.5 rounded-md inline-block self-start border border-brand/20">
                                {data.afterTitle}
                              </div>
                              <div className="text-center text-4xl py-4 select-none">
                                {data.afterGraphics}
                              </div>
                              <div className="space-y-1">
                                <h4 className="font-bold text-xs text-brand select-none">Estándar GreenServe Listo:</h4>
                                <p className="text-[10px] leading-relaxed text-gray-700 font-medium">{data.afterDesc}</p>
                              </div>
                            </div>

                            {/* Range slider input overlaid */}
                            <input 
                              type="range" 
                              min="0" 
                              max="100" 
                              value={slidePercent}
                              onChange={(e) => setSlidePercent(Number(e.target.value))}
                              className="absolute inset-0 w-full h-full opacity-0 cursor-ew-resize z-30"
                            />

                            {/* Sliding bar separator */}
                            <div 
                              className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none z-20"
                              style={{ left: `${slidePercent}%` }}
                            >
                              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand text-white shadow-xl flex items-center justify-center font-bold text-xs border-2 border-white select-none">
                                ↔
                              </div>
                            </div>

                          </div>

                          {/* Descriptive comparison bar below */}
                          <div className="flex items-center justify-between text-[11px] px-2 font-semibold">
                            <span className="text-amber-500 flex items-center gap-1">
                              <Icons.X size={12} /> Desorden Inicial ({100 - slidePercent}%)
                            </span>
                            <span className="text-slate-400 font-mono text-[10px]">
                              Slider: {slidePercent}% Revelado
                            </span>
                            <span className="text-brand flex items-center gap-1">
                              <Icons.CheckCircle size={12} /> Satisfacción GreenServe ({slidePercent}%)
                            </span>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </section>

            {/* Simulated Work-Process Stepper (YC startup style) */}
            <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10 border-t border-gray-100 pt-12">
              <div className="text-center max-w-2xl mx-auto space-y-2">
                <span className="text-[10px] bg-slate-100 text-slate-800 font-extrabold tracking-widest uppercase px-3 py-1 rounded-full">
                  Tecnología y Operaciones Integradas
                </span>
                <h3 className="text-2xl font-black text-gray-990 font-sans">
                  Reserva en Segundos. Sigue en Tiempo Real sin Esfuerzo.
                </h3>
                <p className="text-xs text-gray-500">
                  Hemos rediseñado todo el flujo tradicional de reservación de servicios locales para que tengas control absoluto directamente desde tu pantalla de inicio.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center space-y-3 shrink-0 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-7 w-7 rounded-lg bg-brand text-white flex items-center justify-center text-xs font-black font-mono">
                    1
                  </div>
                  <div className="mx-auto h-12 w-12 rounded-xl bg-brand-light flex items-center justify-center text-brand mt-2">
                    <Icons.Calculator size={20} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Cotización milimétrica instantánea</h4>
                  <p className="text-xs text-gray-500 leading-normal">
                    Ingresa tus habitaciones u objetos en el estimador. Agrega coberturas como mascota o tipo profundo y obtén un precio fijo al centavo.
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center space-y-3 shrink-0 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-7 w-7 rounded-lg bg-brand text-white flex items-center justify-center text-xs font-black font-mono">
                    2
                  </div>
                  <div className="mx-auto h-12 w-12 rounded-xl bg-brand-light flex items-center justify-center text-brand mt-2">
                    <Icons.Activity size={20} className="animate-pulse" />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900 font-sans">Secuencia de Técnico Autónoma</h4>
                  <p className="text-xs text-gray-500 leading-normal">
                    ¿No quieres cliquear botones sin parar? Nuestro despachador autónomo simula el traslado de tu cuadrilla (Camino ➔ Trabajando ➔ Finalizado) de forma automática. ¡Tú solo relájate!
                  </p>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center space-y-3 shrink-0 relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 h-7 w-7 rounded-lg bg-brand text-white flex items-center justify-center text-xs font-black font-mono">
                    3
                  </div>
                  <div className="mx-auto h-12 w-12 rounded-xl bg-brand-light flex items-center justify-center text-brand mt-2">
                    <Icons.ShieldCheck size={20} />
                  </div>
                  <h4 className="font-bold text-sm text-gray-900">Garantía de Cero Depósitos</h4>
                  <p className="text-xs text-gray-500 leading-normal">
                    Nunca cobramos antes del servicio. Una vez que el técnico declare el trabajo finalizado en la app, tú simplemente confirmas tu entera satisfacción para procesar el cobro.
                  </p>
                </div>
              </div>
            </section>

            {/* Interactive FAQs Accordion Section */}
            <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100 pt-14 text-left space-y-8">
              <div className="text-center space-y-2">
                <h3 className="text-2xl font-black text-gray-950 font-sans">Preguntas Frecuentes</h3>
                <p className="text-xs text-gray-500">
                  Todo lo que necesitas saber acerca de los estándares, garantías de seguridad y facturas de GreenServe.
                </p>
              </div>

              <div className="space-y-3">
                {FAQ_DATA.map((faq, idx) => {
                  const isOpen = activeFaq === idx;
                  return (
                    <div 
                      key={idx}
                      className="bg-white rounded-xl border border-gray-150/60 overflow-hidden transition-all duration-250 shadow-xxs"
                    >
                      <button
                        type="button"
                        onClick={() => setActiveFaq(isOpen ? null : idx)}
                        className="w-full flex items-center justify-between p-4 bg-transparent border-none text-left font-sans cursor-pointer focus:outline-none focus:bg-gray-50/50"
                      >
                        <span className="font-bold text-xs sm:text-sm text-gray-850 select-none">
                          {faq.question}
                        </span>
                        <div className="h-5 w-5 rounded-full bg-slate-50 flex items-center justify-center border border-gray-100 text-gray-500 shrink-0">
                          {isOpen ? <Icons.ChevronUp size={13} /> : <Icons.ChevronDown size={13} />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="px-4 pb-4 pt-1 animate-in slide-in-from-top-1 duration-150 border-t border-gray-50">
                          <p className="text-xs sm:text-sm text-gray-600 leading-relaxed font-normal">
                            {faq.answer}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Reviews list section anchor (Original verified review logs) */}
            <section id="reviews-section-panel" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 border-t border-gray-100 pt-12">
              <ReviewsSection
                reviews={reviews}
                services={services}
                onAddReview={handleAddReview}
                onIncrementHelpful={handleIncrementHelpful}
                selectedServiceId={selectedEstimatorId}
                onSelectService={setSelectedEstimatorId}
              />
            </section>
          </div>
        )}

        {/* Tab "estimator" containing CostEstimator or BookingForm */}
        {activeTab === "estimator" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            {bookingParams ? (
              <BookingForm
                bookingParams={bookingParams}
                services={services}
                onBack={() => setBookingParams(null)}
                onSubmitBooking={handleCreateBooking}
              />
            ) : (
              <CostEstimator
                initialServiceId={selectedEstimatorId}
                activeMembership={activeMembership}
                services={services}
                onProceedToBook={(params) => setBookingParams(params)}
              />
            )}
          </section>
        )}

        {/* Tab "membership" containing the membership programs pricing table */}
        {activeTab === "membership" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 animate-in fade-in duration-300">
            <MembershipPlans
              activeMembership={activeMembership}
              onSelectMembership={handleSelectMembership}
              onCancelMembership={handleCancelMembership}
            />
          </section>
        )}

        {/* Tab "about" containing About Us and Eco Standards */}
        {activeTab === "about" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <AboutSection onSelectTab={handleTabChange} />
          </section>
        )}

        {/* Tab "blog" containing Interactive SEO-friendly blog */}
        {activeTab === "blog" && (
          <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
            <BlogSection 
              onSelectTab={handleTabChange} 
              onSelectServiceEstimator={(serviceId) => {
                setSelectedEstimatorId(serviceId);
                handleTabChange("estimator");
              }}
            />
          </section>
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
              onUpdateUser={handleUpdateUser}
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
