import LegalPage from "@/components/layout/LegalPage";

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      pageTitle="Privacy Policy | Grenbee"
      metaDescription="Learn how Grenbee collects, uses, and protects your personal information. We use Stripe for secure payments and Firebase for data storage."
      lastUpdated="May 2026"
      intro="Grenbee is committed to protecting your personal information. This policy explains what data we collect, how we use it, and the choices you have."
      disclaimer="This document is a placeholder and must be reviewed by a licensed attorney before going live with real payment processing or user data collection."
      sections={[
        {
          title: "Information We Collect",
          content: [
            "Account information: name, email address, and profile preferences you provide at sign-up.",
            "Service details: addresses, access instructions, scheduling preferences, and booking history.",
            "Payment data: processed exclusively by Stripe — Grenbee never stores raw card numbers.",
            "Device and usage data: browser type, IP address, pages visited, and time spent on the platform.",
            "Optional: phone number, pet information, lockbox codes, and special notes you choose to share.",
          ],
        },
        {
          title: "How We Use Your Information",
          content: [
            "To fulfill, schedule, and manage your service bookings.",
            "To communicate appointment confirmations, reminders, and service updates.",
            "To process payments securely through Stripe's payment infrastructure.",
            "To improve our platform features and service quality through aggregated analytics.",
            "To comply with legal obligations and enforce our Terms of Service.",
          ],
        },
        {
          title: "Data Sharing",
          content: [
            "Grenbee shares only the minimum necessary information with service Providers to carry out your booking.",
            "We use trusted third-party services: Firebase (Google) for authentication and data storage, Stripe for payments.",
            "We do not sell personal data to advertisers or data brokers.",
            "We may disclose information in response to lawful requests by public authorities.",
          ],
        },
        {
          title: "Data Retention",
          content:
            "We retain account and booking data for up to 7 years to comply with financial and legal record-keeping obligations. You may request deletion of your account; certain records required by law will be retained in an anonymized form.",
        },
        {
          title: "Your Rights",
          content: [
            "Access: request a copy of the personal data we hold about you.",
            "Correction: update inaccurate or incomplete profile information at any time via My Account.",
            "Deletion: request account deletion — processing takes up to 30 business days.",
            "Portability: receive your data in a machine-readable format upon request.",
            "Opt-out: unsubscribe from marketing emails at any time via the unsubscribe link.",
          ],
        },
        {
          title: "Cookies",
          content:
            "We use essential session cookies to keep you logged in and language-preference cookies to remember your preferred language. We do not use advertising or tracking cookies. You can configure cookie behavior through your browser settings.",
        },
        {
          title: "Security",
          content:
            "All data is transmitted over HTTPS. Firebase services apply encryption at rest and in transit. Payment processing is delegated to Stripe (PCI DSS Level 1 certified). Despite best efforts, no digital transmission is 100% secure.",
        },
        {
          title: "Contact",
          content:
            "For privacy inquiries or data requests, contact us at privacy@grenbee.com or use the Contact page.",
        },
      ]}
    />
  );
}
