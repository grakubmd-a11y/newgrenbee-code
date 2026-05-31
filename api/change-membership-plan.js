/**
 * api/change-membership-plan.js
 * Upgrade or downgrade a membership subscription to a different plan.
 *
 * No immediate charge: the new plan/pricing takes effect on the next billing
 * cycle. Pricing is recomputed server-side from the new plan's Firestore
 * pricing tier for the subscription's existing homeSize (never trusted from
 * the client).
 *
 * Auth: Firebase ID token in Authorization header.
 * Body: { subscriptionId, newPlanId }
 * Response: { ok: true, newPlan: {...}, subscription: {...} }
 */

import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Valid Firebase ID token required." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, { error: "Firebase Admin credentials are not configured." });
  }

  const { subscriptionId, newPlanId } = parseBody(req);

  if (!subscriptionId || typeof subscriptionId !== "string") {
    return sendJson(res, 400, { error: "subscriptionId is required." });
  }
  if (!newPlanId || typeof newPlanId !== "string") {
    return sendJson(res, 400, { error: "newPlanId is required." });
  }

  // ── Load subscription & verify ownership ──────────────────────────────────
  const subRef  = db.collection("membershipSubscriptions").doc(subscriptionId);
  const subSnap = await subRef.get();
  if (!subSnap.exists) {
    return sendJson(res, 404, { error: "Subscription not found." });
  }

  const sub     = subSnap.data();
  const isOwner = sub.userId === decoded.uid;
  const isAdmin = decoded.admin === true;
  if (!isOwner && !isAdmin) {
    return sendJson(res, 403, { error: "You do not have permission to modify this subscription." });
  }

  if (sub.status === "cancelled") {
    return sendJson(res, 409, { error: "Cannot change the plan of a cancelled subscription." });
  }

  if (newPlanId === sub.planId) {
    return sendJson(res, 400, { error: "Subscription is already on this plan." });
  }

  // ── Load the new plan (server source of truth) ────────────────────────────
  const planSnap = await db.collection("membershipPlans").doc(newPlanId).get();
  if (!planSnap.exists) {
    return sendJson(res, 404, { error: "Membership plan not found." });
  }
  const plan = planSnap.data();

  if (!plan.active || plan.byQuote) {
    return sendJson(res, 400, { error: "This plan is not available for self-serve changes." });
  }

  // Reprice for the subscription's existing homeSize.
  const priceTier = plan.pricing?.[sub.homeSize];
  if (!priceTier || priceTier.customQuote || !priceTier.price) {
    return sendJson(res, 400, { error: "The selected plan requires a custom quote for this home size." });
  }

  const now = new Date().toISOString();
  const update = {
    planId:          newPlanId,
    planName:        plan.name,
    planType:        plan.type,
    pricePerMonth:   priceTier.price,
    visitsPerMonth:  plan.visitsPerMonth,
    frequencyLabel:  plan.frequencyLabel,
    creditsPerMonth: plan.credits?.monthlyAmount ?? null,
    updatedAt:       now,
    // No immediate charge — new pricing applies on the next billing cycle.
  };

  await subRef.update(update);

  const subscription = { id: subscriptionId, ...sub, ...update };
  return sendJson(res, 200, {
    ok: true,
    newPlan: {
      id:             newPlanId,
      name:           plan.name,
      pricePerMonth:  priceTier.price,
      visitsPerMonth: plan.visitsPerMonth,
      frequencyLabel: plan.frequencyLabel,
    },
    subscription,
  });
}
