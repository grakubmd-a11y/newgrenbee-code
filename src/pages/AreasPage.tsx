import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { MapPin, CheckCircle2, Clock, Bell, ArrowRight } from "lucide-react";
import PageShell from "./shared/PageShell";
import { db } from "../shared/firebase";
import { collection, getDocs } from "firebase/firestore";

interface CoverageArea {
  id: string;
  city: string;
  state: string;
  zipCodes?: string[];
  active: boolean;
  comingSoon?: boolean;
}

const FALLBACK_AREAS: CoverageArea[] = [
  { id: "miami", city: "Miami", state: "FL", active: true },
  { id: "miami-beach", city: "Miami Beach", state: "FL", active: true },
  { id: "coral-gables", city: "Coral Gables", state: "FL", active: true },
  { id: "coconut-grove", city: "Coconut Grove", state: "FL", active: true },
  { id: "brickell", city: "Brickell", state: "FL", active: true },
  { id: "doral", city: "Doral", state: "FL", active: true },
  { id: "hialeah", city: "Hialeah", state: "FL", active: true },
  { id: "homestead", city: "Homestead", state: "FL", active: true },
  { id: "fort-lauderdale", city: "Fort Lauderdale", state: "FL", active: true },
  { id: "pembroke-pines", city: "Pembroke Pines", state: "FL", active: true },
  { id: "hollywood", city: "Hollywood", state: "FL", active: true },
  { id: "miramar", city: "Miramar", state: "FL", active: true },
  { id: "west-palm-beach", city: "West Palm Beach", state: "FL", active: false, comingSoon: true },
  { id: "boca-raton", city: "Boca Raton", state: "FL", active: false, comingSoon: true },
  { id: "orlando", city: "Orlando", state: "FL", active: false, comingSoon: true },
];

export default function AreasPage() {
  const [areas, setAreas] = useState<CoverageArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [waitlistZip, setWaitlistZip] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistSent, setWaitlistSent] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, "coverage"));
        if (!snap.empty) {
          const loaded: CoverageArea[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<CoverageArea, "id">),
          }));
          setAreas(loaded);
        } else {
          setAreas(FALLBACK_AREAS);
        }
      } catch {
        setAreas(FALLBACK_AREAS);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  async function handleWaitlist(e: React.FormEvent) {
    e.preventDefault();
    // Placeholder — real implementation would write to Firestore waitlist collection
    await new Promise((r) => setTimeout(r, 500));
    setWaitlistSent(true);
  }

  const active = areas.filter((a) => a.active);
  const coming = areas.filter((a) => !a.active);

  return (
    <PageShell
      seo={{
        title: "Coverage Areas | Greenbee",
        description:
          "Check if Greenbee serves your city. We cover Miami-Dade, Broward, and more. Join the waitlist if your area isn't listed yet.",
        canonical: "https://grenbee.com/areas",
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Coverage Areas</h1>
          <p className="text-gray-500 max-w-xl">
            Greenbee is growing fast. Check if we currently serve your city or join the waitlist to be notified when we
            expand to your area.
          </p>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
            {[...Array(9)].map((_, i) => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Active areas */}
            <section className="mb-10">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-emerald-600 mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Available Now
              </h2>
              <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                {active.map((area) => (
                  <Link
                    key={area.id}
                    to={`/areas/${area.id}`}
                    className="flex items-center justify-between gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 hover:bg-emerald-100 hover:border-emerald-200 transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-emerald-500 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-800">{area.city}</p>
                        <p className="text-xs text-gray-400">{area.state}</p>
                      </div>
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                ))}
              </div>
            </section>

            {/* Coming soon */}
            {coming.length > 0 && (
              <section className="mb-12">
                <h2 className="text-sm font-semibold uppercase tracking-widest text-amber-500 mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Coming Soon
                </h2>
                <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-3">
                  {coming.map((area) => (
                    <div
                      key={area.id}
                      className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-xl px-4 py-3"
                    >
                      <MapPin className="w-4 h-4 text-gray-300 shrink-0" />
                      <div>
                        <p className="text-sm font-medium text-gray-500">{area.city}</p>
                        <p className="text-xs text-amber-500 font-medium">Coming soon</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        {/* Waitlist */}
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-2xl p-8">
          <div className="flex items-start gap-4 mb-6">
            <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-800 mb-1">Not in your area yet?</h2>
              <p className="text-sm text-gray-500">
                Leave your zip code and email and we'll notify you the moment Greenbee launches near you.
              </p>
            </div>
          </div>

          {waitlistSent ? (
            <div className="flex items-center gap-3 text-emerald-700 bg-emerald-100 rounded-xl px-5 py-3 text-sm font-medium">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              You're on the list! We'll email you when we reach your area.
            </div>
          ) : (
            <form onSubmit={handleWaitlist} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                value={waitlistZip}
                onChange={(e) => setWaitlistZip(e.target.value)}
                required
                placeholder="Zip code"
                maxLength={10}
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 w-full sm:w-32"
              />
              <input
                type="email"
                value={waitlistEmail}
                onChange={(e) => setWaitlistEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 flex-1"
              />
              <button
                type="submit"
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap"
              >
                Notify Me
              </button>
            </form>
          )}
        </div>
      </div>
    </PageShell>
  );
}
