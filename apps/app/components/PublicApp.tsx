"use client";
/**
 * PublicApp — contenido de las rutas /book, /account, /bookings, /estimate.
 *
 * Ya NO tiene Navbar ni footer propios: los provee (app)/layout.tsx (AppShell).
 * Ya NO gestiona estado de auth: lo lee de AuthContext vía useAuth().
 *
 * Lo que sí gestiona:
 *   - navegación entre tabs (URL-driven)
 *   - wizard params y estados de UI locales
 *   - handleCreateBooking (única operación de booking que también navega)
 */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as Icons from "lucide-react";
import ServiceCard from "./ServiceCard";
import CostEstimator from "./CostEstimator";
import BookingWizard, { type WizardBookingParams } from "./BookingWizard";
import BookingsTracker from "./BookingsTracker";
import ReviewsSection from "./ReviewsSection";
import PlansPage from "./PlansPage";
import HeroSection from "./HeroSection";
import FeaturesSection from "./FeaturesSection";
import TestimonialsSection from "./TestimonialsSection";
import TrustSection from "./TrustSection";
import CTASection from "./CTASection";
import AboutSection from "./AboutSection";
import BlogSection from "./BlogSection";
import MyAccount from "./MyAccount";

import { usePathname, useRouter } from "next/navigation";
import { Booking } from "@grenbee/types";
import {
  createBookingInFirestore,
  validateFirestoreConnection,
  fetchReviewsFromFirestore,
  fetchServicesFromFirestore,
} from "@grenbee/firebase/services";
import { SERVICES_DATA, INITIAL_BOOKINGS } from "@grenbee/config";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import { useSiteSettings } from "@grenbee/firebase/contexts";

// ── Helpers ───────────────────────────────────────────────────────────────────

const TAB_TO_PATH: Record<string, string> = {
  estimator: "/book",
  bookings:  "/bookings",
  account:   "/account",
};

function getInitialTab(pathname: string | null): string {
  if (!pathname) return "services";
  if (pathname === "/book" || pathname === "/estimate") return "estimator";
  if (pathname === "/bookings") return "bookings";
  if (pathname === "/account") return "account";
  return "services";
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function PublicApp() {
  const pathname     = usePathname();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { t } = useTranslation();
  const auth         = useAuth();
  const siteSettings = useSiteSettings();

  // Auth + data from context
  const currentUser     = auth?.currentUser     ?? null;
  const bookings        = auth?.bookings        ?? INITIAL_BOOKINGS;
  const reviews         = auth?.reviews         ?? [];
  const setBookings     = auth?.setBookings;

  // Filter SERVICES_DATA by admin-controlled active list
  const visibleServices = SERVICES_DATA.filter(s =>
    siteSettings.activeServiceIds.includes(s.id)
  );

  // Local UI state
  const [activeTab, setActiveTab] = useState<string>(() => getInitialTab(pathname));
  // useSearchParams() is SSR-safe and reads ?service= synchronously on first
  // render (both server and client), so there's no flash of "house-cleaning".
  // The parent page wraps this component in <Suspense> as required by Next.js.
  const [selectedEstimatorId, setSelectedEstimatorId] = useState<string>(
    searchParams.get("service") ?? "house-cleaning"
  );
  const [wizardParams, setWizardParams] = useState<WizardBookingParams | null>(() => {
    try {
      const stored = sessionStorage.getItem("gbee_wizard_params");
      if (stored) {
        sessionStorage.removeItem("gbee_wizard_params");
        return JSON.parse(stored) as WizardBookingParams;
      }
    } catch { /* ignore */ }
    return null;
  });

  const [bookingParams, setBookingParams] = useState<{
    serviceId: string;
    units: number;
    selectedFactors: { [factorName: string]: { label: string; modifier: number } };
    frequency: "once" | "weekly" | "bi-weekly" | "monthly";
    totalCost: number;
    originalCost?: number;
    couponCode?: string;
    couponDiscount?: number;
  } | null>(null);

  // Keep activeTab in sync when the user navigates directly via URL
  useEffect(() => {
    const tab = getInitialTab(pathname);
    setActiveTab(tab);
  }, [pathname]);

  // Load reviews, services, and verify Firestore only when PublicApp mounts
  useEffect(() => {
    validateFirestoreConnection();

    if (auth?.setReviews) {
      fetchReviewsFromFirestore()
        .then((r) => { if (r?.length) auth.setReviews(r); })
        .catch((err) => console.error("[PublicApp] Reviews load:", err));
    }

    if (auth?.setServices) {
      fetchServicesFromFirestore()
        .then((s) => { if (s?.length) auth.setServices(s); })
        .catch((err) => console.error("[PublicApp] Services load:", err));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Navigation ────────────────────────────────────────────────────────────

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    if (tabId !== "estimator") setBookingParams(null);
    const path = TAB_TO_PATH[tabId];
    if (path) router.push(path);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLaunchEstimator = (serviceId: string) => {
    setSelectedEstimatorId(serviceId);
    setBookingParams(null);
    handleTabChange("estimator");
  };

  // ── Create booking (only handler that also navigates) ─────────────────────

  const handleCreateBooking = async (
    bookingData: Omit<Booking, "id" | "status" | "createdAt">,
  ) => {
    const refCode = `BK-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: Booking = {
      ...bookingData,
      id: refCode,
      status: "scheduled",
      createdAt: new Date().toISOString(),
      ...(currentUser?.uid && { userId: currentUser.uid }),
    };

    // Optimistic update
    if (setBookings) {
      setBookings((prev) => [newBooking, ...prev]);
    }

    try {
      await createBookingInFirestore(newBooking);
    } catch (e) {
      console.error("[PublicApp] createBooking Firestore error:", e);
    }

    setBookingParams(null);
    handleTabChange("bookings");
  };

  // ── Rebook — repeat a completed booking with same service pre-selected ────

  const handleRebook = (booking: Booking) => {
    // Pre-fill the estimator with the same service, then optionally
    // inject the previous booking's wizard params so user just picks a date.
    setSelectedEstimatorId(booking.serviceId);
    setWizardParams(null); // clear any stale wizard; user will go through estimator
    // Store prior booking details so CostEstimator can pre-select units/factors
    // via sessionStorage (non-breaking: estimator ignores missing keys)
    try {
      sessionStorage.setItem(
        "gbee_rebook_hint",
        JSON.stringify({
          serviceId:       booking.serviceId,
          units:           booking.units,
          selectedFactors: booking.selectedFactors,
          frequency:       booking.frequency,
          address:         booking.address,
          phone:           booking.phone,
          customerName:    booking.customerName,
          email:           booking.email,
        }),
      );
    } catch { /* ignore storage errors */ }
    handleTabChange("estimator");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ── Review shortcut ───────────────────────────────────────────────────────

  const handleReviewShortcut = (serviceId: string) => {
    setSelectedEstimatorId(serviceId);
    setActiveTab("services");
    setTimeout(() => {
      document
        .getElementById("reviews-section-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 150);
  };

  // ── Stats helper ──────────────────────────────────────────────────────────

  const serviceStats = (serviceId: string) => {
    const sr = reviews.filter((r) => r.serviceId === serviceId);
    const avg =
      sr.length > 0 ? sr.reduce((sum, r) => sum + r.rating, 0) / sr.length : 5;
    return { avg, count: sr.length };
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="animate-in fade-in duration-200">

      {/* ── Services / Home tab ─────────────────────────────────────────── */}
      {activeTab === "services" && (
        <div className="space-y-0">
          <HeroSection onBookService={() => handleTabChange("estimator")} />
          <FeaturesSection />

          <section className="w-full py-20 md:py-32 bg-white">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-16">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-gray-950 mb-4 text-balance">
                  {t("services.title")}
                </h2>
                <p className="text-lg text-gray-600 max-w-2xl mx-auto text-balance">
                  {t("services.subtitle", "Choose from our comprehensive range of professional home services")}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
                {visibleServices.map((service) => (
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

          <TestimonialsSection />
          <TrustSection />
          <CTASection
            onBrowse={() => handleTabChange("estimator")}
            onContact={() => handleTabChange("about")}
          />
        </div>
      )}

      {/* ── Account tab ─────────────────────────────────────────────────── */}
      {activeTab === "account" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <MyAccount
            currentUser={currentUser}
            onLogout={async () => {
              await auth?.handleLogout();
              router.push("/");
            }}
            bookings={bookings}
            onSelectTab={handleTabChange}
            onUpdateProfile={async (updates) => auth?.handleUpdateProfile(updates)}
            onReschedule={async (id, date, slot) =>
              auth?.handleRescheduleBooking(id, date, slot)
            }
            onCancelBooking={async (id) => auth?.handleCancelBooking(id)}
            onEnterAdmin={() => { window.location.href = "/admin"; }}
          />
        </section>
      )}

      {/* ── Bookings / En Progreso tab ───────────────────────────────────── */}
      {activeTab === "bookings" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <BookingsTracker
            bookings={bookings}
            onUpdateStatus={async (id, status, ps, pm) =>
              auth?.handleUpdateBookingStatus(id, status, ps, pm)
            }
            onReschedule={async (id, date, slot) =>
              auth?.handleRescheduleBooking(id, date, slot)
            }
            onCancelBooking={async (id) => auth?.handleCancelBooking(id)}
            onWriteReview={handleReviewShortcut}
            onRebook={handleRebook}
          />
        </section>
      )}

      {/* ── Estimator tab ───────────────────────────────────────────────── */}
      {activeTab === "estimator" && !wizardParams && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="space-y-8">
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-gray-950">
                Instant Cost Calculator
              </h2>
              <p className="text-gray-600 text-lg">
                Get accurate pricing for your home service needs
              </p>
            </div>
            <CostEstimator
              initialServiceId={selectedEstimatorId}
              onProceedToBook={(params) => setWizardParams(params)}
              services={visibleServices}
            />
          </div>
        </section>
      )}

      {/* ── Booking Wizard ──────────────────────────────────────────────── */}
      {activeTab === "estimator" && wizardParams && (
        <section className="max-w-7xl mx-auto pb-16">
          <BookingWizard
            bookingParams={wizardParams}
            services={visibleServices}
            currentUser={currentUser}
            onSubmitBooking={async (draft) => auth?.handleWizardSubmit(draft)}
            onBack={() => setWizardParams(null)}
            onComplete={() => {
              setWizardParams(null);
              handleTabChange("bookings");
            }}
          />
        </section>
      )}

      {/* ── Membership tab ──────────────────────────────────────────────── */}
      {activeTab === "membership" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <PlansPage />
        </section>
      )}

      {/* ── About tab ───────────────────────────────────────────────────── */}
      {activeTab === "about" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-black text-gray-950">
                About Grenbee
              </h2>
              <p className="text-gray-600 leading-relaxed">
                Grenbee is a trusted platform for professional home services.
                We connect homeowners with certified, vetted technicians for
                cleaning, lawn care, TV installation, furniture assembly, and
                pressure washing.
              </p>
              <p className="text-gray-600 leading-relaxed">
                With over 500 satisfied customers and a 4.9/5 rating, we&apos;re
                committed to making home service booking simple, transparent,
                and reliable.
              </p>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-1 border-l-4 border-emerald-500 pl-4">
                  <p className="text-2xl font-black text-gray-950">500+</p>
                  <p className="text-sm text-gray-600">Happy Customers</p>
                </div>
                <div className="space-y-1 border-l-4 border-emerald-500 pl-4">
                  <p className="text-2xl font-black text-gray-950">4.9★</p>
                  <p className="text-sm text-gray-600">Average Rating</p>
                </div>
              </div>
            </div>
            <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 rounded-2xl p-12 text-center space-y-4">
              <div className="text-5xl">🏡</div>
              <p className="text-gray-600">Your home care, perfected</p>
            </div>
          </div>
        </section>
      )}

      {/* ── Blog tab ────────────────────────────────────────────────────── */}
      {activeTab === "blog" && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-16">
          <div className="space-y-12">
            <div className="text-center space-y-2 mb-12">
              <h2 className="text-3xl md:text-4xl font-black text-gray-950">
                Home Care Tips & Insights
              </h2>
              <p className="text-gray-600 text-lg">
                Expert advice for maintaining your home
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8">
              {[
                { title: "Spring Cleaning Checklist", desc: "Complete guide to preparing your home for spring" },
                { title: "TV Installation Best Practices", desc: "Tips for safe and professional TV mounting" },
                { title: "Lawn Care 101", desc: "Seasonal lawn maintenance and care tips" },
              ].map((post, i) => (
                <div
                  key={i}
                  className="p-6 rounded-xl border border-gray-100 hover:shadow-lg transition-all"
                >
                  <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 rounded-lg mb-4 flex items-center justify-center text-4xl">
                    📝
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-2">{post.title}</h3>
                  <p className="text-sm text-gray-600">{post.desc}</p>
                  <button className="mt-4 text-sm font-bold text-emerald-600 hover:text-emerald-700">
                    Read More →
                  </button>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
