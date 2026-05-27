/**
 * api/process-recurring-plans.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Vercel cron endpoint — runs hourly (see vercel.json).
 * Phase 1.3 will fill this in with full auto-charge logic:
 *   1. Query recurringPlans where status='active' AND nextChargeAt <= today
 *   2. For each: charge via Stripe (stripe.paymentIntents.create with off_session)
 *   3. Create new booking in Firestore
 *   4. Advance nextChargeAt by one interval
 *   5. On failure: mark past_due + increment failureCount
 *
 * Requires (not yet set up):
 *   - STRIPE_SECRET_KEY  (already present)
 *   - Stripe Customer ID + saved Payment Method per plan (Phase 1.3)
 *   - FIREBASE_SERVICE_ACCOUNT_JSON  (already present)
 *   - Vercel Pro or higher for cron jobs
 */

import { getFirestore, sendJson } from "./_recurring.js";

export default async function handler(req, res) {
  // Vercel crons send GET; protect against random external callers with a secret
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
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

  // ── Phase 1.3 TODO: query & charge due plans ──────────────────────────────
  // const today = new Date().toISOString().split("T")[0];
  // const due = await db.collection("recurringPlans")
  //   .where("status", "==", "active")
  //   .where("nextChargeAt", "<=", today)
  //   .limit(25)
  //   .get();
  // ... process each plan

  return sendJson(res, 200, {
    ok: true,
    message: "Recurring plan processor stub — Phase 1.3 not yet implemented.",
    processed: 0,
  });
}
