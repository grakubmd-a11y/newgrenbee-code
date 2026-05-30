/**
 * api/hold-slot.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Creates a 20-minute temporary hold on a date+timeSlot so no other user
 * can book the same slot while the first user completes checkout.
 *
 * The `availability.js` endpoint already counts real bookings; this endpoint
 * writes to the `slotHolds` collection which availability also reads.
 *
 * Firestore TTL note: enable TTL on slotHolds.expiresAt in the Firebase console
 * (Firestore > Indexes > TTL) so expired holds are automatically deleted.
 * Until then, a cleanup guard in `availability.js` ignores holds past expiresAt.
 *
 * No auth required — anonymous users can hold slots.
 *
 * POST { date, timeSlot, serviceId }
 * Response 200: { ok, holdId, expiresAt }
 * Response 409: { ok: false, reason: "slot_full", message }
 */

import { getFirestore, sendJson, parseBody } from "./_recurring.js";

const HOLD_MINUTES    = 20;
const MAX_HOLDS_CHECK = 100;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed." });
  }

  const db = getFirestore();
  // Fail-open when Firebase Admin is not configured (dev / test environments)
  if (!db) {
    const fakeExpiry = new Date(Date.now() + HOLD_MINUTES * 60_000).toISOString();
    return sendJson(res, 200, { ok: true, holdId: `local-${Date.now()}`, expiresAt: fakeExpiry });
  }

  const { date, timeSlot, serviceId } = parseBody(req);
  if (!date || !timeSlot) {
    return sendJson(res, 400, { error: "date and timeSlot are required." });
  }

  const now        = new Date();
  const expiresAt  = new Date(now.getTime() + HOLD_MINUTES * 60_000);
  const expiresIso = expiresAt.toISOString();
  const nowIso     = now.toISOString();

  // ── Count active holds + bookings for this slot to check capacity ─────────
  const [holdSnap, staffSnap, bookingSnap] = await Promise.all([
    db.collection("slotHolds")
      .where("date",      "==", date)
      .where("timeSlot",  "==", timeSlot)
      .where("expiresAt", ">",  nowIso)     // only non-expired holds
      .limit(MAX_HOLDS_CHECK)
      .get(),
    db.collection("staff").where("active", "==", true).get(),
    db.collection("bookings")
      .where("bookingDate", "==", date)
      .where("timeSlot",    "==", timeSlot)
      .where("status", "in", ["scheduled","confirmed","needs_assignment","dispatched","in-progress"])
      .get(),
  ]);

  const staffCapacity = staffSnap.size > 0 ? staffSnap.size : 3;
  const activeHolds   = holdSnap.size;
  const activeBooks   = bookingSnap.size;
  const consumed      = activeHolds + activeBooks;

  if (consumed >= staffCapacity) {
    return sendJson(res, 409, {
      ok:      false,
      reason:  "slot_full",
      message: `All ${staffCapacity} slots are taken for ${date} at ${timeSlot}.`,
    });
  }

  // ── Create the hold ───────────────────────────────────────────────────────
  const holdRef = await db.collection("slotHolds").add({
    date,
    timeSlot,
    serviceId: serviceId || "",
    createdAt: nowIso,
    expiresAt: expiresIso,
  });

  return sendJson(res, 200, { ok: true, holdId: holdRef.id, expiresAt: expiresIso });
}
