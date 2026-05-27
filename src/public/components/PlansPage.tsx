import React, { useEffect, useState } from "react";
import * as Icons from "lucide-react";
import { MembershipPlan, MembershipPriceTier, YardSizeTier } from "../../shared/types";
import { fetchMembershipPlans } from "../../shared/services/firebaseService";

// ─── Size guide (static fallback; overridden by Firestore data in future) ──────
const SIZE_GUIDE: { tier: YardSizeTier; label: string; description: string; examples: string }[] = [
  { tier: "small",  label: "Small",  description: "Townhome, front yard or compact lot", examples: "Up to ~3,500 sqft" },
  { tier: "medium", label: "Medium", description: "Standard single-family home yard",    examples: "~3,500–8,000 sqft" },
  { tier: "large",  label: "Large",  description: "Larger residential lot",              examples: "~8,000–15,000 sqft" },
  { tier: "xl",     label: "XL",     description: "Large lots, slopes or complex terrain", examples: "15,000+ sqft" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getPriceTier(plan: MembershipPlan, size: YardSizeTier): MembershipPriceTier {
  return plan.pricing[size];
}

function PriceDisplay({ tier, size }: { tier: MembershipPriceTier; size: YardSizeTier }) {
  if (tier.customQuote || size === "xl") {
    return (
      <div className="mt-1">
        <span className="text-2xl font-black text-gray-800">Custom</span>
        <span className="text-sm text-gray-400 ml-1">quote</span>
      </div>
    );
  }
  return (
    <div className="mt-1">
      <span className="text-2xl font-black text-brand">{tier.priceLabel}</span>
      <span className="text-sm text-gray-400 ml-1">/mo</span>
    </div>
  );
}

// ─── Waitlist modal ────────────────────────────────────────────────────────────
function WaitlistModal({
  plan,
  size,
  onClose,
}: {
  plan: MembershipPlan;
  size: YardSizeTier;
  onClose: () => void;
}) {
  const [name, setName]       = useState("");
  const [email, setEmail]     = useState("");
  const [phone, setPhone]     = useState("");
  const [address, setAddress] = useState("");
  const [sent, setSent]       = useState(false);
  const [busy, setBusy]       = useState(false);

  const priceTier = getPriceTier(plan, size);
  const sizeLabel = SIZE_GUIDE.find(s => s.tier === size)?.label ?? size;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      // For Phase 1: capture as a lead via the existing capture-lead endpoint
      await fetch("/api/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name,
          email,
          phone,
          address,
          serviceName: `${plan.name} — ${sizeLabel} Yard`,
          serviceId: plan.id,
          estimatedValue: priceTier.customQuote ? 0 : priceTier.price,
          source: "membership_waitlist",
          notes: `Membership plan: ${plan.name} · Yard size: ${sizeLabel} · Price: ${priceTier.customQuote ? "Custom quote" : priceTier.priceLabel + "/mo"}`,
        }),
      });
      setSent(true);
    } catch {
      setSent(true); // Still show success — don't block UX on network error
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(4px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {sent ? (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-14 h-14 rounded-full bg-brand/10 flex items-center justify-center">
              <Icons.CheckCircle2 size={32} className="text-brand" />
            </div>
            <h3 className="text-xl font-black text-gray-900">We'll be in touch!</h3>
            <p className="text-sm text-gray-500 leading-relaxed">
              Thanks! We received your interest in the <strong>{plan.name}</strong> plan for a <strong>{sizeLabel}</strong> yard. Someone from the Greenbee team will contact you within 24 hours.
            </p>
            <button
              onClick={onClose}
              className="mt-2 w-full py-3 rounded-xl bg-brand text-white font-bold text-sm border-none cursor-pointer hover:bg-brand/90 transition-colors"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-black text-gray-900">{plan.name}</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                  {sizeLabel} yard ·{" "}
                  {priceTier.customQuote ? "Custom quote" : `${priceTier.priceLabel}/mo`}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1"
              >
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Full Name *</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="jane@email.com"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Phone</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="(555) 000-0000"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
                />
              </div>
              <div>
                <label className="text-[11px] font-bold uppercase text-gray-400 block mb-1">Service Address</label>
                <input
                  value={address}
                  onChange={e => setAddress(e.target.value)}
                  placeholder="123 Main St, City, State"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-brand"
                />
              </div>

              <button
                type="submit"
                disabled={busy}
                className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm border-none cursor-pointer hover:bg-brand/90 disabled:opacity-60 transition-colors flex items-center justify-center gap-2"
              >
                {busy ? <Icons.Loader2 size={16} className="animate-spin" /> : <Icons.Send size={15} />}
                {priceTier.customQuote ? "Request a Custom Quote" : "Get Started"}
              </button>

              <p className="text-[11px] text-gray-400 text-center leading-relaxed">
                No payment required now. A Greenbee team member will contact you to confirm details and schedule your first visit.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Plan Card ─────────────────────────────────────────────────────────────────
function PlanCard({
  plan,
  selectedSize,
  onSelect,
  highlight,
}: {
  plan: MembershipPlan;
  selectedSize: YardSizeTier;
  onSelect: (plan: MembershipPlan) => void;
  highlight?: boolean;
}) {
  const priceTier = getPriceTier(plan, selectedSize);
  const isCustom  = priceTier.customQuote || selectedSize === "xl" || plan.byQuote;

  return (
    <div
      className={`relative flex flex-col rounded-2xl border transition-all ${
        highlight
          ? "border-brand shadow-lg shadow-brand/10 bg-white ring-2 ring-brand"
          : "border-gray-200 bg-white shadow-sm hover:shadow-md"
      }`}
    >
      {highlight && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="bg-brand text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full shadow-sm">
            Most Popular
          </span>
        </div>
      )}

      <div className="p-6 space-y-4 flex-1">
        {/* Header */}
        <div>
          <h3 className="text-lg font-black text-gray-900">{plan.name}</h3>
          <p className="text-sm text-gray-500 mt-0.5">{plan.tagline}</p>
        </div>

        {/* Price */}
        {plan.byQuote ? (
          <div className="mt-1">
            <span className="text-xl font-black text-gray-700">Let's talk</span>
          </div>
        ) : (
          <PriceDisplay tier={priceTier} size={selectedSize} />
        )}

        {/* Frequency badge */}
        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-brand bg-brand/8 px-2.5 py-1 rounded-full">
          <Icons.Repeat2 size={12} />
          {plan.frequencyLabel}
        </span>

        {/* Features */}
        <ul className="space-y-2">
          {plan.features.map((f, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <Icons.Check size={14} className="text-brand mt-0.5 shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Not included */}
        {plan.notIncluded && plan.notIncluded.length > 0 && (
          <details className="group">
            <summary className="text-[11px] font-bold text-gray-400 uppercase tracking-wide cursor-pointer list-none flex items-center gap-1 hover:text-gray-600">
              <Icons.ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
              Not included
            </summary>
            <ul className="mt-2 space-y-1.5 pl-4">
              {plan.notIncluded.map((ni, i) => (
                <li key={i} className="flex items-start gap-2 text-xs text-gray-400">
                  <Icons.Minus size={11} className="mt-0.5 shrink-0" />
                  <span>{ni}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>

      {/* First Visit Reset note */}
      {plan.firstVisit?.required && !plan.byQuote && (
        <div className="mx-6 mb-4 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <p className="text-[11px] font-bold text-amber-800 flex items-center gap-1.5 mb-0.5">
            <Icons.AlertCircle size={12} />
            First Cut Reset may apply
          </p>
          <p className="text-[11px] text-amber-700 leading-relaxed">
            {isCustom
              ? "Custom quote includes initial evaluation."
              : `If lawn is overgrown: ${plan.firstVisit.pricing[selectedSize]?.priceLabel ?? "see quote"} one-time fee. Regular pricing starts after first visit.`}
          </p>
        </div>
      )}

      {/* CTA */}
      <div className="p-6 pt-0">
        <button
          onClick={() => onSelect(plan)}
          className={`w-full py-3 rounded-xl text-sm font-bold border-none cursor-pointer transition-colors ${
            highlight
              ? "bg-brand text-white hover:bg-brand/90"
              : plan.byQuote
              ? "bg-gray-900 text-white hover:bg-gray-700"
              : "bg-brand/10 text-brand hover:bg-brand hover:text-white"
          }`}
        >
          {plan.byQuote
            ? "Contact Us for a Quote"
            : isCustom
            ? "Request a Custom Quote"
            : "Get Started"}
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function PlansPage() {
  const [plans, setPlans]               = useState<MembershipPlan[]>([]);
  const [loading, setLoading]           = useState(true);
  const [selectedSize, setSelectedSize] = useState<YardSizeTier>("medium");
  const [modalPlan, setModalPlan]       = useState<MembershipPlan | null>(null);

  useEffect(() => {
    fetchMembershipPlans("lawn").then((data) => {
      setPlans(data);
      setLoading(false);
    });
  }, []);

  const regularPlans = plans.filter(p => !p.byQuote);
  const customPlan   = plans.find(p => p.byQuote);

  return (
    <div className="min-h-screen bg-[#f0faf4]">
      {/* Nav bar */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-gray-100 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 font-black text-[#0a2e1e] text-lg">
            🌿 <span>Greenbee</span>
          </a>
          <a
            href="/#booking"
            className="text-xs font-bold text-brand border border-brand/30 rounded-full px-4 py-1.5 hover:bg-brand hover:text-white transition-colors"
          >
            Book a one-time visit →
          </a>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-[#0a2e1e] text-white py-16 px-4 text-center">
        <div className="max-w-2xl mx-auto space-y-4">
          <span className="inline-block bg-brand/20 text-brand text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full border border-brand/30">
            Lawn Care Memberships
          </span>
          <h1 className="text-3xl sm:text-4xl font-black leading-tight">
            Your lawn, on autopilot.
          </h1>
          <p className="text-white/60 text-base leading-relaxed">
            Choose a plan that fits your yard size. We show up on schedule — you just enjoy a great-looking lawn.
          </p>
        </div>
      </section>

      {/* Yard size selector */}
      <section className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Icons.Ruler size={16} className="text-brand" />
            <span className="text-sm font-bold text-gray-700">Select your yard size</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SIZE_GUIDE.map((sg) => (
              <button
                key={sg.tier}
                onClick={() => setSelectedSize(sg.tier)}
                className={`rounded-xl p-3 text-left border transition-all cursor-pointer ${
                  selectedSize === sg.tier
                    ? "border-brand bg-brand/5 ring-1 ring-brand"
                    : "border-gray-200 hover:border-gray-300 bg-white"
                }`}
              >
                <span className={`block text-sm font-black ${selectedSize === sg.tier ? "text-brand" : "text-gray-800"}`}>
                  {sg.label}
                </span>
                <span className="block text-[11px] text-gray-500 mt-0.5 leading-snug">{sg.description}</span>
                <span className="block text-[10px] text-gray-400 mt-1 font-mono">{sg.examples}</span>
              </button>
            ))}
          </div>
          {selectedSize === "xl" && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2 flex items-center gap-2">
              <Icons.AlertCircle size={13} />
              XL properties are priced individually. Select any plan below to request a custom quote.
            </p>
          )}
        </div>
      </section>

      {/* Plan cards */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        {loading ? (
          <div className="flex justify-center py-20">
            <Icons.Loader2 size={28} className="animate-spin text-brand" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {regularPlans.map((plan, idx) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                selectedSize={selectedSize}
                onSelect={setModalPlan}
                highlight={idx === 1}
              />
            ))}
          </div>
        )}

        {/* Custom / XL card — full width below */}
        {customPlan && (
          <div className="mt-6 bg-[#0a2e1e] rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-center sm:text-left space-y-1">
              <h3 className="text-white font-black text-lg">Large lots & custom properties</h3>
              <p className="text-white/50 text-sm">
                Large acreage, slopes, complex terrain or commercial properties. We'll assess your yard and give you a tailored quote.
              </p>
            </div>
            <button
              onClick={() => setModalPlan(customPlan)}
              className="shrink-0 bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl border-none cursor-pointer hover:bg-brand/90 transition-colors"
            >
              Request a Quote
            </button>
          </div>
        )}
      </section>

      {/* What's included / not included */}
      <section className="bg-white border-t border-gray-100 py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl font-black text-gray-900 text-center mb-8">What's always included</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-brand flex items-center gap-2">
                <Icons.CheckCircle2 size={14} /> Always included
              </h4>
              {[
                "Lawn mowing per scheduled visit",
                "Edging along walkways & driveway",
                "Blowing clippings off hard surfaces",
                "Consistent technician assignment (when available)",
                "Weather reschedule at no charge",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <Icons.Check size={14} className="text-brand shrink-0" />
                  {item}
                </div>
              ))}
            </div>
            <div className="space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Icons.XCircle size={14} /> Not included by default
              </h4>
              {[
                "Weed removal or herbicide treatment",
                "Bush & shrub trimming",
                "Debris hauling or bagging removal",
                "Fertilizer or soil treatments",
                "Overgrown or first-time cleanup",
                "Sprinkler repair",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-gray-500">
                  <Icons.Minus size={14} className="text-gray-300 shrink-0" />
                  {item}
                </div>
              ))}
              <p className="text-[11px] text-gray-400 pt-1">
                Add-ons available as one-time bookings or service credits on Home & Premium plans.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ / Policies */}
      <section className="py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-xl font-black text-gray-900 text-center mb-8">Plan policies</h2>
          <div className="space-y-4">
            {[
              {
                q: "Is there a First Cut Reset fee?",
                a: "If your lawn hasn't been maintained recently or is overgrown, a one-time First Cut Reset fee applies. This covers the extra time and work to bring it to a baseline. Regular membership pricing begins after the first visit.",
              },
              {
                q: "Can I pause my membership?",
                a: "Yes — members can pause up to 4 weeks per year with at least 7 days' notice. Billing resumes automatically when the pause ends. Credits and scheduled visits do not accrue during a pause. Your preferred schedule is not guaranteed after a pause.",
              },
              {
                q: "Can I cancel at any time?",
                a: "You can cancel with at least 7 days' notice before your next billing date. Cancellations made within 48 hours of a scheduled visit may be subject to a last-minute cancellation fee.",
              },
              {
                q: "What if it rains on my visit day?",
                a: "We reschedule at no charge for weather cancellations. You'll be contacted the day before if weather looks like an issue.",
              },
              {
                q: "Do I get the same technician every time?",
                a: "We do our best to assign the same technician, but it's not guaranteed — especially after pauses or schedule changes.",
              },
            ].map((item, i) => (
              <details
                key={i}
                className="bg-white border border-gray-100 rounded-xl overflow-hidden group"
              >
                <summary className="flex items-center justify-between px-5 py-4 cursor-pointer font-bold text-sm text-gray-800 list-none">
                  {item.q}
                  <Icons.ChevronDown size={16} className="text-gray-400 group-open:rotate-180 transition-transform shrink-0" />
                </summary>
                <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-50 pt-3">
                  {item.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-[#0a2e1e] py-12 px-4 text-center">
        <div className="max-w-md mx-auto space-y-4">
          <h2 className="text-2xl font-black text-white">Ready to get started?</h2>
          <p className="text-white/50 text-sm">Select a plan above or book a one-time visit first to see how we work.</p>
          <a
            href="/#booking"
            className="inline-block bg-brand text-white font-bold text-sm px-6 py-3 rounded-xl hover:bg-brand/90 transition-colors"
          >
            Book a one-time visit →
          </a>
        </div>
      </section>

      {/* Modal */}
      {modalPlan && (
        <WaitlistModal
          plan={modalPlan}
          size={selectedSize}
          onClose={() => setModalPlan(null)}
        />
      )}
    </div>
  );
}
