/**
 * api/create-membership-checkout.js
 * Creates a Stripe PaymentIntent for the first month of a membership subscription.
 *
 * Unlike bookings (capture_method: manual), memberships use automatic capture
 * because we charge immediately when the subscription starts.
 * setup_future_usage: 'off_session' saves the payment method for monthly renewal cron.
 *
 * Auth: Firebase ID token required in Authorization header.
 *
 * Body: { planId, homeSize, userName }
 * Response: { clientSecret, totalCents, planName, pricePerMonth }
 */

import Stripe from "stripe";
import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const hasStripe =
  typeof stripeSecretKey === "string" &&
  stripeSecretKey.trim().length > 0 &&
  !stripeSecretKey.includes("REPLACE_ME");
const stripe = hasStripe ? new Stripe(stripeSecretKey) : null;

const VALID_SIZES = new Set(["small", "medium", "large", "xl"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  if (!stripe) {
    return sendJson(res, 503, { error: "Stripe is not configured on this server." });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Sign in to purchase a membership plan." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, { error: "Firebase Admin credentials are not configured." });
  }

  // ── Validate body ─────────────────────────────────────────────────────────
  const { planId, homeSize, userName } = parseBody(req);

  if (!planId || typeof planId !== "string") {
    return sendJson(res, 400, { error: "planId is required." });
  }
  if (!VALID_SIZES.has(homeSize)) {
    return sendJson(res, 400, { error: "homeSize must be small, medium, large, or xl." });
  }

  // ── Load plan from Firestore ───────────────────────────────────────────────
  const planSnap = await db.collection("membershipPlans").doc(planId).get();
  if (!planSnap.exists) {
    return sendJson(res, 404, { error: "Membership plan not found." });
  }
  const plan = planSnap.data();

  if (!plan.active || plan.byQuote) {
    return sendJson(res, 400, { error: "This plan is not available for self-serve purchase." });
  }

  const priceTier = plan.pricing?.[homeSize];
  if (!priceTier || priceTier.customQuote || !priceTier.price) {
    return sendJson(res, 400, { error: "This home size requires a custom quote." });
  }

  const pricePerMonth = Math.round(priceTier.price * 100); // cents

  // ── Get or create Stripe Customer ─────────────────────────────────────────
  const userId    = decoded.uid;
  const userEmail = decoded.email || "";

  let stripeCustomerId = null;
  try {
    const userRef  = db.collection("users").doc(userId);
    const userSnap = await userRef.get();
    if (userSnap.exists) {
      const userData = userSnap.data() || {};
      stripeCustomerId = userData.stripeCustomerId || null;
    }
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        ...(userEmail ? { email: userEmail } : {}),
        ...(userName  ? { name: userName   } : {}),
        metadata: { userId, source: "grenbee-membership" },
      });
      stripeCustomerId = customer.id;
      await userRef.set({ stripeCustomerId, updatedAt: new Date().toISOString() }, { merge: true });
    }
  } catch (err) {
    console.error("create-membership-checkout: stripe customer error", err);
    // Non-fatal — continue without customer linkage
  }

  // ── Create PaymentIntent ──────────────────────────────────────────────────
  try {
    const intentParams = {
      amount:      pricePerMonth,
      currency:    "usd",
      // capture_method defaults to 'automatic' — charge immediately
      setup_future_usage: "off_session", // save card for monthly renewal
      description: `Grenbee ${plan.name} — ${homeSize} home (first month)`,
      metadata: {
        type:      "membership_subscription",
        planId,
        planName:  plan.name,
        homeSize,
        userId,
        userEmail: String(userEmail).slice(0, 200),
      },
      ...(stripeCustomerId ? { customer: stripeCustomerId } : {}),
    };

    const intent = await stripe.paymentIntents.create(intentParams);

    return sendJson(res, 200, {
      clientSecret:   intent.id + "_secret_" + intent.client_secret.split("_secret_")[1],
      clientSecretFull: intent.client_secret,
      totalCents:     pricePerMonth,
      planName:       plan.name,
      planType:       plan.type,
      pricePerMonth:  priceTier.price,
      priceLabel:     priceTier.priceLabel,
      visitsPerMonth: plan.visitsPerMonth,
      frequencyLabel: plan.frequencyLabel,
      creditsPerMonth: plan.credits?.monthlyAmount ?? null,
      stripeCustomerId,
    });
  } catch (err) {
    console.error("create-membership-checkout: PaymentIntent error", err);
    return sendJson(res, 500, {
      error: err.message || "Could not create Stripe PaymentIntent.",
    });
  }
}
