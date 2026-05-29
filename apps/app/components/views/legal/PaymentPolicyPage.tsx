import LegalPage from "@/components/layout/LegalPage";
import { useSiteSettings } from "@grenbee/firebase/contexts";

export default function PaymentPolicyPage() {
  const { email } = useSiteSettings();
  return (
    <LegalPage
      title="Payment Policy"
      pageTitle="Payment Policy | Grenbee"
      metaDescription="Grenbee uses Stripe for secure payments. Your card is only charged after service completion. Learn about accepted payment methods, refunds, and disputes."
      lastUpdated="May 2026"
      intro="Grenbee uses Stripe to securely process all transactions. This policy explains how and when charges are applied, and what happens in case of disputes."
      sections={[
        {
          title: "Authorization and Capture",
          content:
            "When you confirm a booking, a payment authorization (hold) is placed on your card for the full booking amount. Your card is not charged at this point — the hold is only converted to a real charge after the service has been completed and verified. If the service does not take place, the hold is released automatically within 3–5 business days depending on your bank.",
        },
        {
          title: "Accepted Payment Methods",
          content: [
            "Visa, Mastercard, American Express, and Discover credit and debit cards.",
            "Apple Pay and Google Pay (where supported by your browser or device).",
            "Grenbee does not accept cash, checks, wire transfers, or cryptocurrency.",
          ],
        },
        {
          title: "Pricing and Taxes",
          content: [
            "All prices shown are in US Dollars (USD).",
            "Where applicable, sales tax or service tax will be calculated and added at checkout based on the service location.",
            "The final price is confirmed on the booking summary screen before you authorize payment.",
          ],
        },
        {
          title: "Receipts and Invoices",
          content:
            `A payment receipt is automatically sent to your email address after each charge is captured. You can also access all receipts through My Account → My Bookings. For business expense invoices, contact ${email} with your booking ID.`,
        },
        {
          title: "Refunds",
          content: [
            "Refunds are processed to the original payment method and typically appear within 3–5 business days.",
            "Grenbee cannot redirect refunds to a different card or bank account.",
            "Partial refunds may be issued for incomplete service delivery subject to Guarantee Policy terms.",
            "Authorization holds that are never captured release automatically — no refund action is needed.",
          ],
        },
        {
          title: "Failed Payments",
          content: [
            "If your payment method is declined, you will be notified immediately and given the opportunity to update your payment details.",
            "Bookings with failed authorization are not confirmed and will not be assigned a Provider.",
            "If a payment fails after service completion (e.g., card expired), our team will contact you to resolve the outstanding balance within 5 business days.",
          ],
        },
        {
          title: "Chargebacks and Disputes",
          content:
            `We ask that you contact us at ${email} before initiating a chargeback with your bank. In most cases we can resolve issues faster and more favorably outside the formal dispute process. Frivolous chargebacks may result in account suspension. If a dispute is filed, Grenbee will submit booking records, communications, and service documentation to the card network.`,
        },
        {
          title: "Security",
          content:
            "All payment data is processed by Stripe (PCI DSS Level 1 certified). Grenbee never stores raw card numbers, CVV codes, or full magnetic stripe data on its servers. Your payment information is encrypted end-to-end.",
        },
      ]}
    />
  );
}
