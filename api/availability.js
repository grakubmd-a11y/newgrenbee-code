/**
 * api/availability.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Check slot availability for a given date.
 *
 * Two modes (both POST):
 *
 *   Single-slot check  { date, timeSlot }
 *     → { available, slotsRemaining }
 *
 *   Bulk check (all slots for a date)  { date }
 *     → { slots: { [timeSlot]: { available, slotsRemaining } } }
 *
 * In both modes a single Firestore query retrieves all bookings for the date;
 * the bulk mode groups results by timeSlot server-side instead of requiring
 * one round-trip per slot.
 *
 * Fails open (available=true) when Firebase Admin is not configured, so the
 * booking flow is never hard-blocked by a missing env var.
 */

import admin from "firebase-admin";
import { getFirestore as _adminGetFs } from "firebase-admin/firestore";

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

const MAX_CONCURRENT = 3;

export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return sendJson(res, 405, { error: "Method not allowed" });
  }

  const { date, timeSlot } = parseBody(req);
  if (!date) {
    return sendJson(res, 400, { error: "date is required." });
  }

  const db = getFirestore();

  // ── Fail-open when Firebase Admin is not configured ───────────────────────
  if (!db) {
    if (timeSlot) {
      return sendJson(res, 200, {
        available:      true,
        slotsRemaining: MAX_CONCURRENT,
        reason:         "availability-check-skipped",
      });
    }
    return sendJson(res, 200, {
      slots:  {},
      reason: "availability-check-skipped",
    });
  }

  try {
    // One query for all active bookings on the requested date
    const snap = await db
      .collection("bookings")
      .where("bookingDate", "==", date)
      .where("status", "in", ["scheduled", "dispatched", "in-progress", "confirmed"])
      .get();

    // Count bookings per time-slot
    const counts = {};
    for (const doc of snap.docs) {
      const ts = doc.data().timeSlot;
      if (ts) counts[ts] = (counts[ts] || 0) + 1;
    }

    // ── Single-slot response ────────────────────────────────────────────────
    if (timeSlot) {
      const count          = counts[timeSlot] || 0;
      const slotsRemaining = Math.max(0, MAX_CONCURRENT - count);
      return sendJson(res, 200, {
        available:      slotsRemaining > 0,
        slotsRemaining,
      });
    }

    // ── Bulk response — all known slots ────────────────────────────────────
    // Return status for every slot that had at least one booking PLUS any
    // slot the caller might not know about (so the UI can show all statuses).
    // We also include all 10 hourly slots so the UI always gets
    // a full picture even if no bookings exist yet.
    const KNOWN_SLOTS = [
      "08:00", "09:00", "10:00", "11:00", "12:00",
      "13:00", "14:00", "15:00", "16:00", "17:00",
    ];

    const allSlotKeys = new Set([...KNOWN_SLOTS, ...Object.keys(counts)]);
    const slots = {};
    for (const ts of allSlotKeys) {
      const count          = counts[ts] || 0;
      const slotsRemaining = Math.max(0, MAX_CONCURRENT - count);
      slots[ts] = { available: slotsRemaining > 0, slotsRemaining };
    }

    return sendJson(res, 200, { slots });

  } catch {
    if (timeSlot) {
      return sendJson(res, 200, {
        available:      true,
        slotsRemaining: MAX_CONCURRENT,
        reason:         "check-error",
      });
    }
    return sendJson(res, 200, { slots: {}, reason: "check-error" });
  }
}
