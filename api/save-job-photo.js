/**
 * api/save-job-photo.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Persists a Firebase Storage download URL as a photo on a booking.
 * The actual file upload happens client-side (Firebase Storage SDK).
 * This endpoint validates auth and appends the photo metadata to Firestore.
 *
 * Auth: assigned staff for this booking OR admin/manager.
 *
 * POST { bookingId, phase, url, fileName }
 *   phase: 'before' | 'after'
 *   url:   Firebase Storage download URL
 *
 * Response 200: { ok, photo }
 */

import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";
import { FieldValue } from "firebase-admin/firestore";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const decoded = await verifyIdToken(req.headers.authorization || "");
  if (!decoded) return sendJson(res, 401, { error: "Valid Firebase ID token required." });

  const db = getFirestore();
  if (!db) return sendJson(res, 503, { error: "Firebase Admin not configured." });

  const { bookingId, phase, url, fileName } = parseBody(req);

  if (!bookingId || !phase || !url) {
    return sendJson(res, 400, { error: "bookingId, phase, and url are required." });
  }
  if (phase !== "before" && phase !== "after") {
    return sendJson(res, 400, { error: "phase must be 'before' or 'after'." });
  }

  const bookingRef  = db.collection("bookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) return sendJson(res, 404, { error: "Booking not found." });

  const booking = bookingSnap.data();

  // ── Authorise ─────────────────────────────────────────────────────────────
  const isAdmin   = decoded.admin === true;
  const isManager = decoded.role  === "manager";

  if (!isAdmin && !isManager) {
    // Staff: must be assigned to this booking
    const staffSnap = await db
      .collection("staff")
      .where("email", "==", decoded.email || "")
      .limit(1)
      .get();

    if (staffSnap.empty) {
      return sendJson(res, 403, { error: "No staff profile linked to this account." });
    }

    const staffId = staffSnap.docs[0].id;
    const isAssigned =
      booking.assignedStaffId === staffId ||
      booking.primaryStaffId  === staffId ||
      booking.helperStaffId   === staffId;

    if (!isAssigned) {
      return sendJson(res, 403, { error: "This job is not assigned to you." });
    }
  }

  const photo = {
    url,
    phase,
    fileName: fileName || `photo_${Date.now()}.jpg`,
    uploadedAt: new Date().toISOString(),
    uploadedBy: decoded.uid,
  };

  await bookingRef.update({
    photos:    FieldValue.arrayUnion(photo),
    updatedAt: new Date().toISOString(),
  });

  return sendJson(res, 200, { ok: true, photo });
}
