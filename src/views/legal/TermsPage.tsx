import LegalPage from "../shared/LegalPage";

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      pageTitle="Terms of Service | Grenbee"
      metaDescription="Read Grenbee's Terms of Service. Understand your rights and obligations when booking professional home services through our platform."
      lastUpdated="May 2026"
      intro="By using Grenbee's platform, website, or mobile experience, you agree to the following terms. Please read them carefully before booking any service."
      disclaimer="This document is a placeholder intended to illustrate structure. It must be reviewed and finalized by a licensed attorney before processing real payments or entering legally binding service agreements."
      sections={[
        {
          title: "Acceptance of Terms",
          content:
            "By creating an account or placing a booking, you confirm that you are at least 18 years of age and legally capable of entering into a binding agreement. Use of the platform constitutes acceptance of these terms and any future amendments. Grenbee reserves the right to update these terms with reasonable notice.",
        },
        {
          title: "Services Provided",
          content: [
            "Grenbee acts as a platform connecting customers with independent service professionals ('Providers').",
            "Services include house cleaning, lawn care, TV installation, furniture assembly, pressure washing, and wall mounting.",
            "Service outcomes are subject to the specific details agreed at the time of booking.",
            "Grenbee does not directly employ Providers; all service relationships are governed by independent contractor terms.",
          ],
        },
        {
          title: "Bookings and Scheduling",
          content: [
            "Bookings are confirmed once payment authorization is captured via Stripe.",
            "You must provide accurate address, contact, and access information to ensure proper service delivery.",
            "Grenbee will use commercially reasonable efforts to fulfill bookings at the agreed time slot.",
            "Same-day cancellations or rescheduling within 24 hours may incur a fee (see Cancellation Policy).",
          ],
        },
        {
          title: "Pricing and Payments",
          content: [
            "All prices are displayed in USD and are inclusive of applicable fees unless otherwise stated.",
            "Payment is authorized at booking and captured only upon service completion.",
            "Additional scope requested on-site beyond the original booking may be quoted and billed separately.",
            "Grenbee reserves the right to adjust pricing with advance notice.",
          ],
        },
        {
          title: "Customer Responsibilities",
          content: [
            "Ensure safe access to the property at the scheduled time (unlocked doors, gate codes, pet containment).",
            "Disclose any known hazards, fragile items, or special access conditions before the appointment.",
            "Be present or designate a responsible adult (18+) to be reachable during the service window.",
            "Do not request services that violate local laws or HOA restrictions.",
          ],
        },
        {
          title: "Limitation of Liability",
          content:
            "To the fullest extent permitted by law, Grenbee's aggregate liability for any claim arising from or related to the platform or services shall not exceed the amount paid for the specific booking in question. Grenbee is not liable for indirect, incidental, or consequential damages.",
        },
        {
          title: "Intellectual Property",
          content:
            "All content, branding, code, and materials on the Grenbee platform are the exclusive property of Grenbee LLC and may not be reproduced, distributed, or used without prior written consent.",
        },
        {
          title: "Governing Law",
          content:
            "These terms are governed by the laws of the State of Florida, United States, without regard to conflict-of-law principles. Any disputes shall be resolved exclusively in the courts of Miami-Dade County, Florida.",
        },
        {
          title: "Contact",
          content:
            "For questions about these terms, please contact us at legal@grenbee.com or through our Contact page.",
        },
      ]}
    />
  );
}
