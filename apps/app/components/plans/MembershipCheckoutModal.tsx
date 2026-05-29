"use client";
import React, { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { MembershipPlan, MembershipSubscription, YardSizeTier } from "@grenbee/types";
import { auth } from "@grenbee/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter, useParams } from "next/navigation";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isUsableKey(value: string) {
  const t = value.trim();
  return t.length > 0 && !t.includes("REPLACE_ME");
}

const SIZE_LABELS: Record<string, string> = {
  small:  "Small",
  medium: "Medium",
  large:  "Large",
  xl:     "XL",
};

function formatDate(isoDate: string) {
  try {
    return new Date(isoDate + "T12:00:00Z").toLocaleDateString("en-US", {
      month: "long", day: "numeric", year: "numeric",
    });
  } catch { return isoDate; }
}

// ─── Inner Stripe form ────────────────────────────────────────────────────────

function PaymentForm({
  plan,
  homeSize,
  pricePerMonth,
  planName,
  totalCents,
  onSuccess,
  onError,
}: {
  plan: MembershipPlan;
  homeSize: YardSizeTier;
  pricePerMonth: number;
  planName: string;
  totalCents: number;
  onSuccess: (sub: MembershipSubscription) => void;
  onError: (msg: string) => void;
}) {
  const stripe   = useStripe();
  const elements = useElements();
  const authCtx  = useAuth();
  const [busy, setBusy]   = useState(false);
  const [err, setErr]     = useState("");

  const handlePay = async () => {
    if (!stripe || !elements || !authCtx?.currentUser) return;
    setBusy(true);
    setErr("");

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      redirect: "if_required",
      confirmParams: {
        return_url: `${window.location.origin}/account?tab=plans`,
      },
    });

    if (confirmError) {
      setBusy(false);
      setErr(confirmError.message || "Payment failed.");
      return;
    }

    if (!paymentIntent || paymentIntent.status !== "succeeded") {
      setBusy(false);
      setErr("Payment was not completed. Please try again.");
      return;
    }

    // Confirm with server and create subscription doc
    try {
      const firebaseUser = auth.currentUser; // Firebase Auth User (has getIdToken)
      if (!firebaseUser) throw new Error("Not authenticated.");
      const idToken = await firebaseUser.getIdToken();

      const resp = await fetch("/api/confirm-membership-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          planId:   plan.id,
          homeSize,
          userName: authCtx.currentUser?.name || "",
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Could not save subscription.");
      onSuccess(data.subscription as MembershipSubscription);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Subscription could not be saved.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <PaymentElement
        options={{ layout: { type: "tabs", defaultCollapsed: false } }}
      />

      {err && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <Icons.AlertCircle size={15} className="mt-0.5 shrink-0" />
          <span>{err}</span>
        </div>
      )}

      <button
        type="button"
        disabled={busy || !stripe || !elements}
        onClick={handlePay}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md shadow-brand/20 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? (
          <><Icons.Loader size={16} className="animate-spin" /> Processing…</>
        ) : (
          <><Icons.Lock size={15} strokeWidth={3} /> Pay ${(totalCents / 100).toFixed(2)} / month</>
        )}
      </button>

      <p className="text-[11px] text-gray-400 text-center">
        You'll be charged ${(totalCents / 100).toFixed(2)} today. Renews monthly. Cancel anytime.
      </p>
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props {
  plan: MembershipPlan;
  homeSize: YardSizeTier;
  homeSizeLabel: string;
  onClose: () => void;
}

export default function MembershipCheckoutModal({ plan, homeSize, homeSizeLabel, onClose }: Props) {
  const authCtx = useAuth();
  const router  = useRouter();
  const params = useParams();
  const base   = `/${(params?.country as string) ?? "us"}`;

  const [step, setStep]             = useState<"review" | "payment" | "success">("review");
  const [clientSecret, setCS]       = useState("");
  const [totalCents, setTotalCents] = useState(0);
  const [loadingPI, setLoadingPI]   = useState(false);
  const [piError, setPiError]       = useState("");
  const [subscription, setSub]      = useState<MembershipSubscription | null>(null);
  const [publishableKey]            = useState(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "");

  const priceTier    = plan.pricing[homeSize];
  const pricePerMonth = priceTier?.price ?? 0;

  const stripePromise = useMemo(
    () => (isUsableKey(publishableKey) ? loadStripe(publishableKey) : null),
    [publishableKey]
  );

  // Create PaymentIntent when user proceeds to payment step
  async function proceedToPayment() {
    const firebaseUser = auth.currentUser;
    if (!firebaseUser) return;
    setLoadingPI(true);
    setPiError("");

    try {
      const idToken = await firebaseUser.getIdToken();

      const resp = await fetch("/api/create-membership-checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({
          planId:   plan.id,
          homeSize,
          userName: authCtx?.currentUser?.name || "",
        }),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(data.error || "Could not initialize checkout.");

      setCS(data.clientSecretFull || "");
      setTotalCents(data.totalCents || 0);
      setStep("payment");
    } catch (e) {
      setPiError(e instanceof Error ? e.message : "Could not start checkout.");
    } finally {
      setLoadingPI(false);
    }
  }

  const stripeOptions = useMemo<StripeElementsOptions>(() => ({
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#0f9f6e",
        colorText: "#111827",
        colorDanger: "#e11d48",
        borderRadius: "12px",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
      },
      rules: {
        ".Tab": { border: "1px solid #d1e7dc", boxShadow: "none" },
        ".Tab--selected": { borderColor: "#0f9f6e", boxShadow: "0 0 0 1px #0f9f6e" },
        ".Input": { border: "1px solid #d1d5db", boxShadow: "none" },
      },
    },
  }), [clientSecret]);

  // ── Backdrop click closes modal ───────────────────────────────────────────
  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  };

  const notLoggedIn = !authCtx?.currentUser;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
          {step === "success" ? (
            <h2 className="text-lg font-black text-gray-900">You're all set!</h2>
          ) : step === "payment" ? (
            <button
              onClick={() => setStep("review")}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 font-semibold cursor-pointer bg-transparent border-none"
            >
              <Icons.ChevronLeft size={16} /> Back
            </button>
          ) : (
            <h2 className="text-lg font-black text-gray-900">{plan.name}</h2>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 bg-transparent border-none cursor-pointer p-1"
          >
            <Icons.X size={18} />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* ── Not logged in ───────────────────────────────────────────── */}
          {notLoggedIn && (
            <div className="text-center py-4 space-y-4">
              <div className="h-14 w-14 bg-brand/10 rounded-2xl flex items-center justify-center mx-auto">
                <Icons.LogIn size={24} className="text-brand" />
              </div>
              <div>
                <p className="font-bold text-gray-900 text-sm">Sign in to subscribe</p>
                <p className="text-xs text-gray-500 mt-1">You need an account to purchase a membership plan.</p>
              </div>
              <a
                href="/account"
                className="block w-full py-3 rounded-xl bg-brand text-white font-bold text-sm text-center hover:bg-brand/90 transition-colors"
              >
                Sign In / Create Account
              </a>
            </div>
          )}

          {/* ── Success ─────────────────────────────────────────────────── */}
          {!notLoggedIn && step === "success" && subscription && (
            <div className="text-center space-y-4 py-2">
              <div className="h-16 w-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto">
                <Icons.CheckCircle2 size={32} className="text-emerald-500" />
              </div>
              <div>
                <h3 className="text-xl font-black text-gray-900">Welcome to {plan.name}!</h3>
                <p className="text-sm text-gray-500 mt-1">
                  Your membership is active. First billing: today. Next billing:{" "}
                  <strong>{formatDate(subscription.nextBillingDate)}</strong>.
                </p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-left space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Plan</span>
                  <span className="font-bold">{plan.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Home size</span>
                  <span className="font-bold">{homeSizeLabel}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Monthly charge</span>
                  <span className="font-bold text-brand">${pricePerMonth}/mo</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Visits per month</span>
                  <span className="font-bold">{plan.visitsPerMonth}</span>
                </div>
              </div>
              <button
                onClick={() => { onClose(); router.push("/account?tab=plans"); }}
                className="w-full py-3 rounded-xl bg-brand text-white font-bold text-sm hover:bg-brand/90 transition-colors cursor-pointer"
              >
                View My Subscription →
              </button>
            </div>
          )}

          {/* ── Review step ─────────────────────────────────────────────── */}
          {!notLoggedIn && step === "review" && (
            <>
              {/* Plan summary */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-black text-gray-900">{plan.name}</span>
                  <span className="text-xl font-black text-brand">${pricePerMonth}<span className="text-sm font-bold text-gray-400">/mo</span></span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-xs">
                  <Icons.Home size={12} />
                  <span>{homeSizeLabel} home</span>
                  <span className="text-gray-300">·</span>
                  <Icons.Repeat2 size={12} />
                  <span>{plan.frequencyLabel}</span>
                </div>
              </div>

              {/* What's included */}
              <ul className="space-y-2">
                {plan.features.slice(0, 5).map((f, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-700">
                    <Icons.Check size={13} className="text-brand mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* First clean fee notice */}
              {plan.firstVisit?.required && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                  <Icons.AlertCircle size={13} className="mt-0.5 shrink-0" />
                  <div>
                    <span className="font-bold">First {plan.firstVisit.label} may apply.</span>{" "}
                    {plan.firstVisit.description.split(".")[0]}.
                  </div>
                </div>
              )}

              {/* Credits notice */}
              {plan.credits && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5 text-xs text-amber-800">
                  <Icons.Coins size={13} className="mt-0.5 shrink-0 text-amber-600" />
                  <span>Earn <strong>${plan.credits.monthlyAmount}/mo</strong> in service credits (max ${plan.credits.maxBalance}).</span>
                </div>
              )}

              {piError && (
                <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
                  <Icons.AlertCircle size={15} className="mt-0.5 shrink-0" />
                  <span>{piError}</span>
                </div>
              )}

              {!stripePromise && (
                <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-xl p-3">
                  Stripe is not configured. Add <code>NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY</code> to Vercel env vars.
                </div>
              )}

              <button
                disabled={loadingPI || !stripePromise}
                onClick={proceedToPayment}
                className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-bold shadow-md shadow-brand/20 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loadingPI ? (
                  <><Icons.Loader size={16} className="animate-spin" /> Preparing checkout…</>
                ) : (
                  <><Icons.CreditCard size={15} /> Continue to payment</>
                )}
              </button>
              <p className="text-[11px] text-gray-400 text-center">
                Secured by Stripe. Cancel anytime.
              </p>
            </>
          )}

          {/* ── Payment step ─────────────────────────────────────────────── */}
          {!notLoggedIn && step === "payment" && clientSecret && stripePromise && (
            <>
              <div className="text-sm text-gray-500 text-center">
                <span className="font-bold text-gray-900">{plan.name}</span> · {homeSizeLabel} home · <span className="text-brand font-bold">${pricePerMonth}/mo</span>
              </div>
              <Elements stripe={stripePromise} options={stripeOptions} key={clientSecret}>
                <PaymentForm
                  plan={plan}
                  homeSize={homeSize}
                  pricePerMonth={pricePerMonth}
                  planName={plan.name}
                  totalCents={totalCents}
                  onSuccess={(sub) => { setSub(sub); setStep("success"); }}
                  onError={(msg) => { setPiError(msg); setStep("review"); }}
                />
              </Elements>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
