/**
 * api/delete-job-photo.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Removes a photo from a booking's photos array.
 * Auth: admin or manager only (staff cannot delete photos).
 *
 * POST { bookingId, photoUrl }
 * Response 200: { ok, removed }
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

  const isAdmin   = decoded.admin === true;
  const isManager = decoded.role  === "manager";
  if (!isAdmin && !isManager) {
    return sendJson(res, 403, { error: "Admin or manager role required." });
  }

  const db = getFirestore();
  if (!db) return sendJson(res, 503, { error: "Firebase Admin not configured." });

  const { bookingId, photoUrl } = parseBody(req);
  if (!bookingId || !photoUrl) {
    return sendJson(res, 400, { error: "bookingId and photoUrl are required." });
  }

  const bookingRef  = db.collection("bookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();
  if (!bookingSnap.exists) return sendJson(res, 404, { error: "Booking not found." });

  const photos = bookingSnap.data().photos || [];
  const target  = photos.find((p) => p.url === photoUrl);

  if (!target) return sendJson(res, 404, { error: "Photo not found in this booking." });

  await bookingRef.update({
    photos:    FieldValue.arrayRemove(target),
    updatedAt: new Date().toISOString(),
  });

  return sendJson(res, 200, { ok: true, removed: target });
}
