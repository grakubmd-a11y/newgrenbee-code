/**
 * api/stripe-webhook.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Stripe webhook endpoint — receives signed events from Stripe and updates
 * Firestore accordingly.
 *
 * Handled events
 * ──────────────
 * payment_intent.amount_capturable_updated
 *   Fires when a PaymentIntent with capture_method=manual is confirmed by the
 *   customer.  If setup_future_usage=off_session was set (recurring plans), the
 *   PI now carries customer + payment_method → we store them on the plan so the
 *   cron job can charge off-session later.
 *
 * payment_intent.succeeded
 *   Fires after capture (initial booking) or after an off-session cron charge.
 *   Updates booking stripePaymentStatus + plan lastChargeStatus.
 *
 * payment_intent.payment_failed
 *   Fires when a charge attempt fails (including off-session retry).
 *   Marks the plan as past_due and increments failureCount.
 *
 * Env vars required
 * ─────────────────
 *   STRIPE_SECRET_KEY          — already present
 *   STRIPE_WEBHOOK_SECRET      — wh_sec_... from the Stripe dashboard
 *   FIREBASE_SERVICE_ACCOUNT_JSON — already present
 *
 * Vercel config
 * ─────────────
 * bodyParser must be disabled so we receive the raw body for signature
 * verification.  Controlled by the `config` export below.
 */

import Stripe from "stripe";
import { getFirestore } from "./_recurring.js";
import { sendEmail, buildStatusUpdateEmail } from "./_mailer.js";

// ── Stripe init ───────────────────────────────────────────────────────────────

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret   = process.env.STRIPE_WEBHOOK_SECRET;

const stripe = stripeSecretKey && !stripeSecretKey.includes("REPLACE_ME")
  ? new Stripe(stripeSecretKey)
  : null;

// ── Vercel: disable body parser so we get the raw Buffer ─────────────────────

export const config = {
  api: { bodyParser: false },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

/** Collect raw request body as a Buffer (needed for Stripe signature check). */
function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (chunk) => chunks.push(chunk));
    req.on("end",  () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/** Resolve payment_method to a string ID regardless of expansion state. */
function pmId(pm) {
  if (!pm) return null;
  return typeof pm === "string" ? pm : pm.id || null;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  if (!stripe) {
    return sendJson(res, 503, { error: "Stripe not configured." });
  }

  // ── Signature verification ────────────────────────────────────────────────
  const sig = req.headers["stripe-signature"];
  if (!sig) {
    return sendJson(res, 400, { error: "Missing Stripe-Signature header." });
  }

  const rawBody = await getRawBody(req);
  let event;

  if (webhookSecret && !webhookSecret.includes("REPLACE_ME")) {
    try {
      event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
    } catch (err) {
      return sendJson(res, 400, { error: `Webhook signature verification failed: ${err.message}` });
    }
  } else {
    // Dev fallback: parse without verification (only safe in local testing)
    try {
      event = JSON.parse(rawBody.toString());
    } catch {
      return sendJson(res, 400, { error: "Invalid JSON body." });
    }
  }

  const db = getFirestore();
  if (!db) {
    // Acknowledge to Stripe so it doesn't retry; log the gap
    console.error("[stripe-webhook] Firebase Admin not configured — event not persisted:", event.type);
    return sendJson(res, 200, { received: true, warning: "Firebase not configured." });
  }

  // ── Route by event type ────────────────────────────────────────────────────
  try {
    switch (event.type) {

      // ── PI authorized (manual capture) ───────────────────────────────────
      // Fires when the customer confirms a capture_method=manual PI.
      // 1. Mark the booking as "confirmed" (payment hold placed).
      // 2. For recurring plans: save Stripe Customer + PM so the cron can
      //    charge off-session later.
      case "payment_intent.amount_capturable_updated": {
        const pi  = event.data.object;
        const now = new Date().toISOString();

        // ── Mark booking as confirmed ──────────────────────────────────────
        const bookingSnap = await db
          .collection("bookings")
          .where("stripePaymentIntentId", "==", pi.id)
          .limit(1)
          .get();

        if (!bookingSnap.empty) {
          const bookingDoc  = bookingSnap.docs[0];
          const bookingData = { id: bookingDoc.id, ...bookingDoc.data() };
          // Only advance forward (don't overwrite "dispatched" etc.)
          if (bookingData.status === "scheduled") {
            await bookingDoc.ref.update({ status: "confirmed", updatedAt: now });
          }
        }

        // ── Recurring plan: persist Customer + PM for off-session charges ──
        const frequency = pi.metadata?.frequency;
        if (frequency && frequency !== "once") {
          const customerId      = typeof pi.customer === "string" ? pi.customer : pi.customer?.id;
          const paymentMethodId = pmId(pi.payment_method);
          if (customerId && paymentMethodId) {
            const planSnap = await db
              .collection("recurringPlans")
              .where("stripePaymentIntentId", "==", pi.id)
              .limit(1)
              .get();

            if (!planSnap.empty) {
              const planDoc  = planSnap.docs[0];
              const planData = planDoc.data();
              await planDoc.ref.update({
                stripeCustomerId:      customerId,
                stripePaymentMethodId: paymentMethodId,
                updatedAt:             now,
              });
              if (planData.userId) {
                await db.collection("users").doc(planData.userId).set(
                  { stripeCustomerId: customerId, updatedAt: now },
                  { merge: true }
                );
              }
            }
          }
        }
        break;
      }

      // ── PI succeeded — update booking + plan ─────────────────────────────
      case "payment_intent.succeeded": {
        const pi     = event.data.object;
        const source = pi.metadata?.source || "";
        const now    = new Date().toISOString();

        // Update booking stripePaymentStatus if one references this PI
        const bookingSnap = await db
          .collection("bookings")
          .where("stripePaymentIntentId", "==", pi.id)
          .limit(1)
          .get();

        if (!bookingSnap.empty) {
          await bookingSnap.docs[0].ref.update({
            stripePaymentStatus: "succeeded",
            paymentStatus:       "paid",
            updatedAt:           now,
          });
        }

        // For cron-originated PIs, also update the recurring plan
        if (source === "grenbee-cron") {
          const planId = pi.metadata?.planId;
          if (planId) {
            const planRef = db.collection("recurringPlans").doc(planId);
            await planRef.update({
              lastChargeStatus: "succeeded",
              updatedAt:        now,
            });
          }
        }
        break;
      }

      // ── PI failed ─────────────────────────────────────────────────────────
      case "payment_intent.payment_failed": {
        const pi        = event.data.object;
        const frequency = pi.metadata?.frequency;
        const now       = new Date().toISOString();
        const errorCode = pi.last_payment_error?.code || "payment_failed";

        // ── One-time booking failure: mark booking as payment_failed ───────
        if (!frequency || frequency === "once") {
          const failedSnap = await db
            .collection("bookings")
            .where("stripePaymentIntentId", "==", pi.id)
            .limit(1)
            .get();
          if (!failedSnap.empty) {
            await failedSnap.docs[0].ref.update({
              status:              "payment_failed",
              stripePaymentStatus: String(errorCode).slice(0, 100),
              updatedAt:           now,
            });
          }
          break;
        }

        // Determine which collection / query to use
        const source = pi.metadata?.source || "";
        let planRef = null;

        if (source === "grenbee-cron" && pi.metadata?.planId) {
          // Cron charge failure — planId is in metadata
          planRef = db.collection("recurringPlans").doc(pi.metadata.planId);
        } else {
          // Initial booking failure — look up by stripePaymentIntentId
          const planSnap = await db
            .collection("recurringPlans")
            .where("stripePaymentIntentId", "==", pi.id)
            .limit(1)
            .get();
          if (!planSnap.empty) planRef = planSnap.docs[0].ref;
        }

        if (!planRef) break;

        const planSnap2 = await planRef.get();
        if (!planSnap2.exists) break;

        const planData    = planSnap2.data();
        const newFailures = (planData.failureCount || 0) + 1;

        await planRef.update({
          status:           "past_due",
          failureCount:     newFailures,
          lastChargeStatus: String(errorCode).slice(0, 100),
          updatedAt:        now,
        });
        break;
      }

      default:
        // Acknowledge all other events without doing anything
        break;
    }
  } catch (err) {
    console.error("[stripe-webhook] Error processing event:", event.type, err?.message);
    // Still return 200 — Stripe would keep retrying on 5xx
    return sendJson(res, 200, { received: true, error: err?.message });
  }

  return sendJson(res, 200, { received: true });
}
