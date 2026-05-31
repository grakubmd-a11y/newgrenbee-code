/**
 * api/confirm-membership-subscription.js
 * Called after Stripe payment succeeds. Verifies the PaymentIntent and
 * creates the membershipSubscriptions Firestore document.
 *
 * Auth: Firebase ID token required.
 * Body: { paymentIntentId, planId, homeSize, userName }
 * Response: { subscriptionId, subscription }
 */

import Stripe from "stripe";
import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";
import { sendEmail, buildMembershipConfirmationEmail } from "./_mailer.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
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
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!stripe) {
    return sendJson(res, 503, { error: "Stripe is not configured on this server." });
  }

  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Sign in to confirm a membership subscription." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, { error: "Firebase Admin credentials are not configured." });
  }

  const { paymentIntentId, planId, homeSize, userName } = parseBody(req);

  if (!paymentIntentId || !planId || !homeSize) {
    return sendJson(res, 400, { error: "paymentIntentId, planId, and homeSize are required." });
  }

  // ── Verify PaymentIntent ──────────────────────────────────────────────────
  let intent;
  try {
    intent = await stripe.paymentIntents.retrieve(paymentIntentId);
  } catch (err) {
    return sendJson(res, 400, { error: "Could not retrieve PaymentIntent from Stripe." });
  }

  if (intent.status !== "succeeded") {
    return sendJson(res, 400, {
      error: `Payment not completed. Status: ${intent.status}. Please try again.`,
    });
  }

  // Verify the intent belongs to this user (check metadata.userId)
  if (intent.metadata?.userId && intent.metadata.userId !== decoded.uid) {
    return sendJson(res, 403, { error: "PaymentIntent does not belong to this user." });
  }

  // ── Idempotency: check if subscription already exists for this PI ─────────
  const existing = await db
    .collection("membershipSubscriptions")
    .where("stripePaymentIntentId", "==", paymentIntentId)
    .limit(1)
    .get();

  if (!existing.empty) {
    const sub = { id: existing.docs[0].id, ...existing.docs[0].data() };
    return sendJson(res, 200, { subscriptionId: sub.id, subscription: sub });
  }

  // ── Load plan ─────────────────────────────────────────────────────────────
  const planSnap = await db.collection("membershipPlans").doc(planId).get();
  if (!planSnap.exists) {
    return sendJson(res, 404, { error: "Membership plan not found." });
  }
  const plan = planSnap.data();
  const priceTier = plan.pricing?.[homeSize];

  // ── Extract Stripe payment method ─────────────────────────────────────────
  let stripePaymentMethodId = null;
  let stripeCustomerId = intent.customer || null;
  try {
    if (intent.payment_method) {
      stripePaymentMethodId = typeof intent.payment_method === "string"
        ? intent.payment_method
        : intent.payment_method?.id;
    }
  } catch {}

  // ── Create subscription doc ───────────────────────────────────────────────
  const now       = new Date().toISOString();
  const today     = now.split("T")[0];
  const nextMonth = addOneMonth(today);

  const subData = {
    userId:         decoded.uid,
    userEmail:      decoded.email || intent.metadata?.userEmail || "",
    userName:       userName || intent.metadata?.userName || "",
    planId,
    planName:       plan.name,
    planType:       plan.type,
    homeSize,
    pricePerMonth:  priceTier?.price ?? 0,
    visitsPerMonth: plan.visitsPerMonth,
    frequencyLabel: plan.frequencyLabel,
    creditsPerMonth: plan.credits?.monthlyAmount ?? null,
    status:         "active",
    stripeCustomerId:      stripeCustomerId || null,
    stripePaymentMethodId: stripePaymentMethodId || null,
    stripePaymentIntentId: paymentIntentId,
    currentPeriodStart: today,
    nextBillingDate:    nextMonth,
    lastBillingDate:    today,
    lastBillingStatus:  "succeeded",
    cancelledAt:    null,
    pausedAt:       null,
    failureCount:   0,
    createdAt:      now,
    updatedAt:      now,
  };

  const ref = await db.collection("membershipSubscriptions").add(subData);

  // Update stripePaymentMethodId on user doc for future off-session charges
  if (stripePaymentMethodId && stripeCustomerId) {
    try {
      await db.collection("users").doc(decoded.uid).set(
        { stripeCustomerId, stripePaymentMethodId, updatedAt: now },
        { merge: true }
      );
    } catch {}
  }

  const subscription = { id: ref.id, ...subData };

  // Send confirmation email (non-blocking — sendEmail resolves silently on error)
  if (subscription.userEmail) {
    try {
      const { subject, html } = buildMembershipConfirmationEmail(subscription);
      await sendEmail(subscription.userEmail, subject, html);
    } catch (mailErr) {
      console.error("membership confirmation email failed:", mailErr?.message);
    }
  }

  return sendJson(res, 200, { subscriptionId: ref.id, subscription });
}
