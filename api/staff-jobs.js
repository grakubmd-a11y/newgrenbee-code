/**
 * api/staff-jobs.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Returns the bookings assigned to the authenticated staff member.
 *
 * Auth: Firebase ID token (role=staff | admin | manager).
 *       The server resolves the staff Firestore document by matching the
 *       token's email against the `staff` collection, then queries bookings
 *       where assignedStaffId == staff.id.
 *
 * POST {}
 * Query params:
 *   ?history=1   include completed/cancelled jobs (default: active only)
 *
 * Response 200:
 *   { ok, staffId, staffName, jobs: Booking[] }
 */

import { getFirestore, verifyIdToken, sendJson } from "./_recurring.js";

const ACTIVE_STATUSES   = ["scheduled", "dispatched", "in-progress"];
const HISTORY_STATUSES  = ["completed", "cancelled"];

export default async function handler(req, res) {
  if (req.method !== "POST" && req.method !== "GET") {
    res.setHeader("Allow", "POST, GET");
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

  // ── Find staff document by email ──────────────────────────────────────────
  const email = decoded.email || "";
  if (!email) {
    return sendJson(res, 400, { error: "Token has no email claim." });
  }

  // Admin / manager can specify a staffId via body to view another tech's jobs
  let body = {};
  if (req.method === "POST" && req.body) {
    body = typeof req.body === "string"
      ? JSON.parse(req.body).catch?.(() => {}) || {}
      : req.body;
  }

  const isAdmin   = decoded.admin === true;
  const isManager = decoded.role  === "manager";

  let staffId, staffName;

  if ((isAdmin || isManager) && body.staffId) {
    // Admin viewing another technician's jobs
    const staffDoc = await db.collection("staff").doc(body.staffId).get();
    if (!staffDoc.exists) {
      return sendJson(res, 404, { error: "Staff member not found." });
    }
    staffId   = staffDoc.id;
    staffName = staffDoc.data().name || "";
  } else {
    // Regular staff: look up by their own email
    const staffSnap = await db
      .collection("staff")
      .where("email", "==", email)
      .limit(1)
      .get();

    if (staffSnap.empty) {
      return sendJson(res, 404, {
        error: "No staff profile linked to this email. Ask an admin to set up your profile.",
      });
    }

    staffId   = staffSnap.docs[0].id;
    staffName = staffSnap.docs[0].data().name || "";

    // ── Auto-heal: ensure /users/{uid} exists with role="staff" ──────────
    // This fires on the first sign-in so the admin never has to set the role
    // manually. Subsequent logins are a no-op (merge only writes missing keys).
    try {
      const uid = decoded.uid || decoded.user_id;
      if (uid) {
        await db.collection("users").doc(uid).set(
          {
            uid,
            name:  staffName,
            email,
            role:  "staff",
          },
          { merge: true }          // won't overwrite extra fields if doc exists
        );
      }
    } catch (e) {
      // Non-fatal — log and continue
      console.warn("[staff-jobs] Could not auto-create user doc:", e?.message);
    }
  }

  // ── Query bookings ────────────────────────────────────────────────────────
  const showHistory = String(req.url || "").includes("history=1") ||
                      body.history === true ||
                      body.history === "1";

  const statuses = showHistory ? HISTORY_STATUSES : ACTIVE_STATUSES;

  const jobsSnap = await db
    .collection("bookings")
    .where("assignedStaffId", "==", staffId)
    .where("status", "in", statuses)
    .orderBy("bookingDate", showHistory ? "desc" : "asc")
    .limit(50)
    .get();

  const jobs = jobsSnap.docs.map((d) => ({ id: d.id, ...d.data() }));

  // Include payout settings so the portal can show estimated earnings per job
  const staffDoc = await db.collection("staff").doc(staffId).get().catch(() => null);
  const staffData = staffDoc?.data() || {};

  return sendJson(res, 200, {
    ok: true,
    staffId,
    staffName,
    jobs,
    payoutModel: staffData.payoutModel || "percentage",
    payoutRate:  staffData.payoutRate  ?? 50,
  });
}
