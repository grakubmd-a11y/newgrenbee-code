/**
 * api/availability.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Real staff-based slot availability for the booking calendar.
 *
 * Three modes (all POST):
 *
 *   Bulk check — all slots for a date       { date }
 *     → { slots: { [timeSlot]: { available, slotsRemaining } }, staffCapacity }
 *
 *   Single-slot check                        { date, timeSlot }
 *     → { available, slotsRemaining, staffCapacity }
 *
 *   Month busy-dates                          { year, month }
 *     → { busyDates: string[] }
 *
 * How capacity is calculated
 * ──────────────────────────
 * staffCapacity = number of active staff in Firestore (staff.active == true)
 *
 * For each time slot:
 *   • Bookings WITH an assigned staff member → duration-aware block window.
 *     The staff member is considered busy from (start - TRAVEL_BUFFER) to
 *     (start + duration + TRAVEL_BUFFER). Any slot that falls inside that
 *     window counts as one blocked staff unit.
 *   • Bookings WITHOUT an assigned staff member → per-slot conservative count
 *     (the slot they requested, +1 per tech required).
 *   • Two-tech jobs (requiresTwoStaff = true) consume 2 staff units.
 *
 * slotsRemaining = max(0, staffCapacity − blockedUnits)
 * available      = slotsRemaining > 0
 *
 * Statuses that consume capacity (anything else is ignored — including
 * "cancelled", "completed", "payment_failed"):
 *   scheduled | confirmed | needs_assignment | dispatched | in-progress
 *
 * Fails open (available=true) when Firebase Admin is not configured.
 *
 * Env vars required
 * ─────────────────
 *   FIREBASE_SERVICE_ACCOUNT_JSON  (or FIREBASE_ADMIN_CREDENTIALS)
 *   FIREBASE_DATABASE_ID           (named DB, optional)
 */

import admin from "firebase-admin";
import { getFirestore as _adminGetFs } from "firebase-admin/firestore";

// ── Constants ──────────────────────────────────────────────────────────────────

/** Fallback when no staff documents exist (avoids locking everyone out). */
const FALLBACK_CAPACITY = 3;

/** Minutes of travel buffer added before and after each job window. */
const TRAVEL_BUFFER = 30;

/** All bookable time slots (24h format, matches SchedulePicker HOUR_SLOTS). */
const KNOWN_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "12:00",
  "13:00", "14:00", "15:00", "16:00", "17:00",
];

/**
 * Booking statuses that count against staff capacity.
 * Any other status (cancelled, completed, payment_failed …) is ignored.
 */
const ACTIVE_STATUSES = [
  "scheduled",
  "confirmed",
  "needs_assignment",
  "dispatched",
  "in-progress",
];

/** Estimated job duration by service ID (minutes). */
const SERVICE_DURATIONS = {
  "house-cleaning":     180,
  "tv-installation":    90,
  "lawn-mowing":        60,
  "furniture-assembly": 120,
  "pressure-washing":   120,
  "wall-mounting":      90,
};

// ── Utilities ──────────────────────────────────────────────────────────────────

function sendJson(res, status, payload) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(payload));
}

function parseBody(req) {
  if (!req.body) return {};
  if (typeof req.body === "string") {
    try { return JSON.parse(req.body); } catch { return {}; }
  }
  return req.body;
}

/**
 * Parse a time string to minutes from midnight.
 * Handles both 24h ("09:00") and 12h ("9:00 AM") formats.
 * Returns null when the format is not recognized.
 */
function toMinutes(slot) {
  if (!slot) return null;
  const s = String(slot).trim();

  // 24h: "09:00" or "9:00"
  const m24 = s.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) return parseInt(m24[1], 10) * 60 + parseInt(m24[2], 10);

  // 12h: "9:00 AM", "2:30 PM", or range "9:00 AM – 12:00 PM"
  const m12 = s.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)/i);
  if (m12) {
    let h = parseInt(m12[1], 10);
    const min = parseInt(m12[2], 10);
    const mer = m12[3].toUpperCase();
    if (mer === "PM" && h !== 12) h += 12;
    if (mer === "AM" && h === 12) h = 0;
    return h * 60 + min;
  }

  return null;
}

/** Estimated duration for a booking in minutes. */
function getDuration(booking) {
  const explicit = Number(booking?.estimatedDurationMinutes);
  if (explicit > 0) return explicit;

  if (booking?.serviceId === "house-cleaning") {
    const units = Number(booking?.units) || 1;
    if (units <= 2) return 120;
    if (units <= 4) return 180;
    return 240;
  }

  return SERVICE_DURATIONS[booking?.serviceId] || 120;
}

// ── Firebase ───────────────────────────────────────────────────────────────────

let _db = null;
function getFirestore() {
  if (_db) return _db;
  const json =
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON ||
    process.env.FIREBASE_ADMIN_CREDENTIALS;
  if (!json || json.includes("REPLACE_ME")) return null;
  try {
    const app = admin.apps.length
      ? admin.apps[0]
      : admin.initializeApp({ credential: admin.credential.cert(JSON.parse(json)) });
    const dbId = process.env.FIREBASE_DATABASE_ID;
    _db = dbId ? _adminGetFs(app, dbId) : _adminGetFs(app);
    return _db;
  } catch {
    return null;
  }
}

// ── Core availability computation ─────────────────────────────────────────────

/**
 * Compute slot availability for a single date.
 *
 * Returns { staffCapacity, slots }
 * where slots maps each KNOWN_SLOT to { available, slotsRemaining }.
 */
async function computeDayAvailability(db, date) {
  // ── 1. Real staff capacity ─────────────────────────────────────────────────
  const staffSnap = await db
    .collection("staff")
    .where("active", "==", true)
    .get();

  const staffCapacity = staffSnap.size > 0 ? staffSnap.size : FALLBACK_CAPACITY;

  // ── 2. Active bookings for this date ───────────────────────────────────────
  const bookingSnap = await db
    .collection("bookings")
    .where("bookingDate", "==", date)
    .where("status", "in", ACTIVE_STATUSES)
    .get();

  // ── 3. Build per-staff block windows and per-slot unassigned counts ─────────
  //
  // staffBlocks:   Map<staffId, Array<[blockStart, blockEnd]>>
  // unassigned:    Map<slotKey, number>  ← bookings without a staff assignment
  //
  const staffBlocks = new Map(); // staffId → [[startMin, endMin], …]
  const unassigned  = {};        // slotKey → staff units consumed

  for (const doc of bookingSnap.docs) {
    const b         = doc.data();
    const techCount = b.requiresTwoStaff ? 2 : 1;
    const startMin  = toMinutes(b.timeSlot);
    const duration  = getDuration(b);

    // Collect assigned staff IDs (primary + helper for two-tech jobs)
    const assignedIds = [
      b.primaryStaffId || b.assignedStaffId,
      b.helperStaffId,
    ].filter(Boolean);

    if (assignedIds.length > 0 && startMin !== null) {
      // Duration-aware block: buffer before start, buffer after end
      const blockStart = startMin - TRAVEL_BUFFER;
      const blockEnd   = startMin + duration + TRAVEL_BUFFER;

      for (const id of assignedIds) {
        if (!staffBlocks.has(id)) staffBlocks.set(id, []);
        staffBlocks.get(id).push([blockStart, blockEnd]);
      }
    } else {
      // No assignment yet — conservatively count against the exact requested slot.
      // techCount handles two-tech jobs consuming 2 units.
      const key = b.timeSlot;
      if (key) unassigned[key] = (unassigned[key] || 0) + techCount;
    }
  }

  // ── 4. For each known slot, compute remaining capacity ─────────────────────
  const slots = {};

  for (const slot of KNOWN_SLOTS) {
    const slotMin = toMinutes(slot); // always succeeds for KNOWN_SLOTS

    // Count staff members who are blocked at this slot time
    let staffBlocked = 0;
    for (const [, blocks] of staffBlocks) {
      const blocked = blocks.some(([bStart, bEnd]) =>
        slotMin >= bStart && slotMin < bEnd
      );
      if (blocked) staffBlocked++;
    }

    // Add unassigned bookings for this exact slot
    const unassignedUnits = unassigned[slot] || 0;

    // Total consumed (capped at staffCapacity to avoid negative remaining)
    const consumed      = Math.min(staffBlocked + unassignedUnits, staffCapacity);
    const slotsRemaining = Math.max(0, staffCapacity - consumed);

    slots[slot] = { available: slotsRemaining > 0, slotsRemaining };
  }

  return { staffCapacity, slots };
}

// ── Handler ────────────────────────────────────────────────────────────────────

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const { date, timeSlot, year, month } = parseBody(req);

  // ── Month busy-dates: { year, month } ─────────────────────────────────────
  if (!date && year && month) {
    const db = getFirestore();
    if (!db) return sendJson(res, 200, { busyDates: [] });

    try {
      const y = Number(year);
      const m = Number(month);
      const startDate = `${y}-${String(m).padStart(2, "0")}-01`;
      const nextM     = m === 12 ? 1 : m + 1;
      const nextY     = m === 12 ? y + 1 : y;
      const endDate   = `${nextY}-${String(nextM).padStart(2, "0")}-01`;

      // Get staff capacity once for the whole month
      const staffSnap = await db
        .collection("staff")
        .where("active", "==", true)
        .get();
      const staffCapacity = staffSnap.size > 0 ? staffSnap.size : FALLBACK_CAPACITY;

      // Get all active bookings for the month
      const snap = await db
        .collection("bookings")
        .where("bookingDate", ">=", startDate)
        .where("bookingDate", "<",  endDate)
        .where("status", "in", ACTIVE_STATUSES)
        .get();

      // Count per date → slot (simple counting for month view)
      const perDate = {};
      for (const doc of snap.docs) {
        const { bookingDate, timeSlot: ts, requiresTwoStaff } = doc.data();
        if (!bookingDate || !ts) continue;
        if (!perDate[bookingDate]) perDate[bookingDate] = {};
        const units = requiresTwoStaff ? 2 : 1;
        perDate[bookingDate][ts] = (perDate[bookingDate][ts] || 0) + units;
      }

      // A day is "busy" when every known slot is at or above staffCapacity
      const busyDates = [];
      for (const [d, slotCounts] of Object.entries(perDate)) {
        const fullSlots = KNOWN_SLOTS.filter(
          s => (slotCounts[s] || 0) >= staffCapacity
        ).length;
        if (fullSlots >= KNOWN_SLOTS.length) busyDates.push(d);
      }

      return sendJson(res, 200, { busyDates });
    } catch (err) {
      console.error("[availability] month query error:", err?.message);
      return sendJson(res, 200, { busyDates: [] });
    }
  }

  if (!date) {
    return sendJson(res, 400, { error: "date is required." });
  }

  const db = getFirestore();

  // ── Fail-open: no Firebase Admin configured ────────────────────────────────
  if (!db) {
    if (timeSlot) {
      return sendJson(res, 200, {
        available:      true,
        slotsRemaining: FALLBACK_CAPACITY,
        staffCapacity:  FALLBACK_CAPACITY,
        reason:         "availability-check-skipped",
      });
    }
    const openSlots = {};
    for (const s of KNOWN_SLOTS) {
      openSlots[s] = { available: true, slotsRemaining: FALLBACK_CAPACITY };
    }
    return sendJson(res, 200, {
      slots:         openSlots,
      staffCapacity: FALLBACK_CAPACITY,
      reason:        "availability-check-skipped",
    });
  }

  try {
    const { staffCapacity, slots } = await computeDayAvailability(db, date);

    // ── Single-slot response ──────────────────────────────────────────────
    if (timeSlot) {
      const info = slots[timeSlot] ?? { available: true, slotsRemaining: staffCapacity };
      return sendJson(res, 200, { ...info, staffCapacity });
    }

    // ── Bulk response ─────────────────────────────────────────────────────
    return sendJson(res, 200, { slots, staffCapacity });

  } catch (err) {
    console.error("[availability] error:", err?.message);
    // Fail open so the booking flow is never hard-blocked by an API error
    if (timeSlot) {
      return sendJson(res, 200, {
        available:      true,
        slotsRemaining: FALLBACK_CAPACITY,
        staffCapacity:  FALLBACK_CAPACITY,
        reason:         "check-error",
      });
    }
    const openSlots = {};
    for (const s of KNOWN_SLOTS) {
      openSlots[s] = { available: true, slotsRemaining: FALLBACK_CAPACITY };
    }
    return sendJson(res, 200, {
      slots:         openSlots,
      staffCapacity: FALLBACK_CAPACITY,
      reason:        "check-error",
    });
  }
}
