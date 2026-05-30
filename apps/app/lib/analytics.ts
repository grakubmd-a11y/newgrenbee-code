/**
 * lib/analytics.ts — Thin funnel event tracker for the booking wizard.
 *
 * Uses a custom `window.gbee_track` hook when available (easy to connect to
 * GA4, Mixpanel, PostHog, or any analytics provider). Falls back to a
 * `console.debug` no-op so it never throws in tests or SSR.
 *
 * To activate GA4: add the gtag script to layout.tsx and set
 *   NEXT_PUBLIC_GA_MEASUREMENT_ID in Vercel env vars.
 *
 * Events tracked:
 *   booking_funnel_start     — user opens the estimator
 *   booking_step_schedule    — user reaches step 1 (date/time)
 *   booking_step_details     — user reaches step 2 (contact info)
 *   booking_step_payment     — user reaches step 3 (payment)
 *   booking_complete         — booking confirmed (step 4)
 *   booking_abandon          — user clicked Back at step 1 (exit wizard)
 */

export type FunnelEvent =
  | "booking_funnel_start"
  | "booking_step_schedule"
  | "booking_step_details"
  | "booking_step_payment"
  | "booking_complete"
  | "booking_abandon";

interface EventParams {
  serviceId?:   string;
  serviceName?: string;
  totalCost?:   number;
  step?:        number;
  [key: string]: string | number | boolean | undefined;
}

/**
 * Fire-and-forget funnel event.
 * Safe to call on both client and server (no-ops on server).
 */
export function trackFunnelEvent(event: FunnelEvent, params: EventParams = {}): void {
  if (typeof window === "undefined") return; // SSR guard

  try {
    const gaMeasurementId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;

    // GA4 via gtag (if the script is loaded and measurement ID is set)
    if (gaMeasurementId && typeof (window as any).gtag === "function") {
      (window as any).gtag("event", event, {
        ...params,
        event_category: "booking_funnel",
      });
    }

    // Escape hatch for any custom analytics hook
    if (typeof (window as any).gbee_track === "function") {
      (window as any).gbee_track(event, params);
    }

    // Always log in dev so engineers can see funnel events in the console
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.debug(`[analytics] ${event}`, params);
    }
  } catch {
    // Never let analytics crash the app
  }
}
