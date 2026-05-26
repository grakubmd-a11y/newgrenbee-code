import LegalPage from "../shared/LegalPage";

export default function GuaranteePage() {
  return (
    <LegalPage
      title="Greenbee Satisfaction Guarantee"
      pageTitle="Satisfaction Guarantee | Greenbee"
      metaDescription="Greenbee backs every service with a 100% satisfaction guarantee. Not happy? We'll return to redo the work or issue a refund — no hassle."
      lastUpdated="May 2026"
      intro="We stand behind every service we deliver. If you're not satisfied with the quality of the work, we'll make it right — no hassle, no runaround."
      disclaimer="This document is a placeholder and must be reviewed by a licensed attorney before going live."
      sections={[
        {
          title: "Our Promise",
          content:
            "Every Greenbee booking is backed by a 100% satisfaction guarantee. If the completed service does not meet the scope described at the time of booking, we will return to re-do the affected portion at no additional cost, or issue a partial refund at our discretion.",
        },
        {
          title: "What Is Covered",
          content: [
            "Work quality that does not match the service description (e.g., missed cleaning areas, incorrectly mounted hardware).",
            "Service completion that is materially incomplete compared to what was booked.",
            "Damage to property caused directly by a Greenbee Provider while carrying out the booked service.",
            "Provider no-shows or failure to initiate the service within 30 minutes of the scheduled start (without prior notification).",
          ],
        },
        {
          title: "What Is Not Covered",
          content: [
            "Pre-existing damage or conditions reported after service completion that were not documented before the appointment.",
            "Outcomes affected by customer-provided materials, equipment, or inaccurate information.",
            "Change-of-mind requests unrelated to service quality.",
            "Services where access was denied or significantly limited by the customer.",
            "Damage resulting from pre-existing structural issues (e.g., crumbling drywall, rotting wood) that could not reasonably be foreseen.",
          ],
        },
        {
          title: "How to File a Claim",
          content: [
            "Contact us within 48 hours of service completion — claims submitted after this window may not be eligible.",
            "Email support@grenbee.com with your booking ID, a written description of the issue, and photos where applicable.",
            "Our team will review and respond within 2 business days with next steps.",
            "For damage claims exceeding $500, we may engage a third-party inspector before authorizing remediation.",
          ],
        },
        {
          title: "Remediation Options",
          content: [
            "Re-service: a return appointment at no charge within 3 business days.",
            "Partial refund: issued to the original payment method within 5 business days.",
            "Full refund: reserved for cases where no reasonable remediation is possible.",
          ],
        },
        {
          title: "Provider Insurance",
          content:
            "All Greenbee Providers are required to carry general liability insurance with a minimum coverage of $1,000,000 per incident. Proof of insurance is verified during onboarding. For large damage claims, we will coordinate with the Provider's insurer on your behalf.",
        },
      ]}
    />
  );
}
