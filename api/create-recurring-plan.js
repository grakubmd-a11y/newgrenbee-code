/**
 * api/create-recurring-plan.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a recurring plan document in Firestore after a booking is saved.
 *
 * Called by PublicApp.handleWizardSubmit() right after createBookingInFirestore()
 * when frequency !== 'once' and a Stripe PaymentIntent was used.
 *
 * Auth: Firebase ID token in `Authorization: Bearer <token>` header.
 *       The userId in the body must match the token's uid.
 *
 * Body:
 *   bookingId            string   Firestore doc ID of the source booking
 *   userId               string   Firebase UID
 *   serviceId            string
 *   serviceName          string
 *   units                number
 *   selectedFactors      object
 *   frequency            'weekly' | 'bi-weekly' | 'monthly'
 *   bookingDate          string   YYYY-MM-DD  (next charge is +1 interval from this)
 *   timeSlot             string
 *   address              string
 *   notes                string
 *   totalCost            number
 *   stripePaymentIntentId string
 */

import {
  getFirestore,
  verifyIdToken,
  calculateNextChargeDate,
  sendJson,
  parseBody,
} from "./_recurring.js";

const VALID_RECURRENCE = new Set(["weekly", "bi-weekly", "monthly"]);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Valid Firebase ID token required." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, {
      error: "Firebase Admin credentials are not configured on this server.",
    });
  }

  // ── Parse & validate body ─────────────────────────────────────────────────
  const body = parseBody(req);
  const {
    bookingId,
    userId,
    serviceId,
    serviceName,
    units,
    selectedFactors = {},
    frequency,
    bookingDate,
    timeSlot = "",
    address = "",
    notes = "",
    totalCost = 0,
    stripePaymentIntentId = "",
    customerName = "",
    email = "",
    phone = "",
  } = body;

  if (!bookingId || typeof bookingId !== "string") {
    return sendJson(res, 400, { error: "bookingId is required." });
  }
  if (!userId || userId !== decoded.uid) {
    return sendJson(res, 403, { error: "userId does not match the authenticated user." });
  }
  if (!serviceId || typeof serviceId !== "string") {
    return sendJson(res, 400, { error: "serviceId is required." });
  }
  if (!VALID_RECURRENCE.has(frequency)) {
    return sendJson(res, 400, { error: `frequency must be one of: ${[...VALID_RECURRENCE].join(", ")}.` });
  }
  if (!bookingDate || !/^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) {
    return sendJson(res, 400, { error: "bookingDate must be YYYY-MM-DD." });
  }

  // ── Idempotency: skip if a plan already exists for this booking ───────────
  const existing = await db
    .collection("recurringPlans")
    .where("sourceBookingId", "==", bookingId)
    .limit(1)
    .get();
  if (!existing.empty) {
    const existingDoc = existing.docs[0];
    return sendJson(res, 200, {
      ok: true,
      planId: existingDoc.id,
      plan: { id: existingDoc.id, ...existingDoc.data() },
      alreadyExisted: true,
    });
  }

  // ── Compute next charge date ──────────────────────────────────────────────
  const nextChargeAt = calculateNextChargeDate(bookingDate, frequency);
  if (!nextChargeAt) {
    return sendJson(res, 400, { error: "Could not compute next charge date." });
  }

  const now = new Date().toISOString();

  // ── Build plan document ───────────────────────────────────────────────────
  const planData = {
    userId,
    sourceBookingId:       bookingId,
    lastBookingId:         bookingId,
    serviceId,
    serviceName:           String(serviceName || serviceId).slice(0, 100),
    recurrence:            frequency,
    status:                "active",
    amount:                Math.max(0, Number(totalCost) || 0),
    currency:              "usd",
    stripePaymentIntentId: String(stripePaymentIntentId || "").slice(0, 128),
    stripeCustomerId:      "",   // Set in Phase 1.3 (auto-charge)
    stripePaymentMethodId: "",   // Set in Phase 1.3 (auto-charge)
    nextChargeAt,
    lastChargeAt:          bookingDate,
    lastChargeStatus:      "paid",
    failureCount:          0,
    pausedAt:              null,
    cancelledAt:           null,
    consentCapturedAt:     now,
    templatePayload: {
      serviceId,
      serviceName:     String(serviceName || serviceId).slice(0, 100),
      units:           Math.max(1, Number(units) || 1),
      selectedFactors: typeof selectedFactors === "object" ? selectedFactors : {},
      address:         String(address || "").slice(0, 300),
      timeSlot:        String(timeSlot || "").slice(0, 60),
      notes:           String(notes || "").slice(0, 1000),
      customerName:    String(customerName || "").slice(0, 100),
      email:           String(email || "").slice(0, 100),
      phone:           String(phone || "").slice(0, 30),
    },
    createdAt: now,
    updatedAt: now,
  };

  try {
    const ref = await db.collection("recurringPlans").add(planData);
    return sendJson(res, 201, {
      ok: true,
      planId: ref.id,
      plan: { id: ref.id, ...planData },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Could not create plan.";
    return sendJson(res, 500, { error: msg });
  }
}
