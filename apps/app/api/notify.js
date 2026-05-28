/**
 * api/notify.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Generic notification trigger endpoint.  Clients call this fire-and-forget
 * after creating a booking to dispatch the confirmation email to the customer.
 *
 * Auth:
 *   Firebase ID token in `Authorization: Bearer <token>`.
 *   Accepted from the booking's owner (booking.userId == decoded.uid OR
 *   booking.email == decoded.email) OR admin/manager.
 *
 * Body:
 *   event      'booking_confirmed' | 'status_update'
 *   bookingId  Firestore document ID in `bookings`
 *
 * The server re-reads the booking from Firestore so the client cannot forge
 * email content by passing tampered data.
 */

import {
  getFirestore,
  verifyIdToken,
  sendJson,
  parseBody,
} from "./_recurring.js";

import {
  sendEmail,
  buildBookingConfirmationEmail,
  buildStatusUpdateEmail,
} from "./_mailer.js";

const VALID_EVENTS = new Set(["booking_confirmed", "status_update"]);

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

  const { event, bookingId } = parseBody(req);

  if (!VALID_EVENTS.has(event)) {
    return sendJson(res, 400, { error: `event must be one of: ${[...VALID_EVENTS].join(", ")}.` });
  }
  if (!bookingId || typeof bookingId !== "string") {
    return sendJson(res, 400, { error: "bookingId is required." });
  }

  // ── Load booking ──────────────────────────────────────────────────────────
  const snap = await db.collection("bookings").doc(bookingId).get();
  if (!snap.exists) {
    return sendJson(res, 404, { error: "Booking not found." });
  }

  const booking = { id: snap.id, ...snap.data() };

  // ── Authorise ─────────────────────────────────────────────────────────────
  const isAdmin   = decoded.admin === true;
  const isManager = decoded.role  === "manager";
  const isOwner   = booking.userId === decoded.uid ||
                    booking.email  === decoded.email;

  if (!isOwner && !isAdmin && !isManager) {
    return sendJson(res, 403, { error: "Not authorised for this booking." });
  }

  // ── Dispatch email ────────────────────────────────────────────────────────
  let emailPayload;
  switch (event) {
    case "booking_confirmed":
      emailPayload = buildBookingConfirmationEmail(booking);
      break;
    case "status_update":
      emailPayload = buildStatusUpdateEmail(booking);
      break;
    default:
      return sendJson(res, 400, { error: "Unknown event." });
  }

  const result = await sendEmail(
    booking.email,
    emailPayload.subject,
    emailPayload.html
  );

  return sendJson(res, 200, { ok: true, event, bookingId, email: result });
}
