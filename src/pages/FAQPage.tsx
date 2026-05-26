import { useState } from "react";
import { ChevronDown } from "lucide-react";
import PageShell from "./shared/PageShell";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQCategory {
  name: string;
  items: FAQItem[];
}

const FAQ_DATA: FAQCategory[] = [
  {
    name: "Booking & Scheduling",
    items: [
      {
        q: "How do I book a service?",
        a: "Select a service from the home page, customize the details (area, options, frequency), pick your preferred time slot, and confirm with a payment method. You'll receive an email confirmation immediately.",
      },
      {
        q: "How far in advance do I need to book?",
        a: "Most services can be booked same-day if slots are available. For best availability, we recommend booking at least 48 hours in advance, especially for weekends.",
      },
      {
        q: "Can I book recurring services?",
        a: "Yes! You can choose weekly, bi-weekly, or monthly recurring plans during checkout. Recurring bookings receive a 10% discount and you can pause or cancel at any time with at least 72 hours notice.",
      },
      {
        q: "What if I need to reschedule?",
        a: "You can reschedule for free up to 24 hours before your appointment via My Account → My Bookings. Within 24 hours, a $15 rebooking fee applies.",
      },
      {
        q: "Are weekend appointments available?",
        a: "Yes, we offer Saturday and Sunday slots. Sunday slots book out faster — we recommend booking early in the week for weekend appointments.",
      },
    ],
  },
  {
    name: "Pricing & Payments",
    items: [
      {
        q: "How is the price calculated?",
        a: "Prices start at a base rate and adjust based on factors you configure: service area size, type of work, materials needed, and any add-on options. The final price is shown before you authorize payment — no hidden fees.",
      },
      {
        q: "When does my card get charged?",
        a: "We only authorize (hold) your card at booking. The actual charge is captured only after the service is completed successfully. If the service doesn't happen, the hold releases automatically within 3–5 days.",
      },
      {
        q: "Do you offer any discounts?",
        a: "Recurring plans (weekly, bi-weekly, monthly) receive a 10% discount. We also occasionally run seasonal promotions — sign up to our newsletter to be notified.",
      },
      {
        q: "What payment methods do you accept?",
        a: "Visa, Mastercard, American Express, Discover, Apple Pay, and Google Pay. All transactions are processed securely through Stripe.",
      },
      {
        q: "Can I get a custom quote for a large or unusual project?",
        a: "Absolutely. Use the Contact page to describe your project and we'll respond with a tailored quote within 1 business day.",
      },
    ],
  },
  {
    name: "The Day of Service",
    items: [
      {
        q: "Do I need to be home during the service?",
        a: "Not necessarily. Many customers prefer to provide access instructions (lockbox code, door code) and let our Providers work independently. You'll receive a notification when the team arrives and when they're done.",
      },
      {
        q: "What if I have pets?",
        a: "Please ensure pets are in a safe area during the service. For cleaning services, selecting the 'Pets in Home' option ensures our techs bring the appropriate tools and allergy-safe products.",
      },
      {
        q: "What should I do to prepare for a cleaning?",
        a: "Clear any personal items from surfaces you want cleaned, make sure there's water and electricity access, and communicate any fragile or off-limits areas in the booking notes.",
      },
      {
        q: "What if the Provider is late?",
        a: "We'll notify you if the Provider is running more than 15 minutes behind. If they're more than 30 minutes late with no notice, you're entitled to a $10 discount on that booking.",
      },
      {
        q: "Will the same Provider come each time for recurring bookings?",
        a: "We do our best to assign the same Provider for recurring visits. While not always guaranteed, we track your Provider preference and prioritize consistency.",
      },
    ],
  },
  {
    name: "Service Quality & Guarantees",
    items: [
      {
        q: "What is the Greenbee satisfaction guarantee?",
        a: "If you're not satisfied with the completed work, contact us within 48 hours and we'll send a Provider back to redo the affected portion at no charge, or issue a partial refund.",
      },
      {
        q: "What if something gets damaged?",
        a: "All Providers carry general liability insurance. Document the damage with photos and contact us within 48 hours. We'll coordinate with the Provider and their insurer to resolve the claim.",
      },
      {
        q: "Are your Providers vetted?",
        a: "Yes. Every Provider goes through an application process, background check, and skills verification before joining the platform. We also monitor ongoing reviews and ratings.",
      },
      {
        q: "What products do you use for cleaning?",
        a: "Our default cleaning kit uses EPA-approved, eco-friendly products that are safe for children and pets. If you have allergies or special preferences, note them in your booking.",
      },
    ],
  },
  {
    name: "Coverage Areas",
    items: [
      {
        q: "What areas do you currently serve?",
        a: "We currently operate across Miami-Dade and Broward counties. Check the Coverage Areas page for a full list of supported zip codes and cities.",
      },
      {
        q: "My zip code isn't listed — what can I do?",
        a: "We're expanding quickly. Add your zip code to our waitlist via the Coverage page and you'll be the first to know when we arrive in your area.",
      },
      {
        q: "Do you charge a travel fee for distant locations?",
        a: "There's no travel surcharge within our standard coverage zone. Areas on the edge of coverage may include a small distance fee, which is always shown clearly at checkout.",
      },
    ],
  },
  {
    name: "Accounts & Privacy",
    items: [
      {
        q: "Do I need an account to book?",
        a: "Yes, an account is required to confirm a booking. It allows you to track appointments, store access preferences, and manage payment methods securely.",
      },
      {
        q: "How do I delete my account?",
        a: "You can request account deletion from My Account → Settings. Data will be removed within 30 business days, subject to legal record-keeping obligations.",
      },
      {
        q: "Is my payment information secure?",
        a: "Greenbee never stores card numbers. All payment data is handled exclusively by Stripe, which is PCI DSS Level 1 certified — the highest level of payment security.",
      },
    ],
  },
  {
    name: "Becoming a Provider",
    items: [
      {
        q: "How do I join as a service provider?",
        a: "Use the Contact page, select 'Become a Provider', and describe your experience and the services you offer. Our team reviews applications on a rolling basis.",
      },
      {
        q: "What are the requirements?",
        a: "Providers must be 18+, legally authorized to work in the US, carry general liability insurance, and pass a background screening. Specific tool requirements depend on the service type.",
      },
      {
        q: "How does payment work for providers?",
        a: "Providers receive payment via direct deposit after each completed and verified service, typically within 2–3 business days. Greenbee charges a platform commission on each booking.",
      },
    ],
  },
];

export default function FAQPage() {
  const [openKey, setOpenKey] = useState<string | null>(null);

  function toggle(key: string) {
    setOpenKey((prev) => (prev === key ? null : key));
  }

  return (
    <PageShell
      seo={{
        title: "FAQ | Greenbee Home Services",
        description:
          "Answers to the most common questions about booking, pricing, payments, cancellations, and service quality at Greenbee.",
        canonical: "https://grenbee.com/faq",
      }}
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Frequently Asked Questions</h1>
          <p className="text-gray-500">Everything you need to know about booking and using Greenbee.</p>
        </div>

        <div className="space-y-10">
          {FAQ_DATA.map((category) => (
            <div key={category.name}>
              <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4">
                {category.name}
              </h2>
              <div className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                {category.items.map((item, idx) => {
                  const key = `${category.name}-${idx}`;
                  const isOpen = openKey === key;
                  return (
                    <div key={key} className="bg-white">
                      <button
                        onClick={() => toggle(key)}
                        className="w-full text-left flex items-center justify-between gap-3 px-5 py-4 hover:bg-gray-50 transition-colors"
                      >
                        <span className="text-sm font-medium text-gray-800">{item.q}</span>
                        <ChevronDown
                          className={`w-4 h-4 text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                        />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 bg-gray-50">
                          <p className="pt-3">{item.a}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 p-6 bg-emerald-50 rounded-2xl text-center">
          <p className="text-gray-700 font-medium mb-2">Still have a question?</p>
          <p className="text-sm text-gray-500 mb-4">Our team is available Mon–Sat 8 AM – 7 PM EST.</p>
          <a
            href="/contact"
            className="inline-block bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-6 py-2.5 rounded-xl transition-colors"
          >
            Contact Us
          </a>
        </div>
      </div>
    </PageShell>
  );
}
