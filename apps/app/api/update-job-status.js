/**
 * api/update-job-status.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Allows a staff member to update the status of one of their assigned bookings.
 *
 * Auth: Firebase ID token (role=staff | admin | manager).
 *
 * POST { bookingId, status }
 *   status: 'in-progress' | 'completed'
 *
 * On 'completed':
 *   - Sends status-update email to customer (fire-and-forget)
 *
 * Response 200:
 *   { ok, bookingId, status, booking }
 */

import Stripe from "stripe";
import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";
import { sendEmail, buildStatusUpdateEmail } from "./_mailer.js";

const stripe = (() => {
  const key = process.env.STRIPE_SECRET_KEY;
  return key && !key.includes("REPLACE_ME") ? new Stripe(key) : null;
})();

const ALLOWED_TRANSITIONS = {
  "in-progress": ["scheduled", "dispatched"],
  "completed":   ["scheduled", "dispatched", "in-progress"],
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  // ── Auth ──────────────────────────────────────────────────────────────────
  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) {
    return sendJson(res, 401, { error: "Valid Firebase ID token required." });
  }

  const db = getFirestore();
  if (!db) {
    return sendJson(res, 503, { error: "Firebase Admin not configured." });
  }

  const { bookingId, status, completionNotes } = parseBody(req);

  if (!bookingId || typeof bookingId !== "string") {
    return sendJson(res, 400, { error: "bookingId is required." });
  }
  if (!ALLOWED_TRANSITIONS[status]) {
    return sendJson(res, 400, {
      error: `status must be one of: ${Object.keys(ALLOWED_TRANSITIONS).join(", ")}.`,
    });
  }

  // ── Load booking ──────────────────────────────────────────────────────────
  const bookingRef  = db.collection("bookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();

  if (!bookingSnap.exists) {
    return sendJson(res, 404, { error: "Booking not found." });
  }

  const booking = { id: bookingSnap.id, ...bookingSnap.data() };

  // ── Authorise ─────────────────────────────────────────────────────────────
  const isAdmin   = decoded.admin === true;
  const isManager = decoded.role  === "manager";

  if (!isAdmin && !isManager) {
    // Staff: must be the assigned technician
    const staffSnap = await db
      .collection("staff")
      .where("email", "==", decoded.email || "")
      .limit(1)
      .get();

    if (staffSnap.empty) {
      return sendJson(res, 403, { error: "No staff profile linked to this account." });
    }

    const staffId = staffSnap.docs[0].id;
    if (booking.assignedStaffId !== staffId) {
      return sendJson(res, 403, { error: "This job is not assigned to you." });
    }
  }

  // ── Validate transition ───────────────────────────────────────────────────
  const allowedFrom = ALLOWED_TRANSITIONS[status];
  if (!allowedFrom.includes(booking.status)) {
    return sendJson(res, 409, {
      error: `Cannot move to '${status}' from '${booking.status}'.`,
      currentStatus: booking.status,
    });
  }

  // ── Persist ───────────────────────────────────────────────────────────────
  const now    = new Date().toISOString();
  const update = { status, updatedAt: now };
  if (status === "completed" && completionNotes) {
    update.completionNotes = String(completionNotes).slice(0, 1000);
  }
  await bookingRef.update(update);

  const updated = { ...booking, ...update };

  // ── Capture Stripe PaymentIntent when job is completed ───────────────────
  // capture_method is "manual" — the hold must be captured now or the
  // authorization expires (Stripe default: 7 days).
  if (status === "completed" && booking.stripePaymentIntentId && stripe) {
    try {
      const pi = await stripe.paymentIntents.retrieve(booking.stripePaymentIntentId);
      if (pi.status === "requires_capture") {
        await stripe.paymentIntents.capture(booking.stripePaymentIntentId);
        // The stripe-webhook will handle payment_intent.succeeded →
        // updates booking.paymentStatus = "paid" asynchronously.
      }
    } catch (captureErr) {
      // Non-fatal: log the error but don't fail the status update.
      // The payment may already be captured or the intent may have expired.
      console.error("[update-job-status] Stripe capture failed:", captureErr?.message);
    }
  }

  // ── Notify customer on completion ─────────────────────────────────────────
  if (status === "completed" && booking.email) {
    const { subject, html } = buildStatusUpdateEmail(updated);
    sendEmail(booking.email, subject, html).catch(() => {/* non-fatal */});
  }

  return sendJson(res, 200, { ok: true, bookingId, status, booking: updated });
}
