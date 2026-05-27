/**
 * api/capture-lead.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Called fire-and-forget from the booking wizard right after a PaymentIntent
 * is created (user has entered all contact info but hasn't confirmed payment).
 *
 * Idempotent: if a lead for the same email already exists today and is still
 * 'new', it is updated in place rather than duplicated.
 *
 * No auth required — public endpoint (the user is not signed in at this point).
 *
 * POST {
 *   email, customerName, phone?,
 *   serviceId?, serviceName?,
 *   address?, estimatedValue?,
 *   stripePaymentIntentId?
 * }
 *
 * Response 200: { ok, leadId, created }
 */

import { getFirestore, sendJson, parseBody } from "./_recurring.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const db = getFirestore();
  if (!db) return sendJson(res, 503, { error: "Firebase Admin not configured." });

  const {
    email, customerName, phone,
    serviceId, serviceName,
    address, estimatedValue,
    stripePaymentIntentId,
  } = parseBody(req);

  if (!email || !customerName) {
    return sendJson(res, 400, { error: "email and customerName are required." });
  }

  const body2      = parseBody(req);
  const isRecovered = body2._recovered === true;
  const bookingId   = body2._bookingId  || null;

  const now       = new Date();
  const todayStr  = now.toISOString().slice(0, 10);
  const nowIso    = now.toISOString();
  const emailNorm = String(email).toLowerCase().trim();

  // ── If booking was completed: mark any matching open lead as recovered ─────
  if (isRecovered) {
    const openSnap = await db
      .collection("leads")
      .where("email",  "==", emailNorm)
      .where("status", "in", ["new", "contacted"])
      .limit(5)
      .get();

    if (!openSnap.empty) {
      const batch = db.batch();
      openSnap.docs.forEach(d =>
        batch.update(d.ref, {
          status:             "recovered",
          convertedBookingId: bookingId || "",
          updatedAt:          nowIso,
        })
      );
      await batch.commit();
      return sendJson(res, 200, { ok: true, leadId: openSnap.docs[0].id, recovered: true });
    }
    // No open lead found — nothing to recover, that's fine
    return sendJson(res, 200, { ok: true, leadId: null, recovered: false });
  }

  // ── Idempotency: check for existing open lead today ───────────────────────
  const existing = await db
    .collection("leads")
    .where("email",     "==", emailNorm)
    .where("status",    "==", "new")
    .where("createdAt", ">=", todayStr)
    .limit(1)
    .get();

  if (!existing.empty) {
    const doc = existing.docs[0];
    await doc.ref.update({ updatedAt: nowIso, ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}) });
    return sendJson(res, 200, { ok: true, leadId: doc.id, created: false });
  }

  // ── Create new lead ───────────────────────────────────────────────────────
  const lead = {
    email:         emailNorm,
    customerName:  String(customerName).trim(),
    phone:         phone       || "",
    serviceId:     serviceId   || "",
    serviceName:   serviceName || "",
    address:       address     || "",
    estimatedValue: Number(estimatedValue || 0),
    status:        "new",
    source:        "abandoned_checkout",
    notes:         "",
    createdAt:     nowIso,
    updatedAt:     nowIso,
    recoveryEmailSentAt: null,
    crmWebhookSentAt:    null,
    ...(stripePaymentIntentId ? { stripePaymentIntentId } : {}),
  };

  const ref = await db.collection("leads").add(lead);
  return sendJson(res, 200, { ok: true, leadId: ref.id, created: true });
}
