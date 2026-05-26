import React, { useEffect, useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe, StripeElementsOptions } from "@stripe/stripe-js";
import { Booking, Service } from "../../shared/types";
import { fetchPublicSettingsFromFirestore } from "../../shared/services/firebaseService";

type BookingDraft = Omit<Booking, "id" | "status" | "createdAt">;

interface BookingParams {
  serviceId: string;
  units: number;
  selectedFactors: { [factorName: string]: { label: string; modifier: number } };
  frequency: "once" | "weekly" | "bi-weekly" | "monthly";
  totalCost: number;
  originalCost?: number;
  couponCode?: string;
  couponDiscount?: number;
}

interface StripePaymentPanelProps {
  bookingParams: BookingParams;
  service: Service;
  selectedDate: string;
  selectedSlot: string;
  validateBeforePayment: () => boolean;
  onPaymentStarted: () => void;
  onPaymentFinished: () => void;
  onLog: (logs: string[]) => void;
  onSubmitBooking: (booking: BookingDraft) => void;
  buildBookingDraft: (stripePayment: {
    paymentIntentId: string;
    paymentIntentStatus: string;
    paymentStatus: "paid" | "authorized";
  }) => BookingDraft;
  isProcessing: boolean;
}

function isUsableStripePublishableKey(value: string) {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.includes("REPLACE_ME");
}

function EmbeddedStripeForm({
  bookingParams,
  validateBeforePayment,
  onPaymentStarted,
  onPaymentFinished,
  onLog,
  onSubmitBooking,
  buildBookingDraft,
  isProcessing
}: Omit<StripePaymentPanelProps, "service" | "selectedDate" | "selectedSlot">) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState("");

  const handleStripeSubmit = async () => {
    if (!validateBeforePayment()) {
      return;
    }

    if (!stripe || !elements) {
      setMessage("Stripe is still loading. Please try again in a moment.");
      return;
    }

    setMessage("");
    onPaymentStarted();
    onLog([
      "[SYSTEM] Preparing embedded Stripe Elements authorization...",
      `[CLIENT] Confirming PaymentIntent for $${bookingParams.totalCost.toFixed(2)} USD inside the current page...`
    ]);

    try {
      const result = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/?payment=complete`
        }
      });

      if (result.error) {
        setMessage(result.error.message || "Payment authorization failed.");
        onLog([
          "[GATEWAY] Stripe returned an immediate error.",
          `[CLIENT] ${result.error.message || "Payment authorization failed."}`
        ]);
        return;
      }

      const paymentIntent = result.paymentIntent;
      if (!paymentIntent) {
        setMessage("Stripe did not return a PaymentIntent confirmation.");
        return;
      }

      const confirmResponse = await fetch("/api/confirm-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentIntentId: paymentIntent.id,
          couponCode: bookingParams.couponCode || ""
        })
      });
      const confirmPayload = await confirmResponse.json().catch(() => ({}));
      if (!confirmResponse.ok) {
        throw new Error(confirmPayload.error || "Could not verify Stripe payment.");
      }

      const paymentStatus = paymentIntent.status === "succeeded" ? "paid" : "authorized";
      onLog([
        "[GATEWAY] Stripe authorization confirmed inside embedded checkout.",
        `[SERVER] PaymentIntent ${paymentIntent.id} status: ${paymentIntent.status}`,
        confirmPayload.couponUsage?.recorded
          ? "[SERVER] Coupon usage count recorded after payment confirmation."
          : `[SERVER] Coupon usage count not recorded: ${confirmPayload.couponUsage?.reason || "No coupon used."}`,
        "[CLIENT] Booking finalized and ready to save."
      ]);

      onSubmitBooking(buildBookingDraft({
        paymentIntentId: paymentIntent.id,
        paymentIntentStatus: paymentIntent.status,
        paymentStatus
      }));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Could not complete Stripe payment.";
      setMessage(errorMessage);
      onLog([
        "[SERVER] Payment verification failed.",
        `[CLIENT] ${errorMessage}`
      ]);
    } finally {
      onPaymentFinished();
    }
  };

  return (
    <div className="space-y-5">
      <PaymentElement
        options={{
          layout: {
            type: "tabs",
            defaultCollapsed: false
          }
        }}
      />

      {message && (
        <div className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
          <Icons.AlertCircle size={16} className="mt-0.5 shrink-0" />
          <span>{message}</span>
        </div>
      )}

      <button
        type="button"
        disabled={isProcessing || !stripe || !elements}
        onClick={handleStripeSubmit}
        className="w-full h-12 flex items-center justify-center gap-2 rounded-xl bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-md shadow-brand/20 transition-all hover:scale-[1.01] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <Icons.Loader className="animate-spin" size={14} />
            <span>Authorizing With Stripe...</span>
          </>
        ) : (
          <>
            <Icons.Lock size={14} strokeWidth={3} />
            <span>Authorize ${bookingParams.totalCost.toFixed(2)} Securely</span>
          </>
        )}
      </button>
    </div>
  );
}

export default function StripePaymentPanel({
  bookingParams,
  service,
  selectedDate,
  selectedSlot,
  validateBeforePayment,
  onPaymentStarted,
  onPaymentFinished,
  onLog,
  onSubmitBooking,
  buildBookingDraft,
  isProcessing
}: StripePaymentPanelProps) {
  const [clientSecret, setClientSecret] = useState("");
  const [setupError, setSetupError] = useState("");
  const [isLoadingIntent, setIsLoadingIntent] = useState(false);
  const [publishableKey, setPublishableKey] = useState(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "");

  const amountInCents = useMemo(() => Math.round(bookingParams.totalCost * 100), [bookingParams.totalCost]);
  const stripePromise = useMemo(() => isUsableStripePublishableKey(publishableKey) ? loadStripe(publishableKey) : null, [publishableKey]);

  useEffect(() => {
    let cancelled = false;

    async function loadSavedPublicKey() {
      try {
        const settings = await fetchPublicSettingsFromFirestore();
        if (!cancelled && settings?.stripePublishableKey && isUsableStripePublishableKey(settings.stripePublishableKey)) {
          setPublishableKey(settings.stripePublishableKey.trim());
        }
      } catch (error) {
        console.warn("Could not load Stripe publishable key from settings", error);
      }
    }

    loadSavedPublicKey();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function createIntent() {
      if (!isUsableStripePublishableKey(publishableKey)) {
        setSetupError("Stripe publishable key is missing. Add it in Admin > Integrations or Vercel env.");
        return;
      }

      setIsLoadingIntent(true);
      setSetupError("");
      try {
        const response = await fetch("/api/create-payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: amountInCents,
            currency: "usd",
            booking: {
              serviceId: bookingParams.serviceId,
              serviceName: service.name,
              bookingDate: selectedDate,
              timeSlot: selectedSlot,
              frequency: bookingParams.frequency,
              couponCode: bookingParams.couponCode || "",
              couponDiscount: bookingParams.couponDiscount || 0
            }
          })
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(payload.error || "Could not create Stripe PaymentIntent.");
        }
        if (!cancelled) {
          setClientSecret(payload.clientSecret || "");
        }
      } catch (error) {
        if (!cancelled) {
          setSetupError(error instanceof Error ? error.message : "Could not initialize Stripe payment.");
        }
      } finally {
        if (!cancelled) {
          setIsLoadingIntent(false);
        }
      }
    }

    createIntent();
    return () => {
      cancelled = true;
    };
  }, [
    amountInCents,
    bookingParams.couponCode,
    bookingParams.couponDiscount,
    bookingParams.frequency,
    bookingParams.serviceId,
    selectedDate,
    selectedSlot,
    service.name,
    publishableKey
  ]);

  const stripeOptions = useMemo<StripeElementsOptions>(() => ({
    clientSecret,
    appearance: {
      theme: "stripe",
      variables: {
        colorPrimary: "#0f9f6e",
        colorText: "#111827",
        colorDanger: "#e11d48",
        borderRadius: "12px",
        fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif"
      },
      rules: {
        ".Tab": {
          border: "1px solid #d1e7dc",
          boxShadow: "none"
        },
        ".Tab--selected": {
          borderColor: "#0f9f6e",
          boxShadow: "0 0 0 1px #0f9f6e"
        },
        ".Input": {
          border: "1px solid #d1d5db",
          boxShadow: "none"
        }
      }
    }
  }), [clientSecret]);

  if (isLoadingIntent) {
    return (
      <div className="rounded-2xl border border-brand/15 bg-brand-light/30 p-5 text-sm text-brand flex items-center gap-3">
        <Icons.Loader className="animate-spin" size={18} />
        <span className="font-bold">Preparing secure embedded Stripe checkout...</span>
      </div>
    );
  }

  if (setupError || !stripePromise || !clientSecret) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 space-y-3 text-amber-900">
        <div className="flex items-start gap-2">
          <Icons.AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <h5 className="text-sm font-extrabold">Stripe embedded checkout is not ready yet</h5>
            <p className="mt-1 text-xs leading-normal">
              {setupError || "Missing Stripe client configuration."}
            </p>
          </div>
        </div>
        <p className="text-[11px] leading-normal text-amber-800">
          Add the public key in Admin &gt; Integrations and `STRIPE_SECRET_KEY` on Vercel/server env to activate live card authorization inside this page.
        </p>
      </div>
    );
  }

  return (
    <Elements stripe={stripePromise} options={stripeOptions} key={clientSecret}>
      <EmbeddedStripeForm
        bookingParams={bookingParams}
        validateBeforePayment={validateBeforePayment}
        onPaymentStarted={onPaymentStarted}
        onPaymentFinished={onPaymentFinished}
        onLog={onLog}
        onSubmitBooking={onSubmitBooking}
        buildBookingDraft={buildBookingDraft}
        isProcessing={isProcessing}
      />
    </Elements>
  );
}
