"use client";
/**
 * Waitlist form — the only interactive piece of the /areas hub.
 * Extracted as a client child so the surrounding directory stays server-rendered.
 */
import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";

interface Props {
  successMessage: string;
  zipPlaceholder: string;
  emailPlaceholder: string;
  notifyMe: string;
}

export default function WaitlistForm({ successMessage, zipPlaceholder, emailPlaceholder, notifyMe }: Props) {
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      await fetch("/api/capture-lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, customerName: "", source: "areas_waitlist", zip }),
      });
    } catch {
      /* non-fatal — still confirm to the user */
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex items-center gap-3 text-emerald-700 bg-emerald-100 rounded-xl px-5 py-3 text-sm font-medium">
        <CheckCircle2 className="w-5 h-5 shrink-0" />
        {successMessage}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
      <input
        type="text"
        value={zip}
        onChange={(e) => setZip(e.target.value)}
        required
        placeholder={zipPlaceholder}
        maxLength={10}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full sm:w-32"
      />
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
        placeholder={emailPlaceholder}
        className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 flex-1"
      />
      <button
        type="submit"
        className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
      >
        {notifyMe}
      </button>
    </form>
  );
}
