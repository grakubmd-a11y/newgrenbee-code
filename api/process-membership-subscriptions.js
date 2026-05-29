/**
 * api/process-membership-subscriptions.js
 * Monthly cron: charge active membership subscriptions whose nextBillingDate <= today.
 *
 * Schedule: "0 10 * * *" (daily at 10am UTC — checks if billing is due that day)
 *
 * Requires: stripeCustomerId + stripePaymentMethodId on the subscription doc.
 * These are saved by confirm-membership-subscription.js after the first payment.
 */

import Stripe from "stripe";
import { getFirestore, sendJson } from "./_recurring.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const cronSecret      = process.env.CRON_SECRET;
const hasStripe =
  typeof stripeSecretKey === "string" &&
  stripeSecretKey.trim().length > 0 &&
  !stripeSecretKey.includes("REPLACE_ME");
const stripe = hasStripe ? new Stripe(stripeSecretKey) : null;

function addOneMonth(isoDate) {
  const d = new Date(`${isoDate}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().split("T")[0];
}

export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "POST") {
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // Allow Vercel cron (Authorization header) or manual trigger with CRON_SECRET
  const authHeader = req.headers.authorization || "";
  const isVercelCron = authHeader === "Bearer " + cronSecret;
  if (!isVercelCron) {
    return sendJson(res, 401, { error: "Unauthorized." });
  }

  if (!stripe) {
    return sendJson(res, 503, { error: "Stripe is not configured." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, { error: "Firebase Admin credentials are not configured." });
  }

  const today = new Date().toISOString().split("T")[0];
  const results = { processed: 0, skipped: 0, failed: 0, errors: [] };

  try {
    // Fetch all active subscriptions due for billing today or earlier
    const snap = await db
      .collection("membershipSubscriptions")
      .where("status", "==", "active")
      .where("nextBillingDate", "<=", today)
      .get();

    for (const docSnap of snap.docs) {
      const sub = docSnap.data();
      const subId = docSnap.id;

      // Skip if missing payment method (first payment not yet saved)
      if (!sub.stripeCustomerId || !sub.stripePaymentMethodId) {
        results.skipped++;
        continue;
      }

      try {
        // Charge the saved payment method
        const intent = await stripe.paymentIntents.create({
          amount:         Math.round(sub.pricePerMonth * 100),
          currency:       "usd",
          customer:       sub.stripeCustomerId,
          payment_method: sub.stripePaymentMethodId,
          off_session:    true,
          confirm:        true,
          description:    `Grenbee ${sub.planName} — ${sub.homeSize} home (monthly renewal)`,
          metadata: {
            type:           "membership_renewal",
            subscriptionId: subId,
            planId:         sub.planId,
            userId:         sub.userId,
          },
        });

        const now           = new Date().toISOString();
        const nextBillingDate = addOneMonth(sub.nextBillingDate);

        await docSnap.ref.update({
          nextBillingDate,
          lastBillingDate:   today,
          lastBillingStatus: intent.status,
          failureCount:      0,
          updatedAt:         now,
        });

        results.processed++;
      } catch (err) {
        const now = new Date().toISOString();
        const newFailureCount = (sub.failureCount || 0) + 1;
        const updates = {
          failureCount:      newFailureCount,
          lastBillingStatus: "failed",
          updatedAt:         now,
        };
        // After 3 failures, mark past_due
        if (newFailureCount >= 3) {
          updates.status = "past_due";
        }
        await docSnap.ref.update(updates);
        results.failed++;
        results.errors.push({ subId, error: err.message });
      }
    }
  } catch (err) {
    return sendJson(res, 500, { error: err.message || "Unexpected error.", results });
  }

  return sendJson(res, 200, { ok: true, date: today, results });
}
