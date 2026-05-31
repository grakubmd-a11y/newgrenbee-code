/**
 * api/auto-assign-staff.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Selects the best available staff member(s) for a booking using a scored
 * candidate pipeline:
 *
 *   1. Filter  — active, service-compatible, zone-compatible (if data exists),
 *                no time-slot overlap (if time data exists)
 *   2. Score   — jobs_today * 20 + estimated_mins_today / 30 − preferred_bonus
 *   3. Pick    — lowest score wins; random tie-break
 *
 * Two-tech jobs (requiresTwoStaff = true) run the pipeline twice and assign
 * primaryStaffId + helperStaffId. If only 1 candidate is found, falls back to
 * single-tech assignment. Marks "needs_assignment" only when 0 candidates found.
 *
 * Graceful fallback: when ZIP areas, time slot, or duration data are absent
 * the filter/overlap steps are skipped and the old lowest-workload logic
 * effectively applies — existing bookings are never broken.
 *
 * Auth:
 *   Firebase ID token in `Authorization: Bearer <token>`.
 *   Accepted from the booking's owner (userId == decoded.uid) OR admin/manager.
 *
 * Body:
 *   bookingId  string   Firestore document ID in the `bookings` collection
 *   force      boolean  Re-assign even if already assigned (default false)
 *
 * Response 200 (single-tech):
 *   { ok, bookingId, assignedStaffId, assignedStaffName, staffScore, totalEligible }
 *
 * Response 200 (two-tech):
 *   { ok, bookingId, primaryStaffId, primaryStaffName, helperStaffId, helperStaffName, totalEligible }
 *
 * Response 200 (no-op / manual review):
 *   { ok: false, bookingId, reason, message }
 */

import { getFirestore, verifyIdToken, sendJson, parseBody } from "./_recurring.js";
import { sendEmail, buildStaffAssignmentEmail } from "./_mailer.js";

// ── Duration defaults (minutes) ───────────────────────────────────────────────

const SERVICE_DEFAULT_MINUTES = {
  "house-cleaning":     180,
  "tv-installation":    90,
  "lawn-mowing":        60,
  "furniture-assembly": 120,
  "pressure-washing":   120,
  "wall-mounting":      90,
};

const DEFAULT_TRAVEL_BUFFER = 30; // minutes

// ── Pure helpers ──────────────────────────────────────────────────────────────

/**
 * Parse a time slot string ("9:00 AM", "2:30 PM") into minutes from midnight.
 * Returns null if the format is unrecognised.
 */
function parseTimeSlotMinutes(timeSlot) {
  if (!timeSlot) return null;
  const m = String(timeSlot).match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return null;
  let h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  const mer = m[3].toUpperCase();
  if (mer === "PM" && h !== 12) h += 12;
  if (mer === "AM" && h === 12) h = 0;
  return h * 60 + min;
}

/**
 * Estimate job duration in minutes.
 * Respects booking.estimatedDurationMinutes if set, otherwise uses
 * service-specific defaults scaled by unit count for cleaning jobs.
 */
function estimateDurationMinutes(serviceId, booking) {
  const explicit = Number(booking?.estimatedDurationMinutes);
  if (explicit > 0) return explicit;

  if (serviceId === "house-cleaning") {
    const units = Number(booking?.units) || 1;
    if (units <= 2) return 120; // small
    if (units <= 4) return 180; // medium
    return 240;                 // large
  }

  return SERVICE_DEFAULT_MINUTES[serviceId] || 120;
}

/** Extract a 5-digit US ZIP code from a freeform address string. */
function extractZip(address) {
  if (!address) return null;
  const m = String(address).match(/\b(\d{5})(?:-\d{4})?\b/);
  return m ? m[1] : null;
}

/** Returns true when [aStart, aEnd) overlaps [bStart, bEnd). */
function rangesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// ── Core assignment logic (exported for internal use by other API handlers) ───

/**
 * assignStaffToBooking — runs the full candidate pipeline and writes to Firestore.
 *
 * @param {FirebaseFirestore.Firestore} db
 * @param {string} bookingId
 * @param {{ force?: boolean }} [opts]
 * @returns {Promise<{ ok: boolean, reason?: string, [key: string]: any }>}
 */
export async function assignStaffToBooking(db, bookingId, opts = {}) {
  const { force = false } = opts;

  const bookingRef  = db.collection("bookings").doc(bookingId);
  const bookingSnap = await bookingRef.get();

  if (!bookingSnap.exists) {
    return { ok: false, bookingId, reason: "booking_not_found" };
  }

  const booking = bookingSnap.data();

  // Skip if already assigned (unless force=true)
  if (!force && booking.assignedStaffId) {
    return {
      ok:                true,
      bookingId,
      assignedStaffId:   booking.assignedStaffId,
      assignedStaffName: booking.assignedStaffName || "",
      reason:            "already_assigned",
    };
  }

  const serviceId   = booking.serviceId || "";
  const bookingDate = booking.bookingDate || "";
  const requiresTwo = Boolean(booking.requiresTwoStaff);

  // ── Derive time window for this booking ───────────────────────────────────
  const buffer     = DEFAULT_TRAVEL_BUFFER;
  const startMin   = parseTimeSlotMinutes(booking.timeSlot);
  const duration   = estimateDurationMinutes(serviceId, booking);
  const hasTime    = startMin !== null;
  const endMin     = hasTime ? startMin + duration : null;
  const blockStart = hasTime ? startMin - buffer   : null;
  const blockEnd   = hasTime ? endMin   + buffer   : null;

  // ── Load all active staff ─────────────────────────────────────────────────
  const staffSnap = await db.collection("staff").where("active", "==", true).get();

  if (staffSnap.empty) {
    return { ok: false, bookingId, reason: "no_eligible_staff", message: "No active staff found." };
  }

  // ── Load all active bookings on the same date (one query) ─────────────────
  const daySnap = bookingDate
    ? await db
        .collection("bookings")
        .where("bookingDate", "==", bookingDate)
        .where("status", "in", ["scheduled", "dispatched", "in-progress"])
        .get()
    : null;

  const workload     = {};
  const minutesToday = {};
  const overlapSet   = new Set();

  if (daySnap) {
    for (const doc of daySnap.docs) {
      if (doc.id === bookingId) continue;

      const d   = doc.data();
      const est = estimateDurationMinutes(d.serviceId || "", d);

      const assigned = [
        d.assignedStaffId || d.primaryStaffId,
        d.helperStaffId,
      ].filter(Boolean);

      for (const sid of assigned) {
        workload[sid]     = (workload[sid]     || 0) + 1;
        minutesToday[sid] = (minutesToday[sid] || 0) + est;

        if (hasTime) {
          const existStart = parseTimeSlotMinutes(d.timeSlot);
          if (existStart !== null) {
            const existBlockStart = existStart - buffer;
            const existBlockEnd   = existStart + est + buffer;
            if (rangesOverlap(blockStart, blockEnd, existBlockStart, existBlockEnd)) {
              overlapSet.add(sid);
            }
          }
        }
      }
    }
  }

  // ── Booking ZIP for zone matching ─────────────────────────────────────────
  // BUG #4: If the booking has no zip, staff with zipCodes[] are still eligible
  // (no hard exclusion). The condition below only applies the hard exclude when
  // BOTH sides have zip data — correct behaviour, documented here explicitly.
  const bookingZip  = booking.zipCode || extractZip(booking.address || "");
  const preferredId = booking.preferredStaffId || null;

  const allStaff = staffSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  /**
   * Build a scored, shuffled-then-sorted list of eligible candidates.
   * excludeIds — staff already picked (used for the second slot in two-tech).
   */
  function buildRankedCandidates(excludeIds = []) {
    const candidates = [];

    for (const s of allStaff) {
      if (excludeIds.includes(s.id)) continue;

      // ── Service compatibility ──────────────────────────────────────────
      const svcIds = Array.isArray(s.serviceIds) ? s.serviceIds : [];
      if (svcIds.length > 0 && !svcIds.includes(serviceId)) continue;

      // ── Zone filter ────────────────────────────────────────────────────
      // Hard-exclude only when BOTH the booking AND the staff member have zip
      // data. If the booking has no zip, all staff are eligible regardless of
      // their zipCodes[] list (graceful fallback — no blocking).
      if (bookingZip && Array.isArray(s.zipCodes) && s.zipCodes.length > 0) {
        if (!s.zipCodes.includes(bookingZip)) continue;
      }

      // ── Time-slot overlap ──────────────────────────────────────────────
      if (hasTime && overlapSet.has(s.id)) continue;

      // ── Score ──────────────────────────────────────────────────────────
      // Preferred bonus: 25 pts ≈ 1 extra job of tolerance.
      // High enough to favor the client's preferred tech, low enough that a
      // heavily-loaded preferred tech loses to a free one.
      const jobsToday   = workload[s.id]     || 0;
      const minsToday   = minutesToday[s.id] || 0;
      const isPreferred = s.id === preferredId;
      const score =
        jobsToday * 20
        + Math.round(minsToday / 30)
        - (isPreferred ? 25 : 0);

      candidates.push({ ...s, score, jobsToday, minsToday });
    }

    // BUG #5 fix: shuffle first to break ties correctly, then sort by score.
    // Using Math.random() inside a comparator is not a valid shuffle (violates
    // transitivity) and produces biased results. Shuffle once before sorting.
    for (let i = candidates.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
    }

    return candidates.sort((a, b) => a.score - b.score);
  }

  const now = new Date().toISOString();

  // ── Single-tech assignment ────────────────────────────────────────────────
  if (!requiresTwo) {
    const ranked = buildRankedCandidates();

    if (ranked.length === 0) {
      await bookingRef.update({ status: "needs_assignment", updatedAt: now });
      return {
        ok:      false,
        bookingId,
        reason:  "no_eligible_staff",
        message: "No available staff for this time slot. Booking marked as needs_assignment.",
      };
    }

    const best = ranked[0];

    await bookingRef.update({
      assignedStaffId:   best.id,
      assignedStaffName: best.name || "",
      updatedAt:         now,
    });

    // BUG #6 fix: log email failures so they appear in Vercel logs.
    if (best.email) {
      const { subject, html } = buildStaffAssignmentEmail(booking, best);
      sendEmail(best.email, subject, html).catch((err) => {
        console.error(`[auto-assign-staff] Failed to send assignment email to ${best.email}:`, err?.message || err);
      });
    }

    return {
      ok:                true,
      bookingId,
      assignedStaffId:   best.id,
      assignedStaffName: best.name || "",
      staffScore:        best.score,
      totalEligible:     ranked.length,
    };
  }

  // ── Two-tech assignment ───────────────────────────────────────────────────
  const ranked = buildRankedCandidates();

  // Two-tech jobs require exactly 2 staff. If fewer than 2 are available,
  // mark as needs_assignment so a human can intervene — never send a single
  // tech to a job that physically requires two.
  if (ranked.length < 2) {
    await bookingRef.update({ status: "needs_assignment", updatedAt: now });
    return {
      ok:      false,
      bookingId,
      reason:  "insufficient_staff_for_two_tech",
      message: `Need 2 staff members but only ${ranked.length} available. Booking marked as needs_assignment.`,
    };
  }

  const primary = ranked[0];
  const helper  = ranked[1];

  await bookingRef.update({
    // Keep assignedStaffId populated for backward compatibility
    assignedStaffId:   primary.id,
    assignedStaffName: primary.name || "",
    primaryStaffId:    primary.id,
    primaryStaffName:  primary.name || "",
    helperStaffId:     helper.id,
    helperStaffName:   helper.name || "",
    updatedAt:         now,
  });

  // BUG #6 fix: log email failures.
  for (const staff of [primary, helper]) {
    if (staff.email) {
      const { subject, html } = buildStaffAssignmentEmail(booking, staff);
      sendEmail(staff.email, subject, html).catch((err) => {
        console.error(`[auto-assign-staff] Failed to send assignment email to ${staff.email}:`, err?.message || err);
      });
    }
  }

  return {
    ok:               true,
    bookingId,
    primaryStaffId:   primary.id,
    primaryStaffName: primary.name || "",
    helperStaffId:    helper.id,
    helperStaffName:  helper.name || "",
    totalEligible:    ranked.length,
  };
}

// ── HTTP handler ──────────────────────────────────────────────────────────────

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

  // ── Authorise: owner OR admin/manager ─────────────────────────────────────
  const bookingSnap = await db.collection("bookings").doc(bookingId).get();
  if (!bookingSnap.exists) {
    return sendJson(res, 404, { error: "Booking not found." });
  }
  const booking    = bookingSnap.data();
  const isAdmin    = decoded.admin === true;
  const isManager  = decoded.role === "manager";
  const isOwner    = booking.userId === decoded.uid || booking.email === decoded.email;

  if (!isOwner && !isAdmin && !isManager) {
    return sendJson(res, 403, { error: "Not authorised to assign staff to this booking." });
  }

  const result = await assignStaffToBooking(db, bookingId, { force });

  // Map internal reason codes to appropriate HTTP responses
  if (result.reason === "booking_not_found") {
    return sendJson(res, 404, { error: "Booking not found." });
  }

  return sendJson(res, 200, result);
}
