/**
 * api/set-job-payout.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin-only endpoint for payroll operations:
 *
 * Mode A — per-job override:
 *   POST { bookingId, payoutOverride }
 *   Sets booking.payoutOverride (dollar amount) for one job.
 *
 * Mode B — mark period as paid:
 *   POST { staffId, periodStart, periodEnd, markPaid: true }
 *   Sets payrollPaidAt = now on all completed/paid bookings for that staff
 *   in the given date range that don't already have payrollPaidAt set.
 *
 * Auth: admin or manager role required.
 */

import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";

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

  const body = parseBody(req);

  // ── Mode A: per-job override ──────────────────────────────────────────────
  if (body.bookingId) {
    const { bookingId, payoutOverride } = body;

    if (typeof payoutOverride !== "number" || payoutOverride < 0) {
      return sendJson(res, 400, { error: "payoutOverride must be a non-negative number." });
    }

    const ref  = db.collection("bookings").doc(bookingId);
    const snap = await ref.get();
    if (!snap.exists) return sendJson(res, 404, { error: "Booking not found." });

    await ref.update({ payoutOverride, updatedAt: new Date().toISOString() });
    return sendJson(res, 200, { ok: true, bookingId, payoutOverride });
  }

  // ── Mode B: mark period as paid ───────────────────────────────────────────
  if (body.markPaid && body.staffId) {
    const { staffId, periodStart, periodEnd } = body;

    if (!periodStart || !periodEnd) {
      return sendJson(res, 400, { error: "periodStart and periodEnd (YYYY-MM-DD) are required." });
    }

    const snap = await db
      .collection("bookings")
      .where("assignedStaffId", "==", staffId)
      .where("bookingDate", ">=", periodStart)
      .where("bookingDate", "<=", periodEnd)
      .get();

    const now = new Date().toISOString();
    const batch = db.batch();
    let count = 0;

    snap.docs.forEach((doc) => {
      const data = doc.data();
      // Only mark completed/paid jobs that haven't been paid yet
      if (
        (data.status === "completed" || data.paymentStatus === "paid") &&
        !data.payrollPaidAt
      ) {
        batch.update(doc.ref, { payrollPaidAt: now, updatedAt: now });
        count++;
      }
    });

    if (count > 0) await batch.commit();

    return sendJson(res, 200, { ok: true, staffId, periodStart, periodEnd, markedCount: count });
  }

  return sendJson(res, 400, { error: "Provide either bookingId (override) or staffId+markPaid (period close)." });
}
