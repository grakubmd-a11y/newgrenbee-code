/**
 * api/auto-assign-staff.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Automatically selects the best available staff member for a booking and
 * writes assignedStaffId + assignedStaffName back to the Firestore document.
 *
 * Selection algorithm (mirrors WP AssignmentService):
 *   1. Collect all active staff whose serviceIds includes the booking's serviceId
 *      (staff with an empty serviceIds list are treated as "all-service").
 *   2. Count how many scheduled/dispatched/in-progress bookings each candidate
 *      already has on the same bookingDate.
 *   3. Pick the candidate with the lowest workload; ties broken randomly.
 *   4. Write assignedStaffId + assignedStaffName to the booking doc.
 *
 * Auth:
 *   Firebase ID token in `Authorization: Bearer <token>`.
 *   Accepted from the booking's owner (userId == decoded.uid) OR admin/manager.
 *
 * Body:
 *   bookingId   string   Firestore document ID in the `bookings` collection
 *
 * Response 200:
 *   { ok, bookingId, assignedStaffId, assignedStaffName, reason? }
 *
 * Response 204 (no-op):
 *   { ok, bookingId, reason: "already_assigned" | "no_eligible_staff" }
 */

import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";

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

  const { bookingId, force = false } = parseBody(req);
  if (!bookingId || typeof bookingId !== "string") {
    return sendJson(res, 400, { error: "bookingId is required." });
  }

  // ── Load booking ──────────────────────────────────────────────────────────
  const bookingRef  = db.collection("bookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();

  if (!bookingSnap.exists) {
    return sendJson(res, 404, { error: "Booking not found." });
  }

  const booking = bookingSnap.data();

  // ── Authorise: owner OR admin/manager ────────────────────────────────────
  const isAdmin   = decoded.admin === true;
  const isManager = decoded.role  === "manager";
  const isOwner   = booking.userId === decoded.uid ||
                    booking.email  === decoded.email;

  if (!isOwner && !isAdmin && !isManager) {
    return sendJson(res, 403, { error: "Not authorised to assign staff to this booking." });
  }

  // ── Skip if already assigned (unless force=true) ──────────────────────────
  if (!force && booking.assignedStaffId) {
    return sendJson(res, 200, {
      ok:                true,
      bookingId,
      assignedStaffId:   booking.assignedStaffId,
      assignedStaffName: booking.assignedStaffName || "",
      reason:            "already_assigned",
    });
  }

  // ── Load all active staff ─────────────────────────────────────────────────
  const staffSnap = await db
    .collection("staff")
    .where("active", "==", true)
    .get();

  if (staffSnap.empty) {
    return sendJson(res, 200, {
      ok:       false,
      bookingId,
      reason:   "no_eligible_staff",
      message:  "No active staff found.",
    });
  }

  // ── Filter by service compatibility ──────────────────────────────────────
  // Staff with no serviceIds (empty array or missing) are considered all-service.
  const serviceId = booking.serviceId || "";
  const eligible  = staffSnap.docs
    .map((d) => ({ id: d.id, ...d.data() }))
    .filter((s) => {
      const ids = Array.isArray(s.serviceIds) ? s.serviceIds : [];
      return ids.length === 0 || ids.includes(serviceId);
    });

  if (eligible.length === 0) {
    return sendJson(res, 200, {
      ok:       false,
      bookingId,
      reason:   "no_eligible_staff",
      message:  `No active staff can service serviceId="${serviceId}".`,
    });
  }

  // ── Count workload per staff on the same date ─────────────────────────────
  const bookingDate = booking.bookingDate || "";
  const workloadSnap = bookingDate
    ? await db
        .collection("bookings")
        .where("bookingDate", "==", bookingDate)
        .where("status", "in", ["scheduled", "dispatched", "in-progress"])
        .get()
    : null;

  const workload = {};
  if (workloadSnap) {
    for (const doc of workloadSnap.docs) {
      const d = doc.data();
      if (d.assignedStaffId) {
        workload[d.assignedStaffId] = (workload[d.assignedStaffId] || 0) + 1;
      }
    }
  }

  // ── Pick the least-loaded eligible staff member ───────────────────────────
  // Sort ascending by workload; shuffle within the same workload tier for fairness.
  const ranked = eligible
    .map((s) => ({ ...s, load: workload[s.id] || 0 }))
    .sort((a, b) => {
      if (a.load !== b.load) return a.load - b.load;
      return Math.random() < 0.5 ? -1 : 1;  // random tie-break
    });

  const best = ranked[0];

  // ── Update booking ────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  await bookingRef.update({
    assignedStaffId:   best.id,
    assignedStaffName: best.name || "",
    updatedAt:         now,
  });

  return sendJson(res, 200, {
    ok:                true,
    bookingId,
    assignedStaffId:   best.id,
    assignedStaffName: best.name || "",
    staffWorkload:     best.load,
    totalEligible:     eligible.length,
  });
}
