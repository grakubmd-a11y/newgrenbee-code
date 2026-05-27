import { Routes, Route, Outlet } from "react-router-dom";
import { useEffect } from "react";
import i18n from "./shared/i18n";
import AdminRoute    from "./admin/AdminRoute";
import StaffRoute    from "./staff/StaffRoute";
import PublicApp     from "./public/PublicApp";
import HomePage      from "./pages/HomePage";
import PlansPage     from "./public/components/PlansPage";
import AreasPage     from "./pages/AreasPage";
import AreaLandingPage from "./pages/AreaLandingPage";
import FAQPage       from "./pages/FAQPage";
import ContactPage   from "./pages/ContactPage";
import NotFoundPage  from "./pages/NotFoundPage";
import TermsPage           from "./pages/legal/TermsPage";
import PrivacyPage         from "./pages/legal/PrivacyPage";
import CancellationPage    from "./pages/legal/CancellationPage";
import GuaranteePage       from "./pages/legal/GuaranteePage";
import PaymentPolicyPage   from "./pages/legal/PaymentPolicyPage";

/** Switches i18n locale then renders children */
function LocaleLayout({ lang }: { lang: string }) {
  useEffect(() => {
    if (i18n.language !== lang) i18n.changeLanguage(lang);
  }, [lang]);
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      {/* ── Portals (bypass everything) ─────────────────────────────── */}
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route path="/staff/*" element={<StaffRoute />} />

      {/* ── Marketing pages (static paths beat /:country wildcard) ──── */}
      <Route path="/" element={<HomePage />} />

      <Route path="/plans"              element={<PlansPage />} />
      <Route path="/areas"              element={<AreasPage />} />
      <Route path="/areas/:areaSlug"    element={<AreaLandingPage />} />
      <Route path="/faq"                element={<FAQPage />} />
      <Route path="/contact"            element={<ContactPage />} />

      {/* ── Legal ───────────────────────────────────────────────────── */}
      <Route path="/terms"              element={<TermsPage />} />
      <Route path="/privacy"            element={<PrivacyPage />} />
      <Route path="/cancellation"       element={<CancellationPage />} />
      <Route path="/guarantee"          element={<GuaranteePage />} />
      <Route path="/payment-policy"     element={<PaymentPolicyPage />} />

      {/* ── App sections (estimator, booking wizard, account, tracker) ─ */}
      <Route path="/book"     element={<PublicApp />} />
      <Route path="/bookings" element={<PublicApp />} />
      <Route path="/account"  element={<PublicApp />} />
      <Route path="/estimate" element={<PublicApp />} />

      {/* ── i18n locale prefix (e.g. /us/, /us/es/) ─────────────────── */}
      <Route path="/:country" element={<LocaleLayout lang="en" />}>
        <Route index element={<HomePage />} />
        <Route path="plans"           element={<PlansPage />} />
        <Route path="areas"           element={<AreasPage />} />
        <Route path="areas/:areaSlug" element={<AreaLandingPage />} />
        <Route path="faq"             element={<FAQPage />} />
        <Route path="contact"         element={<ContactPage />} />
        <Route path="terms"           element={<TermsPage />} />
        <Route path="privacy"         element={<PrivacyPage />} />
        <Route path="cancellation"    element={<CancellationPage />} />
        <Route path="guarantee"       element={<GuaranteePage />} />
        <Route path="payment-policy"  element={<PaymentPolicyPage />} />
        <Route path="es" element={<LocaleLayout lang="es" />}>
          <Route index element={<HomePage />} />
          <Route path="plans"           element={<PlansPage />} />
          <Route path="areas"           element={<AreasPage />} />
          <Route path="areas/:areaSlug" element={<AreaLandingPage />} />
          <Route path="faq"             element={<FAQPage />} />
          <Route path="contact"         element={<ContactPage />} />
        </Route>
        <Route path="*" element={<PublicApp />} />
      </Route>

      {/* ── Catch-all ────────────────────────────────────────────────── */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/*"   element={<PublicApp />} />
    </Routes>
  );
}
