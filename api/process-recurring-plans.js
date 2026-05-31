/**
 * api/process-recurring-plans.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel cron endpoint — runs hourly (see vercel.json).
 *
 * For each active recurring plan whose nextChargeAt <= today:
 *   1. Create an off-session Stripe PaymentIntent (charge immediately)
 *   2. Create a new booking in Firestore based on the plan's templatePayload
 *   3. Advance nextChargeAt by one interval
 *   4. On failure: mark past_due + increment failureCount
 *
 * Plans without a saved stripeCustomerId / stripePaymentMethodId are skipped
 * — those IDs are populated by the stripe-webhook handler after the first
 * booking's PI reaches `requires_capture` status.
 *
 * Env vars required
 * ─────────────────
 *   STRIPE_SECRET_KEY             — Stripe secret key
 *   FIREBASE_SERVICE_ACCOUNT_JSON — Firebase Admin credentials
 *   CRON_SECRET                   — optional; protects against random callers
 */

import Stripe from "stripe";
import { getFirestore, calculateNextChargeDate, sendJson, localDateMT } from "./_recurring.js";
import { sendEmail, buildRecurringReceiptEmail } from "./_mailer.js";
import { assignStaffToBooking } from "./auto-assign-staff.js";

// ── Stripe init ───────────────────────────────────────────────────────────────

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripe = stripeSecretKey && !stripeSecretKey.includes("REPLACE_ME")
  ? new Stripe(stripeSecretKey)
  : null;

// ── Cron handler ──────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  // Vercel crons send GET; protect against random external callers with a secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && !cronSecret.includes("REPLACE_ME")) {
    const authHeader = req.headers["authorization"] || "";
    if (authHeader !== `Bearer ${cronSecret}`) {
      return sendJson(res, 401, { error: "Unauthorized." });
    }
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, {
      ok: false,
      message: "Firebase Admin not configured — skipping cron run.",
    });
  }

  if (!stripe) {
    return sendJson(res, 503, {
      ok: false,
      message: "Stripe not configured — skipping cron run.",
    });
  }

  const today = localDateMT(); // Mountain Time — avoids UTC off-by-one at night

  // ── Query due plans ───────────────────────────────────────────────────────
  let due;
  try {
    due = await db
      .collection("recurringPlans")
      .where("status", "==", "active")
      .where("nextChargeAt", "<=", today)
      .limit(25)
      .get();
  } catch (err) {
    return sendJson(res, 500, {
      ok: false,
      message: `Firestore query failed: ${err?.message}`,
    });
  }

  const results = { processed: 0, failed: 0, skipped: 0, total: due.size };

  // ── Process each due plan ─────────────────────────────────────────────────
  for (const planDoc of due.docs) {
    const plan = planDoc.data();

    // Skip plans that don't have a saved payment method yet
    if (!plan.stripeCustomerId || !plan.stripePaymentMethodId) {
      results.skipped++;
      continue;
    }

    const amountCents = Math.round((plan.amount || 0) * 100);
    if (amountCents < 50) {
      // Amount too small — cancel to avoid repeated micro-charge attempts
      await planDoc.ref.update({
        status:    "cancelled",
        cancelledAt: new Date().toISOString(),
        updatedAt:   new Date().toISOString(),
      });
      results.skipped++;
      continue;
    }

    const chargeDate  = plan.nextChargeAt;  // YYYY-MM-DD of this occurrence
    const nextCharge  = calculateNextChargeDate(chargeDate, plan.recurrence);
    const now         = new Date().toISOString();

    try {
      // ── Off-session Stripe charge ───────────────────────────────────────
      const pi = await stripe.paymentIntents.create({
        amount:          amountCents,
        currency:        plan.currency || "usd",
        customer:        plan.stripeCustomerId,
        payment_method:  plan.stripePaymentMethodId,
        off_session:     true,
        confirm:         true,
        description:     `Grenbee — ${plan.serviceName} (${plan.recurrence})`,
        metadata: {
          planId:    planDoc.id,
          userId:    plan.userId,
          serviceId: plan.serviceId,
          frequency: plan.recurrence,
          source:    "grenbee-cron",
        },
      });

      // ── Create new booking from template ───────────────────────────────
      const t = plan.templatePayload || {};
      const newBookingId = db.collection("bookings").doc().id;

      const newBooking = {
        id:                    newBookingId,
        userId:                plan.userId,
        serviceId:             t.serviceId   || plan.serviceId,
        serviceName:           t.serviceName || plan.serviceName,
        bookingDate:           chargeDate,
        timeSlot:              t.timeSlot    || "",
        status:                "scheduled",
        customerName:          t.customerName || "",
        email:                 t.email        || "",
        phone:                 t.phone        || "",
        address:               t.address      || "",
        units:                 t.units        || 1,
        selectedFactors:       t.selectedFactors || {},
        frequency:             plan.recurrence,
        notes:                 t.notes        || "",
        totalCost:             plan.amount,
        paymentMethod:         "card",
        paymentStatus:         "processing",
        stripePaymentIntentId: pi.id,
        stripePaymentStatus:   pi.status,
        recurringPlanId:       planDoc.id,
        createdAt:             now,
        updatedAt:             now,
      };

      await db.collection("bookings").doc(newBookingId).set(newBooking);

      // ── Auto-assign staff to the new booking (fire-and-forget) ────────────
      // Runs after the booking is persisted so assignStaffToBooking can read it.
      // Non-fatal: a failure here does not roll back the charge or the booking.
      assignStaffToBooking(db, newBookingId).catch((err) => {
        console.error(
          `[process-recurring-plans] Auto-assign failed for booking ${newBookingId} (plan ${planDoc.id}):`,
          err?.message || err
        );
      });

      // ── Advance plan to next occurrence ─────────────────────────────────
      await planDoc.ref.update({
        lastBookingId:         newBookingId,
        lastChargeAt:          chargeDate,
        lastChargeStatus:      pi.status === "succeeded" ? "succeeded" : "processing",
        nextChargeAt:          nextCharge,
        stripePaymentIntentId: pi.id,
        failureCount:          0,
        updatedAt:             now,
      });

      // ── Email receipt to customer (fire-and-forget) ─────────────────────
      const customerEmail = plan.templatePayload?.email;
      if (customerEmail) {
        const { subject, html } = buildRecurringReceiptEmail(
          { ...plan, id: planDoc.id, nextChargeAt: nextCharge },
          newBooking
        );
        sendEmail(customerEmail, subject, html).catch(() => {/* non-fatal */});
      }

      results.processed++;

    } catch (err) {
      // Stripe off-session failures use err.code (e.g. 'card_declined')
      const failureCode = err?.code || err?.message || "unknown";
      const newCount    = (plan.failureCount || 0) + 1;

      await planDoc.ref.update({
        status:           "past_due",
        failureCount:     newCount,
        lastChargeStatus: String(failureCode).slice(0, 100),
        updatedAt:        new Date().toISOString(),
      }).catch(() => {/* best-effort */});

      console.error(`[process-recurring-plans] Plan ${planDoc.id} failed:`, failureCode);
      results.failed++;
    }
  }

  return sendJson(res, 200, {
    ok:        true,
    date:      today,
    ...results,
  });
}
