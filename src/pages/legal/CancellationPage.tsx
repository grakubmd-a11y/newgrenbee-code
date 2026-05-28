import LegalPage from "../shared/LegalPage";
import { useSiteSettings } from "../../shared/contexts/SiteSettingsContext";

export default function CancellationPage() {
  const { email } = useSiteSettings();
  return (
    <LegalPage
      title="Cancellation & Rescheduling Policy"
      pageTitle="Cancellation Policy | Greenbee"
      metaDescription="Greenbee's cancellation and rescheduling policy. Free cancellation up to 24 hours before your appointment. Learn about refunds and rebooking fees."
      lastUpdated="May 2026"
      intro="We understand that life happens. Our cancellation policy is designed to be fair to both customers and the service professionals who block time for your appointment."
      disclaimer="This document is a placeholder and must be reviewed by a licensed attorney before going live with real payment processing."
      sections={[
        {
          title: "Free Cancellation Window",
          content:
            "You may cancel or reschedule any booking free of charge up to 24 hours before the scheduled start time. Cancellations made within this window will receive a full refund to the original payment method within 3–5 business days.",
        },
        {
          title: "Late Cancellations (Under 24 Hours)",
          content: [
            "Cancellations made within 24 hours of the scheduled start time will incur a cancellation fee of 25% of the total booking value.",
            "This fee compensates the assigned Provider for the reserved time slot.",
            "The remaining 75% will be refunded to your original payment method.",
          ],
        },
        {
          title: "Same-Day / No-Show Cancellations",
          content: [
            "Cancellations made on the day of service (less than 2 hours before start) are subject to a 50% cancellation fee.",
            "If the Provider arrives at the address and cannot gain access (no-show), the full booking amount may be charged.",
            "We strongly recommend providing accurate access instructions and a valid contact number.",
          ],
        },
        {
          title: "Rescheduling",
          content: [
            "You may reschedule at no charge up to 24 hours before your appointment.",
            "Within 24 hours, rescheduling is subject to availability and a $15 rebooking fee.",
            "To reschedule, use the My Account portal or contact our support team.",
          ],
        },
        {
          title: "Greenbee-Initiated Cancellations",
          content:
            "In rare cases — such as Provider unavailability due to emergencies or severe weather — Greenbee may cancel your booking. In these situations, you will receive a full refund and priority rebooking at no extra charge. We will notify you as early as possible.",
        },
        {
          title: "Subscription / Recurring Plans",
          content: [
            "Recurring service plans can be paused or cancelled at any time with at least 72 hours notice before the next scheduled visit.",
            "Pausing a plan for more than 30 days may result in the promotional rate being removed upon resumption.",
          ],
        },
        {
          title: "How to Cancel",
          content: [
            "Log in to your account and navigate to My Account → My Bookings.",
            "Select the booking and click 'Cancel Appointment'.",
            `Alternatively, email ${email} with your booking ID.`,
          ],
        },
      ]}
    />
  );
}
