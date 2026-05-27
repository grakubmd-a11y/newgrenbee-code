import { Routes, Route } from "react-router-dom";
import AdminRoute from "./admin/AdminRoute";
import StaffRoute from "./staff/StaffRoute";
import PublicApp from "./public/PublicApp";
import AreasPage from "./pages/AreasPage";
import FAQPage from "./pages/FAQPage";
import ContactPage from "./pages/ContactPage";
import NotFoundPage from "./pages/NotFoundPage";
import TermsPage from "./pages/legal/TermsPage";
import PrivacyPage from "./pages/legal/PrivacyPage";
import CancellationPage from "./pages/legal/CancellationPage";
import GuaranteePage from "./pages/legal/GuaranteePage";
import PaymentPolicyPage from "./pages/legal/PaymentPolicyPage";

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<AdminRoute />} />
      <Route path="/staff/*" element={<StaffRoute />} />
      <Route path="/areas" element={<AreasPage />} />
      <Route path="/faq" element={<FAQPage />} />
      <Route path="/contact" element={<ContactPage />} />
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/cancellation" element={<CancellationPage />} />
      <Route path="/guarantee" element={<GuaranteePage />} />
      <Route path="/payment-policy" element={<PaymentPolicyPage />} />
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="/*" element={<PublicApp />} />
    </Routes>
  );
}
