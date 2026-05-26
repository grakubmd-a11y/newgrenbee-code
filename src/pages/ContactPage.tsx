import React, { useState } from "react";
import { Mail, Phone, Clock, MessageSquare, CheckCircle2 } from "lucide-react";
import PageShell from "./shared/PageShell";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Placeholder: real implementation would POST to a Firebase Cloud Function or email service
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <PageShell
      seo={{
        title: "Contact Us | Greenbee",
        description:
          "Get in touch with Greenbee. Request a custom quote, ask about coverage, report a service issue, or inquire about becoming a provider.",
        canonical: "https://grenbee.com/contact",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Contact Us</h1>
          <p className="text-gray-500 max-w-xl">
            Have an unusual project, a question, or need help with a booking? We're here to help.
          </p>
        </div>

        <div className="grid md:grid-cols-5 gap-10">
          {/* Info column */}
          <div className="md:col-span-2 space-y-6">
            <div className="bg-emerald-50 rounded-2xl p-6 space-y-5">
              <InfoRow icon={<Mail className="w-5 h-5 text-emerald-600" />} label="Email" value="support@grenbee.com" />
              <InfoRow icon={<Phone className="w-5 h-5 text-emerald-600" />} label="Phone" value="(305) 555-0190" />
              <InfoRow
                icon={<Clock className="w-5 h-5 text-emerald-600" />}
                label="Hours"
                value="Mon–Sat 8 AM – 7 PM EST"
              />
            </div>

            <div className="bg-gray-50 rounded-2xl p-6">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-500" />
                Common Questions
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                {[
                  "I need a custom quote for a large property",
                  "My city isn't in your coverage area",
                  "I want to become a Provider",
                  "I have an issue with a completed service",
                  "Corporate or recurring service contracts",
                ].map((q) => (
                  <li key={q} className="flex gap-2">
                    <span className="text-emerald-400 shrink-0">›</span>
                    {q}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Form column */}
          <div className="md:col-span-3">
            {submitted ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[320px] text-center gap-4 p-8 bg-emerald-50 rounded-2xl">
                <CheckCircle2 className="w-14 h-14 text-emerald-500" />
                <h2 className="text-xl font-semibold text-gray-800">Message Sent!</h2>
                <p className="text-gray-500 max-w-xs">
                  Thanks for reaching out. Our team will get back to you within 1 business day.
                </p>
                <button
                  onClick={() => { setSubmitted(false); setForm({ name: "", email: "", subject: "", message: "" }); }}
                  className="text-sm text-emerald-600 hover:underline mt-2"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Your Name</label>
                    <input
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="Jane Doe"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                    <input
                      name="email"
                      type="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                      placeholder="jane@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                  <select
                    name="subject"
                    value={form.subject}
                    onChange={handleChange}
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
                  >
                    <option value="">Select a topic…</option>
                    <option value="quote">Custom Quote Request</option>
                    <option value="coverage">Coverage Area Inquiry</option>
                    <option value="provider">Become a Provider</option>
                    <option value="complaint">Service Complaint / Refund</option>
                    <option value="corporate">Corporate / Recurring Contract</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                    placeholder="Describe your project, question, or issue in as much detail as possible…"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white font-semibold py-3 rounded-xl transition-colors"
                >
                  {loading ? "Sending…" : "Send Message"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-medium text-gray-800 mt-0.5">{value}</p>
      </div>
    </div>
  );
}
